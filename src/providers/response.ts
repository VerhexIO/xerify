import type { ZodType } from 'zod';

import { XerifyError } from '../core/errors.js';

export function parseProviderResponse<T>(
  schema: ZodType<T>,
  value: unknown,
  providerLabel: string
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    throw new XerifyError(
      'INVALID_PROVIDER_RESPONSE',
      `${providerLabel} response did not match the expected schema`,
      { retryable: true, cause: error }
    );
  }
}

export function parseProviderJson<T>(schema: ZodType<T>, raw: string, providerLabel: string): T {
  try {
    return parseProviderResponse(schema, JSON.parse(raw) as unknown, providerLabel);
  } catch (error) {
    if (error instanceof XerifyError) throw error;
    throw new XerifyError('INVALID_PROVIDER_RESPONSE', `${providerLabel} returned invalid JSON`, {
      retryable: true,
      cause: error
    });
  }
}
