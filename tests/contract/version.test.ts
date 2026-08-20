import { readdirSync, readFileSync } from 'node:fs';
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

  // Install commands across the documentation pin an exact version, and no build step touches
  // them. A pin left behind tells a reader to install a version older than the page describes.
  // This walks every tracked markdown page rather than just the READMEs, because the translated
  // installation and MCP guides pin too.
  it('matches every exact version pin in the documentation', () => {
    const manifest = readJson('package.json');
    const pages: string[] = [];
    const walk = (relative: string): void => {
      for (const entry of readdirSync(path.join(repositoryRoot, relative), {
        withFileTypes: true
      })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const next = path.join(relative, entry.name);
        if (entry.isDirectory()) walk(next);
        else if (entry.name.endsWith('.md')) pages.push(next);
      }
    };
    walk('.');
    expect(pages.length, 'no markdown pages found').toBeGreaterThan(20);

    // A worked example records what was observed against the version it was run on, and the
    // changelog names past releases by definition. Those pins are history and must not move. Only
    // pages that tell a reader what to install have to track the manifest.
    const instructional = pages.filter(
      (page) => !page.includes(`examples${path.sep}`) && path.basename(page) !== 'CHANGELOG.md'
    );

    const pinned = new Map<string, string[]>();
    for (const page of instructional) {
      const text = readFileSync(path.join(repositoryRoot, page), 'utf8');
      for (const match of text.matchAll(/xverify-cli@(\d+\.\d+\.\d+)/g)) {
        const version = match[1];
        if (version === undefined) continue;
        pinned.set(version, [...(pinned.get(version) ?? []), page]);
      }
    }

    const expected = String(manifest.version);
    const versions = [...pinned.keys()];
    expect(versions, `install instructions pin ${versions.join(', ')}`).toEqual([expected]);
    expect(pinned.get(expected)?.length ?? 0, 'suspiciously few pinned pages').toBeGreaterThan(5);
  });

  it('is a plain semantic version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });
});
