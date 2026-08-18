import type { ResolvedConfig } from './resolve.js';
import type { ProviderConfig, XerifyConfig } from './schema.js';

export const REDACTED_SECRET = '[REDACTED]';

function redactProvider(provider: ProviderConfig): Record<string, unknown> {
  if ('apiKey' in provider && provider.apiKey !== undefined) {
    return { ...provider, apiKey: REDACTED_SECRET };
  }
  return { ...provider };
}

export function redactConfig(config: XerifyConfig): Record<string, unknown> {
  return {
    ...config,
    providers: Object.fromEntries(
      Object.entries(config.providers).map(([id, provider]) => [id, redactProvider(provider)])
    )
  };
}

export function redactResolvedConfig(resolved: ResolvedConfig): Record<string, unknown> {
  return {
    ...resolved,
    config: redactConfig(resolved.config),
    secretsRedacted: true
  };
}
