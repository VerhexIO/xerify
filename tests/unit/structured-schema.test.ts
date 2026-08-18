import { describe, expect, it } from 'vitest';

import { VERIFICATION_JSON_SCHEMA } from '../../src/core/structured-schema.js';

function asObject(value: unknown): Record<string, unknown> {
  expect(value).not.toBeNull();
  expect(typeof value).toBe('object');
  expect(Array.isArray(value)).toBe(false);
  return value as Record<string, unknown>;
}

describe('provider verification schema', () => {
  it('is derived as a required strict generation boundary', () => {
    const root = asObject(VERIFICATION_JSON_SCHEMA);
    expect(root.additionalProperties).toBe(false);
    expect(root.required).toEqual([
      'verdict',
      'summary',
      'findings',
      'evidence',
      'assumptions',
      'limitations',
      'unverifiedClaims'
    ]);

    const properties = asObject(root.properties);
    const findings = asObject(properties.findings);
    const finding = asObject(findings.items);
    expect(finding.required).toEqual(['severity', 'message', 'evidence']);
    expect(finding.additionalProperties).toBe(false);
  });

  it('removes unsupported generation constraints while core Zod keeps them', () => {
    const serialized = JSON.stringify(VERIFICATION_JSON_SCHEMA);
    for (const keyword of [
      '$schema',
      'minLength',
      'maxLength',
      'minItems',
      'maxItems',
      'minimum',
      'maximum',
      'default'
    ]) {
      expect(serialized).not.toContain(`"${keyword}"`);
    }
  });
});
