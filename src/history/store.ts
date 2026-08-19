import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, readdir, rename, rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

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
  ArchiveIndexEntrySchema,
  EvidenceManifestSchema,
  HistoryHeadSchema,
  RunEventSchema,
  RunProcessSchema,
  RunRequestRecordSchema,
  type ArchiveIndexEntry,
  type EvidenceManifest,
  type HistoryHead,
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

function containsPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
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

async function assertEmptyReservation(directory: string): Promise<void> {
  try {
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new XerifyError('CONFIG_INVALID', 'Run sequence reservation must be a real directory', {
        details: { directory }
      });
    }
    if ((await readdir(directory)).length > 0) {
      throw new XerifyError('CONFIG_INVALID', 'Run sequence reservation must be empty', {
        details: { directory: path.basename(directory) }
      });
    }
  } catch (error) {
    if (error instanceof XerifyError) throw error;
    throw new XerifyError('CONFIG_INVALID', 'Unable to validate run sequence reservation', {
      details: { directory },
      cause: error
    });
  }
}

async function pathKind(candidate: string): Promise<'missing' | 'directory' | 'file'> {
  try {
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink()) {
      throw new XerifyError('CONFIG_INVALID', 'Run history metadata cannot be a symbolic link', {
        details: { path: candidate }
      });
    }
    if (metadata.isDirectory()) return 'directory';
    if (metadata.isFile()) return 'file';
    throw new XerifyError(
      'CONFIG_INVALID',
      'Run history metadata must be a regular file or directory',
      {
        details: { path: candidate }
      }
    );
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing';
    throw error;
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

async function readOptionalText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return '';
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

async function appendArchiveIndex(filePath: string, entry: ArchiveIndexEntry): Promise<void> {
  const noFollow = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
  const handle = await open(
    filePath,
    constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | noFollow,
    0o600
  );
  try {
    await handle.writeFile(`${JSON.stringify(ArchiveIndexEntrySchema.parse(entry))}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function runHead(
  operation: RunOperation,
  statement: string,
  capture: HistoryConfig['captureInput']
): string {
  if (capture === 'none') return `${operation}: input capture disabled`;
  if (capture === 'metadata') return `${operation}: ${sha256(statement).slice(0, 23)}`;
  const normalized = statement.replace(/\s+/g, ' ').trim() || '(empty statement)';
  const prefix = `${operation}: `;
  const available = 200 - prefix.length;
  const characters = Array.from(normalized);
  return `${prefix}${characters.slice(0, available).join('')}`;
}

function capturedRunHead(
  operation: RunOperation,
  statement: { capture: HistoryConfig['captureInput']; sha256: string | null; value: string | null }
): string {
  if (statement.capture === 'full' && statement.value !== null) {
    return runHead(operation, statement.value, 'full');
  }
  if (statement.capture === 'metadata' && statement.sha256 !== null) {
    return `${operation}: ${statement.sha256.slice(0, 23)}`;
  }
  return `${operation}: input capture disabled`;
}

function captureText(value: string, capture: HistoryConfig['captureInput']) {
  return {
    capture,
    bytes: capture === 'none' ? null : bytes(value),
    sha256: capture === 'none' ? null : sha256(value),
    value: capture === 'full' ? value : null
  };
}

const MAX_SEQUENCE = BigInt(Number.MAX_SAFE_INTEGER);

function parseSequence(value: string, source: string): bigint {
  const sequence = BigInt(value);
  if (sequence < 1n || sequence > MAX_SEQUENCE) {
    throw new XerifyError('CONFIG_INVALID', `${source} is outside the supported sequence range`, {
      details: { value, maximum: Number.MAX_SAFE_INTEGER }
    });
  }
  return sequence;
}

function runSelector(value: string): bigint {
  const normalized = value.startsWith('xrun_') ? value.slice('xrun_'.length) : value;
  if (!/^\d+$/.test(normalized)) {
    throw new XerifyError('INVALID_INPUT', 'Run selector must be a sequence or xrun_<sequence>');
  }
  return parseSequence(normalized, 'Run selector');
}

export class RunHistoryStore {
  readonly #config: HistoryConfig;
  readonly #activeRoot: string;
  readonly #archiveRoot: string;
  readonly #headPath: string;
  readonly #headLockPath: string;
  readonly #archiveIndexPath: string;
  readonly #legacySequenceRoot: string;

  constructor(config: HistoryConfig) {
    this.#config = config;
    this.#activeRoot = safeRoot(config.directory, 'history.directory');
    this.#archiveRoot = safeRoot(config.archiveDirectory, 'history.archiveDirectory');
    this.#headPath = path.join(this.#activeRoot, 'HEAD.json');
    this.#headLockPath = path.join(this.#activeRoot, '.HEAD.lock');
    this.#archiveIndexPath = path.join(this.#archiveRoot, 'index.jsonl');
    this.#legacySequenceRoot = path.join(this.#activeRoot, '.sequences');
    if (
      this.#activeRoot === this.#archiveRoot ||
      containsPath(this.#activeRoot, this.#archiveRoot) ||
      containsPath(this.#archiveRoot, this.#activeRoot)
    ) {
      throw new XerifyError('CONFIG_INVALID', 'History and archive directories must be disjoint');
    }
  }

  get enabled(): boolean {
    return this.#config.enabled;
  }

  async #directories(root: string): Promise<string[]> {
    await ensurePrivateDirectory(root);
    const entries = (await readdir(root, { withFileTypes: true })).filter((entry) =>
      /^\d+$/.test(entry.name)
    );
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        throw new XerifyError(
          'CONFIG_INVALID',
          'Numeric run history entry must be a real directory',
          {
            details: { entry: entry.name }
          }
        );
      }
      parseSequence(entry.name, 'Run history directory');
    }
    return entries.map((entry) => entry.name);
  }

  async #legacyReservations(): Promise<string[]> {
    const kind = await pathKind(this.#legacySequenceRoot);
    if (kind === 'missing') return [];
    if (kind !== 'directory') {
      throw new XerifyError('CONFIG_INVALID', 'Legacy sequence metadata must be a directory');
    }
    const entries = await readdir(this.#legacySequenceRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!/^\d+$/.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) {
        throw new XerifyError('CONFIG_INVALID', 'Legacy sequence entry is invalid', {
          details: { entry: entry.name }
        });
      }
      parseSequence(entry.name, 'Legacy run sequence');
      await assertEmptyReservation(path.join(this.#legacySequenceRoot, entry.name));
    }
    return entries.map((entry) => entry.name);
  }

  async #removeLegacyReservations(reservations: string[]): Promise<void> {
    for (const reservation of reservations) {
      await rmdir(path.join(this.#legacySequenceRoot, reservation));
    }
    await rmdir(this.#legacySequenceRoot);
  }

  async #readHead(): Promise<HistoryHead | null> {
    const kind = await pathKind(this.#headPath);
    if (kind === 'missing') return null;
    if (kind !== 'file') {
      throw new XerifyError('CONFIG_INVALID', 'Run history HEAD must be a regular file');
    }
    const raw = await readJson(this.#headPath);
    const head = HistoryHeadSchema.parse(raw);
    if (
      BigInt(head.lastDirectory) !== BigInt(head.lastSequence) ||
      head.lastRunId !== `xrun_${head.lastDirectory}`
    ) {
      throw new XerifyError('CONFIG_INVALID', 'Run history HEAD identity is inconsistent');
    }
    return head;
  }

  async #acquireHeadLock(): Promise<() => Promise<void>> {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const token = randomUUID();
      try {
        const handle = await open(this.#headLockPath, 'wx', 0o600);
        try {
          await handle.writeFile(
            `${JSON.stringify({ token, pid: process.pid, acquiredAt: new Date().toISOString() })}\n`,
            'utf8'
          );
          await handle.sync();
        } finally {
          await handle.close();
        }
        return async () => {
          try {
            const current = JSON.parse(await readFile(this.#headLockPath, 'utf8')) as {
              token?: unknown;
            };
            if (current.token === token) await rm(this.#headLockPath, { force: true });
          } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
              throw error;
            }
          }
        };
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
        const metadata = await lstat(this.#headLockPath).catch((metadataError: unknown) => {
          if (
            metadataError instanceof Error &&
            'code' in metadataError &&
            metadataError.code === 'ENOENT'
          ) {
            return null;
          }
          throw metadataError;
        });
        if (metadata === null) continue;
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new XerifyError('CONFIG_INVALID', 'Run history HEAD lock is invalid');
        }
        if (Date.now() - metadata.mtimeMs > 30_000) {
          const stale = `${this.#headLockPath}.stale.${randomUUID()}`;
          try {
            await rename(this.#headLockPath, stale);
            await rm(stale, { force: true });
          } catch (staleError) {
            if (!(
              staleError instanceof Error &&
              'code' in staleError &&
              staleError.code === 'ENOENT'
            )) {
              throw staleError;
            }
          }
          continue;
        }
        await delay(10);
      }
    }
    throw new XerifyError('CONFIG_INVALID', 'Timed out acquiring the run history HEAD lock');
  }

  async #bootstrapSequence(legacyReservations: string[]): Promise<bigint> {
    const all = [
      ...(await this.#directories(this.#activeRoot)),
      ...(await this.#directories(this.#archiveRoot)),
      ...legacyReservations
    ];
    return all.reduce((maximum, value) => {
      const candidate = parseSequence(value, 'Run history directory');
      return candidate > maximum ? candidate : maximum;
    }, 0n);
  }

  async #allocate(): Promise<{ sequence: number; directory: string; runPath: string }> {
    await Promise.all([
      ensurePrivateDirectory(this.#activeRoot),
      ensurePrivateDirectory(this.#archiveRoot)
    ]);
    const release = await this.#acquireHeadLock();
    try {
      const existingHead = await this.#readHead();
      const legacyReservations = await this.#legacyReservations();
      const legacyMaximum = legacyReservations.reduce((maximum, value) => {
        const candidate = parseSequence(value, 'Legacy run sequence');
        return candidate > maximum ? candidate : maximum;
      }, 0n);
      const baseline = existingHead
        ? BigInt(existingHead.lastSequence) > legacyMaximum
          ? BigInt(existingHead.lastSequence)
          : legacyMaximum
        : await this.#bootstrapSequence(legacyReservations);
      let sequence = baseline + 1n;
      for (let attempt = 0; attempt < 1_000; attempt += 1, sequence += 1n) {
        if (sequence > MAX_SEQUENCE) {
          throw new XerifyError('CONFIG_INVALID', 'Run history sequence space is exhausted', {
            details: { maximum: Number.MAX_SAFE_INTEGER }
          });
        }
        const directory = sequence.toString().padStart(this.#config.sequencePadding, '0');
        const runPath = path.join(this.#activeRoot, directory);
        const archivePath = path.join(this.#archiveRoot, directory);
        if (
          (await pathKind(runPath)) !== 'missing' ||
          (await pathKind(archivePath)) !== 'missing'
        ) {
          continue;
        }
        await writeJson(this.#headPath, {
          schemaVersion: SCHEMA_VERSION,
          lastSequence: Number(sequence),
          lastDirectory: directory,
          lastRunId: `xrun_${directory}`,
          updatedAt: new Date().toISOString()
        });
        if (legacyReservations.length > 0) {
          await this.#removeLegacyReservations(legacyReservations);
        } else if ((await pathKind(this.#legacySequenceRoot)) === 'directory') {
          await rmdir(this.#legacySequenceRoot);
        }
        try {
          await mkdir(runPath, { mode: 0o700 });
          return { sequence: Number(sequence), directory, runPath };
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'EEXIST') continue;
          throw error;
        }
      }
      throw new XerifyError('CONFIG_INVALID', 'Unable to allocate a run sequence');
    } finally {
      await release();
    }
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
        head: runHead(input.operation, input.statement, this.#config.captureInput),
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

  async #recordDigest(runPath: string): Promise<string> {
    const [processRecord, requestRecord, resultRecord, errorRecord, evidenceManifest] =
      await Promise.all([
        readFile(path.join(runPath, 'process.json'), 'utf8'),
        readFile(path.join(runPath, 'request.json'), 'utf8'),
        readOptionalText(path.join(runPath, 'result.json')),
        readOptionalText(path.join(runPath, 'error.json')),
        readFile(path.join(runPath, 'evidence', 'manifest.json'), 'utf8')
      ]);
    return sha256(
      `${processRecord}\u0000${requestRecord}\u0000${resultRecord}\u0000${errorRecord}\u0000${evidenceManifest}`
    );
  }

  async #appendIndexEntry(
    event: ArchiveIndexEntry['event'],
    location: ArchiveIndexEntry['location'],
    source: ArchiveIndexEntry['source'],
    processRecord: RunProcess,
    runPath: string,
    timestamp = new Date().toISOString()
  ): Promise<ArchiveIndexEntry> {
    await ensurePrivateDirectory(this.#archiveRoot);
    const entry = ArchiveIndexEntrySchema.parse({
      schemaVersion: SCHEMA_VERSION,
      timestamp,
      event,
      location,
      source,
      process: processRecord,
      recordSha256: await this.#recordDigest(runPath)
    });
    await appendArchiveIndex(this.#archiveIndexPath, entry);
    return entry;
  }

  async #readArchiveIndex(): Promise<ArchiveIndexEntry[]> {
    const kind = await pathKind(this.#archiveIndexPath);
    if (kind === 'missing') return [];
    if (kind !== 'file') {
      throw new XerifyError('CONFIG_INVALID', 'Archive index must be a regular JSONL file');
    }
    const content = await readFile(this.#archiveIndexPath, 'utf8');
    return content
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line, index) => {
        try {
          return ArchiveIndexEntrySchema.parse(JSON.parse(line) as unknown);
        } catch (error) {
          throw new XerifyError('CONFIG_INVALID', 'Archive index contains an invalid entry', {
            details: { line: index + 1 },
            cause: error
          });
        }
      });
  }

  async #readProcess(runPath: string): Promise<RunProcess> {
    const raw = await readJson(path.join(runPath, 'process.json'));
    if (raw === null) throw new XerifyError('CONFIG_INVALID', 'Run process record is missing');
    let processRecord = RunProcessSchema.parse(raw);
    if (
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw) &&
      !Object.prototype.hasOwnProperty.call(raw, 'head')
    ) {
      const requestRaw = await readJson(path.join(runPath, 'request.json'));
      const request = RunRequestRecordSchema.parse(requestRaw);
      processRecord = RunProcessSchema.parse({
        ...processRecord,
        head: capturedRunHead(processRecord.operation, request.statement)
      });
      await writeJson(path.join(runPath, 'process.json'), processRecord);
    }
    return processRecord;
  }

  async #reconcileArchiveIndex(): Promise<ArchiveIndexEntry[]> {
    const entries = await this.#readArchiveIndex();
    const latest = new Map<string, ArchiveIndexEntry>();
    for (const entry of entries) latest.set(entry.process.id, entry);
    const archiveDirectories = new Set(await this.#directories(this.#archiveRoot));
    const activeDirectories = new Set(await this.#directories(this.#activeRoot));

    for (const directory of archiveDirectories) {
      const id = `xrun_${directory}`;
      const current = latest.get(id);
      if (current?.location === 'archive') continue;
      const runPath = path.join(this.#archiveRoot, directory);
      let processRecord = await this.#readProcess(runPath);
      if (processRecord.archivedAt === null) {
        const now = new Date().toISOString();
        processRecord = RunProcessSchema.parse({
          ...processRecord,
          updatedAt: now,
          archivedAt: now
        });
        await writeJson(path.join(runPath, 'process.json'), processRecord);
      }
      const entry = await this.#appendIndexEntry(
        'archived',
        'archive',
        'reconciled',
        processRecord,
        runPath,
        processRecord.archivedAt ?? processRecord.updatedAt
      );
      entries.push(entry);
      latest.set(id, entry);
    }

    for (const entry of latest.values()) {
      if (entry.location !== 'archive' || archiveDirectories.has(entry.process.directory)) continue;
      if (activeDirectories.has(entry.process.directory)) {
        const runPath = path.join(this.#activeRoot, entry.process.directory);
        const restored = await this.#appendIndexEntry(
          'restored',
          'active',
          'reconciled',
          await this.#readProcess(runPath),
          runPath
        );
        entries.push(restored);
      } else {
        const missing = ArchiveIndexEntrySchema.parse({
          ...entry,
          timestamp: new Date().toISOString(),
          event: 'missing',
          location: 'missing',
          source: 'reconciled'
        });
        await appendArchiveIndex(this.#archiveIndexPath, missing);
        entries.push(missing);
      }
    }
    return entries;
  }

  async #resolve(selector: string, location: 'active' | 'archive') {
    const wanted = runSelector(selector);
    const root = location === 'active' ? this.#activeRoot : this.#archiveRoot;
    const directory = (await this.#directories(root)).find(
      (entry) => parseSequence(entry, 'Run history directory') === wanted
    );
    if (directory === undefined) {
      throw new XerifyError('INVALID_INPUT', 'Run record was not found', {
        details: { selector, location }
      });
    }
    const runPath = path.join(root, directory);
    const processRecord = await this.#readProcess(runPath);
    if (BigInt(processRecord.sequence) !== wanted || processRecord.directory !== directory) {
      throw new XerifyError('CONFIG_INVALID', 'Run process identity is inconsistent');
    }
    return { directory, runPath, process: processRecord };
  }

  async list(location: 'active' | 'archive' = 'active', limit = 50): Promise<RunProcess[]> {
    if (location === 'archive') {
      const entries = await this.#reconcileArchiveIndex();
      const latest = new Map<string, ArchiveIndexEntry>();
      for (const entry of entries) latest.set(entry.process.id, entry);
      return [...latest.values()]
        .filter((entry) => entry.location === 'archive')
        .sort((left, right) => right.process.sequence - left.process.sequence)
        .slice(0, limit)
        .map((entry) => entry.process);
    }
    const root = location === 'active' ? this.#activeRoot : this.#archiveRoot;
    const directories = (await this.#directories(root))
      .sort((left, right) => Number(right) - Number(left))
      .slice(0, limit);
    const records = await Promise.all(
      directories.map(async (directory) => {
        return this.#readProcess(path.join(root, directory));
      })
    );
    return records;
  }

  async searchArchive(query: string, limit = 50): Promise<RunProcess[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0 || normalized.length > 200) {
      throw new XerifyError('INVALID_INPUT', 'Archive search query must be 1 to 200 characters');
    }
    const entries = await this.#reconcileArchiveIndex();
    const latest = new Map<string, ArchiveIndexEntry>();
    for (const entry of entries) latest.set(entry.process.id, entry);
    return [...latest.values()]
      .filter((entry) => entry.location === 'archive')
      .filter((entry) => {
        const processRecord = entry.process;
        return [
          processRecord.id,
          processRecord.head,
          processRecord.operation,
          processRecord.surface,
          processRecord.status,
          processRecord.createdAt,
          processRecord.updatedAt,
          processRecord.archivedAt,
          processRecord.adapterId,
          processRecord.from?.provider,
          processRecord.from?.model,
          processRecord.to.provider,
          processRecord.to.model,
          processRecord.outcome?.verdict,
          processRecord.outcome?.errorCode,
          processRecord.outcome?.exitCode
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      })
      .sort((left, right) => right.process.sequence - left.process.sequence)
      .slice(0, limit)
      .map((entry) => entry.process);
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
    await this.#appendIndexEntry('archived', 'archive', 'command', processRecord, target, now);
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
    await this.#appendIndexEntry('restored', 'active', 'command', processRecord, target, now);
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
    const recordSha256 = await this.#recordDigest(resolved.runPath);
    await rm(resolved.runPath, { recursive: true, force: false });
    await ensurePrivateDirectory(this.#archiveRoot);
    await appendArchiveIndex(
      this.#archiveIndexPath,
      ArchiveIndexEntrySchema.parse({
        schemaVersion: SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        event: 'deleted',
        location: 'deleted',
        source: 'command',
        process: resolved.process,
        recordSha256
      })
    );
    return { id: resolved.process.id, deleted: true, recoverable: false };
  }
}
