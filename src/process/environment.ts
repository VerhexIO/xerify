const PLATFORM_ENVIRONMENT_KEYS = [
  'PATH',
  'Path',
  'PATHEXT',
  'SYSTEMROOT',
  'SystemRoot',
  'WINDIR',
  'COMSPEC',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'XDG_CONFIG_HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'TERM',
  'NO_COLOR'
] as const;

export function buildChildEnvironment(
  parent: NodeJS.ProcessEnv,
  allowedKeys: readonly string[] = [],
  explicit: Readonly<Record<string, string>> = {}
): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of new Set([...PLATFORM_ENVIRONMENT_KEYS, ...allowedKeys])) {
    const value = parent[key];
    if (value !== undefined) result[key] = value;
  }
  for (const [key, value] of Object.entries(explicit)) result[key] = value;
  return result;
}
