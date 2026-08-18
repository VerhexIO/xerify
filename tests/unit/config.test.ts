import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { userConfigPath } from '../../src/config/paths.js';
import { resolveConfig } from '../../src/config/resolve.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-config-test-'));
  temporaryDirectories.push(directory);
  return directory;
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
        env: { XERIFY_USER_CONFIG_PATH: '/isolated/config.json' },
        homeDirectory: '/Users/test'
      })
    ).toBe('/isolated/config.json');
  });

  it('uses XDG on Linux', () => {
    expect(
      userConfigPath({
        platform: 'linux',
        env: { XDG_CONFIG_HOME: '/config' },
        homeDirectory: '/home/test'
      })
    ).toBe(path.join('/config', 'xerify', 'config.json'));
  });

  it('uses platform-native macOS and Windows paths', () => {
    expect(userConfigPath({ platform: 'darwin', homeDirectory: '/Users/test', env: {} })).toBe(
      path.join('/Users/test', 'Library', 'Application Support', 'Xerify', 'config.json')
    );
    expect(
      userConfigPath({
        platform: 'win32',
        homeDirectory: 'C:\\Users\\test',
        env: { APPDATA: 'C:\\Users\\test\\AppData\\Roaming' }
      })
    ).toContain(path.join('Xerify', 'config.json'));
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
      path.join(configHome, 'xerify', 'config.json'),
      JSON.stringify({ limits: { timeoutMs: 10_000, maxInputBytes: 2_000 } })
    );
    await writeFile(
      path.join(project, 'xerify.config.json'),
      JSON.stringify({ limits: { timeoutMs: 20_000, maxOutputBytes: 3_000 } })
    );

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
    await writeFile(
      path.join(root, 'xerify.config.json'),
      JSON.stringify({
        providers: {
          unsafe: {
            kind: 'command',
            provider: 'openai',
            executable: 'provider',
            apiKey: 'must-not-be-here'
          }
        }
      })
    );
    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });

  it('rejects unused defaultModel configuration instead of implying silent model choice', async () => {
    const root = await temporaryDirectory();
    await writeFile(
      path.join(root, 'xerify.config.json'),
      JSON.stringify({ providers: { claude: { kind: 'claude', defaultModel: 'guessed-model' } } })
    );

    await expect(
      resolveConfig({ cwd: root, platform: 'linux', homeDirectory: root, env: {} })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });
});
