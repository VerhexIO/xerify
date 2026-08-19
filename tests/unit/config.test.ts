import { chmod, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { userConfigPath } from '../../src/config/paths.js';
import { resolveConfig } from '../../src/config/resolve.js';

const temporaryDirectories: string[] = [];
const itOnPosix = process.platform === 'win32' ? it.skip : it;

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-config-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeProjectConfig(directory: string, value: unknown): Promise<void> {
  const stateDirectory = path.join(directory, '.xerify');
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(path.join(stateDirectory, 'xverify-config.json'), JSON.stringify(value));
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      const { rm } = await import('node:fs/promises');
      await rm(directory, { recursive: true, force: true });
    })
  );
});

describe('platform config paths', () => {
  it('allows a dedicated user-config path for hermetic automation', () => {
    expect(
      userConfigPath({
        platform: 'darwin',
        env: { XERIFY_USER_CONFIG_PATH: '/isolated/xverify-config.json' },
        homeDirectory: '/Users/test'
      })
    ).toBe('/isolated/xverify-config.json');
  });

  it('uses XDG on Linux', () => {
    expect(
      userConfigPath({
        platform: 'linux',
        env: { XDG_CONFIG_HOME: '/config' },
        homeDirectory: '/home/test'
      })
    ).toBe(path.join('/config', 'xerify', 'xverify-config.json'));
  });

  it('uses platform-native macOS and Windows paths', () => {
    expect(userConfigPath({ platform: 'darwin', homeDirectory: '/Users/test', env: {} })).toBe(
      path.join('/Users/test', 'Library', 'Application Support', 'Xerify', 'xverify-config.json')
    );
    expect(
      userConfigPath({
        platform: 'win32',
        homeDirectory: 'C:\\Users\\test',
        env: { APPDATA: 'C:\\Users\\test\\AppData\\Roaming' }
      })
    ).toContain(path.join('Xerify', 'xverify-config.json'));
  });
});

describe('config precedence', () => {
  it('resolves default < user < project < env < flag and records sources', async () => {
    const root = await temporaryDirectory();
    const project = path.join(root, 'project');
    const configHome = path.join(root, 'config');
    await mkdir(project, { recursive: true });
    await mkdir(path.join(configHome, 'xerify'), { recursive: true });
    await writeFile(
      path.join(configHome, 'xerify', 'xverify-config.json'),
      JSON.stringify({ limits: { timeoutMs: 10_000, maxInputBytes: 2_000 } })
    );
    await writeProjectConfig(project, {
      limits: { timeoutMs: 20_000, maxOutputBytes: 3_000 }
    });

    const resolved = await resolveConfig({
      cwd: project,
      platform: 'linux',
      homeDirectory: root,
      env: { XDG_CONFIG_HOME: configHome, XERIFY_TIMEOUT_MS: '30000' },
      overrides: { limits: { timeoutMs: 40_000 } }
    });

    expect(resolved.config.limits).toEqual({
      timeoutMs: 40_000,
      maxInputBytes: 2_000,
      maxOutputBytes: 3_000
    });
    expect(resolved.sources).toMatchObject({
      'limits.timeoutMs': 'flag',
      'limits.maxInputBytes': 'user',
      'limits.maxOutputBytes': 'project'
    });
  });

  it('rejects credential-shaped fields instead of persisting secrets', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: {
        unsafe: {
          kind: 'command',
          provider: 'openai',
          executable: 'provider',
          apiKey: 'must-not-be-here'
        }
      }
    });
    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });

  it('accepts an explicitly configured literal key only for direct API adapters', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: {
        direct: {
          kind: 'openai-api',
          apiKeyEnvironment: 'OPENAI_API_KEY',
          apiKey: 'local-config-key'
        }
      }
    });
    await chmod(path.join(root, '.xerify', 'xverify-config.json'), 0o600);
    const resolved = await resolveConfig({
      cwd: root,
      platform: 'linux',
      homeDirectory: root,
      env: {}
    });
    expect(resolved.config.providers.direct).toMatchObject({
      kind: 'openai-api',
      apiKey: 'local-config-key'
    });
  });

  itOnPosix('rejects a literal API key in a group/world-readable POSIX config', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: { direct: { kind: 'anthropic-api', apiKey: 'local-config-key' } }
    });
    await chmod(path.join(root, '.xerify', 'xverify-config.json'), 0o644);

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      message: expect.stringContaining('chmod 600')
    });
  });

  itOnPosix('rejects an explicit endpoint in a group/world-readable POSIX config', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: {
        gateway: {
          kind: 'openai-compatible',
          provider: 'vendor',
          endpoint: 'https://api.example.test/v1/chat/completions?api-key=inline-secret'
        }
      }
    });
    await chmod(path.join(root, '.xerify', 'xverify-config.json'), 0o644);

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({
      code: 'CONFIG_INVALID',
      message: expect.stringContaining('explicit endpoint'),
      details: { requiredMode: '0600' }
    });
  });

  itOnPosix('does not require private mode for an adapter default endpoint alone', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: { direct: { kind: 'openai-api', apiKeyEnvironment: 'OPENAI_API_KEY' } }
    });
    await chmod(path.join(root, '.xerify', 'xverify-config.json'), 0o644);

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).resolves.toMatchObject({
      config: { providers: { direct: { endpoint: 'https://api.openai.com/v1/responses' } } }
    });
  });

  it('does not interpret Windows mode bits as POSIX secret permissions', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: { direct: { kind: 'openai-api', apiKey: 'local-config-key' } }
    });
    await chmod(path.join(root, '.xerify', 'xverify-config.json'), 0o644);

    await expect(
      resolveConfig({ cwd: root, platform: 'win32', homeDirectory: root, env: { APPDATA: root } })
    ).resolves.toMatchObject({
      config: { providers: { direct: { kind: 'openai-api', apiKey: 'local-config-key' } } }
    });
  });

  it('rejects unused defaultModel configuration instead of implying silent model choice', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, {
      providers: { claude: { kind: 'claude', defaultModel: 'guessed-model' } }
    });

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });

  it('assigns Cursor as provider identity and rejects legacy upstream identity', async () => {
    const root = await temporaryDirectory();
    await writeProjectConfig(root, { providers: { cursor: { kind: 'cursor' } } });

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).resolves.toMatchObject({
      config: { providers: { cursor: { kind: 'cursor', provider: 'cursor' } } }
    });

    await writeProjectConfig(root, {
      providers: { cursor: { kind: 'cursor', provider: 'openai' } }
    });

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });

  it('discovers project state from a nested working directory and anchors relative logs', async () => {
    const root = await temporaryDirectory();
    const nested = path.join(root, 'packages', 'app');
    await mkdir(nested, { recursive: true });
    await writeProjectConfig(root, { logPath: '.xerify/logs/audit.jsonl' });

    const resolved = await resolveConfig({
      cwd: nested,
      platform: 'linux',
      homeDirectory: root,
      env: { XERIFY_USER_CONFIG_PATH: path.join(root, 'absent-user-config.json') }
    });
    expect(resolved.paths.project).toBe(path.join(root, '.xerify', 'xverify-config.json'));
    expect(resolved.config.logPath).toBe(path.join(root, '.xerify', 'logs', 'audit.jsonl'));
  });
});
