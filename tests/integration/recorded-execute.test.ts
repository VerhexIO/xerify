import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_LIMITS, parseProviderReference } from '../../src/core/contracts.js';
import { executeRecordedVerify } from '../../src/history/execute.js';
import { RunHistoryStore } from '../../src/history/store.js';
import { CommandAdapter } from '../../src/providers/command.js';
import { ProviderRegistry } from '../../src/providers/registry.js';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-provider.mjs'
);
const from = parseProviderReference('openai:author');
const to = parseProviderReference('fixture:verifier');

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

async function historyRoot(): Promise<{ store: RunHistoryStore; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'xerify-recorded-'));
  temporaryDirectories.push(root);
  return {
    root,
    store: new RunHistoryStore({
      enabled: true,
      directory: path.join(root, 'runs'),
      archiveDirectory: path.join(root, 'archive'),
      captureInput: 'full',
      captureOutput: 'normalized',
      sequencePadding: 6
    })
  };
}

function adapters(...ids: readonly string[]): ProviderRegistry {
  return new ProviderRegistry(
    ids.map(
      (id) =>
        new CommandAdapter({
          id,
          provider: 'fixture',
          executable: process.execPath,
          args: [fixture, 'confirmed'],
          authKind: 'local',
          structuredOutput: true
        })
    )
  );
}

async function recordedRequest(root: string): Promise<Record<string, unknown>> {
  const file = path.join(root, 'runs', '000001', 'request.json');
  return JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
}

describe('recorded execution', () => {
  // A bare `--to provider:model` is answered by the first adapter claiming that identity. A record
  // naming only the provider does not say which adapter ran, so an operator reading history cannot
  // reproduce the run when more than one adapter claims the identity.
  it('records which adapter answered, not just the provider', async () => {
    const { store, root } = await historyRoot();
    const result = await executeRecordedVerify(
      { from, to, claim: 'The change is safe', context: 'Evidence', limits: DEFAULT_LIMITS },
      adapters('primary', 'secondary'),
      { history: store }
    );

    expect(result.verdict).toBe('confirmed');
    const record = await recordedRequest(root);
    expect(record.adapterId).toBe('primary');
    expect(record.to).toMatchObject({ provider: 'fixture' });
  });

  it('records the explicitly requested adapter when one is named', async () => {
    const { store, root } = await historyRoot();
    await executeRecordedVerify(
      { from, to, claim: 'The change is safe', context: 'Evidence', limits: DEFAULT_LIMITS },
      adapters('primary', 'secondary'),
      { history: store, adapterId: 'secondary' }
    );

    expect((await recordedRequest(root)).adapterId).toBe('secondary');
  });
});
