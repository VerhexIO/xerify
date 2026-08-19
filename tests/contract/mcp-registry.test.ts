import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface PackageManifest {
  name: string;
  version: string;
  mcpName: string;
}

interface RegistryManifest {
  $schema: string;
  name: string;
  version: string;
  packages: Array<{
    registryType: string;
    identifier: string;
    version: string;
    transport: { type: string };
    packageArguments?: Array<{ type: string; value: string }>;
  }>;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.resolve(file), 'utf8')) as T;
}

describe('official MCP Registry metadata', () => {
  it('keeps npm ownership, version, transport, and launch arguments in sync', async () => {
    const packageManifest = await readJson<PackageManifest>('package.json');
    const registry = await readJson<RegistryManifest>('server.json');
    const entry = registry.packages[0];

    expect(registry.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'
    );
    expect(registry.name).toBe(packageManifest.mcpName);
    expect(registry.version).toBe(packageManifest.version);
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      registryType: 'npm',
      identifier: packageManifest.name,
      version: packageManifest.version,
      transport: { type: 'stdio' },
      packageArguments: [
        { type: 'positional', value: 'mcp' },
        { type: 'positional', value: 'stdio' }
      ]
    });
  });
});
