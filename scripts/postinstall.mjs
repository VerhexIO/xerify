import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CONFIG_FILENAME = 'xverify-config.json';
const PACKAGE_NAME = 'xerify';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function enabledForDirectLocalInstall(environment) {
  if (environment.XERIFY_SKIP_AUTO_INIT === '1') return false;
  if (environment.npm_config_global === 'true') return false;
  if (environment.npm_command === 'exec') return false;
  return typeof environment.INIT_CWD === 'string' && environment.INIT_CWD.length > 0;
}

function manifestDeclaresDirectDependency(manifest) {
  return ['dependencies', 'devDependencies', 'optionalDependencies'].some(
    (field) => typeof manifest?.[field]?.[PACKAGE_NAME] === 'string'
  );
}

function isLikelyFirstDirectNpmInstall(directory, environment) {
  const explicitSave = [
    'npm_config_save_dev',
    'npm_config_save_prod',
    'npm_config_save_optional'
  ].some((key) => environment[key] === 'true');
  return explicitSave && packageRoot === path.resolve(directory, 'node_modules', PACKAGE_NAME);
}

async function isDirectDependency(directory, environment) {
  try {
    const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    if (manifest?.name === PACKAGE_NAME) return false;
    if (manifestDeclaresDirectDependency(manifest)) return true;
  } catch {
    // npm may not have saved package.json yet; check its planned root lock entry next.
  }
  try {
    const lock = JSON.parse(await readFile(path.join(directory, 'package-lock.json'), 'utf8'));
    if (manifestDeclaresDirectDependency(lock?.packages?.[''])) return true;
  } catch {
    // Fall through to npm's first-install metadata.
  }
  return isLikelyFirstDirectNpmInstall(directory, environment);
}

async function writeNewFile(filePath, content) {
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

async function ensureIgnoreEntry(filePath) {
  const entry = '.xerify/';
  try {
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`Ignore target is not a regular file: ${filePath}`);
    }
    const current = await readFile(filePath, 'utf8');
    if (current.split(/\r?\n/).some((line) => line.trim() === entry)) return false;
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
    const noFollow = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
    const handle = await open(filePath, constants.O_APPEND | constants.O_WRONLY | noFollow, 0o600);
    try {
      await handle.writeFile(`${separator}\n# Xerify local state\n${entry}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    return true;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    return await writeNewFile(filePath, `# Xerify local state\n${entry}\n`);
  }
}

export async function autoInitializeProject(environment = process.env) {
  if (!enabledForDirectLocalInstall(environment)) return { initialized: false, reason: 'skipped' };
  const projectDirectory = path.resolve(environment.INIT_CWD);
  if (!(await isDirectDependency(projectDirectory, environment))) {
    return { initialized: false, reason: 'not-direct-dependency' };
  }

  const stateDirectory = path.join(projectDirectory, '.xerify');
  const logsDirectory = path.join(stateDirectory, 'logs');
  await mkdir(logsDirectory, { recursive: true, mode: 0o700 });
  await mkdir(path.join(stateDirectory, 'runs'), { recursive: true, mode: 0o700 });
  await mkdir(path.join(stateDirectory, 'archive'), { recursive: true, mode: 0o700 });

  const config = {
    $schema: 'https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json',
    providers: {},
    limits: {
      timeoutMs: 120000,
      maxInputBytes: 1048576,
      maxOutputBytes: 1048576
    },
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
  const configPath = path.join(stateDirectory, CONFIG_FILENAME);
  const gitignorePath = path.join(stateDirectory, '.gitignore');
  const configCreated = await writeNewFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const gitignoreCreated = await writeNewFile(
    gitignorePath,
    ['.gitignore', 'xverify-config.json', 'logs/', '*.jsonl', '*.log', ''].join('\n')
  );
  const ignoreProtectionChanged = (
    await Promise.all(
      ['.gitignore', '.npmignore', '.dockerignore'].map((name) =>
        ensureIgnoreEntry(path.join(projectDirectory, name))
      )
    )
  ).some(Boolean);
  return {
    initialized: configCreated || gitignoreCreated || ignoreProtectionChanged,
    reason: configCreated || gitignoreCreated || ignoreProtectionChanged ? 'created' : 'existing',
    stateDirectory
  };
}

if (process.env.npm_lifecycle_event === 'postinstall') {
  try {
    const result = await autoInitializeProject();
    if (result.initialized) {
      process.stderr.write('[xerify] Initialized project-local .xerify state.\n');
    }
  } catch {
    process.stderr.write(
      '[xerify] Automatic project initialization was skipped after a local filesystem error; run `xerify init` manually.\n'
    );
  }
}
