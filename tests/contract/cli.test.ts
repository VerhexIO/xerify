import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const goldenDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/golden'
);

async function golden(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(goldenDirectory, name), 'utf8')) as unknown;
}

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
  const stateDirectory = path.join(directory, '.xerify');
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(
    path.join(stateDirectory, 'xverify-config.json'),
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
    for (const command of [
      'ask',
      'verify',
      'health',
      'doctor',
      'providers',
      'config',
      'init',
      'runs',
      'mcp',
      'request'
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it('initializes isolated project config and idempotent secret-safe logging', async () => {
    const directory = await temporaryDirectory();
    for (const name of ['.gitignore', '.npmignore', '.dockerignore']) {
      await writeFile(path.join(directory, name), `owner-rule-${name}\n`);
    }
    const first = await capture(['--json', 'init'], { cwd: directory });
    expect(first.code).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({
      ok: true,
      command: 'init',
      data: {
        root: path.join(directory, '.xerify'),
        configPath: path.join(directory, '.xerify', 'xverify-config.json'),
        logPath: path.join(directory, '.xerify', 'logs', 'audit.jsonl')
      }
    });
    const configPath = path.join(directory, '.xerify', 'xverify-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
    expect(config).toMatchObject({
      providers: {},
      history: {
        enabled: true,
        directory: '.xerify/runs',
        archiveDirectory: '.xerify/archive'
      },
      logPath: '.xerify/logs/audit.jsonl'
    });
    expect(JSON.stringify(config)).not.toMatch(/token|secret|apiKey/i);
    expect(await readFile(path.join(directory, '.xerify', '.gitignore'), 'utf8')).toContain(
      'xverify-config.json'
    );
    expect(await readFile(path.join(directory, '.xerify', '.gitignore'), 'utf8')).toContain(
      '.gitignore'
    );
    for (const name of ['.gitignore', '.npmignore', '.dockerignore']) {
      const ignore = await readFile(path.join(directory, name), 'utf8');
      expect(ignore).toContain(`owner-rule-${name}`);
      expect(ignore).toContain('.xerify/');
    }

    const second = await capture(['--json', 'init'], { cwd: directory });
    expect(JSON.parse(second.stdout)).toMatchObject({
      data: { created: [], existing: expect.arrayContaining([configPath]) }
    });

    const listed = await capture(['--json', 'providers', 'list'], { cwd: directory });
    expect(listed.code).toBe(0);
    const audit = await readFile(path.join(directory, '.xerify', 'logs', 'audit.jsonl'), 'utf8');
    expect(audit.trim().split('\n')).toHaveLength(1);
    expect(audit).not.toMatch(/prompt|context|answer|finding|secret|token/i);
  });

  it('reports usable health and linked invocation providers without a model call', async () => {
    const directory = await temporaryDirectory();
    await configureFixture(directory, 'echo');
    const result = await capture(['--json', 'health'], { cwd: directory });
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'health',
      data: {
        status: 'degraded',
        usable: true,
        project: { initialized: true },
        providers: {
          identityBasis: 'invocation-provider',
          configured: 3,
          linked: 1,
          identities: ['fixture'],
          adapters: expect.arrayContaining([
            expect.objectContaining({
              adapterId: 'fixture',
              provider: 'fixture',
              available: true
            })
          ])
        },
        networkProbed: false
      }
    });
  });

  it('reports remote compatible endpoint authentication as unknown without an explicit key', async () => {
    const directory = await temporaryDirectory();
    const stateDirectory = path.join(directory, '.xerify');
    await mkdir(stateDirectory, { recursive: true });
    await writeFile(
      path.join(stateDirectory, 'xverify-config.json'),
      JSON.stringify({
        providers: {
          gateway: {
            kind: 'openai-compatible',
            provider: 'vendor',
            endpoint: 'https://api.example.test/v1/chat/completions?api-key=inline-secret'
          }
        }
      })
    );
    await chmod(path.join(stateDirectory, 'xverify-config.json'), 0o600);

    const result = await capture(['--json', 'providers', 'probe', '--provider', 'gateway'], {
      cwd: directory
    });
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('inline-secret');
    expect(JSON.parse(result.stdout)).toMatchObject({
      data: [
        {
          adapterId: 'gateway',
          provider: 'vendor',
          available: true,
          auth: { kind: 'unknown', status: 'unknown', source: 'config' },
          detail: expect.stringContaining('requirements are unknown')
        }
      ]
    });
  });

  it('redacts literal API keys from config output', async () => {
    const directory = await temporaryDirectory();
    const stateDirectory = path.join(directory, '.xerify');
    await mkdir(stateDirectory, { recursive: true });
    await writeFile(
      path.join(stateDirectory, 'xverify-config.json'),
      JSON.stringify({
        providers: {
          direct: { kind: 'openai-api', apiKey: 'literal-never-print-this' }
        }
      })
    );
    await chmod(path.join(stateDirectory, 'xverify-config.json'), 0o600);

    const result = await capture(['--json', 'config', 'show'], { cwd: directory });
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('literal-never-print-this');
    expect(JSON.parse(result.stdout)).toMatchObject({
      data: {
        secretsRedacted: true,
        config: { providers: { direct: { apiKey: '[REDACTED]' } } }
      }
    });
  });

  it.each(['show', 'validate'] as const)(
    'redacts the complete endpoint URL from config %s output',
    async (subcommand) => {
      const directory = await temporaryDirectory();
      const stateDirectory = path.join(directory, '.xerify');
      await mkdir(stateDirectory, { recursive: true });
      await writeFile(
        path.join(stateDirectory, 'xverify-config.json'),
        JSON.stringify({
          providers: {
            gateway: {
              kind: 'openai-compatible',
              provider: 'vendor',
              endpoint:
                'https://visible-user:userinfo-secret@api.example.test/private/path-secret?api-key=query-secret#fragment-secret'
            }
          }
        })
      );
      await chmod(path.join(stateDirectory, 'xverify-config.json'), 0o600);

      const result = await capture(['--json', 'config', subcommand], { cwd: directory });
      expect(result.code).toBe(0);
      for (const secret of [
        'visible-user',
        'userinfo-secret',
        'private/path-secret',
        'query-secret',
        'fragment-secret',
        'api.example.test'
      ]) {
        expect(result.stdout).not.toContain(secret);
      }
      expect(JSON.parse(result.stdout)).toMatchObject({
        data: {
          secretsRedacted: true,
          config: { providers: { gateway: { endpoint: '[REDACTED]' } } }
        }
      });
    }
  );

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
    expect(JSON.parse(result.stdout)).toEqual(await golden('verify-same-provider-error.json'));
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
    const actual = JSON.parse(result.stdout) as { data: { id: string; durationMs: number } };
    actual.data.id = 'xrf_normalized';
    actual.data.durationMs = 0;
    expect(actual).toEqual(await golden('verify-confirmed.json'));
    const runs = await capture(['--json', 'runs', 'list'], { cwd: directory });
    expect(JSON.parse(runs.stdout)).toMatchObject({
      ok: true,
      command: 'runs.list',
      data: {
        location: 'active',
        runs: [
          {
            id: 'xrun_000001',
            operation: 'verify',
            head: 'verify: safe',
            status: 'completed',
            outcome: { exitCode: 0, verdict: 'confirmed' }
          }
        ]
      }
    });
    expect((await capture(['--json', 'runs', 'archive', '1'], { cwd: directory })).code).toBe(0);
    const searched = await capture(['--json', 'runs', 'search', 'safe'], { cwd: directory });
    expect(JSON.parse(searched.stdout)).toMatchObject({
      ok: true,
      command: 'runs.search',
      data: {
        location: 'archive',
        query: 'safe',
        runs: [{ id: 'xrun_000001', head: 'verify: safe' }]
      }
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
