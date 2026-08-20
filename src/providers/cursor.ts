import { chmod, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import type { Usage } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { buildChildEnvironment } from '../process/environment.js';
import { resolveExecutable } from '../process/executable-resolution.js';
import { runProcess } from '../process/spawn.js';
import type {
  InvokeInput,
  InvokeResult,
  ProbeInput,
  ProbeResult,
  ProviderAdapter,
  ProviderCapabilities
} from './contract.js';
import { describeProcessFailure } from './diagnostic.js';
import { parseProviderJson } from './response.js';

const CursorOutputSchema = z.looseObject({
  type: z.string().optional(),
  subtype: z.string().optional(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  usage: z
    .looseObject({
      inputTokens: z.number().int().nonnegative().optional(),
      outputTokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export interface CursorAdapterOptions {
  id?: string;
  executable?: string;
  prefixArgs?: readonly string[];
  env?: NodeJS.ProcessEnv;
}

function assertExactCursorModel(model: string): void {
  const baseModel = model.trim().split('[', 1)[0]?.toLowerCase() ?? '';
  if (baseModel === 'auto') {
    throw new XerifyError(
      'INVALID_INPUT',
      'Cursor auto selection cannot provide deterministic model provenance',
      { details: { model, provider: 'cursor' } }
    );
  }
}

function parseOutput(raw: string): { output: string; usage: Usage | null } {
  const value = parseProviderJson(CursorOutputSchema, raw, 'Cursor Agent');
  if (value.is_error === true || (value.subtype && value.subtype !== 'success')) {
    throw new XerifyError('PROVIDER_FAILURE', 'Cursor Agent reported an unsuccessful result', {
      retryable: true
    });
  }
  if (value.type && value.type !== 'result') {
    throw new XerifyError(
      'INVALID_PROVIDER_RESPONSE',
      'Cursor Agent returned an unexpected event',
      {
        retryable: true
      }
    );
  }
  if (value.result === undefined) {
    throw new XerifyError('INVALID_PROVIDER_RESPONSE', 'Cursor Agent did not return a result', {
      retryable: true
    });
  }
  const inputTokens = value.usage?.inputTokens ?? null;
  const outputTokens = value.usage?.outputTokens ?? null;
  return {
    output: value.result,
    usage: value.usage
      ? {
          inputTokens,
          outputTokens,
          totalTokens:
            inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
          costUsd: null
        }
      : null
  };
}

export class CursorAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #options: Required<Pick<CursorAdapterOptions, 'executable' | 'prefixArgs'>> &
    Pick<CursorAdapterOptions, 'env'>;

  constructor(options: CursorAdapterOptions) {
    this.id = options.id ?? 'cursor';
    this.#options = {
      executable: options.executable ?? 'agent',
      prefixArgs: options.prefixArgs ?? [],
      ...(options.env === undefined ? {} : { env: options.env })
    };
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: 'cursor',
      transports: ['command'],
      authKinds: ['subscription', 'api-key'],
      structuredOutput: false,
      reportsUsage: true,
      reportsCost: false,
      supportsAbort: true
    };
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const env = this.#options.env ?? process.env;
    const executable = await resolveExecutable(this.#options.executable, { env });
    if (!executable) {
      return {
        adapterId: this.id,
        provider: 'cursor',
        available: false,
        executable: null,
        auth: { kind: 'subscription', status: 'unknown', source: 'provider-cli' },
        detail: 'Cursor Agent executable not found'
      };
    }
    const result = await runProcess(
      {
        executable,
        args: [...this.#options.prefixArgs, 'status'],
        stdin: '',
        env: buildChildEnvironment(env, ['CURSOR_API_KEY', 'CURSOR_API_ENDPOINT']),
        timeoutMs: input.timeoutMs,
        maxInputBytes: 1,
        maxOutputBytes: 64 * 1024
      },
      new AbortController().signal
    );
    const apiKey = Boolean(env.CURSOR_API_KEY);
    return {
      adapterId: this.id,
      provider: 'cursor',
      available: result.exitCode === 0,
      executable,
      auth: apiKey
        ? { kind: 'api-key', status: 'present', source: 'env' }
        : {
            kind: 'subscription',
            status: result.exitCode === 0 ? 'managed' : 'missing',
            source: result.exitCode === 0 ? 'provider-cli' : 'missing'
          },
      detail:
        result.exitCode === 0
          ? 'Cursor Agent auth is available'
          : 'Cursor Agent is not authenticated'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    assertExactCursorModel(input.model);
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'xerify-cursor-'));
    await chmod(temporaryDirectory, 0o700);
    try {
      const result = await runProcess(
        {
          executable: this.#options.executable,
          args: [
            ...this.#options.prefixArgs,
            '-p',
            '--trust',
            '--mode',
            'ask',
            '--sandbox',
            'enabled',
            '--workspace',
            temporaryDirectory,
            '--model',
            input.model,
            '--output-format',
            'json'
          ],
          stdin: input.prompt,
          env: buildChildEnvironment(this.#options.env ?? process.env, [
            'CURSOR_API_KEY',
            'CURSOR_API_ENDPOINT'
          ]),
          cwd: temporaryDirectory,
          timeoutMs: input.limits.timeoutMs,
          maxInputBytes: input.limits.maxInputBytes,
          maxOutputBytes: input.limits.maxOutputBytes
        },
        signal
      );
      if (result.exitCode !== 0) {
        const providerMessage = describeProcessFailure(result.stderr, result.stdout);
        throw new XerifyError('PROVIDER_FAILURE', 'Cursor Agent exited unsuccessfully', {
          retryable: true,
          details: {
            exitCode: result.exitCode,
            signal: result.signal,
            ...(providerMessage === null ? {} : { providerMessage })
          }
        });
      }
      const parsed = parseOutput(result.stdout);
      return {
        output: parsed.output,
        usage: parsed.usage,
        durationMs: result.durationMs,
        inputTruncated: result.inputTruncated,
        outputTruncated: result.outputTruncated
      };
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}
