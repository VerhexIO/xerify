import { z } from 'zod';

import { ProviderReferenceSchema, RequestLimitsSchema, SCHEMA_VERSION } from '../core/contracts.js';

export const RunOperationSchema = z.enum(['ask', 'verify']);
export type RunOperation = z.infer<typeof RunOperationSchema>;

export const RunSurfaceSchema = z.enum(['cli', 'mcp', 'library']);
export type RunSurface = z.infer<typeof RunSurfaceSchema>;

export const RunStatusSchema = z.enum(['running', 'completed', 'failed']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

const DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const CapturedTextSchema = z
  .object({
    capture: z.enum(['full', 'metadata', 'none']),
    bytes: z.number().int().nonnegative().nullable(),
    sha256: DigestSchema.nullable(),
    value: z.string().nullable()
  })
  .strict();

export const ContextRecordSchema = CapturedTextSchema.extend({
  label: z.string().min(1).max(500),
  evidenceId: z
    .string()
    .regex(/^E-\d{3}$/)
    .nullable(),
  evidenceFile: z.string().max(1_000).nullable()
});

export const RunRequestRecordSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    runId: z.string().regex(/^xrun_\d+$/),
    operation: RunOperationSchema,
    recordedAt: z.iso.datetime(),
    from: ProviderReferenceSchema.nullable(),
    to: ProviderReferenceSchema,
    adapterId: z.string().min(1).max(200).nullable(),
    statementKind: z.enum(['question', 'claim']),
    statement: CapturedTextSchema,
    context: ContextRecordSchema,
    limits: RequestLimitsSchema
  })
  .strict();
export type RunRequestRecord = z.infer<typeof RunRequestRecordSchema>;

export const EvidenceManifestEntrySchema = z
  .object({
    evidenceId: z.string().regex(/^E-\d{3}$/),
    kind: z.literal('stdin-context'),
    locator: z.string().min(1).max(500),
    contentSha256: DigestSchema,
    bytes: z.number().int().nonnegative(),
    file: z
      .string()
      .regex(/^001-[a-f0-9]{64}\.txt$/)
      .nullable()
  })
  .strict();

export const EvidenceManifestSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    runId: z.string().regex(/^xrun_\d+$/),
    entries: z.array(EvidenceManifestEntrySchema)
  })
  .strict();
export type EvidenceManifest = z.infer<typeof EvidenceManifestSchema>;

export const RunOutcomeSchema = z
  .object({
    exitCode: z.number().int().nonnegative(),
    resultId: z.string().nullable(),
    verdict: z.enum(['confirmed', 'refuted', 'unclear']).nullable(),
    errorCode: z.string().max(200).nullable()
  })
  .strict();

export const RunProcessSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string().regex(/^xrun_\d+$/),
    sequence: z.number().int().positive(),
    directory: z.string().regex(/^\d+$/),
    operation: RunOperationSchema,
    surface: RunSurfaceSchema,
    status: RunStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    archivedAt: z.iso.datetime().nullable(),
    from: ProviderReferenceSchema.nullable(),
    to: ProviderReferenceSchema,
    adapterId: z.string().min(1).max(200).nullable(),
    outcome: RunOutcomeSchema.nullable()
  })
  .strict();
export type RunProcess = z.infer<typeof RunProcessSchema>;

export const RunEventSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    timestamp: z.iso.datetime(),
    runId: z.string().regex(/^xrun_\d+$/),
    event: z.enum(['started', 'completed', 'failed', 'archived', 'restored']),
    status: RunStatusSchema,
    exitCode: z.number().int().nonnegative().nullable(),
    verdict: z.enum(['confirmed', 'refuted', 'unclear']).nullable(),
    errorCode: z.string().max(200).nullable()
  })
  .strict();
export type RunEvent = z.infer<typeof RunEventSchema>;
