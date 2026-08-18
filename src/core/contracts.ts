import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;

const identifierPart = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, 'must be a provider or model identifier');

export const ProvenanceSchema = z.enum(['observed', 'declared', 'unknown']);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const PublicProvenanceSchema = z.enum(['declared', 'unknown']);
export type PublicProvenance = z.infer<typeof PublicProvenanceSchema>;

export const ProviderReferenceSchema = z
  .object({
    provider: identifierPart,
    model: identifierPart,
    provenance: ProvenanceSchema
  })
  .strict();
export type ProviderReference = z.infer<typeof ProviderReferenceSchema>;

export const PublicProviderReferenceSchema = ProviderReferenceSchema.extend({
  provenance: PublicProvenanceSchema
});
export type PublicProviderReference = z.infer<typeof PublicProviderReferenceSchema>;

export const DeclaredProviderReferenceSchema = ProviderReferenceSchema.extend({
  provenance: z.literal('declared')
});
export type DeclaredProviderReference = z.infer<typeof DeclaredProviderReferenceSchema>;

export const RequestLimitsSchema = z
  .object({
    timeoutMs: z.number().int().positive().max(3_600_000),
    maxInputBytes: z
      .number()
      .int()
      .positive()
      .max(100 * 1024 * 1024),
    maxOutputBytes: z
      .number()
      .int()
      .positive()
      .max(100 * 1024 * 1024)
  })
  .strict();
export type RequestLimits = z.infer<typeof RequestLimitsSchema>;

export const DEFAULT_LIMITS: RequestLimits = {
  timeoutMs: 120_000,
  maxInputBytes: 1024 * 1024,
  maxOutputBytes: 1024 * 1024
};

const boundedText = z.string().max(100 * 1024 * 1024);

export const AskRequestSchema = z
  .object({
    from: PublicProviderReferenceSchema.optional(),
    to: DeclaredProviderReferenceSchema,
    question: z.string().trim().min(1).max(100_000),
    context: boundedText.default(''),
    limits: RequestLimitsSchema.default(DEFAULT_LIMITS)
  })
  .strict();
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const VerifyRequestSchema = z
  .object({
    from: PublicProviderReferenceSchema,
    to: DeclaredProviderReferenceSchema,
    claim: z.string().trim().min(1).max(100_000),
    context: boundedText.default(''),
    limits: RequestLimitsSchema.default(DEFAULT_LIMITS)
  })
  .strict();
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const FindingSchema = z
  .object({
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    message: z.string().trim().min(1).max(20_000),
    evidence: z.string().trim().max(20_000).optional()
  })
  .strict();
export type Finding = z.infer<typeof FindingSchema>;

export const EvidenceReferenceSchema = z
  .object({
    reference: z.string().trim().min(1).max(2_000),
    observation: z.string().trim().min(1).max(20_000)
  })
  .strict();
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

const EpistemicListItemSchema = z.string().trim().min(1).max(20_000);
const EpistemicListSchema = z.array(EpistemicListItemSchema).max(100);

export const VerdictSchema = z.enum(['confirmed', 'refuted', 'unclear']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const VerifierPayloadSchema = z
  .object({
    verdict: VerdictSchema,
    summary: z.string().trim().min(1).max(20_000),
    findings: z.array(FindingSchema).max(100),
    evidence: z.array(EvidenceReferenceSchema).max(100).optional(),
    assumptions: EpistemicListSchema.optional(),
    limitations: EpistemicListSchema.optional(),
    unverifiedClaims: EpistemicListSchema.optional()
  })
  .strict();
export type VerifierPayload = z.infer<typeof VerifierPayloadSchema>;

// Provider structured-output APIs often need every property to be required. This
// schema is a strict generation boundary; VerifierPayloadSchema remains
// backwards-compatible for command adapters and public result consumers.
export const StructuredVerifierPayloadSchema = VerifierPayloadSchema.extend({
  findings: z.array(FindingSchema.extend({ evidence: z.string().trim().max(20_000) })).max(100),
  evidence: z.array(EvidenceReferenceSchema).max(100),
  assumptions: EpistemicListSchema,
  limitations: EpistemicListSchema,
  unverifiedClaims: EpistemicListSchema
});

export const UsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
    costUsd: z.number().nonnegative().nullable()
  })
  .strict();
export type Usage = z.infer<typeof UsageSchema>;

export const TruncationSchema = z
  .object({
    input: z.boolean(),
    output: z.boolean()
  })
  .strict();

export const FailureSchema = z
  .object({
    code: z.enum(['TIMEOUT', 'CANCELLED', 'PROVIDER_FAILURE', 'INVALID_PROVIDER_RESPONSE']),
    message: z.string().min(1).max(2_000),
    retryable: z.boolean()
  })
  .strict();
export type VerificationFailure = z.infer<typeof FailureSchema>;

export const VerifyResultSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string().regex(/^xrf_[A-Za-z0-9_-]+$/),
    from: ProviderReferenceSchema,
    to: ProviderReferenceSchema,
    verdict: VerdictSchema,
    summary: z.string().min(1).max(20_000),
    findings: z.array(FindingSchema).max(100),
    evidence: z.array(EvidenceReferenceSchema).max(100).optional(),
    assumptions: EpistemicListSchema.optional(),
    limitations: EpistemicListSchema.optional(),
    unverifiedClaims: EpistemicListSchema.optional(),
    usage: UsageSchema.nullable(),
    durationMs: z.number().int().nonnegative(),
    truncation: TruncationSchema,
    failure: FailureSchema.nullable()
  })
  .strict();
export type VerifyResult = z.infer<typeof VerifyResultSchema>;

export const AskResultSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string().regex(/^xrf_[A-Za-z0-9_-]+$/),
    from: ProviderReferenceSchema.nullable(),
    to: ProviderReferenceSchema,
    answer: z.string(),
    usage: UsageSchema.nullable(),
    durationMs: z.number().int().nonnegative(),
    truncation: TruncationSchema
  })
  .strict();
export type AskResult = z.infer<typeof AskResultSchema>;

export const ErrorBodySchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown())
  })
  .strict();
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export const CliSuccessEnvelopeSchema = z
  .object({
    ok: z.literal(true),
    schemaVersion: z.literal(SCHEMA_VERSION),
    command: z.string().min(1),
    data: z.unknown()
  })
  .strict();
export type CliSuccessEnvelope = z.infer<typeof CliSuccessEnvelopeSchema>;

export const CliErrorEnvelopeSchema = z
  .object({
    ok: z.literal(false),
    schemaVersion: z.literal(SCHEMA_VERSION),
    command: z.string().min(1),
    error: ErrorBodySchema
  })
  .strict();
export type CliErrorEnvelope = z.infer<typeof CliErrorEnvelopeSchema>;

export function parseProviderReference(value: string): DeclaredProviderReference {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error('provider reference must use provider:model');
  }

  return DeclaredProviderReferenceSchema.parse({
    provider: value.slice(0, separator),
    model: value.slice(separator + 1),
    provenance: 'declared'
  });
}
