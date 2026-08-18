import type { XerifyConfig } from '../config/schema.js';
import { AnthropicApiAdapter } from './anthropic-api.js';
import { ClaudeAdapter } from './claude.js';
import { CommandAdapter } from './command.js';
import type { ProviderAdapter } from './contract.js';
import { CodexAdapter } from './codex.js';
import { OpenAiApiAdapter } from './openai-api.js';
import { OpenAiCompatibleAdapter } from './openai-compatible.js';
import { ProviderRegistry } from './registry.js';

export interface ProviderFactoryOptions {
  env?: NodeJS.ProcessEnv;
}

export function adaptersFromConfig(
  config: XerifyConfig,
  options: ProviderFactoryOptions = {}
): ProviderAdapter[] {
  const environment = options.env === undefined ? {} : { env: options.env };
  return Object.entries(config.providers).map(([id, provider]) => {
    switch (provider.kind) {
      case 'command':
        return new CommandAdapter({
          id,
          provider: provider.provider,
          executable: provider.executable,
          args: provider.args,
          authKind: provider.authKind,
          authEnvironment: provider.authEnvironment,
          structuredOutput: provider.structuredOutput,
          reportsUsage: provider.reportsUsage,
          ...environment
        });
      case 'codex':
        return new CodexAdapter({ id, executable: provider.executable, ...environment });
      case 'claude':
        return new ClaudeAdapter({ id, executable: provider.executable, ...environment });
      case 'openai-api':
        return new OpenAiApiAdapter({
          id,
          endpoint: provider.endpoint,
          apiKeyEnvironment: provider.apiKeyEnvironment,
          ...environment
        });
      case 'anthropic-api':
        return new AnthropicApiAdapter({
          id,
          endpoint: provider.endpoint,
          apiKeyEnvironment: provider.apiKeyEnvironment,
          maxTokens: provider.maxTokens,
          ...environment
        });
      case 'openai-compatible':
        return new OpenAiCompatibleAdapter({
          id,
          provider: provider.provider,
          endpoint: provider.endpoint,
          ...environment,
          ...(provider.apiKeyEnvironment === undefined
            ? {}
            : { apiKeyEnvironment: provider.apiKeyEnvironment })
        });
    }
  });
}

export function registryFromConfig(
  config: XerifyConfig,
  options: ProviderFactoryOptions = {}
): ProviderRegistry {
  return new ProviderRegistry(adaptersFromConfig(config, options));
}
