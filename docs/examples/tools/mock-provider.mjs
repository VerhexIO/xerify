#!/usr/bin/env node
// Deterministic mock provider for the Xerify failure-mode examples.
//
// It is not a model. It reads the prompt on stdin, ignores it, and emits one fixed
// response chosen by its first argument. Every failure-mode example in this directory
// can therefore be reproduced with zero provider quota and identical output.
//
// Wire it through a `command` adapter:
//
//   "mock": {
//     "kind": "command",
//     "provider": "mock-lab",
//     "executable": "node",
//     "args": ["docs/examples/tools/mock-provider.mjs", "confirmed"],
//     "authKind": "local",
//     "structuredOutput": true
//   }

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const scenario = process.argv[2] ?? 'confirmed';

// Xerify always sends the prompt on stdin. Draining it keeps the pipe from breaking.
try {
  readFileSync(0, 'utf8');
} catch {
  // An empty or already-closed stdin is not an error for a mock.
}

const payload = (verdict, summary, findings = []) =>
  JSON.stringify({
    verdict,
    summary,
    findings,
    evidence: [
      {
        reference: 'supplied evidence envelope',
        observation: 'Deterministic mock response; no model judgement was involved.'
      }
    ],
    assumptions: ['The mock provider represents a provider that answers in the exact schema.'],
    limitations: ['No live model was called. This output is fixed.'],
    unverifiedClaims: []
  });

switch (scenario) {
  case 'confirmed':
    process.stdout.write(
      payload(
        'confirmed',
        'The supplied evidence supports the claim and no counterexample appears.'
      )
    );
    break;

  case 'refuted':
    process.stdout.write(
      payload('refuted', 'The supplied evidence contains a direct counterexample to the claim.', [
        {
          severity: 'high',
          message: 'The evidence states the opposite of the claim.',
          evidence: 'supplied evidence envelope'
        }
      ])
    );
    break;

  case 'unclear':
    process.stdout.write(
      payload('unclear', 'The supplied evidence is insufficient to decide the claim either way.')
    );
    break;

  // Answers in prose instead of the required JSON object.
  case 'prose':
    process.stdout.write('Yes, that looks right to me. I would ship it.');
    break;

  // Starts a JSON object and stops. JSON.parse fails.
  case 'malformed':
    process.stdout.write('{"verdict":');
    break;

  // Valid JSON, but `verdict` is not one of confirmed/refuted/unclear.
  case 'off-schema':
    process.stdout.write(JSON.stringify({ verdict: 'probably', summary: 'Seems fine.' }));
    break;

  // Exits nonzero the way a CLI does when its own call fails.
  case 'crash':
    process.stderr.write('mock provider: upstream request failed\n');
    process.exitCode = 7;
    break;

  // Outlives any short --timeout.
  case 'slow':
    await delay(30_000);
    process.stdout.write(payload('confirmed', 'This response arrives too late to be used.'));
    break;

  // Emits far more than a small maxOutputBytes limit allows.
  case 'flood':
    process.stdout.write(`{"verdict":"confirmed","summary":"${'x'.repeat(512 * 1024)}"}`);
    break;

  default:
    process.stderr.write(`mock provider: unknown scenario ${scenario}\n`);
    process.exitCode = 2;
}
