import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { VERSION } from '../../src/cli/program.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(repositoryRoot, relative), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('published version', () => {
  // The CLI and the MCP server report a version constant that is compiled in rather than read
  // from package.json at runtime. Nothing else keeps those in step, so a release that bumps the
  // manifest and forgets the constant would ship a binary that lies about which version it is.
  it('matches the package manifest', () => {
    const manifest = readJson('package.json');
    expect(VERSION).toBe(manifest.version);
  });

  it('matches the MCP registry manifest, including its package entry', () => {
    const manifest = readJson('package.json');
    const server = readJson('server.json') as {
      version: string;
      packages: ReadonlyArray<{ identifier: string; version: string }>;
    };
    expect(server.version).toBe(manifest.version);
    for (const entry of server.packages) {
      expect(entry.identifier).toBe(manifest.name);
      expect(entry.version).toBe(manifest.version);
    }
  });

  // A bumped manifest with a stale lockfile passes every build step and only fails at
  // `npm run release:audit`, where npm's SBOM disagrees with the lockfile about which version
  // of this package is installed.
  it('matches the lockfile, at both the root and the root package entry', () => {
    const manifest = readJson('package.json');
    const lock = readJson('package-lock.json') as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    expect(lock.version).toBe(manifest.version);
    expect(lock.packages['']?.version).toBe(manifest.version);
  });

  it('is a plain semantic version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });
});
