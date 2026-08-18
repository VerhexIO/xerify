import { spawn } from 'node:child_process';

import { XerifyError } from '../core/errors.js';
import { processTerminator } from '../platform/index.js';
import { BoundedCollector, truncateUtf8 } from './bounds.js';

export interface ProcessInput {
  executable: string;
  args: readonly string[];
  stdin: string;
  env: NodeJS.ProcessEnv;
  cwd?: string;
  timeoutMs: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  terminationGraceMs?: number;
}

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  inputTruncated: boolean;
  outputTruncated: boolean;
}

export async function runProcess(input: ProcessInput, signal: AbortSignal): Promise<ProcessResult> {
  const startedAt = Date.now();
  const stdin = truncateUtf8(input.stdin, input.maxInputBytes);
  const stdout = new BoundedCollector(input.maxOutputBytes);
  const stderr = new BoundedCollector(input.maxOutputBytes);
  const terminator = processTerminator();

  return await new Promise<ProcessResult>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let cancelled = signal.aborted;
    let terminationStarted = false;

    const child = spawn(input.executable, [...input.args], {
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
      detached: process.platform !== 'win32',
      env: input.env,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    const terminate = (): void => {
      if (terminationStarted || child.pid === undefined) return;
      terminationStarted = true;
      void terminator.terminate(
        child.pid,
        input.terminationGraceMs ?? 250,
        () => !settled && child.exitCode === null && child.signalCode === null
      );
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      terminate();
    }, input.timeoutMs);
    timeout.unref();

    const abort = (): void => {
      cancelled = true;
      terminate();
    };
    signal.addEventListener('abort', abort, { once: true });
    if (cancelled) terminate();

    child.stdout.on('data', (chunk: Buffer) => stdout.append(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.append(chunk));
    const streamsEnded = Promise.all([
      new Promise<void>((done) => child.stdout.once('end', done)),
      new Promise<void>((done) => child.stderr.once('end', done))
    ]);

    child.once('error', (error: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (error.code === 'ENOENT') {
        reject(
          new XerifyError('PROVIDER_UNAVAILABLE', 'Provider executable is unavailable', {
            details: { executable: input.executable },
            cause: error
          })
        );
        return;
      }
      reject(
        new XerifyError('PROVIDER_FAILURE', 'Provider process could not be started', {
          retryable: true,
          cause: error
        })
      );
    });

    child.once('close', async (exitCode, exitSignal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (timedOut) {
        reject(new XerifyError('TIMEOUT', 'Provider invocation timed out', { retryable: true }));
        return;
      }
      if (cancelled) {
        reject(
          new XerifyError('CANCELLED', 'Provider invocation was cancelled', { retryable: true })
        );
        return;
      }
      await streamsEnded;
      const stdoutResult = stdout.result();
      const stderrResult = stderr.result();
      resolve({
        stdout: stdoutResult.text,
        stderr: stderrResult.text,
        exitCode,
        signal: exitSignal,
        durationMs: Math.max(0, Date.now() - startedAt),
        inputTruncated: stdin.truncated,
        outputTruncated: stdoutResult.truncated || stderrResult.truncated
      });
    });

    child.stdin.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE' && !settled) terminate();
    });
    child.stdin.end(stdin.text);
  });
}
