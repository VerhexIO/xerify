import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface ConfigPaths {
  project: string;
  user: string;
}

export const PROJECT_STATE_DIRECTORY = '.xerify';
export const CONFIG_FILENAME = 'xverify-config.json';

export interface ProjectStatePaths {
  root: string;
  config: string;
  logs: string;
  runs: string;
  archive: string;
  auditLog: string;
  gitignore: string;
}

export function projectStatePaths(cwd: string = process.cwd()): ProjectStatePaths {
  const root = path.join(cwd, PROJECT_STATE_DIRECTORY);
  return {
    root,
    config: path.join(root, CONFIG_FILENAME),
    logs: path.join(root, 'logs'),
    runs: path.join(root, 'runs'),
    archive: path.join(root, 'archive'),
    auditLog: path.join(root, 'logs', 'audit.jsonl'),
    gitignore: path.join(root, '.gitignore')
  };
}

export function projectConfigPath(cwd: string = process.cwd()): string {
  let directory = path.resolve(cwd);
  for (;;) {
    const candidate = projectStatePaths(directory).config;
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) return projectStatePaths(path.resolve(cwd)).config;
    directory = parent;
  }
}

export function userConfigPath(
  options: {
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  } = {}
): string {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homeDirectory = options.homeDirectory ?? os.homedir();
  if (env.XERIFY_USER_CONFIG_PATH) return env.XERIFY_USER_CONFIG_PATH;
  if (platform === 'win32') {
    return path.join(
      env.APPDATA ?? path.join(homeDirectory, 'AppData', 'Roaming'),
      'Xerify',
      CONFIG_FILENAME
    );
  }
  if (platform === 'darwin') {
    return path.join(homeDirectory, 'Library', 'Application Support', 'Xerify', CONFIG_FILENAME);
  }
  return path.join(
    env.XDG_CONFIG_HOME ?? path.join(homeDirectory, '.config'),
    'xerify',
    CONFIG_FILENAME
  );
}

export function configPaths(
  options: {
    cwd?: string;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  } = {}
): ConfigPaths {
  return {
    project: projectConfigPath(options.cwd ?? process.cwd()),
    user: userConfigPath(options)
  };
}
