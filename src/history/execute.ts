import {
  AskRequestSchema,
  VerifyRequestSchema,
  type AskRequest,
  type AskResult,
  type VerifyRequest,
  type VerifyResult
} from '../core/contracts.js';
import { executeAsk, executeVerify } from '../core/execute.js';
import type { ExecuteOptions } from '../core/execute.js';
import { verificationExitCode } from '../core/verdict.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { RunSurface } from './contracts.js';
import type { RunHistoryStore } from './store.js';

export interface RecordedExecuteOptions extends ExecuteOptions {
  history?: RunHistoryStore;
  surface?: RunSurface;
  contextLabel?: string;
}

export async function executeRecordedAsk(
  rawRequest: AskRequest,
  registry: ProviderRegistry,
  options: RecordedExecuteOptions = {}
): Promise<AskResult> {
  const request = AskRequestSchema.parse(rawRequest);
  const session = await options.history?.start({
    operation: 'ask',
    surface: options.surface ?? 'library',
    from: request.from ?? null,
    to: request.to,
    ...(options.adapterId ? { adapterId: options.adapterId } : {}),
    statementKind: 'question',
    statement: request.question,
    context: request.context,
    ...(options.contextLabel ? { contextLabel: options.contextLabel } : {}),
    limits: request.limits
  });
  try {
    const result = await executeAsk(request, registry, options);
    await options.history?.complete(session ?? null, result, 0);
    return result;
  } catch (error) {
    await options.history?.fail(session ?? null, error);
    throw error;
  }
}

export async function executeRecordedVerify(
  rawRequest: VerifyRequest,
  registry: ProviderRegistry,
  options: RecordedExecuteOptions = {}
): Promise<VerifyResult> {
  const request = VerifyRequestSchema.parse(rawRequest);
  const session = await options.history?.start({
    operation: 'verify',
    surface: options.surface ?? 'library',
    from: request.from,
    to: request.to,
    ...(options.adapterId ? { adapterId: options.adapterId } : {}),
    statementKind: 'claim',
    statement: request.claim,
    context: request.context,
    ...(options.contextLabel ? { contextLabel: options.contextLabel } : {}),
    limits: request.limits
  });
  try {
    const result = await executeVerify(request, registry, options);
    await options.history?.complete(session ?? null, result, verificationExitCode(result));
    return result;
  } catch (error) {
    await options.history?.fail(session ?? null, error);
    throw error;
  }
}
