import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

function candidates(
  executable: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): string[] {
  if (platform !== 'win32') return [executable];
  if (path.extname(executable)) return [executable];
  const extensions = (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean)
    .map((extension) => extension.toLowerCase());
  return [executable, ...extensions.map((extension) => `${executable}${extension}`)];
}

export async function resolveExecutable(
  executable: string,
  options: { platform?: NodeJS.Platform; env?: NodeJS.ProcessEnv } = {}
): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const pathValue = env.PATH ?? env.Path ?? '';
  const directories =
    executable.includes('/') || executable.includes('\\')
      ? ['']
      : pathValue.split(path.delimiter).filter(Boolean);
  const mode = platform === 'win32' ? constants.F_OK : constants.X_OK;

  for (const directory of directories) {
    for (const candidate of candidates(executable, platform, env)) {
      const resolved = directory ? path.join(directory, candidate) : path.resolve(candidate);
      try {
        await access(resolved, mode);
        return resolved;
      } catch {
        // Try the next PATH entry.
      }
    }
  }
  return null;
}
