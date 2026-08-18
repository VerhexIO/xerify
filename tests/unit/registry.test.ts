import { describe, expect, it } from 'vitest';

import { CommandAdapter } from '../../src/providers/command.js';
import { ProviderRegistry } from '../../src/providers/registry.js';

const adapter = (id: string, provider: string) =>
  new CommandAdapter({ id, provider, executable: process.execPath, authKind: 'local' });

describe('provider registry', () => {
  it('resolves provider identity independently from adapter id', () => {
    const registry = new ProviderRegistry([adapter('codex-cli', 'openai')]);
    expect(registry.resolve('OpenAI').id).toBe('codex-cli');
  });

  it('rejects duplicate adapter ids for a provider', () => {
    expect(
      () => new ProviderRegistry([adapter('local', 'openai'), adapter('local', 'openai')])
    ).toThrow('Duplicate provider adapter');
  });
});
