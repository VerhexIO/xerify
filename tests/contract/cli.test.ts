import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli, stdinFromString } from '../../src/cli/program.js';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-provider.mjs'
);
const temporaryDirectories: string[] = [];

interface CapturedRun {
  code: number;
  stdout: string;
  stderr: string;
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-cli-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function configureFixture(directory: string, scenario: string): Promise<void> {
  await writeFile(
    path.join(directory, 'xerify.config.json'),
    JSON.stringify({
      providers: {
        fixture: {
          kind: 'command',
          provider: 'fixture',
          executable: process.execPath,
          args: [fixture, scenario],
          authKind: 'local',
          structuredOutput: true
        }
      }
    })
  );
}

async function capture(
  argv: readonly string[],
  options: { cwd?: string; stdin?: string; stdinIsTTY?: boolean } = {}
): Promise<CapturedRun> {
  let stdout = '';
  let stderr = '';
  const code = await runCli(argv, {
    cwd: options.cwd ?? (await temporaryDirectory()),
    env: {},
    platform: 'linux',
    stdin: stdinFromString(options.stdin ?? ''),
    stdinIsTTY: options.stdinIsTTY ?? true,
    writer: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      }
    }
  });
  return { code, stdout, stderr };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('CLI contract', () => {
  it('shows every major command in top-level help', async () => {
    const result = await capture(['--help']);
    expect(result.code).toBe(0);
    for (const command of ['ask', 'verify', 'doctor', 'providers', 'config', 'mcp', 'request']) {
      expect(result.stdout).toContain(command);
    }
  });

  it('emits a single stable doctor envelope without configured auth', async () => {
    const result = await capture(['--json', 'doctor']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      schemaVersion: 1,
      command: 'doctor',
      data: {
        providers: [
          { adapterId: 'codex', provider: 'openai', available: false },
          { adapterId: 'claude', provider: 'anthropic', available: false }
        ],
        mcp: { sdkMajor: 2, stdioSafe: true }
      }
    });
  });

  it('fails same-provider verification before adapter invocation', async () => {
    const result = await capture([
      '--json',
      'verify',
      '--from',
      'openai:author',
      '--to',
      'openai:verifier',
      '--claim',
      'safe'
    ]);
    expect(result.code).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      command: 'verify',
      error: { code: 'SAME_PROVIDER', retryable: false }
    });
  });

  it('accepts global --json after the subcommand', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'confirmed');
    const result = await capture(
      [
        'verify',
        '--from',
        'openai:author',
        '--to',
        'fixture:verifier',
        '--claim',
        'safe',
        '--json'
      ],
      { cwd: directory }
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'verify',
      data: { verdict: 'confirmed', failure: null }
    });
  });

  it('returns refuted as a complete result with exit 10', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'refuted');
    const result = await capture(
      [
        '--json',
        'verify',
        '--from',
        'openai:author',
        '--to',
        'fixture:verifier',
        '--claim',
        'safe'
      ],
      { cwd: directory, stdin: 'diff', stdinIsTTY: false }
    );
    expect(result.code).toBe(10);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: { verdict: 'refuted', truncation: { input: false, output: false } }
    });
  });

  it('returns malformed verifier output as unclear with exit 6', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'malformed');
    const result = await capture(
      [
        '--json',
        'verify',
        '--from',
        'openai:author',
        '--to',
        'fixture:verifier',
        '--claim',
        'safe'
      ],
      { cwd: directory }
    );
    expect(result.code).toBe(6);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: {
        verdict: 'unclear',
        failure: { code: 'INVALID_PROVIDER_RESPONSE' }
      }
    });
  });

  it('writes one append-only secret-safe audit record when --log is explicit', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'refuted');
    const logPath = path.join(directory, 'audit.jsonl');
    const result = await capture(
      [
        '--json',
        '--log',
        logPath,
        'verify',
        '--from',
        'openai:author',
        '--to',
        'fixture:verifier',
        '--claim',
        'SECRET_CLAIM'
      ],
      { cwd: directory, stdin: 'SECRET_CONTEXT', stdinIsTTY: false }
    );

    expect(result.code).toBe(10);
    const raw = await readFile(logPath, 'utf8');
    expect(raw.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(raw)).toMatchObject({
      command: 'verify',
      outcome: 'success',
      exitCode: 10,
      result: { verdict: 'refuted', from: { provider: 'openai' } }
    });
    expect(raw).not.toContain('SECRET_CLAIM');
    expect(raw).not.toContain('SECRET_CONTEXT');
  });

  it('uses stdin as context and keeps human ask output undecorated', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'echo');
    const result = await capture(['ask', '--to', 'fixture:model', '--question', 'Review this'], {
      cwd: directory,
      stdin: 'context body',
      stdinIsTTY: false
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Question: Review this');
    expect(result.stdout).toContain('context body');
    expect(result.stderr).toBe('');
  });
});
