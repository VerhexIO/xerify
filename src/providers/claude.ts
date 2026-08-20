import { chmod, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import type { Usage } from '../core/contracts.js';
import { XerifyError } from '../core/errors.js';
import { VERIFICATION_JSON_SCHEMA } from '../core/structured-schema.js';
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
import { describeProcessFailure, sumInputTokens } from './diagnostic.js';
import { parseProviderJson } from './response.js';

const ClaudeOutputSchema = z.looseObject({
  type: z.string().optional(),
  subtype: z.string().optional(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  total_cost_usd: z.number().nonnegative().optional(),
  usage: z
    .looseObject({
      input_tokens: z.number().int().nonnegative().optional(),
      cache_creation_input_tokens: z.number().int().nonnegative().optional(),
      cache_read_input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export interface ClaudeAdapterOptions {
  id?: string;
  executable?: string;
  prefixArgs?: readonly string[];
  env?: NodeJS.ProcessEnv;
}

function parseOutput(raw: string, structured: boolean): { output: string; usage: Usage | null } {
  const value = parseProviderJson(ClaudeOutputSchema, raw, 'Claude');
  if (value.subtype && value.subtype !== 'success') {
    throw new XerifyError('PROVIDER_FAILURE', 'Claude reported an unsuccessful result', {
      retryable: true
    });
  }
  const output = structured
    ? value.structured_output === undefined
      ? null
      : JSON.stringify(value.structured_output)
    : (value.result ?? null);
  if (output === null) {
    throw new XerifyError(
      'INVALID_PROVIDER_RESPONSE',
      'Claude did not return the expected output',
      {
        retryable: true
      }
    );
  }
  // Claude's cache counts are additions to `input_tokens`, not a subset of it. Measured against a
  // live `claude -p --output-format json` run: input 2, cache_creation 12170, cache_read 16594,
  // against a real charge of $0.130107. A two-token request does not cost that, so `input_tokens`
  // alone under-reports the input by four orders of magnitude here. Note this is the opposite of
  // Codex, whose `cached_input_tokens` IS a subset — see the comment in `codex.ts`.
  const inputTokens = sumInputTokens(
    value.usage?.input_tokens,
    value.usage?.cache_creation_input_tokens,
    value.usage?.cache_read_input_tokens
  );
  const outputTokens = value.usage?.output_tokens ?? null;
  return {
    output,
    usage:
      value.usage || value.total_cost_usd !== undefined
        ? {
            inputTokens,
            outputTokens,
            totalTokens:
              inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
            costUsd: value.total_cost_usd ?? null
          }
        : null
  };
}

export class ClaudeAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #options: Required<Pick<ClaudeAdapterOptions, 'executable' | 'prefixArgs'>> &
    Pick<ClaudeAdapterOptions, 'env'>;

  constructor(options: ClaudeAdapterOptions = {}) {
    this.id = options.id ?? 'claude';
    this.#options = {
      executable: options.executable ?? 'claude',
      prefixArgs: options.prefixArgs ?? [],
      ...(options.env === undefined ? {} : { env: options.env })
    };
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: 'anthropic',
      transports: ['command'],
      authKinds: ['subscription', 'api-key'],
      structuredOutput: true,
      reportsUsage: true,
      reportsCost: true,
      supportsAbort: true
    };
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const env = this.#options.env ?? process.env;
    const executable = await resolveExecutable(this.#options.executable, { env });
    if (!executable) {
      return {
        adapterId: this.id,
        provider: 'anthropic',
        available: false,
        executable: null,
        auth: { kind: 'subscription', status: 'unknown', source: 'provider-cli' },
        detail: 'Claude executable not found'
      };
    }
    const result = await runProcess(
      {
        executable,
        args: [...this.#options.prefixArgs, 'auth', 'status', '--json'],
        stdin: '',
        env: buildChildEnvironment(env, ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN']),
        timeoutMs: input.timeoutMs,
        maxInputBytes: 1,
        maxOutputBytes: 64 * 1024
      },
      new AbortController().signal
    );
    const apiKey = Boolean(env.ANTHROPIC_API_KEY);
    return {
      adapterId: this.id,
      provider: 'anthropic',
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
        result.exitCode === 0 ? 'Claude CLI auth is available' : 'Claude CLI is not authenticated'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'xerify-claude-'));
    await chmod(temporaryDirectory, 0o700);
    try {
      const args = [
        ...this.#options.prefixArgs,
        '-p',
        '--model',
        input.model,
        '--output-format',
        'json',
        '--no-session-persistence',
        '--safe-mode',
        '--disable-slash-commands',
        '--tools',
        '',
        '--permission-mode',
        'dontAsk'
      ];
      if (input.operation === 'verify') {
        args.push('--json-schema', JSON.stringify(VERIFICATION_JSON_SCHEMA));
      }
      const result = await runProcess(
        {
          executable: this.#options.executable,
          args,
          stdin: input.prompt,
          env: buildChildEnvironment(this.#options.env ?? process.env, [
            'ANTHROPIC_API_KEY',
            'CLAUDE_CODE_OAUTH_TOKEN'
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
        throw new XerifyError('PROVIDER_FAILURE', 'Claude CLI exited unsuccessfully', {
          retryable: true,
          details: {
            exitCode: result.exitCode,
            signal: result.signal,
            ...(providerMessage === null ? {} : { providerMessage })
          }
        });
      }
      const parsed = parseOutput(result.stdout, input.operation === 'verify');
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
