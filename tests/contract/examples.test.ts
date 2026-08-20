import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface ExampleRecord {
  schemaVersion: number;
  exampleId: string;
  observedAt: string;
  author: { provider: string; model: string; provenance: string };
  target: { provider: string; model: string; adapter: string };
  claim: string;
  verdict: 'confirmed' | 'refuted' | 'unclear';
  exitCode: number;
  summary: string;
  document: string;
  evidence: string;
}

const OBSERVED_AT = '2026-08-20';
const KNOWN_PROVIDERS = ['anthropic', 'cursor', 'openai'];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const examplesRoot = path.join(repositoryRoot, 'docs', 'examples');

function readIndex(): { raw: string; records: ExampleRecord[] } {
  const raw = readFileSync(path.join(examplesRoot, 'index.jsonl'), 'utf8');
  return {
    raw,
    records: raw
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as ExampleRecord)
  };
}

describe('worked verification examples', () => {
  it('keeps one complete compact record for each documented scenario', () => {
    const { records } = readIndex();
    expect(records).toHaveLength(7);
    expect(new Set(records.map((record) => record.exampleId)).size).toBe(records.length);
    expect(records.map((record) => record.exampleId)).toEqual([
      'research-paper',
      'game-design',
      'website-decision',
      'data-analysis',
      'outbound-data-policy',
      'dogfood-cursor-adapter',
      'dogfood-package-boundary'
    ]);

    const expectedExit = { confirmed: 0, refuted: 10, unclear: 11 } as const;
    for (const record of records) {
      expect(record.schemaVersion).toBe(1);
      expect(record.observedAt).toBe(OBSERVED_AT);
      expect(record.author.provenance).toBe('declared');
      expect(record.author.model.length).toBeGreaterThan(0);
      // The subject of a claim and the channel that verifies it are independent, so an example
      // about the Cursor adapter may be verified through any other invocation provider.
      expect(KNOWN_PROVIDERS).toContain(record.author.provider);
      expect(KNOWN_PROVIDERS).toContain(record.target.provider);
      expect(record.author.provider).not.toBe(record.target.provider);
      expect(record.target.model.length).toBeGreaterThan(0);
      expect(record.target.adapter.length).toBeGreaterThan(0);
      expect(record.claim.length).toBeGreaterThan(10);
      expect(record.summary.length).toBeGreaterThan(10);
      expect(record.exitCode).toBe(expectedExit[record.verdict]);
      expect(existsSync(path.join(examplesRoot, record.document))).toBe(true);
      expect(existsSync(path.join(examplesRoot, record.evidence))).toBe(true);
    }
  });

  it('keeps transport, billing, account, and local run identifiers out of the AI index', () => {
    const { raw, records } = readIndex();
    for (const record of records) {
      expect(record).not.toHaveProperty('id');
      expect(record).not.toHaveProperty('resultId');
      expect(record).not.toHaveProperty('runId');
      expect(record).not.toHaveProperty('durationMs');
      expect(record).not.toHaveProperty('usage');
      expect(record).not.toHaveProperty('costUsd');
      expect(record).not.toHaveProperty('rawResponse');
      expect(record).not.toHaveProperty('sessionId');
    }
    expect(raw).not.toMatch(/sk-[A-Za-z0-9_-]{12,}/);
    expect(raw).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
  });
});
