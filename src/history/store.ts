import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

import type { HistoryConfig } from '../config/schema.js';
import {
  SCHEMA_VERSION,
  type AskResult,
  type ProviderReference,
  type RequestLimits,
  type VerifyResult
} from '../core/contracts.js';
import { summarizeForAudit } from '../core/audit.js';
import { toXerifyError, XerifyError } from '../core/errors.js';
import {
  EvidenceManifestSchema,
  RunEventSchema,
  RunProcessSchema,
  RunRequestRecordSchema,
  type EvidenceManifest,
  type RunEvent,
  type RunOperation,
  type RunProcess,
  type RunSurface
} from './contracts.js';

export interface StartRunInput {
  operation: RunOperation;
  surface: RunSurface;
  from: ProviderReference | null;
  to: ProviderReference;
  adapterId?: string;
  statementKind: 'question' | 'claim';
  statement: string;
  context: string;
  contextLabel?: string;
  limits: RequestLimits;
}

export interface RunSession {
  process: RunProcess;
  path: string;
}

export interface RunRecordView {
  location: 'active' | 'archive';
  path: string;
  process: RunProcess;
  request: unknown;
  result: unknown | null;
  error: unknown | null;
  evidenceManifest: EvidenceManifest;
  evidence?: Readonly<Record<string, string>>;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function safeRoot(root: string, name: string): string {
  const resolved = path.resolve(root);
  if (resolved === path.parse(resolved).root) {
    throw new XerifyError('CONFIG_INVALID', `${name} cannot be a filesystem root`, {
      details: { path: resolved }
    });
  }
  return resolved;
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new XerifyError('CONFIG_INVALID', 'Run history path must be a real directory', {
      details: { path: directory }
    });
  }
}

