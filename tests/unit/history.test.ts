import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

  it('allocates monotonically while active and archived records exist', async () => {
    const { store } = await makeStore();
    const to = parseProviderReference('anthropic:claude-test');
    const active = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Keep this record active.',
      context: '',
      limits: DEFAULT_LIMITS
    });
    const archived = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Archive this record.',
      context: '',
      limits: DEFAULT_LIMITS
    });
    await store.complete(
      archived,
      {
        schemaVersion: 1,
        id: 'xrf_archived',
        from: null,
        to,
        answer: 'complete',
        usage: null,
        durationMs: 1,
        truncation: { input: false, output: false }
      },
      0
    );
    await store.archive('2');
    const next = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Allocate after both locations are occupied.',
      context: '',
      limits: DEFAULT_LIMITS
    });

    expect(active?.process.id).toBe('xrun_000001');
    expect(archived?.process.id).toBe('xrun_000002');
    expect(next?.process.id).toBe('xrun_000003');
    await expect(store.list()).resolves.toHaveLength(2);
    await expect(store.list('archive')).resolves.toHaveLength(1);
  });

  it('preserves a content-free reservation when an archived record is deleted', async () => {
    const { root, store } = await makeStore();
    const to = parseProviderReference('anthropic:claude-test');
    const session = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Archive and delete this record.',
      context: '',
      limits: DEFAULT_LIMITS
    });
    await store.complete(
      session,
      {
        schemaVersion: 1,
        id: 'xrf_deleted_archive',
        from: null,
        to,
        answer: 'complete',
        usage: null,
        durationMs: 1,
        truncation: { input: false, output: false }
      },
      0
    );
    await store.archive('1');
    await expect(store.delete('1', 'archive')).resolves.toMatchObject({
      id: 'xrun_000001',
      deleted: true
    });
    await expect(
      readdir(path.join(root, '.xerify', 'runs', '.sequences', '000001'))
    ).resolves.toEqual([]);

    const next = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Do not reuse the deleted sequence.',
      context: '',
      limits: DEFAULT_LIMITS
    });
    expect(next?.process.id).toBe('xrun_000002');
  });

  it('allocates unique content-free reservations for concurrent starts', async () => {
    const { root, store } = await makeStore();
    const to = parseProviderReference('anthropic:claude-test');
    const sessions = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        store.start({
          operation: 'ask',
          surface: 'library',
          from: null,
          to,
          statementKind: 'question',
          statement: `Concurrent request ${index + 1}`,
          context: '',
          limits: DEFAULT_LIMITS
        })
      )
    );
    const ids = sessions.map((session) => session?.process.id).sort();
    expect(ids).toEqual(
      Array.from({ length: 8 }, (_, index) => `xrun_${String(index + 1).padStart(6, '0')}`)
    );
    const reservations = await readdir(path.join(root, '.xerify', 'runs', '.sequences'));
    expect(reservations.sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => String(index + 1).padStart(6, '0'))
    );
    await expect(
      Promise.all(
        reservations.map((reservation) =>
          readdir(path.join(root, '.xerify', 'runs', '.sequences', reservation))
        )
      )
    ).resolves.toEqual(Array.from({ length: 8 }, () => []));
  });

  it('fails closed when a directory sequence exceeds safe integer precision', async () => {
    const { root, store } = await makeStore();
    await mkdir(path.join(root, '.xerify', 'runs', '.sequences', '9007199254740993'), {
      recursive: true
    });

    await expect(
      store.start({
        operation: 'ask',
        surface: 'library',
        from: null,
        to: parseProviderReference('anthropic:claude-test'),
        statementKind: 'question',
        statement: 'Do not allocate around an imprecise sequence.',
        context: '',
        limits: DEFAULT_LIMITS
      })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      message: 'Unable to initialize the Xerify run record',
      cause: expect.objectContaining({
        code: 'CONFIG_INVALID',
        message: 'Run history directory is outside the supported sequence range'
      })
    });
  });

  it('allocates the maximum safe sequence exactly and then fails closed', async () => {
    const { root, store } = await makeStore();
    await mkdir(path.join(root, '.xerify', 'runs', '.sequences', '9007199254740990'), {
      recursive: true
    });
    const to = parseProviderReference('anthropic:claude-test');
    const maximum = await store.start({
      operation: 'ask',
      surface: 'library',
      from: null,
      to,
      statementKind: 'question',
      statement: 'Allocate the maximum safe sequence.',
      context: '',
      limits: DEFAULT_LIMITS
    });
    expect(maximum?.process).toMatchObject({
      id: 'xrun_9007199254740991',
      sequence: Number.MAX_SAFE_INTEGER
    });

    await expect(
      store.start({
        operation: 'ask',
        surface: 'library',
        from: null,
        to,
        statementKind: 'question',
        statement: 'Fail instead of overflowing.',
        context: '',
        limits: DEFAULT_LIMITS
      })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      cause: expect.objectContaining({ message: 'Run history sequence space is exhausted' })
    });
  });

  it('fails closed when a sequence reservation contains external content', async () => {
    const { root, store } = await makeStore();
    await mkdir(path.join(root, '.xerify', 'runs', '.sequences', '000001'), {
      recursive: true
    });
    await writeFile(
      path.join(root, '.xerify', 'runs', '.sequences', '000001', 'unexpected.txt'),
      'external content'
    );

    await expect(
      store.start({
        operation: 'ask',
        surface: 'library',
        from: null,
        to: parseProviderReference('anthropic:claude-test'),
        statementKind: 'question',
        statement: 'Do not trust a modified reservation.',
        context: '',
        limits: DEFAULT_LIMITS
      })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      cause: expect.objectContaining({ message: 'Run sequence reservation must be empty' })
    });
  });

  it('fails closed when a numeric reservation entry is not a directory', async () => {
    const { root, store } = await makeStore();
    const reservationRoot = path.join(root, '.xerify', 'runs', '.sequences');
    await mkdir(reservationRoot, { recursive: true });
    await writeFile(path.join(reservationRoot, '000001'), 'not a reservation directory');

    await expect(
      store.start({
        operation: 'ask',
        surface: 'library',
        from: null,
        to: parseProviderReference('anthropic:claude-test'),
        statementKind: 'question',
        statement: 'Do not ignore a malformed reservation.',
        context: '',
        limits: DEFAULT_LIMITS
      })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      cause: expect.objectContaining({
        message: 'Numeric run history entry must be a real directory'
      })
    });
  });

  it.each([
    ['archive nested under history', 'runs', path.join('runs', 'archive')],
    ['history nested under archive', path.join('archive', 'runs'), 'archive']
  ])('rejects %s', async (_label, historyDirectory, archiveDirectory) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'xerify-history-layout-test-'));
    temporaryDirectories.push(root);

    expect(
      () =>
        new RunHistoryStore({
          enabled: true,
          directory: path.join(root, historyDirectory),
          archiveDirectory: path.join(root, archiveDirectory),
          captureInput: 'full',
          captureOutput: 'normalized',
          sequencePadding: 6
        })
    ).toThrowError('History and archive directories must be disjoint');
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
