import type { ResolvedConfig } from './resolve.js';
import type { ProviderConfig, XerifyConfig } from './schema.js';

export const REDACTED_SECRET = '[REDACTED]';

function redactProvider(provider: ProviderConfig): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...provider };
  if ('apiKey' in provider && provider.apiKey !== undefined) {
    redacted.apiKey = REDACTED_SECRET;
  }
  // Endpoint URLs are treated as sensitive in full. Credentials can appear in userinfo, path,
  // arbitrary query keys, or fragments, so key-name heuristics cannot make partial redaction safe.
  if ('endpoint' in provider) redacted.endpoint = REDACTED_SECRET;
  return redacted;
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
