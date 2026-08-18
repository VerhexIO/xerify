import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_LIMITS, parseProviderReference } from '../../src/core/contracts.js';
import { executeAsk, executeVerify } from '../../src/core/execute.js';
import { verificationExitCode } from '../../src/core/verdict.js';
import { CommandAdapter } from '../../src/providers/command.js';
import { ProviderRegistry } from '../../src/providers/registry.js';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-provider.mjs'
);
const from = parseProviderReference('openai:author');
const to = parseProviderReference('fixture:verifier');

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-execute-test-'));
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

function registry(
  scenario: string,
  options: { fixturePath?: string; extraArgs?: readonly string[] } = {}
): ProviderRegistry {
  return new ProviderRegistry([
    new CommandAdapter({
      id: `fixture-${scenario}`,
      provider: 'fixture',
      executable: process.execPath,
      args: [options.fixturePath ?? fixture, scenario, ...(options.extraArgs ?? [])],
      authKind: 'local',
      structuredOutput: true
    })
  ]);
}

describe('canonical execution chain', () => {
  it('asks through the same provider SPI', async () => {
    const result = await executeAsk(
      { to, question: 'What changed?', context: 'A small diff.', limits: DEFAULT_LIMITS },
      registry('echo')
    );
    expect(result.answer).toContain('What changed?');
    expect(result.truncation).toEqual({ input: false, output: false });
  });

  it('returns a strict confirmed result', async () => {
    const result = await executeVerify(
      { from, to, claim: 'The change is safe', context: 'Evidence', limits: DEFAULT_LIMITS },
      registry('confirmed')
    );
    expect(result.verdict).toBe('confirmed');
    expect(result.failure).toBeNull();
    expect(verificationExitCode(result)).toBe(0);
  });

  it('fails closed when the verification prompt is truncated', async () => {
    const result = await executeVerify(
      {
        from,
        to,
        claim: 'The change is safe',
        context: 'Evidence',
        limits: { ...DEFAULT_LIMITS, maxInputBytes: 32 }
      },
      registry('confirmed')
    );

    expect(result).toMatchObject({
      verdict: 'unclear',
      truncation: { input: true, output: false },
      failure: {
        code: 'INVALID_PROVIDER_RESPONSE',
        message: 'Verification input or output was truncated'
      }
    });
    expect(verificationExitCode(result)).toBe(6);
  });

  it('preserves refuted as a domain outcome', async () => {
    const result = await executeVerify(
      { from, to, claim: 'The change is safe', context: 'Evidence', limits: DEFAULT_LIMITS },
      registry('refuted')
    );
    expect(result.verdict).toBe('refuted');
    expect(verificationExitCode(result)).toBe(10);
  });

  it.each(['malformed', 'prose'])('normalizes %s output to typed unclear', async (scenario) => {
    const result = await executeVerify(
      { from, to, claim: 'The change is safe', context: '', limits: DEFAULT_LIMITS },
      registry(scenario)
    );
    expect(result.verdict).toBe('unclear');
    expect(result.failure?.code).toBe('INVALID_PROVIDER_RESPONSE');
    expect(verificationExitCode(result)).toBe(6);
  });

  it('normalizes nonzero provider exit without exposing stderr', async () => {
    const result = await executeVerify(
      { from, to, claim: 'The change is safe', context: '', limits: DEFAULT_LIMITS },
      registry('stderr')
    );
    expect(result.failure).toEqual({
      code: 'PROVIDER_FAILURE',
      message: 'Provider process exited unsuccessfully',
      retryable: true
    });
    expect(JSON.stringify(result)).not.toContain('fixture failed');
  });

  it('terminates a timed-out provider and returns exit reason 4', async () => {
    const result = await executeVerify(
      {
        from,
        to,
        claim: 'The change is safe',
        context: '',
        limits: { ...DEFAULT_LIMITS, timeoutMs: 30 }
      },
      registry('delay')
    );
    expect(result.failure?.code).toBe('TIMEOUT');
    expect(verificationExitCode(result)).toBe(4);
  });

  it('cancels an in-flight provider and returns a typed cancellation', async () => {
    const controller = new AbortController();
    const pending = executeVerify(
      {
        from,
        to,
        claim: 'The change is safe',
        context: '',
        limits: DEFAULT_LIMITS
      },
      registry('delay'),
      { signal: controller.signal }
    );
    setTimeout(() => controller.abort(), 20).unref();
    const result = await pending;
    expect(result.failure?.code).toBe('CANCELLED');
    expect(verificationExitCode(result)).toBe(4);
  });

  it.runIf(process.platform !== 'win32')(
    'signals provider descendants through the POSIX process group',
    async () => {
      const directory = await temporaryDirectory();
      const marker = path.join(directory, 'descendant-terminated');
      const result = await executeVerify(
        {
          from,
          to,
          claim: 'The change is safe',
          context: '',
          limits: { ...DEFAULT_LIMITS, timeoutMs: 250 }
        },
        registry('descendant', { extraArgs: [marker] })
      );
      expect(result.failure?.code).toBe('TIMEOUT');
      await expect(readFile(marker, 'utf8')).resolves.toBe('terminated');
    }
  );

  it('preserves argument boundaries for paths with spaces, Unicode, and CRLF input', async () => {
    const directory = await temporaryDirectory();
    const fixtureDirectory = path.join(directory, 'provider space ü');
    const copiedFixture = path.join(fixtureDirectory, 'fake provider.mjs');
    await mkdir(fixtureDirectory, { recursive: true });
    await copyFile(fixture, copiedFixture);
    const result = await executeAsk(
      {
        to,
        question: 'Türkçe soru?',
        context: 'satır 1\r\nsatır 2',
        limits: DEFAULT_LIMITS
      },
      registry('echo', { fixturePath: copiedFixture })
    );
    expect(result.answer).toContain('Türkçe soru?');
    expect(result.answer).toContain(JSON.stringify({ context: 'satır 1\r\nsatır 2' }));
  });

  it('accepts a valid structured response framed with CRLF', async () => {
    const result = await executeVerify(
      { from, to, claim: 'The change is safe', context: '', limits: DEFAULT_LIMITS },
      registry('confirmed-crlf')
    );
    expect(result.verdict).toBe('confirmed');
  });

  it('bounds provider output and reports truncation', async () => {
    const result = await executeAsk(
      {
        to,
        question: 'large output',
        context: '',
        limits: { ...DEFAULT_LIMITS, maxOutputBytes: 100 }
      },
      registry('huge')
    );
    expect(Buffer.byteLength(result.answer)).toBe(100);
    expect(result.truncation.output).toBe(true);
  });
});
