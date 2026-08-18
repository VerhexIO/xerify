import { describe, expect, it } from 'vitest';

import { XerifyConfigSchema } from '../../src/config/schema.js';
import { adaptersFromConfig } from '../../src/providers/factory.js';

describe('provider factory', () => {
  it('constructs every configured built-in kind with stable adapter IDs', async () => {
    const config = XerifyConfigSchema.parse({
      providers: {
        codexLocal: { kind: 'codex' },
        claudeLocal: { kind: 'claude' },
        openaiDirect: {
          kind: 'openai-api',
          apiKeyEnvironment: 'TEST_OPENAI_KEY'
        },
        anthropicDirect: {
          kind: 'anthropic-api',
          apiKeyEnvironment: 'TEST_ANTHROPIC_KEY'
        },
        local: {
          kind: 'openai-compatible',
          provider: 'local-lab',
          endpoint: 'http://127.0.0.1:1234/v1/chat/completions'
        },
        command: {
          kind: 'command',
          provider: 'fixture',
          executable: process.execPath,
          authKind: 'local'
        }
      }
    });
    const adapters = adaptersFromConfig(config, {
      env: { TEST_OPENAI_KEY: 'present', TEST_ANTHROPIC_KEY: 'present' }
    });

    expect(adapters.map((adapter) => adapter.id)).toEqual([
      'codexLocal',
      'claudeLocal',
      'openaiDirect',
      'anthropicDirect',
      'local',
      'command'
    ]);
    await expect(
      adapters
        .find((adapter) => adapter.id === 'openaiDirect')
        ?.probe({
          network: false,
          timeoutMs: 100
        })
    ).resolves.toMatchObject({ available: true, auth: { status: 'present' } });
    await expect(
      adapters
        .find((adapter) => adapter.id === 'anthropicDirect')
        ?.probe({
          network: false,
          timeoutMs: 100
        })
    ).resolves.toMatchObject({ available: true, auth: { status: 'present' } });
  });
});
