import { XerifyError } from '../core/errors.js';
import type { ProviderAdapter } from './contract.js';

export class ProviderRegistry {
  readonly #adapters = new Map<string, ProviderAdapter[]>();

  constructor(adapters: readonly ProviderAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ProviderAdapter): void {
    const key = adapter.capabilities().provider.toLowerCase();
    const existing = this.#adapters.get(key) ?? [];
    if (existing.some((candidate) => candidate.id === adapter.id)) {
      throw new XerifyError('CONFIG_INVALID', `Duplicate provider adapter: ${adapter.id}`);
    }
    this.#adapters.set(key, [...existing, adapter]);
  }

  list(): readonly ProviderAdapter[] {
    return [...this.#adapters.values()].flat();
  }

  resolve(provider: string, adapterId?: string): ProviderAdapter {
    const candidates = this.#adapters.get(provider.toLowerCase()) ?? [];
    const adapter = adapterId
      ? candidates.find((candidate) => candidate.id === adapterId)
      : candidates[0];
    if (!adapter) {
      throw new XerifyError('PROVIDER_UNAVAILABLE', 'No adapter is configured for provider', {
        details: { provider, ...(adapterId ? { adapterId } : {}) }
      });
    }
    return adapter;
  }
}
