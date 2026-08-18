export interface ProcessTerminator {
  terminate(pid: number, graceMs: number, isRunning: () => boolean): Promise<void>;
}
