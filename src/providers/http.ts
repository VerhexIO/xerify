import { XerifyError } from '../core/errors.js';
import { BoundedCollector } from '../process/bounds.js';

export type FetchLike = typeof fetch;

export interface JsonRequestResult {
  data: unknown;
  durationMs: number;
  outputTruncated: boolean;
}

function httpFailure(status: number): XerifyError {
  if (status === 401 || status === 403) {
    return new XerifyError('AUTH_UNAVAILABLE', 'Provider rejected authentication', {
      details: { status }
    });
  }
  return new XerifyError('PROVIDER_FAILURE', 'Provider API request failed', {
    retryable: status === 408 || status === 409 || status === 429 || status >= 500,
    details: { status }
  });
}

export async function postJson(
  options: {
    endpoint: string;
    headers: Readonly<Record<string, string>>;
    body: unknown;
    timeoutMs: number;
    maxOutputBytes: number;
    fetch: FetchLike;
  },
  signal: AbortSignal
): Promise<JsonRequestResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  timeout.unref();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });

  try {
    const response = await options.fetch(options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...options.headers },
      body: JSON.stringify(options.body),
      signal: controller.signal
    });
    const collector = new BoundedCollector(options.maxOutputBytes);
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        collector.append(Buffer.from(chunk.value));
        if (collector.truncated) {
          await reader.cancel();
          break;
        }
      }
    } else {
      collector.append(await response.text());
    }
    const body = collector.result();
    if (!response.ok) throw httpFailure(response.status);
    try {
      return {
        data: JSON.parse(body.text) as unknown,
        durationMs: Math.max(0, Date.now() - startedAt),
        outputTruncated: body.truncated
      };
    } catch (error) {
      throw new XerifyError('INVALID_PROVIDER_RESPONSE', 'Provider returned invalid JSON', {
        retryable: true,
        details: { outputTruncated: body.truncated },
        cause: error
      });
    }
  } catch (error) {
    if (error instanceof XerifyError) throw error;
    if (signal.aborted) {
      throw new XerifyError('CANCELLED', 'Provider invocation was cancelled', { retryable: true });
    }
    if (timedOut) {
      throw new XerifyError('TIMEOUT', 'Provider invocation timed out', { retryable: true });
    }
    throw new XerifyError('PROVIDER_FAILURE', 'Provider API request failed', {
      retryable: true,
      cause: error
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function probeHttpEndpoint(
  endpoint: string,
  headers: Readonly<Record<string, string>>,
  timeoutMs: number,
  fetchFunction: FetchLike
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref();
  try {
    const response = await fetchFunction(endpoint, {
      method: 'HEAD',
      headers,
      signal: controller.signal
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
