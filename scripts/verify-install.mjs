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
const scratchDirectory = mkdtempSync(join(tmpdir(), 'xerify external smoke ü-'));
const packDirectory = join(scratchDirectory, 'pack');
const installPrefix = join(scratchDirectory, 'installed prefix');
const externalProject = join(scratchDirectory, 'consumer project');
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

  const packOutput = runNpm(['pack', '--json', '--pack-destination', packDirectory], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120_000,
    env: smokeEnvironment
  });
  const packResult = JSON.parse(packOutput);
  const packedFilename = packResult[0]?.filename;
  if (typeof packedFilename !== 'string') throw new Error('npm pack did not return a filename');
  const tarballPath = join(packDirectory, packedFilename);

  runNpm(
    [
      'install',
      '--global',
      '--prefix',
      installPrefix,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      tarballPath
    ],
    {
      cwd: externalProject,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: smokeEnvironment
    }
  );

  const packageRoot =
    process.platform === 'win32'
      ? join(installPrefix, 'node_modules', 'xerify')
      : join(installPrefix, 'lib', 'node_modules', 'xerify');
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
  if (!help.includes('verify') || !help.includes('mcp')) {
    throw new Error('Installed --help output is missing the public command surface');
  }
  const doctor = JSON.parse(runInstalledBinary(['--json', 'doctor'], { cwd: externalProject }));
  if (doctor.ok !== true || doctor.command !== 'doctor') {
    throw new Error('Installed doctor output did not match the stable JSON envelope');
  }

  const fakeProviderPath = join(externalProject, 'provider fixture.mjs');
  writeFileSync(
    fakeProviderPath,
    "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('external fixture answer\\n'));\n"
  );
  writeFileSync(
    join(externalProject, 'xerify.config.json'),
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
      commands: ['--help', '--json doctor', 'ask fixture', 'mcp modern', 'mcp legacy'],
      cleanExternalDirectory: true
    })}\n`
  );
} finally {
  rmSync(scratchDirectory, { recursive: true, force: true });
}
