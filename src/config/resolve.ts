import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_LIMITS, type RequestLimits } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { configPaths, type ConfigPaths } from './paths.js';
import {
  DEFAULT_PROVIDER_CONFIGS,
  DEFAULT_HISTORY_CONFIG,
  FileConfigSchema,
  XerifyConfigSchema,
  type FileConfig,
  type ProviderConfig,
  type XerifyConfig
} from './schema.js';

export type ConfigSource = 'flag' | 'env' | 'project' | 'user' | 'default';

export interface ResolvedConfig {
  config: XerifyConfig;
  sources: Record<string, ConfigSource>;
  paths: ConfigPaths & { loaded: readonly string[] };
}

export interface ConfigOverrides {
  limits?: Partial<RequestLimits>;
  logPath?: string | null;
}

function containsLiteralApiKey(config: FileConfig): boolean {
  return Object.values(config.providers ?? {}).some(
    (provider) => 'apiKey' in provider && provider.apiKey !== undefined
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsExplicitEndpoint(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.providers)) return false;
  return Object.values(value.providers).some(
    (provider) => isRecord(provider) && Object.hasOwn(provider, 'endpoint')
  );
}

async function readConfig(path: string, platform: NodeJS.Platform): Promise<FileConfig | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const value = JSON.parse(raw) as unknown;
    const config = FileConfigSchema.parse(value);
    // `platform` can be injected to resolve another platform's config paths in tests and hosts.
    // POSIX mode enforcement is valid only when both the selected platform and the real filesystem
    // support those permission bits. Windows relies on the documented owner-only ACL boundary.
    const containsSensitiveValues =
      containsLiteralApiKey(config) || containsExplicitEndpoint(value);
    if (platform !== 'win32' && process.platform !== 'win32' && containsSensitiveValues) {
      const metadata = await stat(path);
      if ((metadata.mode & 0o077) !== 0) {
        throw new XerifyError(
          'CONFIG_INVALID',
          'Config containing a literal API key or explicit endpoint must be owner-readable only (chmod 600)',
          { details: { path, requiredMode: '0600' } }
        );
      }
    }
    return config;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    if (error instanceof XerifyError) throw error;
    throw new XerifyError('CONFIG_INVALID', `Invalid config file: ${path}`, {
      details: { path },
      cause: error
    });
  }
}

function applyFile(
  target: {
    providers: Record<string, ProviderConfig>;
    limits: RequestLimits;
    history: typeof DEFAULT_HISTORY_CONFIG;
    logPath: string | null;
  },
  sources: Record<string, ConfigSource>,
  file: FileConfig,
  source: 'user' | 'project'
): void {
  for (const [id, provider] of Object.entries(file.providers ?? {})) {
    target.providers[id] = provider;
    sources[`providers.${id}`] = source;
  }
  for (const [key, value] of Object.entries(file.limits ?? {})) {
    if (value === undefined) continue;
    const limit = key as keyof RequestLimits;
    target.limits[limit] = value;
    sources[`limits.${limit}`] = source;
  }
  for (const [key, value] of Object.entries(file.history ?? {})) {
    if (value === undefined) continue;
    const historyKey = key as keyof typeof DEFAULT_HISTORY_CONFIG;
    Object.assign(target.history, { [historyKey]: value });
    sources[`history.${historyKey}`] = source;
  }
  if (file.logPath !== undefined) {
    target.logPath = file.logPath;
    sources.logPath = source;
  }
}

function environmentNumber(
  env: NodeJS.ProcessEnv,
  key: string,
  name: keyof RequestLimits
): number | null {
  const raw = env[key];
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new XerifyError('CONFIG_INVALID', `${key} must be a positive integer`, {
      details: { field: name, source: 'env' }
    });
  }
  return value;
}

export async function resolveConfig(
  options: {
    cwd?: string;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
    overrides?: ConfigOverrides;
  } = {}
): Promise<ResolvedConfig> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const paths = configPaths(options);
  const sources: Record<string, ConfigSource> = {
    'limits.timeoutMs': 'default',
    'limits.maxInputBytes': 'default',
    'limits.maxOutputBytes': 'default',
    'history.enabled': 'default',
    'history.directory': 'default',
    'history.archiveDirectory': 'default',
    'history.captureInput': 'default',
    'history.captureOutput': 'default',
    'history.sequencePadding': 'default',
    logPath: 'default'
  };
  const merged = {
    providers: { ...DEFAULT_PROVIDER_CONFIGS } as Record<string, ProviderConfig>,
    limits: { ...DEFAULT_LIMITS },
    history: { ...DEFAULT_HISTORY_CONFIG },
    logPath: null as string | null
  };
  const loaded: string[] = [];
  for (const id of Object.keys(DEFAULT_PROVIDER_CONFIGS)) sources[`providers.${id}`] = 'default';

  const user = await readConfig(paths.user, platform);
  if (user) {
    applyFile(merged, sources, user, 'user');
    loaded.push(paths.user);
  }
  const project = await readConfig(paths.project, platform);
  if (project) {
    applyFile(merged, sources, project, 'project');
    loaded.push(paths.project);
  }

  const environmentLimits: ReadonlyArray<[string, keyof RequestLimits]> = [
    ['XERIFY_TIMEOUT_MS', 'timeoutMs'],
    ['XERIFY_MAX_INPUT_BYTES', 'maxInputBytes'],
    ['XERIFY_MAX_OUTPUT_BYTES', 'maxOutputBytes']
  ];
  for (const [environmentKey, configKey] of environmentLimits) {
    const value = environmentNumber(env, environmentKey, configKey);
    if (value !== null) {
      merged.limits[configKey] = value;
      sources[`limits.${configKey}`] = 'env';
    }
  }

  for (const [key, value] of Object.entries(options.overrides?.limits ?? {})) {
    if (value !== undefined) {
      const limit = key as keyof RequestLimits;
      merged.limits[limit] = value;
      sources[`limits.${limit}`] = 'flag';
    }
  }
  if (options.overrides?.logPath !== undefined) {
    merged.logPath = options.overrides.logPath;
    sources.logPath = 'flag';
  }

  if (merged.logPath !== null && !path.isAbsolute(merged.logPath)) {
    const logBase =
      sources.logPath === 'project'
        ? path.dirname(path.dirname(paths.project))
        : (options.cwd ?? process.cwd());
    merged.logPath = path.resolve(logBase, merged.logPath);
  }

  const historyBase = path.dirname(path.dirname(paths.project));
  for (const key of ['directory', 'archiveDirectory'] as const) {
    if (!path.isAbsolute(merged.history[key])) {
      merged.history[key] = path.resolve(historyBase, merged.history[key]);
    }
  }

  return {
    config: XerifyConfigSchema.parse(merged),
    sources,
    paths: { ...paths, loaded }
  };
}
