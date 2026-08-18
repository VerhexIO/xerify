import { mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { appendAuditRecord, AuditRecordSchema, summarizeForAudit } from '../../src/core/audit.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-audit-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('secret-safe audit writer', () => {
  it('keeps operational metadata and excludes provider text', async () => {
    const directory = await temporaryDirectory();
    const logPath = path.join(directory, 'audit.jsonl');
    await appendAuditRecord(logPath, {
      command: 'verify',
      outcome: 'success',
      exitCode: 10,
      now: new Date('2026-08-18T12:00:00.000Z'),
      result: {
        id: 'xrf_test',
        verdict: 'refuted',
        summary: 'SECRET_PROVIDER_TEXT',
        findings: [{ message: 'SECRET_FINDING' }],
        from: { provider: 'openai', model: 'author', provenance: 'declared' },
        to: { provider: 'anthropic', model: 'verifier', provenance: 'declared' },
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5, costUsd: null },
        durationMs: 4,
        truncation: { input: false, output: false }
      }
    });

    const raw = await readFile(logPath, 'utf8');
    const record = AuditRecordSchema.parse(JSON.parse(raw) as unknown);
    expect(record).toMatchObject({
      command: 'verify',
      outcome: 'success',
      exitCode: 10,
      result: { verdict: 'refuted', from: { provider: 'openai' } }
    });
    expect(raw).not.toContain('SECRET_PROVIDER_TEXT');
    expect(raw).not.toContain('SECRET_FINDING');
    if (process.platform !== 'win32') {
      expect((await stat(logPath)).mode & 0o077).toBe(0);
    }
  });

  it('never copies arbitrary fields into the audit summary', () => {
    expect(
      summarizeForAudit({
        prompt: 'SECRET_PROMPT',
        context: 'SECRET_CONTEXT',
        authorization: 'Bearer SECRET',
        answer: 'SECRET_ANSWER'
      })
    ).toEqual({});
  });

  it.runIf(process.platform !== 'win32')('refuses to follow a log symlink', async () => {
    const directory = await temporaryDirectory();
    const target = path.join(directory, 'target');
    const link = path.join(directory, 'audit.jsonl');
    await writeFile(target, 'untouched');
    await symlink(target, link);

    await expect(
      appendAuditRecord(link, { command: 'doctor', outcome: 'success', exitCode: 0 })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
    expect(await readFile(target, 'utf8')).toBe('untouched');
  });
});
