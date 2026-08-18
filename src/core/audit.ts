import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

import { z } from 'zod';

import { SCHEMA_VERSION } from './contracts.js';
import { XerifyError, type XerifyErrorCode } from './errors.js';

const SafeAuditValueSchema = z.union([
  z.string().max(2_000),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

export const AuditRecordSchema = z
  .object({
    timestamp: z.iso.datetime(),
    schemaVersion: z.literal(SCHEMA_VERSION),
    command: z.string().min(1).max(200),
    outcome: z.enum(['success', 'error']),
    exitCode: z.number().int().nonnegative(),
    result: z.record(z.string(), z.unknown()).optional(),
    error: z
      .object({
        code: z.string().min(1).max(200),
        retryable: z.boolean()
      })
      .strict()
      .optional()
  })
  .strict();
export type AuditRecord = z.infer<typeof AuditRecordSchema>;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickSafeObject(value: unknown, fields: readonly string[]): Record<string, unknown> | null {
  const object = objectValue(value);
  if (!object) return null;
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    const parsed = SafeAuditValueSchema.safeParse(object[field]);
    if (parsed.success) picked[field] = parsed.data;
  }
  return Object.keys(picked).length > 0 ? picked : null;
}

export function summarizeForAudit(value: unknown): Record<string, unknown> {
  const object = objectValue(value);
  if (!object) return {};
  const result: Record<string, unknown> = {};
  for (const field of ['id', 'verdict', 'durationMs'] as const) {
    const parsed = SafeAuditValueSchema.safeParse(object[field]);
    if (parsed.success) result[field] = parsed.data;
  }
  for (const [field, keys] of [
    ['from', ['provider', 'model', 'provenance']],
    ['to', ['provider', 'model', 'provenance']],
    ['usage', ['inputTokens', 'outputTokens', 'totalTokens', 'costUsd']],
    ['truncation', ['input', 'output']],
    ['failure', ['code', 'retryable']]
  ] as const) {
    const picked = pickSafeObject(object[field], keys);
    if (picked) result[field] = picked;
  }
  return result;
}

export interface AppendAuditInput {
  command: string;
  outcome: 'success' | 'error';
  exitCode: number;
  result?: unknown;
  error?: { code: XerifyErrorCode | string; retryable: boolean };
  now?: Date;
}

export async function appendAuditRecord(path: string, input: AppendAuditInput): Promise<void> {
  const record = AuditRecordSchema.parse({
    timestamp: (input.now ?? new Date()).toISOString(),
    schemaVersion: SCHEMA_VERSION,
    command: input.command,
    outcome: input.outcome,
    exitCode: input.exitCode,
    ...(input.result === undefined ? {} : { result: summarizeForAudit(input.result) }),
    ...(input.error === undefined ? {} : { error: input.error })
  });
  const noFollow = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
  try {
    const handle = await open(
      path,
      constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | noFollow,
      0o600
    );
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) throw new Error('Audit target is not a regular file');
      await handle.writeFile(`${JSON.stringify(record)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    throw new XerifyError('CONFIG_INVALID', 'Unable to append the audit log safely', {
      cause: error
    });
  }
}
