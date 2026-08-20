import { describe, expect, it } from 'vitest';

import { FailureSchema, MAX_PROVIDER_MESSAGE_LENGTH } from '../../src/core/contracts.js';
import {
  describeEventFailure,
  describeProcessFailure,
  redactDiagnostic
} from '../../src/providers/diagnostic.js';

describe('provider failure diagnostics', () => {
  it('carries the provider’s own sentence through', () => {
    const stderr = "The 'gpt-5.6-sol' model requires a newer version of Codex\n";
    expect(describeProcessFailure(stderr)).toBe(
      "The 'gpt-5.6-sol' model requires a newer version of Codex"
    );
  });

  it('falls back to stdout when the process said nothing on stderr', () => {
    expect(describeProcessFailure('', 'model not available for this account')).toBe(
      'model not available for this account'
    );
  });

  it('returns null rather than an empty string when the process said nothing', () => {
    expect(describeProcessFailure('', '')).toBeNull();
    expect(describeProcessFailure('   \n  \n')).toBeNull();
  });

  it('keeps only the last few lines and bounds the total length', () => {
    const noisy = Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n');
    const described = describeProcessFailure(noisy);
    expect(described).toBe('line 36 | line 37 | line 38 | line 39');

    const long = describeProcessFailure('x'.repeat(4000));
    expect(long?.length).toBeLessThanOrEqual(501);
    expect(long?.endsWith('…')).toBe(true);
  });

  // Provider output is untrusted and error messages are exactly where a CLI is most likely to
  // echo back the credential it just rejected. This runs before the text reaches a result.
  it('redacts anything shaped like a credential', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['auth failed for sk-abcdef0123456789', 'sk-abcdef0123456789'],
      ['header was Bearer eyJhbGciOiJIUzI1NiJ9abcdefgh', 'Bearer eyJhbGciOiJIUzI1NiJ9abcdefgh'],
      ['OPENAI_API_KEY=super-secret-value rejected', 'super-secret-value'],
      ['token: abcdefgh12345678 is expired', 'abcdefgh12345678'],
      ['GET https://user:hunter2@api.example.com/v1 failed', 'hunter2'],
      // Userinfo without a password half is still userinfo, and requiring the colon let it past.
      ['GET https://username@example.com/path failed', 'username@example.com'],
      // A credential-bearing header whose name contains none of the words above. This exact line
      // survived an earlier version of the pattern set and reached the result verbatim.
      ['> Authorization: Basic YWxpY2U6U3VwZXJTZWNyZXQh', 'YWxpY2U6U3VwZXJTZWNyZXQh'],
      ['> Proxy-Authorization: Basic ZGVjb3k6c2VjcmV0', 'ZGVjb3k6c2VjcmV0'],
      ['Authorization=Digest abcdef1234567890', 'abcdef1234567890'],
      ['> Cookie: session=abc123def456', 'abc123def456']
    ];
    for (const [input, secret] of cases) {
      const redacted = redactDiagnostic(input);
      expect(redacted, input).not.toContain(secret);
      expect(redacted, input).toContain('[REDACTED]');
    }
  });

  // A prefix list covers only the vendors it names. An npm token reached a result verbatim under a
  // prefix-only pipeline, so the rule is structural: a long unbroken alphanumeric run mixing
  // letters and digits goes, whatever vendor issued it.
  it('redacts an opaque token whose vendor prefix is unknown', () => {
    // Assemble the credential-shaped fixtures at runtime so the repository release audit does
    // not mistake deliberate redaction inputs for credentials committed in source.
    const npmShapedToken = ['npm_', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('');
    const awsShapedToken = ['AKIA', 'IOSFODNN7EXAMPLEZZZZZZZ'].join('');
    for (const [input, secret] of [
      [`npm ERR! Authentication failed for token ${npmShapedToken}`, npmShapedToken],
      [`unknown token ${awsShapedToken} rejected`, awsShapedToken]
    ] as const) {
      const redacted = redactDiagnostic(input);
      expect(redacted, input).not.toContain(secret);
      expect(redacted, input).toContain('[REDACTED]');
    }
  });

  // The identifiers that make a failure diagnosable break into short segments, so the structural
  // rule above must not reach them. If it does, the field stops being worth having.
  it('keeps the identifiers a reader needs to act on', () => {
    for (const survivor of [
      'model claude-opus-4-5-20251101 is not available on this plan',
      "Error: Cannot find module '/tmp/xerify-command-rBJrxX/tools/verifier.mjs'",
      "code: 'MODULE_NOT_FOUND', requireStack: []",
      "The 'gpt-5.6-sol' model requires a newer version of Codex"
    ]) {
      expect(redactDiagnostic(survivor), survivor).toBe(survivor);
    }
  });

  // A cookie header carries several pairs. Consuming a fixed number of whitespace-delimited pieces
  // left everything after the first pair in the result.
  it('removes the whole header value, not just its first pair', () => {
    expect(redactDiagnostic('> Cookie: session=abc; csrf=SECRET')).toBe('> [REDACTED]');
    expect(redactDiagnostic('> Set-Cookie: a=1; b=2; token=SECRET; Path=/')).toBe('> [REDACTED]');
  });

  // Redaction runs per line, so a header rule that consumes to end of line cannot swallow the
  // lines that follow it.
  it('confines a header rule to its own line', () => {
    const described = describeProcessFailure(
      'request rejected\n> Cookie: a=1; b=SECRET\n> Authorization: Basic ZZZZ\nretry later'
    );
    expect(described).toBe('request rejected | > [REDACTED] | > [REDACTED] | retry later');
  });

  it('leaves an ordinary message untouched', () => {
    const plain = 'model gpt-4 is not available on this plan';
    expect(redactDiagnostic(plain)).toBe(plain);
  });

  // A provider CLI writes for a terminal. Colour codes and cursor moves are noise inside a JSON
  // result, and a caller that prints the result would hand those sequences to its own terminal.
  it('removes ANSI escapes and control characters', () => {
    const esc = String.fromCharCode(0x1b);
    expect(redactDiagnostic(`${esc}[31mred error${esc}[0m`)).toBe('red error');
    expect(redactDiagnostic(`${esc}[2J${esc}[Hclear screen attempt`)).toBe('clear screen attempt');

    const withControls = `line one${String.fromCharCode(7)}bell${String.fromCharCode(0)}nul`;
    const cleaned = redactDiagnostic(withControls);
    // eslint-disable-next-line no-control-regex
    expect(/[\u0000-\u0008\u000B-\u001F\u007F]/.test(cleaned)).toBe(false);
    expect(cleaned).toContain('bell');
  });

  // A terminal that accepts 8-bit controls reads U+009B exactly as it reads `ESC [`, so matching
  // only the ESC form leaves a working cursor-control sequence sitting in the message.
  it('removes the 8-bit forms of the escape sequences too', () => {
    const csi = String.fromCharCode(0x9b);
    const osc = String.fromCharCode(0x9d);
    const terminator = String.fromCharCode(0x9c);
    expect(redactDiagnostic(`${csi}2Jerased screen`)).toBe('erased screen');
    expect(redactDiagnostic(`${osc}0;title${terminator}real error`)).toBe('real error');
    // A C1 character that forms no complete sequence still must not survive as a control.
    expect(redactDiagnostic(`a${String.fromCharCode(0x85)}b`)).toBe('a b');
  });

  // A lone carriage return returns the cursor to the start of the line, so whatever follows
  // overwrites what the reader already saw. It is not covered by the escape-sequence rule.
  it('neutralizes a carriage return used to overwrite the line', () => {
    const cleaned = redactDiagnostic(`harmless${String.fromCharCode(0x0d)}OVERWRITTEN`);
    expect(cleaned).toBe('harmless OVERWRITTEN');
  });

  // An OSC sequence carries a payload between its introducer and terminator. Removing only the
  // introducer left `]0;window-title` sitting in the message as stray text.
  it('removes an OSC sequence together with its payload', () => {
    const escape = String.fromCharCode(0x1b);
    const bell = String.fromCharCode(0x07);
    expect(redactDiagnostic(`${escape}]0;window-title${bell}real error`)).toBe('real error');
  });

  it('never exceeds the bound the public schema declares', () => {
    const described = describeProcessFailure('y'.repeat(5000));
    expect(described).not.toBeNull();
    expect(described!.length).toBeLessThanOrEqual(MAX_PROVIDER_MESSAGE_LENGTH);
    expect(() =>
      FailureSchema.parse({
        code: 'PROVIDER_FAILURE',
        message: 'Provider process exited unsuccessfully',
        retryable: true,
        providerMessage: described
      })
    ).not.toThrow();
  });

  // Captured from a real `node missing.mjs` crash. The line that names the cause is fifth; the
  // last four lines name none of it. A misconfigured command adapter produces exactly this.
  it('prefers the line that states the error over the tail of a stack trace', () => {
    const crash = [
      'node:internal/modules/cjs/loader:1479',
      '  throw err;',
      '  ^',
      '',
      "Error: Cannot find module '/work/tools/mock-provider.mjs'",
      '    at Module._resolveFilename (node:internal/modules/cjs/loader:1476:15)',
      '    at Module._load (node:internal/modules/cjs/loader:1262:25) {',
      "  code: 'MODULE_NOT_FOUND',",
      '  requireStack: []',
      '}',
      '',
      'Node.js v24.15.0'
    ].join('\n');
    expect(describeProcessFailure(crash)).toBe(
      "Error: Cannot find module '/work/tools/mock-provider.mjs'"
    );
  });

  // Captured verbatim from a live `codex` rejection of an unknown model, which is the failure this
  // whole field exists for. Codex fronts an HTTP API and prints its JSON error body to stderr, so
  // the sentence a reader needs is nested inside the envelope.
  it('pulls the message out of a JSON error body printed on stderr', () => {
    const stderr =
      'ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error",' +
      '"message":"The \'gpt-9\' model is not supported when using Codex with a ChatGPT account."}}';
    expect(describeProcessFailure(stderr)).toBe(
      "The 'gpt-9' model is not supported when using Codex with a ChatGPT account."
    );
  });

  it('keeps the line as written when it embeds nothing parseable', () => {
    expect(describeProcessFailure('ERROR: {not valid json')).toBe('ERROR: {not valid json');
    expect(describeProcessFailure('error: unknown flag --foo')).toBe('error: unknown flag --foo');
  });

  it('still uses the tail when nothing states an error', () => {
    // A CLI that logs progress and then gives up puts the useful sentence last.
    expect(describeProcessFailure('connecting\nauthenticating\nmodel rejected by account')).toBe(
      'connecting | authenticating | model rejected by account'
    );
  });

  it('reads the message out of a JSONL failure event', () => {
    const stdout = [
      JSON.stringify({ type: 'thread.started', thread_id: 't' }),
      JSON.stringify({ type: 'turn.failed', error: { message: 'model requires a newer CLI' } })
    ].join('\n');
    expect(describeEventFailure(stdout, ['turn.failed', 'error'])).toBe(
      'model requires a newer CLI'
    );
  });

  // Captured verbatim from Codex v0.148.0 rejecting an unknown model — the failure this whole
  // field exists for. Codex reports the API's JSON error body as an event whose `message` is that
  // body serialized into a string, so the sentence a reader needs sits two wrappers deep.
  it('unwraps a Codex event whose message is itself a JSON error body', () => {
    const sentence =
      "The 'definitely-not-a-real-model' model is not supported when using Codex with a ChatGPT account.";
    const body = JSON.stringify({
      type: 'error',
      status: 400,
      error: { type: 'invalid_request_error', message: sentence }
    });
    const stdout = [
      JSON.stringify({ type: 'thread.started', thread_id: 't' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'error', message: body }),
      JSON.stringify({ type: 'turn.failed', error: { message: body } })
    ].join('\n');

    expect(describeEventFailure(stdout, ['turn.failed', 'error'])).toBe(sentence);
  });

  it('ignores unparseable lines and unrelated events', () => {
    const stdout = ['not json at all', JSON.stringify({ type: 'turn.completed' })].join('\n');
    expect(describeEventFailure(stdout, ['turn.failed'])).toBeNull();
  });

  it('redacts inside event messages too', () => {
    const stdout = JSON.stringify({ type: 'error', message: 'bad key sk-abcdef0123456789' });
    const described = describeEventFailure(stdout, ['error']);
    expect(described).not.toContain('sk-abcdef0123456789');
    expect(described).toContain('[REDACTED]');
  });
});
