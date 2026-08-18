import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DEFAULT_LIMITS } from '../../src/core/contracts.js';
import { ClaudeAdapter } from '../../src/providers/claude.js';
import { CodexAdapter } from '../../src/providers/codex.js';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-provider.mjs'
);

describe('official subscription CLI adapters', () => {
  it('parses Codex JSONL final output and reported usage', async () => {
    const adapter = new CodexAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'codex-jsonl'],
      env: {}
    });
    const result = await adapter.invoke(
      { operation: 'verify', model: 'test-model', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    expect(JSON.parse(result.output)).toMatchObject({ verdict: 'confirmed' });
    expect(result.usage).toEqual({
      inputTokens: 12,
      outputTokens: 8,
      totalTokens: 20,
      costUsd: null
    });
  });

  it('parses Claude single-result structured output and cost', async () => {
    const adapter = new ClaudeAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'claude-json'],
      env: {}
    });
    const result = await adapter.invoke(
      { operation: 'verify', model: 'test-model', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    expect(JSON.parse(result.output)).toMatchObject({ verdict: 'refuted' });
    expect(result.usage).toEqual({
      inputTokens: 14,
      outputTokens: 9,
      totalTokens: 23,
      costUsd: 0.01
    });
  });

  it.each([
    [
      'Codex',
      new CodexAdapter({
        executable: process.execPath,
        prefixArgs: [fixture, 'malformed'],
        env: {}
      })
    ],
    [
      'Claude',
      new ClaudeAdapter({
        executable: process.execPath,
        prefixArgs: [fixture, 'malformed'],
        env: {}
      })
    ]
  ] as const)('maps malformed %s output to a provider response failure', async (_name, adapter) => {
    await expect(
      adapter.invoke(
        { operation: 'verify', model: 'test-model', prompt: 'verify', limits: DEFAULT_LIMITS },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', exitCode: 6 });
  });

  it('probes official CLI auth without a model call and preserves configured IDs', async () => {
    const codex = new CodexAdapter({
      id: 'codex-custom',
      executable: process.execPath,
      prefixArgs: [fixture, 'codex-jsonl'],
      env: {}
    });
    const claude = new ClaudeAdapter({
      id: 'claude-custom',
      executable: process.execPath,
      prefixArgs: [fixture, 'claude-json'],
      env: {}
    });

    await expect(codex.probe({ network: false, timeoutMs: 1_000 })).resolves.toMatchObject({
      adapterId: 'codex-custom',
      available: true,
      auth: { kind: 'subscription', status: 'managed' }
    });
    await expect(claude.probe({ network: false, timeoutMs: 1_000 })).resolves.toMatchObject({
      adapterId: 'claude-custom',
      available: true,
      auth: { kind: 'subscription', status: 'managed' }
    });
  });

  it('reports missing official executables without spawning a process', async () => {
    const codex = new CodexAdapter({ executable: 'definitely-missing-codex', env: { PATH: '' } });
    const claude = new ClaudeAdapter({
      executable: 'definitely-missing-claude',
      env: { PATH: '' }
    });
    await expect(codex.probe({ network: false, timeoutMs: 100 })).resolves.toMatchObject({
      available: false,
      executable: null
    });
    await expect(claude.probe({ network: false, timeoutMs: 100 })).resolves.toMatchObject({
      available: false,
      executable: null
    });
  });
});
