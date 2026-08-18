import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import type { Usage } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { VERIFICATION_JSON_SCHEMA } from '../core/structured-schema.js';
import { buildChildEnvironment } from '../process/environment.js';
import { resolveExecutable } from '../process/executable-resolution.js';
import { runProcess, type ProcessResult } from '../process/spawn.js';
import type {
  InvokeInput,
  InvokeResult,
  ProbeInput,
  ProbeResult,
  ProviderAdapter,
  ProviderCapabilities
} from './contract.js';
import { parseProviderJson } from './response.js';

const CodexEventSchema = z.looseObject({
  type: z.string(),
  item: z
    .looseObject({
      type: z.string(),
      text: z.string().optional()
    })
    .optional(),
  usage: z
    .looseObject({
      input_tokens: z.number().int().nonnegative().optional(),
      cached_input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export interface CodexAdapterOptions {
  id?: string;
  executable?: string;
  prefixArgs?: readonly string[];
  env?: NodeJS.ProcessEnv;
}

function parseEvents(output: string): { message: string; usage: Usage | null } {
  let message: string | null = null;
  let usage: Usage | null = null;
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const event = parseProviderJson(CodexEventSchema, line, 'Codex');
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      message = event.item.text ?? null;
    }
    if (event.type === 'turn.completed' && event.usage) {
      const inputTokens = event.usage.input_tokens ?? null;
      const outputTokens = event.usage.output_tokens ?? null;
      usage = {
        inputTokens,
        outputTokens,
        totalTokens:
          inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
        costUsd: null
      };
    }
    if (event.type === 'turn.failed' || event.type === 'error') {
      throw new XerifyError('PROVIDER_FAILURE', 'Codex reported an unsuccessful turn', {
        retryable: true
      });
    }
  }
  if (message === null) {
    throw new XerifyError(
      'INVALID_PROVIDER_RESPONSE',
      'Codex did not return a final agent message',
      {
        retryable: true
      }
    );
  }
  return { message, usage };
}

export class CodexAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #options: Required<Pick<CodexAdapterOptions, 'executable' | 'prefixArgs'>> &
    Pick<CodexAdapterOptions, 'env'>;

  constructor(options: CodexAdapterOptions = {}) {
    this.id = options.id ?? 'codex';
    this.#options = {
      executable: options.executable ?? 'codex',
      prefixArgs: options.prefixArgs ?? [],
      ...(options.env === undefined ? {} : { env: options.env })
    };
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: 'openai',
      transports: ['command'],
      authKinds: ['subscription', 'api-key'],
      structuredOutput: true,
      reportsUsage: true,
      supportsAbort: true
    };
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const env = this.#options.env ?? process.env;
    const executable = await resolveExecutable(this.#options.executable, { env });
    if (!executable) {
      return {
        adapterId: this.id,
        provider: 'openai',
        available: false,
        executable: null,
        auth: { kind: 'subscription', status: 'unknown', source: 'provider-cli' },
        detail: 'Codex executable not found'
      };
    }
    const result = await runProcess(
      {
        executable,
        args: [...this.#options.prefixArgs, 'login', 'status'],
        stdin: '',
        env: buildChildEnvironment(env, ['CODEX_HOME', 'CODEX_API_KEY']),
        timeoutMs: input.timeoutMs,
        maxInputBytes: 1,
        maxOutputBytes: 64 * 1024
      },
      new AbortController().signal
    );
    const apiKey = Boolean(env.CODEX_API_KEY);
    return {
      adapterId: this.id,
      provider: 'openai',
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
        result.exitCode === 0 ? 'Codex CLI auth is available' : 'Codex CLI is not authenticated'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'xerify-codex-'));
    await chmod(temporaryDirectory, 0o700);
    try {
      const args = [
        ...this.#options.prefixArgs,
        'exec',
        '--ephemeral',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--ignore-user-config',
        '--ignore-rules',
        '--color',
        'never',
        '--model',
        input.model,
        '--json'
      ];
      if (input.operation === 'verify') {
        const schemaPath = path.join(temporaryDirectory, 'verification-schema.json');
        await writeFile(schemaPath, JSON.stringify(VERIFICATION_JSON_SCHEMA), { mode: 0o600 });
        args.push('--output-schema', schemaPath);
      }
      args.push('-');

      const processResult: ProcessResult = await runProcess(
        {
          executable: this.#options.executable,
          args,
          stdin: input.prompt,
          env: buildChildEnvironment(this.#options.env ?? process.env, [
            'CODEX_HOME',
            'CODEX_API_KEY'
          ]),
          cwd: temporaryDirectory,
          timeoutMs: input.limits.timeoutMs,
          maxInputBytes: input.limits.maxInputBytes,
          maxOutputBytes: input.limits.maxOutputBytes
        },
        signal
      );
      if (processResult.exitCode !== 0) {
        throw new XerifyError('PROVIDER_FAILURE', 'Codex CLI exited unsuccessfully', {
          retryable: true,
          details: { exitCode: processResult.exitCode, signal: processResult.signal }
        });
      }
      const parsed = parseEvents(processResult.stdout);
      return {
        output: parsed.message,
        usage: parsed.usage,
        durationMs: processResult.durationMs,
        inputTruncated: processResult.inputTruncated,
        outputTruncated: processResult.outputTruncated
      };
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}
