import { XerifyError } from '../core/errors.js';
import { buildChildEnvironment } from '../process/environment.js';
import { resolveExecutable } from '../process/executable-resolution.js';
import { runProcess } from '../process/spawn.js';
import type {
  AuthKind,
  InvokeInput,
  InvokeResult,
  ProbeResult,
  ProviderAdapter,
  ProviderCapabilities
} from './contract.js';

export interface CommandAdapterOptions {
  id: string;
  provider: string;
  executable: string;
  args?: readonly string[];
  authKind?: AuthKind;
  authEnvironment?: readonly string[];
  structuredOutput?: boolean;
  reportsUsage?: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

function expandArgs(args: readonly string[], input: InvokeInput): string[] {
  return args.map((argument) =>
    argument.replaceAll('{model}', input.model).replaceAll('{operation}', input.operation)
  );
}

export class CommandAdapter implements ProviderAdapter {
  readonly id: string;
  readonly #options: CommandAdapterOptions;

  constructor(options: CommandAdapterOptions) {
    this.id = options.id;
    this.#options = options;
  }

  capabilities(): ProviderCapabilities {
    return {
      provider: this.#options.provider,
      transports: ['command'],
      authKinds: [this.#options.authKind ?? 'unknown'],
      structuredOutput: this.#options.structuredOutput ?? false,
      reportsUsage: this.#options.reportsUsage ?? false,
      supportsAbort: true
    };
  }

  async probe(): Promise<ProbeResult> {
    const environment = this.#options.env ?? process.env;
    const executable = await resolveExecutable(this.#options.executable, { env: environment });
    const authEnvironment = this.#options.authEnvironment ?? [];
    const hasAuth = authEnvironment.some((key) => Boolean(environment[key]));
    const authKind = this.#options.authKind ?? 'unknown';
    const managed = authKind === 'subscription';
    const notRequired = authKind === 'local';
    return {
      adapterId: this.id,
      provider: this.#options.provider,
      available:
        executable !== null && (managed || notRequired || authEnvironment.length === 0 || hasAuth),
      executable,
      auth: {
        kind: authKind,
        status: managed
          ? 'managed'
          : notRequired
            ? 'not-required'
            : authEnvironment.length === 0
              ? 'unknown'
              : hasAuth
                ? 'present'
                : 'missing',
        source: managed
          ? 'provider-cli'
          : notRequired
            ? 'local'
            : hasAuth
              ? 'env'
              : authEnvironment.length > 0
                ? 'missing'
                : 'unknown'
      },
      detail:
        executable === null
          ? 'Executable not found'
          : authEnvironment.length > 0 && !hasAuth
            ? 'Executable found; required auth environment is missing'
            : 'Adapter is available'
    };
  }

  async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
    const environment = this.#options.env ?? process.env;
    const result = await runProcess(
      {
        executable: this.#options.executable,
        args: expandArgs(this.#options.args ?? [], input),
        stdin: input.prompt,
        env: buildChildEnvironment(environment, this.#options.authEnvironment),
        ...(this.#options.cwd === undefined ? {} : { cwd: this.#options.cwd }),
        timeoutMs: input.limits.timeoutMs,
        maxInputBytes: input.limits.maxInputBytes,
        maxOutputBytes: input.limits.maxOutputBytes
      },
      signal
    );

    if (result.exitCode !== 0) {
      throw new XerifyError('PROVIDER_FAILURE', 'Provider process exited unsuccessfully', {
        retryable: true,
        details: { exitCode: result.exitCode, signal: result.signal }
      });
    }

    return {
      output: result.stdout,
      usage: null,
      durationMs: result.durationMs,
      inputTruncated: result.inputTruncated,
      outputTruncated: result.outputTruncated
    };
  }
}
