import type { RequestLimits, Usage } from '../core/contracts.js';

export type AuthKind = 'subscription' | 'api-key' | 'local' | 'unknown';
export type ProviderTransport = 'command' | 'http';
export type AuthSource = 'env' | 'config' | 'provider-cli' | 'local' | 'missing' | 'unknown';

export interface ProviderCapabilities {
  provider: string;
  transports: readonly ProviderTransport[];
  authKinds: readonly AuthKind[];
  structuredOutput: boolean;
  reportsUsage: boolean;
  supportsAbort: boolean;
}

export interface ProbeInput {
  network: boolean;
  timeoutMs: number;
}

export interface ProbeResult {
  adapterId: string;
  provider: string;
  available: boolean;
  executable: string | null;
  auth: {
    kind: AuthKind;
    status: 'present' | 'missing' | 'managed' | 'unknown' | 'not-required';
    source: AuthSource;
  };
  detail: string;
}

export interface InvokeInput {
  operation: 'ask' | 'verify' | 'request';
  model: string;
  prompt: string;
  limits: RequestLimits;
}

export interface InvokeResult {
  output: string;
  usage: Usage | null;
  durationMs: number;
  inputTruncated: boolean;
  outputTruncated: boolean;
}

export interface ProviderAdapter {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  probe(input: ProbeInput): Promise<ProbeResult>;
  invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult>;
}
