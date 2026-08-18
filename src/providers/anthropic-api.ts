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

const AnthropicResponseSchema = z.looseObject({
  content: z.array(
    z.looseObject({
      type: z.string(),
      text: z.string().optional()
    })
  ),
  stop_reason: z.string().nullable().optional(),
  usage: z
    .looseObject({
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export interface AnthropicApiAdapterOptions {
  id?: string;
  endpoint?: string;
  apiKeyEnvironment?: string;
  maxTokens?: number;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
}

export class AnthropicApiAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #endpoint: string;
  readonly #apiKeyEnvironment: string;
  readonly #maxTokens: number;
  readonly #env: NodeJS.ProcessEnv;
  readonly #fetch: FetchLike;

  constructor(options: AnthropicApiAdapterOptions = {}) {
    this.id = options.id ?? 'anthropic-api';
    this.#endpoint = options.endpoint ?? 'https://api.anthropic.com/v1/messages';
    this.#apiKeyEnvironment = options.apiKeyEnvironment ?? 'ANTHROPIC_API_KEY';
    this.#maxTokens = options.maxTokens ?? 4_096;
    this.#env = options.env ?? process.env;
    this.#fetch = options.fetch ?? fetch;
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: 'anthropic',
      transports: ['http'],
      authKinds: ['api-key'],
      structuredOutput: true,
      reportsUsage: true,
      supportsAbort: true
    };
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const key = this.#env[this.#apiKeyEnvironment];
    const headers = key
      ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
      : { 'anthropic-version': '2023-06-01' };
    const reachable = input.network
      ? await probeHttpEndpoint(this.#endpoint, headers, input.timeoutMs, this.#fetch)
      : null;
    return {
      adapterId: this.id,
      provider: 'anthropic',
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
      throw new XerifyError('AUTH_UNAVAILABLE', 'Anthropic API key is unavailable', {
        details: { environment: this.#apiKeyEnvironment }
      });
    }
    const prompt = truncateUtf8(input.prompt, input.limits.maxInputBytes);
    const response = await postJson(
      {
        endpoint: this.#endpoint,
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: {
          model: input.model,
          max_tokens: this.#maxTokens,
          messages: [{ role: 'user', content: prompt.text }],
          ...(input.operation === 'verify'
            ? {
                output_config: {
                  format: { type: 'json_schema', schema: VERIFICATION_JSON_SCHEMA }
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
    const parsed = parseProviderResponse(AnthropicResponseSchema, response.data, 'Anthropic');
    if (parsed.stop_reason === 'max_tokens') {
      throw new XerifyError(
        'INVALID_PROVIDER_RESPONSE',
        'Anthropic response reached the output token limit',
        { retryable: true }
      );
    }
    if (parsed.stop_reason === 'refusal') {
      throw new XerifyError('PROVIDER_FAILURE', 'Anthropic refused the request', {
        retryable: false
      });
    }
    const output = parsed.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text ?? '')
      .join('');
    if (!output) {
      throw new XerifyError('INVALID_PROVIDER_RESPONSE', 'Anthropic response contained no text', {
        retryable: true
      });
    }
    const inputTokens = parsed.usage?.input_tokens ?? null;
    const outputTokens = parsed.usage?.output_tokens ?? null;
    const usage: Usage | null = parsed.usage
      ? {
          inputTokens,
          outputTokens,
          totalTokens:
            inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
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
