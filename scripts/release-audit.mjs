import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDirectory = resolve(repositoryRoot, 'artifacts');
const prettierOptions = (await resolveConfig(resolve(repositoryRoot, 'package.json'))) ?? {};
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const lockfile = readFileSync(resolve(repositoryRoot, 'package-lock.json'));
const lock = JSON.parse(lockfile);
const changelog = readFileSync(resolve(repositoryRoot, 'CHANGELOG.md'), 'utf8');
const releaseDate = changelog.match(
  new RegExp(
    `^## \\[${packageJson.version.replaceAll('.', '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})$`,
    'm'
  )
)?.[1];

if (!releaseDate) throw new Error(`CHANGELOG.md has no dated ${packageJson.version} release`);

function npmCommand(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return [process.execPath, [npmExecPath, ...args]];
  }
  return [process.platform === 'win32' ? 'npm.cmd' : 'npm', args];
}

function runNpmJson(args, allowFailure = false) {
  const [command, commandArgs] = npmCommand(args);
  try {
    return JSON.parse(
      execFileSync(command, commandArgs, {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 120_000,
        windowsHide: true
      })
    );
  } catch (error) {
    if (allowFailure && error && typeof error === 'object' && 'stdout' in error) {
      return JSON.parse(String(error.stdout));
    }
    throw error;
  }
}

async function writeJson(filename, value) {
  writeFileSync(
    resolve(artifactDirectory, filename),
    await format(JSON.stringify(value), { ...prettierOptions, parser: 'json' })
  );
}

