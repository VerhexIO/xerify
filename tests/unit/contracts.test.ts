import { describe, expect, it } from 'vitest';

import {
  AskRequestSchema,
  CliErrorEnvelopeSchema,
  CliSuccessEnvelopeSchema,
  ErrorBodySchema,
  parseProviderReference,
  ProviderReferenceSchema,
  StructuredVerifierPayloadSchema,
  VerifierPayloadSchema,
  VerifyRequestSchema
} from '../../src/core/contracts.js';

describe('provider references', () => {
  it('parses provider:model without guessing provenance', () => {
    expect(parseProviderReference('openai:gpt-test')).toEqual({
      provider: 'openai',
      model: 'gpt-test',
      provenance: 'declared'
    });
  });

  it.each(['openai', ':model', 'provider:', 'provider:model with spaces'])(
    'rejects invalid reference %s',
    (value) => {
      expect(() => parseProviderReference(value)).toThrow();
    }
  );
});

describe('request schemas', () => {
  const to = parseProviderReference('anthropic:claude-test');

  it('allows ask without an author identity', () => {
    const request = AskRequestSchema.parse({ to, question: 'Review this' });
    expect(request.context).toBe('');
    expect(request.from).toBeUndefined();
  });

  it('requires verify author identity', () => {
    expect(() => VerifyRequestSchema.parse({ to, claim: 'Safe' })).toThrow();
  });

  it('does not accept self-attested observed provenance on public requests', () => {
    const observed = { provider: 'openai', model: 'author', provenance: 'observed' };
    expect(() => VerifyRequestSchema.parse({ from: observed, to, claim: 'Safe' })).toThrow();
    expect(ProviderReferenceSchema.parse(observed)).toEqual(observed);
  });
});

describe('verifier payload', () => {
  it('accepts the exact public payload', () => {
    expect(
      VerifierPayloadSchema.parse({
        verdict: 'confirmed',
        summary: 'Evidence supports the claim.',
        findings: []
      })
    ).toEqual({
      verdict: 'confirmed',
      summary: 'Evidence supports the claim.',
      findings: []
    });
  });

  it('rejects unknown fields', () => {
    expect(() =>
      VerifierPayloadSchema.parse({
        verdict: 'confirmed',
        summary: 'Okay',
        findings: [],
        confidence: 1
      })
    ).toThrow();
  });

  it('accepts additive epistemic fields and enforces the structured provider boundary', () => {
    const payload = {
      verdict: 'confirmed' as const,
      summary: 'No material counterexample was found.',
      findings: [{ severity: 'info' as const, message: 'No contradiction found.', evidence: '' }],
      evidence: [{ reference: 'src/example.ts:10', observation: 'The guarded write occurs here.' }],
      assumptions: ['All mutation paths are represented in the supplied diff.'],
      limitations: ['No runtime trace was supplied.'],
      unverifiedClaims: []
    };

    expect(StructuredVerifierPayloadSchema.parse(payload)).toEqual(payload);
    expect(VerifierPayloadSchema.parse(payload)).toEqual(payload);
    expect(() =>
      StructuredVerifierPayloadSchema.parse({ ...payload, limitations: undefined })
    ).toThrow();
  });
});

describe('CLI envelope schemas', () => {
  it('accepts a stable success envelope with command-specific data', () => {
    expect(
      CliSuccessEnvelopeSchema.parse({
        ok: true,
        schemaVersion: 1,
        command: 'doctor',
        data: { providers: [] }
      })
    ).toMatchObject({ ok: true, command: 'doctor' });
  });

  it('accepts the typed error body and rejects extra envelope fields', () => {
    const error = ErrorBodySchema.parse({
      code: 'INVALID_INPUT',
      message: 'Bad request',
      retryable: false,
      details: {}
    });
    expect(() =>
      CliErrorEnvelopeSchema.parse({
        ok: false,
        schemaVersion: 1,
        command: 'verify',
        error,
        extra: true
      })
    ).toThrow();
  });
});
