import { spawn } from 'node:child_process';

import type { ProcessTerminator } from './contract.js';

async function taskkill(pid: number, force: boolean): Promise<void> {
  await new Promise<void>((resolve) => {
    const args = ['/PID', String(pid), '/T'];
    if (force) args.push('/F');
    const child = spawn('taskkill.exe', args, {
      shell: false,
      stdio: 'ignore',
      windowsHide: true
    });
    child.once('error', () => resolve());
    child.once('exit', () => resolve());
  });
}

export class WindowsProcessTerminator implements ProcessTerminator {
  async terminate(pid: number, graceMs: number, isRunning: () => boolean): Promise<void> {
    await taskkill(pid, false);
    await new Promise<void>((resolve) => setTimeout(resolve, graceMs));
    if (!isRunning()) return;
    await taskkill(pid, true);
  }
}
