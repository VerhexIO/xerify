import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DEFAULT_LIMITS } from '../../src/core/contracts.js';
import { ClaudeAdapter } from '../../src/providers/claude.js';
import { CodexAdapter } from '../../src/providers/codex.js';
import { CursorAdapter } from '../../src/providers/cursor.js';

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
    // The fixture reports `cached_input_tokens: 3` alongside `input_tokens: 12`. Codex's cached
    // count is a subset of its input count, so the input is 12 and not 15. Measured against Codex
    // v0.148.0: a turn reporting input 17607 / cached 11008 / output 5 is summarised by Codex as
    // `tokens used 6,604` = 17607 - 11008 + 5. Summing here would double-count the cached prefix.
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

  // The two official CLIs report cached input with opposite meanings, and reading either one the
  // wrong way silently misreports every cached turn. Codex's `cached_input_tokens` is contained in
  // its `input_tokens`; Claude's cache counts sit outside `input_tokens` and are billed on top.
  it('adds Claude cache counts to the input total because they sit outside input_tokens', async () => {
    const adapter = new ClaudeAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'claude-json-cached'],
      env: {}
    });
    const result = await adapter.invoke(
      { operation: 'verify', model: 'test-model', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    expect(result.usage).toEqual({
      inputTokens: 28_766,
      outputTokens: 4,
      totalTokens: 28_770,
      costUsd: 0.13
    });
  });

  it('runs Claude with customizations and tools disabled in an isolated workspace', async () => {
    const adapter = new ClaudeAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'cursor-inspect'],
      env: {}
    });
    const prompt = 'untrusted project evidence';
    const result = await adapter.invoke(
      { operation: 'ask', model: 'test-model', prompt, limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    const inspected = JSON.parse(result.output) as {
      argv: string[];
      input: string;
      cwd: string;
    };
    expect(inspected.input).toBe(prompt);
    expect(inspected.argv).not.toContain(prompt);
    expect(inspected.argv).toEqual(
      expect.arrayContaining([
        '-p',
        '--safe-mode',
        '--disable-slash-commands',
        '--tools',
        '',
        '--permission-mode',
        'dontAsk'
      ])
    );
    expect(path.basename(inspected.cwd)).toMatch(/^xerify-claude-/);
  });

  it('parses Cursor Agent result output and camel-case usage', async () => {
    const adapter = new CursorAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'cursor-json'],
      env: {}
    });
    const result = await adapter.invoke(
      { operation: 'verify', model: 'gpt-test', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    expect(JSON.parse(result.output)).toMatchObject({ verdict: 'refuted' });
    expect(result.usage).toEqual({
      inputTokens: 16,
      outputTokens: 11,
      totalTokens: 27,
      costUsd: null
    });
  });

  it('runs Cursor in an isolated read-only workspace and keeps the prompt off argv', async () => {
    const adapter = new CursorAdapter({
      executable: process.execPath,
      prefixArgs: [fixture, 'cursor-inspect'],
      env: {}
    });
    const prompt = 'bounded prompt that must travel on stdin';
    const result = await adapter.invoke(
      { operation: 'ask', model: 'claude-test', prompt, limits: DEFAULT_LIMITS },
      new AbortController().signal
    );
    const inspected = JSON.parse(result.output) as {
      argv: string[];
      input: string;
      cwd: string;
    };
    expect(inspected.input).toBe(prompt);
    expect(inspected.argv).not.toContain(prompt);
    expect(inspected.argv).toEqual(
      expect.arrayContaining([
        '-p',
        '--trust',
        '--mode',
        'ask',
        '--sandbox',
        'enabled',
        '--model',
        'claude-test',
        '--output-format',
        'json'
      ])
    );
    expect(path.basename(inspected.cwd)).toMatch(/^xerify-cursor-/);
  });

  it('rejects Cursor auto before a model call', async () => {
    const adapter = new CursorAdapter({
      executable: 'must-not-run',
      env: { PATH: '' }
    });
    await expect(
      adapter.invoke(
        { operation: 'verify', model: 'auto', prompt: 'verify', limits: DEFAULT_LIMITS },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', exitCode: 2 });
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
    ],
    [
      'Cursor',
      new CursorAdapter({
        executable: process.execPath,
        prefixArgs: [fixture, 'malformed'],
        env: {}
      })
    ]
  ] as const)('maps malformed %s output to a provider response failure', async (name, adapter) => {
    await expect(
      adapter.invoke(
        {
          operation: 'verify',
          model: name === 'Cursor' ? 'gpt-test' : 'test-model',
          prompt: 'verify',
          limits: DEFAULT_LIMITS
        },
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
    const cursor = new CursorAdapter({
      id: 'cursor-custom',
      executable: process.execPath,
      prefixArgs: [fixture, 'cursor-json'],
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
    await expect(cursor.probe({ network: false, timeoutMs: 1_000 })).resolves.toMatchObject({
      adapterId: 'cursor-custom',
      provider: 'cursor',
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
    const cursor = new CursorAdapter({
      executable: 'definitely-missing-cursor',
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
    await expect(cursor.probe({ network: false, timeoutMs: 100 })).resolves.toMatchObject({
      available: false,
      executable: null
    });
  });
});
