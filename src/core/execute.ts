import type { ProviderRegistry } from '../providers/registry.js';
import {
  AskRequestSchema,
  VerifyRequestSchema,
  type AskRequest,
  type AskResult,
  type VerificationFailure,
  type VerifyRequest,
  type VerifyResult
} from './contracts.js';
import { toXerifyError, type XerifyError } from './errors.js';
import { buildAskPrompt, buildVerifyPrompt } from './prompts.js';
import {
  assertProviderSeparation,
  parseVerifierPayload,
  resultId,
  unclearResult
} from './verdict.js';

export interface ExecuteOptions {
  signal?: AbortSignal;
  adapterId?: string;
}

function operationalFailure(error: XerifyError): VerificationFailure | null {
  if (
    error.code === 'TIMEOUT' ||
    error.code === 'CANCELLED' ||
    error.code === 'PROVIDER_FAILURE' ||
    error.code === 'INVALID_PROVIDER_RESPONSE'
  ) {
    const providerMessage = error.details.providerMessage;
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(typeof providerMessage === 'string' && providerMessage.length > 0
        ? { providerMessage }
        : {})
    };
  }
  return null;
}

export async function executeAsk(
  rawRequest: AskRequest,
  registry: ProviderRegistry,
  options: ExecuteOptions = {}
): Promise<AskResult> {
  const request = AskRequestSchema.parse(rawRequest);
  const adapter = registry.resolve(request.to.provider, options.adapterId);
  const startedAt = Date.now();
  const result = await adapter.invoke(
    {
      operation: 'ask',
      model: request.to.model,
      prompt: buildAskPrompt(request),
      limits: request.limits
    },
    options.signal ?? new AbortController().signal
  );

  return {
    schemaVersion: 1,
    id: resultId(),
    from: request.from ?? null,
    to: request.to,
    answer: result.output,
    usage: result.usage,
    durationMs: Math.max(result.durationMs, Date.now() - startedAt),
    truncation: { input: result.inputTruncated, output: result.outputTruncated }
  };
}

export async function executeVerify(
  rawRequest: VerifyRequest,
  registry: ProviderRegistry,
  options: ExecuteOptions = {}
): Promise<VerifyResult> {
  const request = VerifyRequestSchema.parse(rawRequest);
  assertProviderSeparation(request.from, request.to);
  const adapter = registry.resolve(request.to.provider, options.adapterId);
  const startedAt = Date.now();
  const id = resultId();

  try {
    const invoked = await adapter.invoke(
      {
        operation: 'verify',
        model: request.to.model,
        prompt: buildVerifyPrompt(request),
        limits: request.limits
      },
      options.signal ?? new AbortController().signal
    );

    if (invoked.inputTruncated || invoked.outputTruncated) {
      return unclearResult({
        id,
        from: request.from,
        to: request.to,
        startedAt,
        usage: invoked.usage,
        inputTruncated: invoked.inputTruncated,
        outputTruncated: invoked.outputTruncated,
        failure: {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'Verification input or output was truncated',
          retryable: true
        }
      });
    }

    try {
      const payload = parseVerifierPayload(invoked.output);
      return {
        schemaVersion: 1,
        id,
        from: request.from,
        to: request.to,
        ...payload,
        usage: invoked.usage,
        durationMs: Math.max(invoked.durationMs, Date.now() - startedAt),
        truncation: {
          input: invoked.inputTruncated,
          output: invoked.outputTruncated
        },
        failure: null
      };
    } catch {
      return unclearResult({
        id,
        from: request.from,
        to: request.to,
        startedAt,
        usage: invoked.usage,
        inputTruncated: invoked.inputTruncated,
        outputTruncated: invoked.outputTruncated,
        failure: {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'Provider response did not match the verification schema',
          retryable: true
        }
      });
    }
  } catch (error) {
    const typed = toXerifyError(error);
    const failure = operationalFailure(typed);
    if (!failure) throw typed;
    return unclearResult({ id, from: request.from, to: request.to, startedAt, failure });
  }
}
