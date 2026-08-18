import type { ProcessTerminator } from './contract.js';

function ignoreMissingProcess(error: unknown): void {
  if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return;
  throw error;
}

export class PosixProcessTerminator implements ProcessTerminator {
  async terminate(pid: number, graceMs: number, isRunning: () => boolean): Promise<void> {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch (error) {
      ignoreMissingProcess(error);
      return;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, graceMs));
    if (!isRunning()) return;
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (error) {
      ignoreMissingProcess(error);
    }
  }
}
