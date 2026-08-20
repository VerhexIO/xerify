import { execFileSync, execSync } from 'node:child_process';
import {
  accessSync,
  constants,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePackageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const scratchDirectory = mkdtempSync(join(tmpdir(), 'xerify external smoke ü-'));
const packDirectory = join(scratchDirectory, 'pack');
const installPrefix = join(scratchDirectory, 'installed prefix');
const externalProject = join(scratchDirectory, 'consumer project');
const autoInitProject = join(scratchDirectory, 'auto init consumer');
const isolatedUserConfig = join(scratchDirectory, 'no-user-config.json');
const smokeEnvironment = {
  ...process.env,
  XERIFY_USER_CONFIG_PATH: isolatedUserConfig,
  NO_UPDATE_NOTIFIER: '1'
};

function runNpm(args, options = {}) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return execFileSync(process.execPath, [npmExecPath, ...args], options);
  }
  return execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, options);
}

try {
  mkdirSync(packDirectory, { recursive: true });
  mkdirSync(externalProject, { recursive: true });
  mkdirSync(autoInitProject, { recursive: true });

  const packOutput = runNpm(['--silent', 'pack', '--json', '--pack-destination', packDirectory], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120_000,
    env: smokeEnvironment
  });
  const packJsonOffset = packOutput.lastIndexOf('\n[');
  const packResult = JSON.parse(
    packJsonOffset < 0 ? packOutput : packOutput.slice(packJsonOffset + 1)
  );
  const packedFilename = packResult[0]?.filename;
  if (typeof packedFilename !== 'string') throw new Error('npm pack did not return a filename');
  const packedPaths = (packResult[0]?.files ?? []).map((entry) => entry.path);
  for (const forbiddenPrefix of [
    '.agents/',
    '.codex/',
    '.cursor/',
    '.deckent/',
    '.github/',
    '.xerify/',
    'assets/',
    'artifacts/',
    'design/',
    'docs/',
    'src/',
    'tests/'
  ]) {
    if (packedPaths.some((packedPath) => packedPath.startsWith(forbiddenPrefix))) {
      throw new Error(`npm package contains forbidden development path: ${forbiddenPrefix}`);
    }
  }
  for (const forbiddenFile of ['AGENTS.md', 'XERIFY.md', 'CONTRIBUTING.md']) {
    if (packedPaths.includes(forbiddenFile)) {
      throw new Error(`npm package contains forbidden development file: ${forbiddenFile}`);
    }
  }
  // The documentation set is served from GitHub, not installed onto consumer machines. Only the
  // package's own README family ships, plus the tools a reader needs to run the documented flows.
  for (const requiredDocument of [
    'README.md',
    'README.de.md',
    'README.es.md',
    'README.fr.md',
    'README.tr.md',
    'README.zh-CN.md'
  ]) {
    if (!packedPaths.includes(requiredDocument)) {
      throw new Error(`npm package is missing consumer documentation: ${requiredDocument}`);
    }
  }
  if (!packedPaths.includes('tools/mock-provider.mjs')) {
    throw new Error('npm package is missing the deterministic mock provider tool');
  }
  if (!packedPaths.includes('scripts/postinstall.mjs')) {
    throw new Error('npm package is missing the guarded postinstall initializer');
  }
  const tarballPath = join(packDirectory, packedFilename);

  const npmExecVersion = runNpm(
    ['exec', '--yes', '--package', tarballPath, '--', 'xerify', '--version'],
    {
      cwd: externalProject,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: smokeEnvironment
    }
  );
  if (npmExecVersion.trim() !== sourcePackageJson.version) {
    throw new Error('npm exec did not resolve the xerify binary from the xverify-cli package');
  }

  runNpm(
    ['install', '--global', '--prefix', installPrefix, '--no-audit', '--no-fund', tarballPath],
    {
      cwd: externalProject,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: smokeEnvironment
    }
  );

  try {
    accessSync(join(externalProject, '.xerify'), constants.F_OK);
    throw new Error('Global install unexpectedly initialized project state');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }

  writeFileSync(
    join(autoInitProject, 'package.json'),
    `${JSON.stringify({ name: 'xerify-install-consumer', private: true }, null, 2)}\n`
  );
  const localInstallOutput = runNpm(
    ['install', '--save-dev', '--no-audit', '--no-fund', tarballPath],
    {
      cwd: autoInitProject,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: smokeEnvironment
    }
  );
  const autoConfigPath = join(autoInitProject, '.xerify', 'xverify-config.json');
  try {
    accessSync(autoConfigPath, constants.R_OK);
  } catch {
    throw new Error(`Direct local install did not initialize project state: ${localInstallOutput}`);
  }
  const autoConfig = JSON.parse(readFileSync(autoConfigPath, 'utf8'));
  if (autoConfig.logPath !== '.xerify/logs/audit.jsonl') {
    throw new Error('Direct local install did not initialize canonical project state');
  }
  if (
    !readFileSync(join(autoInitProject, '.xerify', '.gitignore'), 'utf8').includes(
      'xverify-config.json'
    )
  ) {
    throw new Error('Automatic init did not protect the token-capable config from Git');
  }
  for (const name of ['.gitignore', '.npmignore', '.dockerignore']) {
    if (!readFileSync(join(autoInitProject, name), 'utf8').includes('.xerify/')) {
      throw new Error(`Automatic init did not protect local state in ${name}`);
    }
  }

  const packageRoot =
    process.platform === 'win32'
      ? join(installPrefix, 'node_modules', sourcePackageJson.name)
      : join(installPrefix, 'lib', 'node_modules', sourcePackageJson.name);
  const installedEntry = join(packageRoot, 'dist', 'cli', 'entry.js');
  const installedBinary =
    process.platform === 'win32'
      ? join(installPrefix, 'xerify.cmd')
      : join(installPrefix, 'bin', 'xerify');
  accessSync(installedBinary, constants.X_OK);
  accessSync(installedEntry, constants.R_OK);

  const binaryDirectory = dirname(installedBinary);
  const binaryEnvironment = {
    ...smokeEnvironment,
    PATH: `${binaryDirectory}${delimiter}${process.env.PATH ?? ''}`
  };
  const resolvedBinary =
    process.platform === 'win32'
      ? execFileSync('where.exe', ['xerify'], {
          env: binaryEnvironment,
          encoding: 'utf8',
          windowsHide: true
        })
      : execFileSync('/bin/sh', ['-c', 'command -v xerify'], {
          env: binaryEnvironment,
          encoding: 'utf8'
        });
  if (!resolvedBinary.trim()) throw new Error('Installed xerify was not discoverable on PATH');

  function runInstalledBinary(args, options = {}) {
    const executionOptions = {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
      env: binaryEnvironment,
      ...options
    };
    if (process.platform !== 'win32') {
      return execFileSync(installedBinary, args, executionOptions);
    }
    const commandLine = [installedBinary, ...args]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(' ');
    return execSync(commandLine, executionOptions);
  }

  const help = runInstalledBinary(['--help'], { cwd: externalProject });
  if (!help.includes('verify') || !help.includes('mcp') || !help.includes('runs')) {
    throw new Error('Installed --help output is missing the public command surface');
  }
  const doctor = JSON.parse(runInstalledBinary(['--json', 'doctor'], { cwd: externalProject }));
  if (doctor.ok !== true || doctor.command !== 'doctor') {
    throw new Error('Installed doctor output did not match the stable JSON envelope');
  }
  const health = JSON.parse(runInstalledBinary(['--json', 'health'], { cwd: externalProject }));
  if (
    health.ok !== true ||
    health.command !== 'health' ||
    typeof health.data?.usable !== 'boolean'
  ) {
    throw new Error('Installed health output did not match the stable JSON envelope');
  }

  const initialized = JSON.parse(runInstalledBinary(['--json', 'init'], { cwd: externalProject }));
  const xerifyStateDirectory = join(externalProject, '.xerify');
  const initializedConfigPath = join(xerifyStateDirectory, 'xverify-config.json');
  const initializedConfig = JSON.parse(readFileSync(initializedConfigPath, 'utf8'));
  if (
    initialized.ok !== true ||
    initialized.command !== 'init' ||
    initializedConfig.logPath !== '.xerify/logs/audit.jsonl'
  ) {
    throw new Error('Installed init did not create canonical project state');
  }

  const fakeProviderPath = join(externalProject, 'provider fixture.mjs');
  writeFileSync(
    fakeProviderPath,
    "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('external fixture answer\\n'));\n"
  );
  writeFileSync(
    initializedConfigPath,
    `${JSON.stringify(
      {
        providers: {
          fixture: {
            kind: 'command',
            provider: 'fixture-lab',
            executable: process.execPath,
            args: [fakeProviderPath],
            authKind: 'local',
            structuredOutput: false
          }
        }
      },
      null,
      2
    )}\n`
  );
  const askResult = JSON.parse(
    runInstalledBinary(
      ['--json', 'ask', '--adapter', 'fixture', '--to', 'fixture-lab:echo', '--question', 'test'],
      { cwd: externalProject, input: 'external context\r\n' }
    )
  );
  if (askResult.data?.answer !== 'external fixture answer\n') {
    throw new Error('Installed binary did not complete the external fake-provider chain');
  }
  const runList = JSON.parse(
    runInstalledBinary(['--json', 'runs', 'list'], { cwd: externalProject })
  );
  if (runList.data?.runs?.length !== 1 || runList.data.runs[0]?.operation !== 'ask') {
    throw new Error('Installed binary did not persist the deterministic local run record');
  }
  if (runList.data.runs[0]?.head !== 'ask: test') {
    throw new Error('Installed binary did not persist the deterministic run head');
  }
  const archiveResult = JSON.parse(
    runInstalledBinary(['--json', 'runs', 'archive', '1'], { cwd: externalProject })
  );
  if (archiveResult.data?.id !== 'xrun_000001') {
    throw new Error('Installed binary did not archive the local run record');
  }
  const archiveSearch = JSON.parse(
    runInstalledBinary(['--json', 'runs', 'search', 'test'], { cwd: externalProject })
  );
  if (archiveSearch.data?.runs?.length !== 1 || archiveSearch.data.runs[0]?.id !== 'xrun_000001') {
    throw new Error('Installed binary did not search the compact archive index');
  }
  accessSync(join(externalProject, '.xerify', 'runs', 'HEAD.json'), constants.R_OK);
  accessSync(join(externalProject, '.xerify', 'archive', 'index.jsonl'), constants.R_OK);

  const inspectorResult = JSON.parse(
    execFileSync(
      process.execPath,
      [resolve(repositoryRoot, 'scripts', 'verify-mcp-inspector.mjs'), installedEntry],
      {
        cwd: externalProject,
        env: smokeEnvironment,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: 90_000,
        windowsHide: true
      }
    )
  );
  if (inspectorResult.ok !== true || inspectorResult.target !== 'external-install') {
    throw new Error('Inspector did not verify the externally installed MCP entry');
  }

  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      package: `${packageJson.name}@${packageJson.version}`,
      executableResolved: true,
      commands: [
        '--help',
        'npm exec package/binary split',
        'postinstall auto-init',
        '--json health',
        '--json doctor',
        '--json init',
        'ask fixture',
        'runs list',
        'runs archive/search',
        'mcp modern',
        'mcp legacy'
      ],
      cleanExternalDirectory: true
    })}\n`
  );
} finally {
  rmSync(scratchDirectory, { recursive: true, force: true });
}
