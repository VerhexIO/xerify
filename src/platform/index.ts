import type { ProcessTerminator } from './contract.js';
import { PosixProcessTerminator } from './posix.js';
import { WindowsProcessTerminator } from './windows.js';

export function processTerminator(platform = process.platform): ProcessTerminator {
  return platform === 'win32' ? new WindowsProcessTerminator() : new PosixProcessTerminator();
}
