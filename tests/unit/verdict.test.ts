import { describe, expect, it } from 'vitest';

import type { ProviderReference, VerifyResult } from '../../src/core/contracts.js';
import { XerifyError } from '../../src/core/errors.js';
import {
  assertProviderSeparation,
  parseVerifierPayload,
  verificationExitCode
} from '../../src/core/verdict.js';

const reference = (
  provider: string,
  provenance: ProviderReference['provenance'] = 'declared'
): ProviderReference => ({ provider, model: 'test-model', provenance });

describe('provider separation', () => {
  it('accepts distinct invocation-provider identities', () => {
    expect(() =>
      assertProviderSeparation(reference('openai'), reference('anthropic'))
    ).not.toThrow();
  });

  it('admits direct OpenAI to Cursor even when the model lineage label overlaps', () => {
    expect(() =>
      assertProviderSeparation(
        { provider: 'openai', model: 'gpt-test', provenance: 'declared' },
        { provider: 'cursor', model: 'gpt-test', provenance: 'declared' }
      )
    ).not.toThrow();
  });

  it('rejects two Cursor models regardless of their upstream family labels', () => {
    expect(() =>
      assertProviderSeparation(
        { provider: 'cursor', model: 'gpt-test', provenance: 'declared' },
        { provider: 'cursor', model: 'claude-test', provenance: 'declared' }
      )
    ).toThrow('different providers');
  });

  it('rejects the same provider case-insensitively', () => {
    try {
      assertProviderSeparation(reference('OpenAI'), reference('openai'));
      expect.fail('expected provider separation to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(XerifyError);
      expect((error as XerifyError).code).toBe('SAME_PROVIDER');
    }
  });

  it('rejects unknown provenance', () => {
    try {
      assertProviderSeparation(reference('openai', 'unknown'), reference('anthropic'));
      expect.fail('expected unknown provenance to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(XerifyError);
      expect((error as XerifyError).code).toBe('PROVENANCE_UNPROVABLE');
    }
  });
});

describe('strict verdict parsing', () => {
  it('does not recover JSON from prose or fences', () => {
    expect(() =>
      parseVerifierPayload('```json\n{"verdict":"confirmed","summary":"x","findings":[]}\n```')
    ).toThrow();
  });
});

describe('verification exit policy', () => {
  const result = (partial: Partial<VerifyResult>): VerifyResult => ({
    schemaVersion: 1,
    id: 'xrf_test',
    from: reference('openai'),
    to: reference('anthropic'),
    verdict: 'confirmed',
    summary: 'Done',
    findings: [],
    usage: null,
    durationMs: 1,
    truncation: { input: false, output: false },
    failure: null,
    ...partial
  });

  it.each([
    [result({ verdict: 'confirmed' }), 0],
    [result({ verdict: 'refuted' }), 10],
    [result({ verdict: 'unclear' }), 11],
    [
      result({
        verdict: 'unclear',
        failure: { code: 'TIMEOUT', message: 'Timed out', retryable: true }
      }),
      4
    ],
    [
      result({
        verdict: 'unclear',
        failure: {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'Invalid JSON',
          retryable: true
        }
      }),
      6
    ]
  ])('maps %# to exit code', (value, expected) => {
    expect(verificationExitCode(value)).toBe(expected);
  });
});
