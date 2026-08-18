import { z } from 'zod';

import type { Usage } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { VERIFICATION_JSON_SCHEMA } from '../core/structured-schema.js';
import { truncateUtf8 } from '../process/bounds.js';
import type {
  InvokeInput,
  InvokeResult,
  ProbeInput,
  ProbeResult,
  ProviderAdapter,
  ProviderCapabilities
} from './contract.js';
import { postJson, probeHttpEndpoint, type FetchLike } from './http.js';
import { parseProviderResponse } from './response.js';

const CompatibleResponseSchema = z.looseObject({
  choices: z.array(
    z.looseObject({
      message: z.looseObject({ content: z.string().nullable() })
    })
  ),
  usage: z
    .looseObject({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export interface OpenAiCompatibleAdapterOptions {
  id: string;
  provider: string;
  endpoint: string;
  apiKeyEnvironment?: string;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
}

export class OpenAiCompatibleAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #provider: string;
  readonly #endpoint: string;
  readonly #apiKeyEnvironment: string | undefined;
  readonly #env: NodeJS.ProcessEnv;
  readonly #fetch: FetchLike;

  constructor(options: OpenAiCompatibleAdapterOptions) {
    this.id = options.id;
    this.#provider = options.provider;
    this.#endpoint = options.endpoint;
    this.#apiKeyEnvironment = options.apiKeyEnvironment;
    this.#env = options.env ?? process.env;
    this.#fetch = options.fetch ?? fetch;
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: this.#provider,
      transports: ['http'],
      authKinds: this.#apiKeyEnvironment ? ['api-key'] : ['local'],
      structuredOutput: true,
      reportsUsage: true,
      supportsAbort: true
    };
  }

  #key(): string | undefined {
    return this.#apiKeyEnvironment ? this.#env[this.#apiKeyEnvironment] : undefined;
  }

  #headers(): Record<string, string> {
    const key = this.#key();
    return key ? { authorization: `Bearer ${key}` } : {};
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const key = this.#key();
    const authPresent = !this.#apiKeyEnvironment || Boolean(key);
    const reachable = input.network
      ? await probeHttpEndpoint(this.#endpoint, this.#headers(), input.timeoutMs, this.#fetch)
      : null;
    return {
      adapterId: this.id,
      provider: this.#provider,
      available: authPresent && reachable !== false,
      executable: null,
      auth: this.#apiKeyEnvironment
        ? {
            kind: 'api-key',
            status: key ? 'present' : 'missing',
            source: key ? 'env' : 'missing'
          }
        : { kind: 'local', status: 'not-required', source: 'local' },
      detail: !authPresent
        ? `${this.#apiKeyEnvironment} is missing`
        : reachable === false
          ? 'Compatible endpoint is unreachable'
          : reachable === true
            ? 'Compatible endpoint is reachable'
            : 'Endpoint configured; network was not probed'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    if (this.#apiKeyEnvironment && !this.#key()) {
      throw new XerifyError('AUTH_UNAVAILABLE', 'Compatible endpoint API key is unavailable', {
        details: { environment: this.#apiKeyEnvironment }
      });
    }
    const prompt = truncateUtf8(input.prompt, input.limits.maxInputBytes);
    const response = await postJson(
      {
        endpoint: this.#endpoint,
        headers: this.#headers(),
        body: {
          model: input.model,
          messages: [{ role: 'user', content: prompt.text }],
          ...(input.operation === 'verify'
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'xerify_verification',
                    strict: true,
                    schema: VERIFICATION_JSON_SCHEMA
                  }
                }
              }
            : {})
        },
        timeoutMs: input.limits.timeoutMs,
        maxOutputBytes: input.limits.maxOutputBytes,
        fetch: this.#fetch
      },
      signal
    );
    const parsed = parseProviderResponse(
      CompatibleResponseSchema,
      response.data,
      'OpenAI-compatible provider'
    );
    const output = parsed.choices[0]?.message.content;
    if (!output) {
      throw new XerifyError('INVALID_PROVIDER_RESPONSE', 'Compatible response contained no text', {
        retryable: true
      });
    }
    const inputTokens = parsed.usage?.prompt_tokens ?? null;
    const outputTokens = parsed.usage?.completion_tokens ?? null;
    const usage: Usage | null = parsed.usage
      ? {
          inputTokens,
          outputTokens,
          totalTokens: parsed.usage.total_tokens ?? null,
          costUsd: null
        }
      : null;
    return {
      output,
      usage,
      durationMs: response.durationMs,
      inputTruncated: prompt.truncated,
      outputTruncated: response.outputTruncated
    };
  }
}
