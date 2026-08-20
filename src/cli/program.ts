import { readFile } from 'node:fs/promises';
import os from 'node:os';
import process from 'node:process';
import { Readable } from 'node:stream';

import { Command, CommanderError, InvalidArgumentError } from 'commander';
import { z } from 'zod';

import { resolveConfig, type ConfigOverrides } from '../config/resolve.js';
import { initializeProject } from '../config/initialize.js';
import { redactResolvedConfig } from '../config/redact.js';
import { appendAuditRecord } from '../core/audit.js';
import { parseProviderReference } from '../core/contracts.js';
import { toXerifyError, XerifyError } from '../core/errors.js';
import { verificationExitCode } from '../core/verdict.js';
import { executeRecordedAsk, executeRecordedVerify } from '../history/execute.js';
import { RunHistoryStore } from '../history/store.js';
import { serveXerifyHttp } from '../mcp/http.js';
import { createXerifyMcpFactory } from '../mcp/server.js';
import { serveXerifyStdio } from '../mcp/stdio.js';
import { adaptersFromConfig, registryFromConfig } from '../providers/factory.js';
import type { ProviderAdapter } from '../providers/contract.js';
import { readStdin } from './io.js';
import {
  errorEnvelope,
  successEnvelope,
  writeHumanObject,
  writeJson,
  writeVerifyHuman,
  type OutputWriter
} from './output.js';

export const VERSION = '0.1.1';

export interface CliDependencies {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin: Readable;
  stdinIsTTY: boolean;
  writer: OutputWriter;
  platform: NodeJS.Platform;
  architecture: string;
  nodeVersion: string;
}

const defaults = (): CliDependencies => ({
  cwd: process.cwd(),
  env: process.env,
  stdin: process.stdin,
  stdinIsTTY: Boolean(process.stdin.isTTY),
  writer: {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value)
  },
  platform: process.platform,
  architecture: process.arch,
  nodeVersion: process.version
});

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('must be a positive integer');
  }
  return parsed;
}

function requestedCommand(argv: readonly string[]): string {
  const commands = [
    'ask',
    'verify',
    'health',
    'doctor',
    'providers',
    'config',
    'init',
    'runs',
    'mcp',
    'request'
  ];
  return argv.find((argument) => commands.includes(argument)) ?? 'cli';
}

function jsonRequested(argv: readonly string[]): boolean {
  return argv.includes('--json');
}

function optionOverrides(options: { timeout?: number; log?: string }): ConfigOverrides {
  return {
    ...(options.timeout === undefined ? {} : { limits: { timeoutMs: options.timeout } }),
    ...(options.log === undefined ? {} : { logPath: options.log })
  };
}

function providerReference(value: string | undefined, name: string) {
  if (!value) throw new XerifyError('INVALID_INPUT', `${name} is required`);
  try {
    return parseProviderReference(value);
  } catch (error) {
    throw new XerifyError('INVALID_INPUT', `${name} must use provider:model`, { cause: error });
  }
}

function installAbortHandlers(): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  return {
    signal: controller.signal,
    dispose: () => {
      process.removeListener('SIGINT', abort);
      process.removeListener('SIGTERM', abort);
    }
  };
}

async function stdinContext(dependencies: CliDependencies, limit: number): Promise<string> {
  if (dependencies.stdinIsTTY) return '';
  return await readStdin(dependencies.stdin, limit);
}

async function emitSuccess(
  dependencies: CliDependencies,
  json: boolean,
  command: string,
  data: unknown,
  options: { human?: () => void; auditPath?: string | null; exitCode?: number } = {}
): Promise<void> {
  if (options.auditPath) {
    await appendAuditRecord(options.auditPath, {
      command,
      outcome: 'success',
      exitCode: options.exitCode ?? 0,
      result: data
    });
  }
  if (json) writeJson(dependencies.writer, successEnvelope(command, data));
  else if (options.human) options.human();
  else writeHumanObject(dependencies.writer, data);
}

