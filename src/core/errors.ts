import { ZodError } from 'zod';

import type { ErrorBody } from './contracts.js';

export type XerifyErrorCode =
  | 'INVALID_INPUT'
  | 'CONFIG_INVALID'
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTH_UNAVAILABLE'
  | 'UNSUPPORTED'
  | 'SAME_PROVIDER'
  | 'PROVENANCE_UNPROVABLE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'PROVIDER_FAILURE'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR';

const EXIT_CODES: Record<XerifyErrorCode, number> = {
  INVALID_INPUT: 2,
  CONFIG_INVALID: 2,
  SAME_PROVIDER: 2,
  PROVENANCE_UNPROVABLE: 2,
  PROVIDER_UNAVAILABLE: 3,
  AUTH_UNAVAILABLE: 3,
  UNSUPPORTED: 3,
  TIMEOUT: 4,
  CANCELLED: 4,
  PROVIDER_FAILURE: 5,
  INVALID_PROVIDER_RESPONSE: 6,
  INTERNAL_ERROR: 5
};

export class XerifyError extends Error {
  readonly code: XerifyErrorCode;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;

  constructor(
    code: XerifyErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'XerifyError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }

  get exitCode(): number {
    return EXIT_CODES[this.code];
  }

  toBody(): ErrorBody {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details
    };
  }
}

export function toXerifyError(error: unknown): XerifyError {
  if (error instanceof XerifyError) return error;
  if (error instanceof ZodError) {
    return new XerifyError('INVALID_INPUT', 'Input did not match the required schema', {
      details: {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      cause: error
    });
  }
  if (error instanceof Error) {
    return new XerifyError('INTERNAL_ERROR', 'Unexpected internal error', {
      cause: error
    });
  }
  return new XerifyError('INTERNAL_ERROR', 'Unexpected internal error');
}
