import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_LIMITS, parseProviderReference } from '../../src/core/contracts.js';
import { RunHistoryStore } from '../../src/history/store.js';

const temporaryDirectories: string[] = [];

async function makeStore(
  captureInput: 'full' | 'metadata' | 'none' = 'full',
  captureOutput: 'normalized' | 'metadata' | 'none' = 'normalized'
) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'xerify-history-test-'));
  temporaryDirectories.push(root);
  return {
    root,
    store: new RunHistoryStore({
      enabled: true,
      directory: path.join(root, '.xerify', 'runs'),
      archiveDirectory: path.join(root, '.xerify', 'archive'),
      captureInput,
      captureOutput,
      sequencePadding: 6
    })
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

describe('deterministic local run history', () => {
  it('records content-addressed evidence and manages the run lifecycle', async () => {
    const { store } = await makeStore();
    const from = parseProviderReference('openai:gpt-test');
    const to = parseProviderReference('anthropic:claude-test');
    const session = await store.start({
      operation: 'verify',
      surface: 'cli',
      from,
      to,
      statementKind: 'claim',
      statement: 'The bounded change is correct.',
      context: 'const bounded = true;\n',
      contextLabel: 'src/example.ts',
      limits: DEFAULT_LIMITS
    });
    expect(session?.process.id).toBe('xrun_000001');
    await store.complete(
      session,
      {
        schemaVersion: 1,
        id: 'xrf_test',
        from,
        to,
        verdict: 'confirmed',
        summary: 'No material counterexample was found.',
        findings: [],
        usage: null,
        durationMs: 1,
        truncation: { input: false, output: false },
        failure: null
      },
      0
    );

    const shown = await store.show('1', { includeEvidence: true });
    expect(shown.process).toMatchObject({ status: 'completed', sequence: 1 });
    expect(shown.evidenceManifest.entries[0]).toMatchObject({
      evidenceId: 'E-001',
      locator: 'src/example.ts',
      contentSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/)
    });
    expect(shown.evidence).toEqual({ 'E-001': 'const bounded = true;\n' });
    expect(await readFile(path.join(session!.path, 'events.jsonl'), 'utf8')).toContain(
      '"event":"completed"'
    );

    await expect(store.archive('xrun_000001')).resolves.toMatchObject({ id: 'xrun_000001' });
    await expect(store.list()).resolves.toHaveLength(0);
    await expect(store.list('archive')).resolves.toHaveLength(1);
    await expect(store.restore('1')).resolves.toMatchObject({ id: 'xrun_000001' });
    await expect(store.delete('1')).resolves.toEqual({
      id: 'xrun_000001',
      deleted: true,
      recoverable: false
    });
    const next = await store.start({
      operation: 'ask',
      surface: 'cli',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Does the sequence remain monotonic?',
      context: '',
      limits: DEFAULT_LIMITS
    });
    expect(next?.process.id).toBe('xrun_000002');
  });

  it('keeps hashes but not values in metadata mode', async () => {
    const { store } = await makeStore('metadata');
    const session = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to: parseProviderReference('anthropic:claude-test'),
      statementKind: 'question',
      statement: 'Review this.',
      context: 'private context',
      limits: DEFAULT_LIMITS
    });
    const shown = await store.show('1', { includeEvidence: true });
    expect(shown.request).toMatchObject({
      statement: { capture: 'metadata', value: null },
      context: { capture: 'metadata', value: null, evidenceFile: null }
    });
    expect(shown.evidence).toEqual({});
    expect(session).not.toBeNull();
  });

  it.each(['metadata', 'none'] as const)(
    'enforces the %s output capture policy',
    async (captureOutput) => {
      const { store } = await makeStore('none', captureOutput);
      const to = parseProviderReference('anthropic:claude-test');
      const session = await store.start({
        operation: 'ask',
        surface: 'library',
        from: null,
        to,
        statementKind: 'question',
        statement: 'Review this.',
        context: 'private context',
        limits: DEFAULT_LIMITS
      });
      await store.complete(
        session,
        {
          schemaVersion: 1,
          id: 'xrf_output_policy',
          from: null,
          to,
          answer: 'provider-authored content must follow the capture policy',
          usage: null,
          durationMs: 2,
          truncation: { input: false, output: false }
        },
        0
      );
      const shown = await store.show('1');
      if (captureOutput === 'metadata') {
        expect(shown.result).toMatchObject({ id: 'xrf_output_policy', durationMs: 2 });
        expect(shown.result).not.toHaveProperty('answer');
      } else {
        expect(shown.result).toBeNull();
      }
      expect(shown.request).toMatchObject({
        statement: { capture: 'none', bytes: null, sha256: null, value: null },
        context: { capture: 'none', bytes: null, sha256: null, value: null }
      });
    }
  );

  it('rejects evidence whose bytes no longer match the manifest', async () => {
    const { store } = await makeStore();
    const session = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to: parseProviderReference('anthropic:claude-test'),
      statementKind: 'question',
      statement: 'Review this.',
      context: 'original evidence',
      limits: DEFAULT_LIMITS
    });
    const manifest = await store.show('1');
    const evidenceFile = manifest.evidenceManifest.entries[0]!.file!;
    await writeFile(path.join(session!.path, 'evidence', evidenceFile), 'tampered evidence');
    await expect(store.show('1', { includeEvidence: true })).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      message: expect.stringContaining('integrity')
    });
  });

  it('does not archive or delete a running record', async () => {
    const { store } = await makeStore();
    await store.start({
      operation: 'ask',
      surface: 'mcp',
      from: null,
      to: parseProviderReference('anthropic:claude-test'),
      statementKind: 'question',
      statement: 'Still running',
      context: '',
      limits: DEFAULT_LIMITS
    });
    await expect(store.archive('1')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.delete('1')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
