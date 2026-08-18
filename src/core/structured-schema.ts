import { z } from 'zod';

import { StructuredVerifierPayloadSchema } from './contracts.js';

const unsupportedGenerationKeywords = new Set([
  '$schema',
  'default',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'pattern'
]);

function providerCompatibleSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(providerCompatibleSchema);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !unsupportedGenerationKeywords.has(key))
      .map(([key, nested]) => [key, providerCompatibleSchema(nested)])
  );
}

// Derived from the canonical Zod field definitions, then reduced to the JSON
// Schema subset shared by strict provider output implementations. Core Zod
// validation still enforces the removed byte/count constraints after receipt.
export const VERIFICATION_JSON_SCHEMA = providerCompatibleSchema(
  z.toJSONSchema(StructuredVerifierPayloadSchema, {
    target: 'draft-2020-12',
    io: 'output'
  })
) as Record<string, unknown>;
