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

const OpenAiResponseSchema = z.looseObject({
  status: z.string().optional(),
  output: z.array(
    z.looseObject({
      type: z.string(),
      content: z
        .array(
          z.looseObject({
            type: z.string(),
            text: z.string().optional()
          })
        )
        .optional()
    })
  ),
  usage: z
    .looseObject({
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional()
    })
    .nullable()
    .optional()
});

export interface OpenAiApiAdapterOptions {
  id?: string;
  endpoint?: string;
  apiKeyEnvironment?: string;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
}

export class OpenAiApiAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #endpoint: string;
  readonly #apiKeyEnvironment: string;
  readonly #env: NodeJS.ProcessEnv;
  readonly #fetch: FetchLike;

  constructor(options: OpenAiApiAdapterOptions = {}) {
    this.id = options.id ?? 'openai-api';
    this.#endpoint = options.endpoint ?? 'https://api.openai.com/v1/responses';
    this.#apiKeyEnvironment = options.apiKeyEnvironment ?? 'OPENAI_API_KEY';
    this.#env = options.env ?? process.env;
    this.#fetch = options.fetch ?? fetch;
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: 'openai',
      transports: ['http'],
      authKinds: ['api-key'],
      structuredOutput: true,
      reportsUsage: true,
      supportsAbort: true
    };
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const key = this.#env[this.#apiKeyEnvironment];
    const reachable = input.network
      ? await probeHttpEndpoint(
          this.#endpoint,
          key ? { authorization: `Bearer ${key}` } : {},
          input.timeoutMs,
          this.#fetch
        )
      : null;
    return {
      adapterId: this.id,
      provider: 'openai',
      available: Boolean(key) && reachable !== false,
      executable: null,
      auth: {
        kind: 'api-key',
        status: key ? 'present' : 'missing',
        source: key ? 'env' : 'missing'
      },
      detail: !key
        ? `${this.#apiKeyEnvironment} is missing`
        : reachable === false
          ? 'API endpoint is unreachable'
          : reachable === true
            ? 'API key is present and endpoint is reachable'
            : 'API key is present; network was not probed'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    const key = this.#env[this.#apiKeyEnvironment];
    if (!key) {
      throw new XerifyError('AUTH_UNAVAILABLE', 'OpenAI API key is unavailable', {
        details: { environment: this.#apiKeyEnvironment }
      });
    }
    const prompt = truncateUtf8(input.prompt, input.limits.maxInputBytes);
    const response = await postJson(
      {
        endpoint: this.#endpoint,
        headers: { authorization: `Bearer ${key}` },
        body: {
          model: input.model,
          input: prompt.text,
          store: false,
          ...(input.operation === 'verify'
            ? {
                text: {
                  format: {
                    type: 'json_schema',
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
    const parsed = parseProviderResponse(OpenAiResponseSchema, response.data, 'OpenAI');
    if (parsed.status && parsed.status !== 'completed') {
      throw new XerifyError('PROVIDER_FAILURE', 'OpenAI response did not complete', {
        retryable: true,
        details: { status: parsed.status }
      });
    }
    const output = parsed.output
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === 'output_text')
      .map((content) => content.text ?? '')
      .join('');
    if (!output) {
      throw new XerifyError(
        'INVALID_PROVIDER_RESPONSE',
        'OpenAI response contained no output text',
        {
          retryable: true
        }
      );
    }
    const inputTokens = parsed.usage?.input_tokens ?? null;
    const outputTokens = parsed.usage?.output_tokens ?? null;
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
