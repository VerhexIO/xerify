import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entryPath = join(repositoryRoot, 'dist', 'cli', 'entry.js');
const externalEntryPath = process.argv[2] ? resolve(process.argv[2]) : null;
const serverCommand = process.execPath;
const serverArgs = [externalEntryPath ?? entryPath, 'mcp', 'stdio'];
const inspectorPackagePath = require.resolve('@modelcontextprotocol/inspector/package.json');
const inspectorPackage = JSON.parse(readFileSync(inspectorPackagePath, 'utf8'));
const inspectorLauncher = join(
  dirname(inspectorPackagePath),
  'clients',
  'launcher',
  'build',
  'index.js'
);
const scratchDirectory = mkdtempSync(join(tmpdir(), 'xerify-inspector-'));
const configPath = join(scratchDirectory, 'mcp.json');
const expectedTools = ['xerify_ask', 'xerify_capabilities', 'xerify_verify'];

function assertToolList(era, stdout) {
  const payload = JSON.parse(stdout);
  const actualTools = payload.result?.tools?.map((tool) => tool.name).sort();

  if (JSON.stringify(actualTools) !== JSON.stringify(expectedTools)) {
    throw new Error(
      `${era} Inspector tools/list mismatch: expected ${JSON.stringify(expectedTools)}, got ${JSON.stringify(actualTools)}`
    );
  }

  return actualTools;
}

try {
  const mcpServers = Object.fromEntries(
    ['modern', 'legacy'].map((era) => [
      `xerify-${era}`,
      {
        type: 'stdio',
        command: serverCommand,
        args: serverArgs,
        cwd: repositoryRoot,
        protocolEra: era
      }
    ])
  );

  writeFileSync(configPath, `${JSON.stringify({ mcpServers }, null, 2)}\n`, { mode: 0o600 });

  const results = ['modern', 'legacy'].map((era) => {
    const stdout = execFileSync(
      process.execPath,
      [
        inspectorLauncher,
        '--cli',
        '--config',
        configPath,
        '--server',
        `xerify-${era}`,
        '--method',
        'tools/list',
        '--format',
        'json'
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
        windowsHide: true
      }
    );

    return {
      requestedEra: era,
      tools: assertToolList(era, stdout)
    };
  });

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      inspectorVersion: inspectorPackage.version,
      target: externalEntryPath === null ? 'repository-build' : 'external-install',
      results
    })}\n`
  );
} finally {
  rmSync(scratchDirectory, { recursive: true, force: true });
}