async function atomicWrite(filePath: string, value: string): Promise<void> {
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(value, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, filePath);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function appendEvent(directory: string, event: RunEvent): Promise<void> {
  const noFollow = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
  const handle = await open(
    path.join(directory, 'events.jsonl'),
    constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | noFollow,
    0o600
  );
  try {
    await handle.writeFile(`${JSON.stringify(RunEventSchema.parse(event))}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function captureText(value: string, capture: HistoryConfig['captureInput']) {
  return {
    capture,
    bytes: capture === 'none' ? null : bytes(value),
    sha256: capture === 'none' ? null : sha256(value),
    value: capture === 'full' ? value : null
  };
}

function runSelector(value: string): string {
  const normalized = value.startsWith('xrun_') ? value.slice('xrun_'.length) : value;
  if (!/^\d+$/.test(normalized)) {
    throw new XerifyError('INVALID_INPUT', 'Run selector must be a sequence or xrun_<sequence>');
  }
  return normalized;
}

export class RunHistoryStore {
  readonly #config: HistoryConfig;
  readonly #activeRoot: string;
  readonly #archiveRoot: string;
  readonly #sequenceRoot: string;

  constructor(config: HistoryConfig) {
    this.#config = config;
    this.#activeRoot = safeRoot(config.directory, 'history.directory');
    this.#archiveRoot = safeRoot(config.archiveDirectory, 'history.archiveDirectory');
    this.#sequenceRoot = path.join(this.#activeRoot, '.sequences');
    if (this.#activeRoot === this.#archiveRoot) {
      throw new XerifyError('CONFIG_INVALID', 'History and archive directories must be different');
    }
  }

  get enabled(): boolean {
    return this.#config.enabled;
  }

  async #directories(root: string): Promise<string[]> {
    await ensurePrivateDirectory(root);
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map((entry) => entry.name);
  }

  async #allocate(): Promise<{ sequence: number; directory: string; runPath: string }> {
    await Promise.all([
      ensurePrivateDirectory(this.#activeRoot),
      ensurePrivateDirectory(this.#archiveRoot),
      ensurePrivateDirectory(this.#sequenceRoot)
    ]);
    const all = [
      ...(await this.#directories(this.#activeRoot)),
      ...(await this.#directories(this.#archiveRoot)),
      ...(await this.#directories(this.#sequenceRoot))
    ];
    let sequence = all.reduce((maximum, value) => Math.max(maximum, Number(value)), 0) + 1;
    for (let attempt = 0; attempt < 1_000; attempt += 1, sequence += 1) {
      const directory = String(sequence).padStart(this.#config.sequencePadding, '0');
      const runPath = path.join(this.#activeRoot, directory);
      try {
        await mkdir(path.join(this.#sequenceRoot, directory), { mode: 0o700 });
        await mkdir(runPath, { mode: 0o700 });
        return { sequence, directory, runPath };
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'EEXIST') continue;
        throw error;
      }
    }
    throw new XerifyError('CONFIG_INVALID', 'Unable to allocate a run sequence');
  }

  async start(input: StartRunInput): Promise<RunSession | null> {
    if (!this.enabled) return null;
    try {
      const allocated = await this.#allocate();
      const now = new Date().toISOString();
      const id = `xrun_${allocated.directory}`;
      const contextLabel = input.contextLabel?.trim() || 'stdin';
      const contextDigest = sha256(input.context);
      const evidenceDirectory = path.join(allocated.runPath, 'evidence');
      await ensurePrivateDirectory(evidenceDirectory);
      let evidenceFile: string | null = null;
      if (this.#config.captureInput === 'full' && input.context.length > 0) {
        evidenceFile = `001-${contextDigest.slice('sha256:'.length)}.txt`;
        await atomicWrite(path.join(evidenceDirectory, evidenceFile), input.context);
      }
      const hasContextRecord = this.#config.captureInput !== 'none' && input.context.length > 0;
      const manifest = EvidenceManifestSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        runId: id,
        entries: hasContextRecord
          ? [
              {
                evidenceId: 'E-001',
                kind: 'stdin-context',
                locator: contextLabel,
                contentSha256: contextDigest,
                bytes: bytes(input.context),
                file: evidenceFile
              }
            ]
          : []
      });
      const request = RunRequestRecordSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        runId: id,
        operation: input.operation,
        recordedAt: now,
        from: input.from,
        to: input.to,
        adapterId: input.adapterId ?? null,
        statementKind: input.statementKind,
        statement: captureText(input.statement, this.#config.captureInput),
        context: {
          ...captureText(input.context, this.#config.captureInput),
          label: contextLabel,
          evidenceId: hasContextRecord ? 'E-001' : null,
          evidenceFile
        },
        limits: input.limits
      });
      const processRecord = RunProcessSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        id,
        sequence: allocated.sequence,
        directory: allocated.directory,
        operation: input.operation,
        surface: input.surface,
        status: 'running',
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        from: input.from,
        to: input.to,
        adapterId: input.adapterId ?? null,
        outcome: null
      });
      await Promise.all([
        writeJson(path.join(allocated.runPath, 'process.json'), processRecord),
        writeJson(path.join(allocated.runPath, 'request.json'), request),
        writeJson(path.join(evidenceDirectory, 'manifest.json'), manifest)
      ]);
      await appendEvent(allocated.runPath, {
        schemaVersion: SCHEMA_VERSION,
        timestamp: now,
        runId: id,
        event: 'started',
        status: 'running',
        exitCode: null,
        verdict: null,
        errorCode: null
      });
      return { process: processRecord, path: allocated.runPath };
    } catch (error) {
      throw new XerifyError('CONFIG_INVALID', 'Unable to initialize the Xerify run record', {
        cause: error
      });
    }
  }

  async complete(
    session: RunSession | null,
    result: AskResult | VerifyResult,
    exitCode: number
  ): Promise<void> {
    if (!session) return;
    const now = new Date().toISOString();
    const verdict = 'verdict' in result ? result.verdict : null;
    const resultValue =
      this.#config.captureOutput === 'normalized'
        ? result
        : this.#config.captureOutput === 'metadata'
          ? summarizeForAudit(result)
          : null;
    if (resultValue !== null) {
      await writeJson(path.join(session.path, 'result.json'), resultValue);
    }
    const processRecord = RunProcessSchema.parse({
      ...session.process,
      status: 'completed',
      updatedAt: now,
      outcome: {
        exitCode,
        resultId: result.id,
        verdict,
        errorCode: 'failure' in result ? (result.failure?.code ?? null) : null
      }
    });
    await writeJson(path.join(session.path, 'process.json'), processRecord);
    await appendEvent(session.path, {
      schemaVersion: SCHEMA_VERSION,
      timestamp: now,
      runId: processRecord.id,
      event: 'completed',
      status: 'completed',
      exitCode,
      verdict,
      errorCode: processRecord.outcome?.errorCode ?? null
    });
  }

  async fail(session: RunSession | null, error: unknown): Promise<void> {
    if (!session) return;
    const typed = toXerifyError(error);
    const now = new Date().toISOString();
    const errorRecord = {
      schemaVersion: SCHEMA_VERSION,
      runId: session.process.id,
      code: typed.code,
      message: typed.message,
      retryable: typed.retryable,
      exitCode: typed.exitCode
    };
    await writeJson(path.join(session.path, 'error.json'), errorRecord);
    const processRecord = RunProcessSchema.parse({
      ...session.process,
      status: 'failed',
      updatedAt: now,
      outcome: {
        exitCode: typed.exitCode,
        resultId: null,
        verdict: null,
        errorCode: typed.code
      }
    });
    await writeJson(path.join(session.path, 'process.json'), processRecord);
    await appendEvent(session.path, {
      schemaVersion: SCHEMA_VERSION,
      timestamp: now,
      runId: processRecord.id,
      event: 'failed',
      status: 'failed',
      exitCode: typed.exitCode,
      verdict: null,
      errorCode: typed.code
    });
  }

  async #resolve(selector: string, location: 'active' | 'archive') {
    const wanted = Number(runSelector(selector));
    const root = location === 'active' ? this.#activeRoot : this.#archiveRoot;
    const directory = (await this.#directories(root)).find((entry) => Number(entry) === wanted);
    if (!directory) {
      throw new XerifyError('INVALID_INPUT', 'Run record was not found', {
        details: { selector, location }
      });
    }
    const runPath = path.join(root, directory);
    const raw = await readJson(path.join(runPath, 'process.json'));
    if (raw === null) throw new XerifyError('CONFIG_INVALID', 'Run process record is missing');
    return { directory, runPath, process: RunProcessSchema.parse(raw) };
  }

  async list(location: 'active' | 'archive' = 'active', limit = 50): Promise<RunProcess[]> {
    const root = location === 'active' ? this.#activeRoot : this.#archiveRoot;
    const directories = (await this.#directories(root))
      .sort((left, right) => Number(right) - Number(left))
      .slice(0, limit);
    const records = await Promise.all(
      directories.map(async (directory) => {
        const raw = await readJson(path.join(root, directory, 'process.json'));
        return raw === null ? null : RunProcessSchema.parse(raw);
      })
    );
    return records.filter((record): record is RunProcess => record !== null);
  }

  async show(
    selector: string,
    options: { location?: 'active' | 'archive'; includeEvidence?: boolean } = {}
  ): Promise<RunRecordView> {
    const location = options.location ?? 'active';
    const resolved = await this.#resolve(selector, location);
    const manifestRaw = await readJson(path.join(resolved.runPath, 'evidence', 'manifest.json'));
    if (manifestRaw === null) {
      throw new XerifyError('CONFIG_INVALID', 'Run evidence manifest is missing');
    }
    const manifest = EvidenceManifestSchema.parse(manifestRaw);
    const evidence: Record<string, string> = {};
    if (options.includeEvidence) {
      for (const entry of manifest.entries) {
        if (entry.file) {
          const content = await readFile(
            path.join(resolved.runPath, 'evidence', entry.file),
            'utf8'
          );
          if (sha256(content) !== entry.contentSha256 || bytes(content) !== entry.bytes) {
            throw new XerifyError('CONFIG_INVALID', 'Run evidence failed integrity validation', {
              details: { runId: resolved.process.id, evidenceId: entry.evidenceId }
            });
          }
          evidence[entry.evidenceId] = content;
        }
      }
    }
    return {
      location,
      path: resolved.runPath,
      process: resolved.process,
      request: RunRequestRecordSchema.parse(
        await readJson(path.join(resolved.runPath, 'request.json'))
      ),
      result: await readJson(path.join(resolved.runPath, 'result.json')),
      error: await readJson(path.join(resolved.runPath, 'error.json')),
      evidenceManifest: manifest,
      ...(options.includeEvidence ? { evidence } : {})
    };
  }

  async archive(selector: string): Promise<{ id: string; path: string }> {
    const resolved = await this.#resolve(selector, 'active');
    if (resolved.process.status === 'running') {
      throw new XerifyError('INVALID_INPUT', 'A running record cannot be archived');
    }
    await ensurePrivateDirectory(this.#archiveRoot);
    const target = path.join(this.#archiveRoot, resolved.directory);
    try {
      await lstat(target);
      throw new XerifyError('CONFIG_INVALID', 'Archive target already exists', {
        details: { target }
      });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    await rename(resolved.runPath, target);
    const now = new Date().toISOString();
    const processRecord = RunProcessSchema.parse({
      ...resolved.process,
      updatedAt: now,
      archivedAt: now
    });
    await writeJson(path.join(target, 'process.json'), processRecord);
    await appendEvent(target, {
      schemaVersion: SCHEMA_VERSION,
      timestamp: now,
      runId: processRecord.id,
      event: 'archived',
      status: processRecord.status,
      exitCode: processRecord.outcome?.exitCode ?? null,
      verdict: processRecord.outcome?.verdict ?? null,
      errorCode: processRecord.outcome?.errorCode ?? null
    });
    return { id: processRecord.id, path: target };
  }

  async restore(selector: string): Promise<{ id: string; path: string }> {
    const resolved = await this.#resolve(selector, 'archive');
    await ensurePrivateDirectory(this.#activeRoot);
    const target = path.join(this.#activeRoot, resolved.directory);
    try {
      await lstat(target);
      throw new XerifyError('CONFIG_INVALID', 'Active run target already exists', {
        details: { target }
      });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    await rename(resolved.runPath, target);
    const now = new Date().toISOString();
    const processRecord = RunProcessSchema.parse({
      ...resolved.process,
      updatedAt: now,
      archivedAt: null
    });
    await writeJson(path.join(target, 'process.json'), processRecord);
    await appendEvent(target, {
      schemaVersion: SCHEMA_VERSION,
      timestamp: now,
      runId: processRecord.id,
      event: 'restored',
      status: processRecord.status,
      exitCode: processRecord.outcome?.exitCode ?? null,
      verdict: processRecord.outcome?.verdict ?? null,
      errorCode: processRecord.outcome?.errorCode ?? null
    });
    return { id: processRecord.id, path: target };
  }

  async delete(
    selector: string,
    location: 'active' | 'archive' = 'active'
  ): Promise<{ id: string; deleted: true; recoverable: false }> {
    const resolved = await this.#resolve(selector, location);
    if (resolved.process.status === 'running') {
      throw new XerifyError('INVALID_INPUT', 'A running record cannot be deleted');
    }
    await rm(resolved.runPath, { recursive: true, force: false });
    return { id: resolved.process.id, deleted: true, recoverable: false };
  }
}
