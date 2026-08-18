import { randomUUID } from 'node:crypto';

import {
  VerifierPayloadSchema,
  type ProviderReference,
  type Usage,
  type VerificationFailure,
  type VerifyResult
} from './contracts.js';
import { XerifyError } from './errors.js';

export function assertProviderSeparation(from: ProviderReference, to: ProviderReference): void {
  if (from.provenance === 'unknown') {
    throw new XerifyError(
      'PROVENANCE_UNPROVABLE',
      'The author provider is unknown; different-provider verification cannot be enforced'
    );
  }

  if (from.provider.toLowerCase() === to.provider.toLowerCase()) {
    throw new XerifyError(
      'SAME_PROVIDER',
      'Author and verifier must belong to different providers',
      { details: { provider: from.provider } }
    );
  }
}

export function parseVerifierPayload(raw: string) {
  return VerifierPayloadSchema.parse(JSON.parse(raw) as unknown);
}

export function resultId(): string {
  return `xrf_${randomUUID().replaceAll('-', '')}`;
}

export function unclearResult(input: {
  id?: string;
  from: ProviderReference;
  to: ProviderReference;
  startedAt: number;
  failure: VerificationFailure;
  usage?: Usage | null;
  inputTruncated?: boolean;
  outputTruncated?: boolean;
}): VerifyResult {
  return {
    schemaVersion: 1,
    id: input.id ?? resultId(),
    from: input.from,
    to: input.to,
    verdict: 'unclear',
    summary: input.failure.message,
    findings: [],
    usage: input.usage ?? null,
    durationMs: Math.max(0, Date.now() - input.startedAt),
    truncation: {
      input: input.inputTruncated ?? false,
      output: input.outputTruncated ?? false
    },
    failure: input.failure
  };
}

export function verificationExitCode(result: VerifyResult): number {
  if (result.failure?.code === 'TIMEOUT' || result.failure?.code === 'CANCELLED') return 4;
  if (result.failure?.code === 'PROVIDER_FAILURE') return 5;
  if (result.failure?.code === 'INVALID_PROVIDER_RESPONSE') return 6;
  if (result.verdict === 'refuted') return 10;
  if (result.verdict === 'unclear') return 11;
  return 0;
}
