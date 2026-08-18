import os from 'node:os';
import path from 'node:path';

export interface ConfigPaths {
  project: string;
  user: string;
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
      'config.json'
    );
  }
  if (platform === 'darwin') {
    return path.join(homeDirectory, 'Library', 'Application Support', 'Xerify', 'config.json');
  }
  return path.join(
    env.XDG_CONFIG_HOME ?? path.join(homeDirectory, '.config'),
    'xerify',
    'config.json'
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
    project: path.join(options.cwd ?? process.cwd(), 'xerify.config.json'),
    user: userConfigPath(options)
  };
}
