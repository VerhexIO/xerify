import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_LIMITS } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { projectStatePaths } from './paths.js';

export interface InitializeProjectResult {
  root: string;
  configPath: string;
  logPath: string;
  created: readonly string[];
  existing: readonly string[];
}

async function writeNewFile(filePath: string, content: string): Promise<boolean> {
  try {
    const handle = await open(filePath, 'wx', 0o600);
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') return false;
    throw error;
  }
}

async function ensureIgnoreEntry(filePath: string): Promise<'created' | 'updated' | 'existing'> {
  const entry = '.xerify/';
  try {
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new XerifyError('CONFIG_INVALID', 'Ignore target must be a regular file', {
        details: { path: filePath }
      });
    }
    const current = await readFile(filePath, 'utf8');
    if (current.split(/\r?\n/).some((line) => line.trim() === entry)) return 'existing';
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
    const noFollow = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
    const handle = await open(filePath, constants.O_APPEND | constants.O_WRONLY | noFollow, 0o600);
    try {
      await handle.writeFile(`${separator}\n# Xerify local state\n${entry}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    return 'updated';
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    await writeNewFile(filePath, `# Xerify local state\n${entry}\n`);
    return 'created';
  }
}

export async function initializeProject(cwd: string): Promise<InitializeProjectResult> {
  const paths = projectStatePaths(path.resolve(cwd));
  const created: string[] = [];
  const existing: string[] = [];
  try {
    await mkdir(paths.root, { recursive: true, mode: 0o700 });
    await mkdir(paths.logs, { recursive: true, mode: 0o700 });
    await mkdir(paths.runs, { recursive: true, mode: 0o700 });
    await mkdir(paths.archive, { recursive: true, mode: 0o700 });

    const config = {
      $schema: 'https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json',
      providers: {},
      limits: DEFAULT_LIMITS,
      history: {
        enabled: true,
        directory: '.xerify/runs',
        archiveDirectory: '.xerify/archive',
        captureInput: 'full',
        captureOutput: 'normalized',
        sequencePadding: 6
      },
      logPath: '.xerify/logs/audit.jsonl'
    };
    if (await writeNewFile(paths.config, `${JSON.stringify(config, null, 2)}\n`)) {
      created.push(paths.config);
    } else {
      existing.push(paths.config);
    }

    const gitignore = ['.gitignore', 'xverify-config.json', 'logs/', '*.jsonl', '*.log', ''].join(
      '\n'
    );
    if (await writeNewFile(paths.gitignore, gitignore)) {
      created.push(paths.gitignore);
    } else {
      existing.push(paths.gitignore);
    }

    for (const name of ['.gitignore', '.npmignore', '.dockerignore']) {
      const ignorePath = path.join(path.resolve(cwd), name);
      const status = await ensureIgnoreEntry(ignorePath);
      (status === 'existing' ? existing : created).push(ignorePath);
    }
  } catch (error) {
    throw new XerifyError('CONFIG_INVALID', 'Unable to initialize the project state directory', {
      details: { root: paths.root },
      cause: error
    });
  }

  return {
    root: paths.root,
    configPath: paths.config,
    logPath: paths.auditLog,
    created,
    existing
  };
}