function scanSecrets() {
  const ignoredExtensions = new Set(['.png', '.tgz', '.zip', '.ico']);
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[A-Z0-9]{16}\b/,
    /\bgh[opusr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /\bnpm_[A-Za-z0-9]{30,}\b/,
    /\bsk-[A-Za-z0-9_-]{24,}\b/
  ];
  const findings = [];

  const candidatePaths = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true
    }
  )
    .split('\0')
    .filter(Boolean);
  for (const candidatePath of new Set(candidatePaths)) {
    const absolutePath = resolve(repositoryRoot, candidatePath);
    let metadata;
    try {
      metadata = statSync(absolutePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    if (!metadata.isFile()) continue;
    if (ignoredExtensions.has(extname(candidatePath).toLowerCase())) continue;
    if (metadata.size > 2 * 1024 * 1024) continue;
    const content = readFileSync(absolutePath, 'utf8');
    for (const pattern of patterns) {
      if (pattern.test(content)) findings.push(candidatePath);
    }
  }
  return [...new Set(findings)].sort();
}

function resolveLockedDependency(parentPath, dependencyName) {
  let currentPath = parentPath;
  while (true) {
    const candidate = currentPath
      ? `${currentPath}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (lock.packages[candidate]) return candidate;
    const nestedIndex = currentPath.lastIndexOf('/node_modules/');
    if (nestedIndex < 0) {
      if (currentPath === '') break;
      currentPath = '';
    } else {
      currentPath = currentPath.slice(0, nestedIndex);
    }
  }
  throw new Error(
    `Lockfile cannot resolve runtime dependency ${dependencyName} from ${parentPath}`
  );
}

function runtimePackagePaths() {
  const selected = new Set(['']);
  const queue = Object.keys(lock.packages[''].dependencies ?? {}).map((name) =>
    resolveLockedDependency('', name)
  );

  while (queue.length > 0) {
    const packagePath = queue.shift();
    if (selected.has(packagePath)) continue;
    selected.add(packagePath);
    const packageEntry = lock.packages[packagePath];
    const peerDependencies = Object.fromEntries(
      Object.entries(packageEntry.peerDependencies ?? {}).filter(
        ([name]) => packageEntry.peerDependenciesMeta?.[name]?.optional !== true
      )
    );
    const dependencyNames = Object.keys({
      ...(packageEntry.dependencies ?? {}),
      ...(packageEntry.optionalDependencies ?? {}),
      ...peerDependencies
    });
    for (const name of dependencyNames) {
      queue.push(resolveLockedDependency(packagePath, name));
    }
  }

  return [...selected].sort();
}

mkdirSync(artifactDirectory, { recursive: true });

const runtimePaths = runtimePackagePaths();
const runtimePackages = runtimePaths.map((packagePath) => ({
  path: packagePath,
  name:
    packagePath === ''
      ? packageJson.name
      : packagePath.slice(packagePath.lastIndexOf('node_modules/') + 13),
  ...lock.packages[packagePath]
}));
const runtimeCoordinates = new Set(
  runtimePackages.map((item) => `${item.name}\0${item.version ?? packageJson.version}`)
);
const sbom = runNpmJson(['sbom', '--sbom-format', 'spdx']);
sbom.packages = sbom.packages.filter((item) =>
  runtimeCoordinates.has(`${item.name}\0${item.versionInfo}`)
);
const keptSpdxIds = new Set(sbom.packages.map((item) => item.SPDXID));
sbom.relationships = sbom.relationships.filter(
  (relationship) =>
    (relationship.spdxElementId === 'SPDXRef-DOCUMENT' ||
      keptSpdxIds.has(relationship.spdxElementId)) &&
    (relationship.relatedSpdxElement === 'SPDXRef-DOCUMENT' ||
      keptSpdxIds.has(relationship.relatedSpdxElement))
);
const representedCoordinates = new Set(
  sbom.packages.map((item) => `${item.name}\0${item.versionInfo}`)
);
const missingCoordinates = [...runtimeCoordinates].filter(
  (coordinate) => !representedCoordinates.has(coordinate)
);
if (missingCoordinates.length > 0) {
  throw new Error(`npm SBOM omitted runtime packages: ${missingCoordinates.join(', ')}`);
}
const lockHash = createHash('sha256').update(lockfile).digest('hex');
sbom.documentNamespace = `https://spdx.org/spdxdocs/xerify-${packageJson.version}-${lockHash.slice(0, 24)}`;
sbom.creationInfo.created = `${releaseDate}T00:00:00.000Z`;
await writeJson('xerify.spdx.json', sbom);

const licenses = runtimePackages
  .filter((item) => item.path !== '')
  .map((item) => ({
    name: item.name,
    version: item.version ?? null,
    license: item.license ?? 'NOASSERTION',
    downloadLocation: item.resolved ?? null
  }))
  .sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`)
  );
const unknownLicenses = licenses.filter((item) => item.license === 'NOASSERTION');
if (unknownLicenses.length > 0) {
  throw new Error(
    `Production dependencies with unknown licenses: ${unknownLicenses.map((item) => item.name).join(', ')}`
  );
}
await writeJson('production-licenses.json', {
  schemaVersion: 1,
  package: `${packageJson.name}@${packageJson.version}`,
  lockfileSha256: lockHash,
  dependencies: licenses
});

const pack = runNpmJson(['pack', '--dry-run', '--json', '--ignore-scripts'])[0];
const packedPaths = pack.files.map((item) => item.path).sort();
const requiredPaths = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'dist/cli/entry.js',
  'schemas/config.schema.json',
  'skills/xerify/SKILL.md',
  'scripts/postinstall.mjs'
];
const missingPaths = requiredPaths.filter((path) => !packedPaths.includes(path));
const requiredConsumerDocs = [
  'docs/compatibility.md',
  'docs/configuration.md',
  'docs/examples/README.md',
  'docs/examples/index.jsonl',
  'docs/installation.md'
];
const missingConsumerDocs = requiredConsumerDocs.filter((path) => !packedPaths.includes(path));
const forbiddenPaths = packedPaths.filter(
  (path) =>
    path.startsWith('.agents/') ||
    path.startsWith('.codex/') ||
    path.startsWith('.cursor/') ||
    path.startsWith('.deckent/') ||
    path.startsWith('.xerify/') ||
    path.startsWith('assets/') ||
    path.startsWith('design/') ||
    path.startsWith('src/') ||
    path.startsWith('tests/') ||
    path.startsWith('.github/') ||
    path.startsWith('artifacts/') ||
    path === 'AGENTS.md' ||
    path === 'CONTRIBUTING.md' ||
    path === 'XERIFY.md'
);
if (missingPaths.length > 0 || missingConsumerDocs.length > 0 || forbiddenPaths.length > 0) {
  throw new Error(
    `Package content audit failed: missing=${[...missingPaths, ...missingConsumerDocs].join(',') || 'none'} forbidden=${forbiddenPaths.join(',') || 'none'}`
  );
}
await writeJson('npm-pack-audit.json', {
  schemaVersion: 1,
  package: `${packageJson.name}@${packageJson.version}`,
  filename: pack.filename,
  entryCount: packedPaths.length,
  unpackedSize: pack.unpackedSize,
  files: packedPaths
});

const audit = runNpmJson(['audit', '--omit=dev', '--json'], true);
const vulnerabilities = audit.metadata?.vulnerabilities ?? {};
const vulnerabilityTotal = Number(vulnerabilities.total ?? 0);
if (vulnerabilityTotal !== 0) {
  throw new Error(`npm production audit reports ${vulnerabilityTotal} vulnerabilities`);
}

const secretFindings = scanSecrets();
if (secretFindings.length > 0) {
  throw new Error(`Secret-pattern scan failed: ${secretFindings.join(', ')}`);
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    packageEntries: packedPaths.length,
    productionDependencies: licenses.length,
    productionVulnerabilities: vulnerabilityTotal,
    secretFindings: 0,
    artifacts: [
      'artifacts/npm-pack-audit.json',
      'artifacts/production-licenses.json',
      'artifacts/xerify.spdx.json'
    ]
  })}\n`
);
