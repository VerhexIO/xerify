import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// @ts-expect-error The lifecycle entry is intentionally plain ESM so it can run before a build.
import { autoInitializeProject } from '../../scripts/postinstall.mjs';

const temporaryDirectories: string[] = [];

async function temporaryProject(manifest: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xerify-postinstall-test-'));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, 'package.json'), JSON.stringify(manifest));
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('npm postinstall project initialization', () => {
  it('initializes only a direct local dependency and never overwrites config', async () => {
    const directory = await temporaryProject({
      name: 'consumer',
      devDependencies: { xerify: '^0.1.0' }
    });
    const environment = { INIT_CWD: directory, npm_command: 'install' };

    await expect(autoInitializeProject(environment)).resolves.toMatchObject({
      initialized: true,
      reason: 'created'
    });
    const configPath = path.join(directory, '.xerify', 'xverify-config.json');
    const original = await readFile(configPath, 'utf8');
    expect(original).toContain('.xerify/logs/audit.jsonl');
    expect(await readFile(path.join(directory, '.xerify', '.gitignore'), 'utf8')).toContain(
      'xverify-config.json'
    );
    if (process.platform !== 'win32') {
      expect((await stat(configPath)).mode & 0o777).toBe(0o600);
    }

    await writeFile(configPath, '{"owner":"value"}\n');
    await expect(autoInitializeProject(environment)).resolves.toMatchObject({
      initialized: false,
      reason: 'existing'
    });
    expect(await readFile(configPath, 'utf8')).toBe('{"owner":"value"}\n');
  });

  it.each([
    {
      environment: { INIT_CWD: '/tmp/project', npm_config_global: 'true' },
      label: 'global install'
    },
    { environment: { INIT_CWD: '/tmp/project', npm_command: 'exec' }, label: 'npx/npm exec' },
    {
      environment: { INIT_CWD: '/tmp/project', XERIFY_SKIP_AUTO_INIT: '1' },
      label: 'explicit opt-out'
    }
  ])('skips $label', async ({ environment }) => {
    await expect(autoInitializeProject(environment)).resolves.toMatchObject({
      initialized: false,
      reason: 'skipped'
    });
  });

  it('does not initialize when Xerify is only transitive', async () => {
    const directory = await temporaryProject({
      name: 'consumer',
      dependencies: { parent: '1.0.0' }
    });
    await expect(
      autoInitializeProject({ INIT_CWD: directory, npm_command: 'install' })
    ).resolves.toMatchObject({ initialized: false, reason: 'not-direct-dependency' });
  });

  it('uses the npm root lock entry while package.json save is still pending', async () => {
    const directory = await temporaryProject({ name: 'consumer', private: true });
    await writeFile(
      path.join(directory, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: { '': { name: 'consumer', devDependencies: { xerify: 'file:package.tgz' } } }
      })
    );

    await expect(
      autoInitializeProject({ INIT_CWD: directory, npm_command: 'install' })
    ).resolves.toMatchObject({ initialized: true, reason: 'created' });
  });
});