function findAdapters(adapters: readonly ProviderAdapter[], selector?: string): ProviderAdapter[] {
  if (!selector) return [...adapters];
  const normalized = selector.toLowerCase();
  return adapters.filter(
    (adapter) =>
      adapter.id.toLowerCase() === normalized ||
      adapter.capabilities().provider.toLowerCase() === normalized
  );
}

const RawRequestSchema = z
  .object({
    operation: z.enum(['ask', 'verify', 'request']).default('request'),
    prompt: z.string(),
    model: z.string().min(1).optional()
  })
  .strict();

export async function runCli(
  argv: readonly string[],
  providedDependencies: Partial<CliDependencies> = {}
): Promise<number> {
  const dependencies = { ...defaults(), ...providedDependencies };
  const json = jsonRequested(argv);
  let exitCode = 0;
  let activeAuditPath: string | null = null;
  const commandName = requestedCommand(argv);
  const program = new Command();

  const run = async (command: string, action: () => Promise<number | void>): Promise<void> => {
    activeAuditPath = null;
    try {
      exitCode = (await action()) ?? 0;
    } catch (error) {
      let typed = toXerifyError(error);
      if (activeAuditPath) {
        try {
          await appendAuditRecord(activeAuditPath, {
            command,
            outcome: 'error',
            exitCode: typed.exitCode,
            error: { code: typed.code, retryable: typed.retryable }
          });
        } catch (auditError) {
          typed = toXerifyError(auditError);
        }
      }
      exitCode = typed.exitCode;
      if (json) writeJson(dependencies.writer, errorEnvelope(command, typed.toBody()));
      else dependencies.writer.stderr(`Error [${typed.code}]: ${typed.message}\n`);
    }
  };

  program
    .name('xerify')
    .description('Ask another provider. Get a clear second opinion.')
    .version(VERSION)
    .option('--json', 'write one stable JSON object to stdout')
    .option('--timeout <milliseconds>', 'provider lifecycle timeout', positiveInteger)
    .option('--log <path>', 'append a secret-safe JSONL audit record')
    .showHelpAfterError()
    .allowExcessArguments(false)
    .exitOverride()
    .configureOutput({
      writeOut: (value) => dependencies.writer.stdout(value),
      writeErr: (value) => dependencies.writer.stderr(value)
    });

  program
    .command('ask')
    .description('ask a provider for a cross-provider second opinion')
    .argument('[question]', 'question to ask')
    .option('--question <question>', 'question to ask when stdin supplies context')
    .option('--from <provider:model>', 'declared author identity for provenance')
    .requiredOption('--to <provider:model>', 'target provider and model')
    .option('--adapter <id>', 'configured adapter id to use')
    .option('--context-label <label>', 'human-readable label for stdin evidence')
    .action(async (positionalQuestion: string | undefined, options: Record<string, unknown>) => {
      await run('ask', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const context = await stdinContext(dependencies, resolved.config.limits.maxInputBytes);
        const question = positionalQuestion ?? (options.question as string | undefined);
        if (!question) throw new XerifyError('INVALID_INPUT', 'A question is required');
        const abort = installAbortHandlers();
        try {
          const result = await executeRecordedAsk(
            {
              ...(options.from
                ? { from: providerReference(options.from as string, '--from') }
                : {}),
              to: providerReference(options.to as string, '--to'),
              question,
              context,
              limits: resolved.config.limits
            },
            registryFromConfig(resolved.config, { env: dependencies.env }),
            {
              signal: abort.signal,
              history: new RunHistoryStore(resolved.config.history),
              surface: 'cli',
              ...(options.adapter ? { adapterId: options.adapter as string } : {}),
              ...(options.contextLabel ? { contextLabel: options.contextLabel as string } : {})
            }
          );
          await emitSuccess(dependencies, json, 'ask', result, {
            auditPath: activeAuditPath,
            human: () => {
              dependencies.writer.stdout(
                result.answer.endsWith('\n') ? result.answer : `${result.answer}\n`
              );
            }
          });
        } finally {
          abort.dispose();
        }
      });
    });

  program
    .command('verify')
    .description('verify a claim with a different provider')
    .requiredOption('--from <provider:model>', 'declared author identity')
    .requiredOption('--to <provider:model>', 'target provider and verifier model')
    .requiredOption('--claim <claim>', 'claim to evaluate')
    .option('--adapter <id>', 'configured adapter id to use')
    .option('--context-label <label>', 'human-readable label for stdin evidence')
    .action(async (options: Record<string, unknown>) => {
      await run('verify', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const context = await stdinContext(dependencies, resolved.config.limits.maxInputBytes);
        const abort = installAbortHandlers();
        try {
          const result = await executeRecordedVerify(
            {
              from: providerReference(options.from as string, '--from'),
              to: providerReference(options.to as string, '--to'),
              claim: options.claim as string,
              context,
              limits: resolved.config.limits
            },
            registryFromConfig(resolved.config, { env: dependencies.env }),
            {
              signal: abort.signal,
              history: new RunHistoryStore(resolved.config.history),
              surface: 'cli',
              ...(options.adapter ? { adapterId: options.adapter as string } : {}),
              ...(options.contextLabel ? { contextLabel: options.contextLabel as string } : {})
            }
          );
          const resultExitCode = verificationExitCode(result);
          await emitSuccess(dependencies, json, 'verify', result, {
            auditPath: activeAuditPath,
            exitCode: resultExitCode,
            human: () => writeVerifyHuman(dependencies.writer, result)
          });
          return resultExitCode;
        } finally {
          abort.dispose();
        }
      });
    });

  program
    .command('health')
    .description('show project readiness and linked providers without a billable model call')
    .option('--network', 'include explicit endpoint reachability probes', false)
    .action(async (options: { network: boolean }) => {
      await run('health', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const adapters = adaptersFromConfig(resolved.config, { env: dependencies.env });
        const probes = await Promise.all(
          adapters.map((adapter) =>
            adapter.probe({ network: options.network, timeoutMs: resolved.config.limits.timeoutMs })
          )
        );
        const linked = probes.filter((probe) => probe.available);
        const status =
          linked.length === 0
            ? 'setup-required'
            : linked.length === probes.length
              ? 'ready'
              : 'degraded';
        const data = {
          status,
          usable: linked.length > 0,
          xerifyVersion: VERSION,
          nodeVersion: dependencies.nodeVersion,
          platform: dependencies.platform,
          architecture: dependencies.architecture,
          project: {
            initialized: resolved.paths.loaded.includes(resolved.paths.project),
            configPath: resolved.paths.project,
            loadedConfigPaths: resolved.paths.loaded
          },
          history: {
            enabled: resolved.config.history.enabled,
            directory: resolved.config.history.directory,
            archiveDirectory: resolved.config.history.archiveDirectory,
            captureInput: resolved.config.history.captureInput,
            captureOutput: resolved.config.history.captureOutput
          },
          providers: {
            identityBasis: 'invocation-provider',
            configured: probes.length,
            linked: linked.length,
            identities: [...new Set(linked.map((probe) => probe.provider))].sort(),
            adapters: probes
          },
          networkProbed: options.network
        };
        await emitSuccess(dependencies, json, 'health', data, {
          auditPath: activeAuditPath
        });
      });
    });

  program
    .command('doctor')
    .description('report setup truth without making a billable provider call')
    .option('--network', 'include explicit endpoint reachability probes', false)
    .action(async (options: { network: boolean }) => {
      await run('doctor', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const adapters = adaptersFromConfig(resolved.config, { env: dependencies.env });
        const probes = await Promise.all(
          adapters.map((adapter) =>
            adapter.probe({ network: options.network, timeoutMs: resolved.config.limits.timeoutMs })
          )
        );
        const data = {
          xerifyVersion: VERSION,
          nodeVersion: dependencies.nodeVersion,
          platform: dependencies.platform,
          architecture: dependencies.architecture,
          config: { paths: resolved.paths, valid: true },
          history: resolved.config.history,
          providers: probes,
          mcp: { sdkMajor: 2, stdioSafe: true },
          tempDirectory: os.tmpdir(),
          networkProbed: options.network
        };
        await emitSuccess(dependencies, json, 'doctor', data, {
          auditPath: activeAuditPath
        });
      });
    });

  program
    .command('init')
    .description('initialize .xerify/xverify-config.json and secret-safe project logs')
    .action(async () => {
      await run('init', async () => {
        const data = await initializeProject(dependencies.cwd);
        await emitSuccess(dependencies, json, 'init', data, {
          human: () => {
            dependencies.writer.stdout(`Initialized Xerify project state at ${data.root}\n`);
          }
        });
      });
    });

  const runs = program
    .command('runs')
    .description('inspect and manage local deterministic run records');
  runs
    .command('list')
    .description('list active or archived runs without provider calls')
    .option('--archived', 'list archived runs', false)
    .option('--limit <count>', 'maximum records', positiveInteger, 50)
    .action(async (options: { archived: boolean; limit: number }) => {
      await run('runs.list', async () => {
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform
        });
        const location = options.archived ? 'archive' : 'active';
        const data = await new RunHistoryStore(resolved.config.history).list(
          location,
          options.limit
        );
        await emitSuccess(dependencies, json, 'runs.list', { location, runs: data });
      });
    });
  runs
    .command('show')
    .description('show a run record; evidence content is opt-in')
    .argument('<run>', 'sequence or xrun_<sequence>')
    .option('--archived', 'read from the archive', false)
    .option('--include-evidence', 'include captured evidence content', false)
    .action(async (selector: string, options: { archived: boolean; includeEvidence: boolean }) => {
      await run('runs.show', async () => {
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform
        });
        const data = await new RunHistoryStore(resolved.config.history).show(selector, {
          location: options.archived ? 'archive' : 'active',
          includeEvidence: options.includeEvidence
        });
        await emitSuccess(dependencies, json, 'runs.show', data);
      });
    });
  runs
    .command('search')
    .description('search compact archived run heads and metadata without opening every record')
    .argument('<query>', 'text to match in archived run metadata')
    .option('--limit <count>', 'maximum matches', positiveInteger, 50)
    .action(async (query: string, options: { limit: number }) => {
      await run('runs.search', async () => {
        const resolved = await resolveConfig({ cwd: dependencies.cwd, env: dependencies.env });
        const data = await new RunHistoryStore(resolved.config.history).searchArchive(
          query,
          options.limit
        );
        await emitSuccess(dependencies, json, 'runs.search', {
          location: 'archive',
          query,
          runs: data
        });
      });
    });
  runs
    .command('archive')
    .description('move an active run into the local archive')
    .argument('<run>', 'sequence or xrun_<sequence>')
    .action(async (selector: string) => {
      await run('runs.archive', async () => {
        const resolved = await resolveConfig({ cwd: dependencies.cwd, env: dependencies.env });
        const data = await new RunHistoryStore(resolved.config.history).archive(selector);
        await emitSuccess(dependencies, json, 'runs.archive', data);
      });
    });
  runs
    .command('restore')
    .description('restore an archived run to the active list')
    .argument('<run>', 'sequence or xrun_<sequence>')
    .action(async (selector: string) => {
      await run('runs.restore', async () => {
        const resolved = await resolveConfig({ cwd: dependencies.cwd, env: dependencies.env });
        const data = await new RunHistoryStore(resolved.config.history).restore(selector);
        await emitSuccess(dependencies, json, 'runs.restore', data);
      });
    });
  runs
    .command('delete')
    .description('permanently delete one local run record')
    .argument('<run>', 'sequence or xrun_<sequence>')
    .option('--archived', 'delete from the archive', false)
    .option('--yes', 'confirm permanent deletion', false)
    .action(async (selector: string, options: { archived: boolean; yes: boolean }) => {
      await run('runs.delete', async () => {
        if (!options.yes) {
          throw new XerifyError('INVALID_INPUT', 'Permanent deletion requires --yes');
        }
        const resolved = await resolveConfig({ cwd: dependencies.cwd, env: dependencies.env });
        const data = await new RunHistoryStore(resolved.config.history).delete(
          selector,
          options.archived ? 'archive' : 'active'
        );
        await emitSuccess(dependencies, json, 'runs.delete', data);
      });
    });

  const providers = program
    .command('providers')
    .description('discover and probe provider adapters');
  providers
    .command('list')
    .description('list configured provider capabilities without live calls')
    .action(async () => {
      await run('providers.list', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const data = adaptersFromConfig(resolved.config, { env: dependencies.env }).map(
          (adapter) => ({
            id: adapter.id,
            ...adapter.capabilities()
          })
        );
        await emitSuccess(dependencies, json, 'providers.list', data, {
          auditPath: activeAuditPath
        });
      });
    });
  providers
    .command('probe')
    .description('probe executable/auth availability without a provider call')
    .option('--provider <id-or-provider>', 'adapter id or invocation-provider identity')
    .option('--all', 'probe every configured adapter')
    .option('--network', 'include explicit endpoint reachability probes', false)
    .action(async (options: { provider?: string; all?: boolean; network: boolean }) => {
      await run('providers.probe', async () => {
        if (!options.all && !options.provider) {
          throw new XerifyError('INVALID_INPUT', 'Use --provider <id> or --all');
        }
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const selected = findAdapters(
          adaptersFromConfig(resolved.config, { env: dependencies.env }),
          options.provider
        );
        if (options.provider && selected.length === 0) {
          throw new XerifyError(
            'PROVIDER_UNAVAILABLE',
            'Configured provider adapter was not found',
            {
              details: { provider: options.provider }
            }
          );
        }
        const data = await Promise.all(
          selected.map((adapter) =>
            adapter.probe({ network: options.network, timeoutMs: resolved.config.limits.timeoutMs })
          )
        );
        await emitSuccess(dependencies, json, 'providers.probe', data, {
          auditPath: activeAuditPath
        });
      });
    });

  const config = program
    .command('config')
    .description('inspect validated configuration with all secret values redacted');
  for (const subcommand of ['show', 'validate'] as const) {
    config
      .command(subcommand)
      .description(
        subcommand === 'show'
          ? 'show resolved config values and their sources'
          : 'validate config files and print the resolved result'
      )
      .action(async () => {
        await run(`config.${subcommand}`, async () => {
          const global = program.opts<{ timeout?: number; log?: string }>();
          const resolved = await resolveConfig({
            cwd: dependencies.cwd,
            env: dependencies.env,
            platform: dependencies.platform,
            overrides: optionOverrides(global)
          });
          activeAuditPath = resolved.config.logPath;
          await emitSuccess(
            dependencies,
            json,
            `config.${subcommand}`,
            redactResolvedConfig(resolved),
            {
              auditPath: activeAuditPath
            }
          );
        });
      });
  }

  const mcp = program.command('mcp').description('serve the Xerify core over MCP');
  mcp
    .command('stdio')
    .description('serve MCP over the local STDIO protocol channel')
    .action(async () => {
      await run('mcp.stdio', async () => {
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform
        });
        activeAuditPath = resolved.config.logPath;
        if (activeAuditPath) {
          await appendAuditRecord(activeAuditPath, {
            command: 'mcp.stdio',
            outcome: 'success',
            exitCode: 0,
            result: {}
          });
        }
        const factory = createXerifyMcpFactory({
          registry: registryFromConfig(resolved.config, { env: dependencies.env }),
          history: new RunHistoryStore(resolved.config.history),
          version: VERSION
        });
        const handle = serveXerifyStdio(factory, {
          onerror: (error) => dependencies.writer.stderr(`MCP error: ${error.message}\n`)
        });
        const close = () => void handle.close();
        process.once('SIGINT', close);
        process.once('SIGTERM', close);
      });
    });
  mcp
    .command('http')
    .description('serve MCP over Streamable HTTP')
    .option('--host <host>', 'bind host', '127.0.0.1')
    .option('--port <port>', 'bind port', positiveInteger, 8787)
    .option('--token-env <name>', 'environment variable containing the bearer token')
    .option('--allow-public', 'confirm an authenticated non-loopback bind', false)
    .action(
      async (options: { host: string; port: number; tokenEnv?: string; allowPublic: boolean }) => {
        await run('mcp.http', async () => {
          if (options.tokenEnv && !/^[A-Z_][A-Z0-9_]*$/.test(options.tokenEnv)) {
            throw new XerifyError(
              'INVALID_INPUT',
              '--token-env must name an uppercase environment variable'
            );
          }
          const bearerToken = options.tokenEnv ? dependencies.env[options.tokenEnv] : undefined;
          if (options.tokenEnv && !bearerToken) {
            throw new XerifyError('AUTH_UNAVAILABLE', `${options.tokenEnv} is missing`);
          }
          const resolved = await resolveConfig({
            cwd: dependencies.cwd,
            env: dependencies.env,
            platform: dependencies.platform
          });
          activeAuditPath = resolved.config.logPath;
          const handle = await serveXerifyHttp({
            factory: createXerifyMcpFactory({
              registry: registryFromConfig(resolved.config, { env: dependencies.env }),
              history: new RunHistoryStore(resolved.config.history),
              version: VERSION
            }),
            host: options.host,
            port: options.port,
            ...(bearerToken === undefined ? {} : { bearerToken }),
            allowPublic: options.allowPublic,
            onerror: (error) => dependencies.writer.stderr(`MCP error: ${error.message}\n`)
          });
          const close = () => void handle.close();
          process.once('SIGINT', close);
          process.once('SIGTERM', close);
          try {
            await emitSuccess(
              dependencies,
              json,
              'mcp.http',
              {
                url: handle.url,
                host: handle.host,
                port: handle.port,
                authenticated: bearerToken !== undefined
              },
              { auditPath: activeAuditPath }
            );
          } catch (error) {
            await handle.close();
            throw error;
          }
        });
      }
    );

  program
    .command('request')
    .description('send a bounded raw adapter envelope without verification guarantees')
    .requiredOption('--to <provider:model>', 'target provider and model')
    .requiredOption('--input <path>', 'JSON request envelope path')
    .option('--adapter <id>', 'configured adapter id to use')
    .action(async (options: { to: string; input: string; adapter?: string }) => {
      await run('request', async () => {
        const global = program.opts<{ timeout?: number; log?: string }>();
        const resolved = await resolveConfig({
          cwd: dependencies.cwd,
          env: dependencies.env,
          platform: dependencies.platform,
          overrides: optionOverrides(global)
        });
        activeAuditPath = resolved.config.logPath;
        const raw = await readFile(options.input, 'utf8');
        if (Buffer.byteLength(raw) > resolved.config.limits.maxInputBytes) {
          throw new XerifyError('INVALID_INPUT', 'Request file exceeds the configured input limit');
        }
        const envelope = RawRequestSchema.parse(JSON.parse(raw) as unknown);
        const to = providerReference(options.to, '--to');
        const adapter = registryFromConfig(resolved.config, { env: dependencies.env }).resolve(
          to.provider,
          options.adapter
        );
        const abort = installAbortHandlers();
        try {
          const result = await adapter.invoke(
            {
              operation: envelope.operation,
              model: envelope.model ?? to.model,
              prompt: envelope.prompt,
              limits: resolved.config.limits
            },
            abort.signal
          );
          await emitSuccess(
            dependencies,
            json,
            'request',
            { to, ...result },
            {
              auditPath: activeAuditPath
            }
          );
        } finally {
          abort.dispose();
        }
      });
    });

  try {
    await program.parseAsync(['node', 'xerify', ...argv], { from: 'node' });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') return 0;
      const typed = new XerifyError('INVALID_INPUT', error.message);
      if (json) writeJson(dependencies.writer, errorEnvelope(commandName, typed.toBody()));
      exitCode = 2;
    } else {
      const typed = toXerifyError(error);
      if (json) writeJson(dependencies.writer, errorEnvelope(commandName, typed.toBody()));
      else dependencies.writer.stderr(`Error [${typed.code}]: ${typed.message}\n`);
      exitCode = typed.exitCode;
    }
  }
  return exitCode;
}

export function stdinFromString(value: string): Readable {
  return Readable.from([value]);
}
