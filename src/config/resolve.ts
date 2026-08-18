import { readFile } from 'node:fs/promises';

import { DEFAULT_LIMITS, type RequestLimits } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { configPaths, type ConfigPaths } from './paths.js';
import {
  DEFAULT_PROVIDER_CONFIGS,
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

async function readConfig(path: string): Promise<FileConfig | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return FileConfigSchema.parse(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
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
  const paths = configPaths(options);
  const sources: Record<string, ConfigSource> = {
    'limits.timeoutMs': 'default',
    'limits.maxInputBytes': 'default',
    'limits.maxOutputBytes': 'default',
    logPath: 'default'
  };
  const merged = {
    providers: { ...DEFAULT_PROVIDER_CONFIGS } as Record<string, ProviderConfig>,
    limits: { ...DEFAULT_LIMITS },
    logPath: null as string | null
  };
  const loaded: string[] = [];
  for (const id of Object.keys(DEFAULT_PROVIDER_CONFIGS)) sources[`providers.${id}`] = 'default';

  const user = await readConfig(paths.user);
  if (user) {
    applyFile(merged, sources, user, 'user');
    loaded.push(paths.user);
  }
  const project = await readConfig(paths.project);
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

  return {
    config: XerifyConfigSchema.parse(merged),
    sources,
    paths: { ...paths, loaded }
  };
}
