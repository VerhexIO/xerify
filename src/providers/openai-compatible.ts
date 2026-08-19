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
  apiKey?: string;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
}

function isLoopbackEndpoint(endpoint: string): boolean {
  const hostname = new URL(endpoint).hostname.toLowerCase().replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '::1' || hostname === '[::1]') return true;
  const octets = hostname.split('.');
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

function hasInlineEndpointMaterial(endpoint: string): boolean {
  const value = new URL(endpoint);
  return value.username !== '' || value.password !== '' || value.search !== '' || value.hash !== '';
}

export class OpenAiCompatibleAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #provider: string;
  readonly #endpoint: string;
  readonly #apiKeyEnvironment: string | undefined;
  readonly #apiKey: string | undefined;
  readonly #env: NodeJS.ProcessEnv;
  readonly #fetch: FetchLike;

  constructor(options: OpenAiCompatibleAdapterOptions) {
    this.id = options.id;
    this.#provider = options.provider;
    this.#endpoint = options.endpoint;
    this.#apiKeyEnvironment = options.apiKeyEnvironment;
    this.#apiKey = options.apiKey;
    this.#env = options.env ?? process.env;
    this.#fetch = options.fetch ?? fetch;
  }

  capabilities(): ProviderCapabilities {
    const explicitAuth = Boolean(this.#apiKeyEnvironment || this.#apiKey);
    const inlineEndpointMaterial = hasInlineEndpointMaterial(this.#endpoint);
    return {
      provider: this.#provider,
      transports: ['http'],
      authKinds: explicitAuth
        ? ['api-key']
        : isLoopbackEndpoint(this.#endpoint) && !inlineEndpointMaterial
          ? ['local']
          : ['unknown'],
      structuredOutput: true,
      reportsUsage: true,
      supportsAbort: true
    };
  }

  #credential(): { key: string; source: 'env' | 'config' } | null {
    const environmentKey = this.#apiKeyEnvironment ? this.#env[this.#apiKeyEnvironment] : undefined;
    if (environmentKey) return { key: environmentKey, source: 'env' };
    return this.#apiKey ? { key: this.#apiKey, source: 'config' } : null;
  }

  #headers(): Record<string, string> {
    const credential = this.#credential();
    return credential ? { authorization: `Bearer ${credential.key}` } : {};
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const credential = this.#credential();
    const authRequired = Boolean(this.#apiKeyEnvironment || this.#apiKey);
    const loopback = isLoopbackEndpoint(this.#endpoint);
    const inlineEndpointMaterial = hasInlineEndpointMaterial(this.#endpoint);
    const authPresent = !authRequired || credential !== null;
    const reachable = input.network
      ? await probeHttpEndpoint(this.#endpoint, this.#headers(), input.timeoutMs, this.#fetch)
      : null;
    return {
      adapterId: this.id,
      provider: this.#provider,
      available: authPresent && reachable !== false,
      executable: null,
      auth: authRequired
        ? {
            kind: 'api-key',
            status: credential ? 'present' : 'missing',
            source: credential?.source ?? 'missing'
          }
        : inlineEndpointMaterial
          ? { kind: 'unknown', status: 'unknown', source: 'config' }
          : loopback
            ? { kind: 'local', status: 'not-required', source: 'local' }
            : { kind: 'unknown', status: 'unknown', source: 'unknown' },
      detail: !authPresent
        ? `${this.#apiKeyEnvironment ?? 'Configured environment'} and config apiKey are missing`
        : reachable === false
          ? 'Compatible endpoint is unreachable'
          : inlineEndpointMaterial
            ? reachable === true
              ? 'Compatible endpoint is reachable; inline URL authentication requirements are unknown'
              : 'Compatible endpoint contains inline URL material; authentication requirements are unknown'
            : loopback
              ? reachable === true
                ? 'Local compatible endpoint is reachable'
                : 'Local compatible endpoint configured; network was not probed'
              : reachable === true
                ? 'Remote compatible endpoint is reachable; authentication requirements are unknown'
                : 'Remote compatible endpoint configured without explicit auth; requirements are unknown'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    if ((this.#apiKeyEnvironment || this.#apiKey) && !this.#credential()) {
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
