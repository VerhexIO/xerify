# Worked verification examples

These pages show the complete Xerify shape: a bounded claim, the evidence that may leave the machine,
one exact target model, a normalized result, and the exit decision a caller should make.

They are **observed runs**, not canned verdicts. Every result on these pages was produced by running
the command shown, on the date shown. A repeat is a new verification, not a replay guarantee — see
[failure modes](failure-modes.md) for a documented case where the same command produced two different
outcomes.

## Start here if you have no provider account

The [no-account walkthrough](no-account-walkthrough.md) reproduces **every verdict and every typed
failure** with zero provider quota, using a deterministic mock provider bundled with the package. It
is the fastest way to understand the exit-code contract before spending a real call.

## The failure catalogue

[Failure modes](failure-modes.md) documents every non-`confirmed` outcome: what produces it, the
exact output, why it happens, and what you would change to get a usable result. It covers the
provider CLI not being installed, the provider CLI not being **logged in**, same-provider rejection,
Cursor's `auto` model, prose instead of JSON, truncated and off-schema responses, nonzero provider
exits, timeouts, output truncation, and observed run-to-run flakiness.

Read it before integrating. The most common integration bug is treating exit `11` as one thing when
it is really two — a real `unclear` verdict, or an operational failure wearing the same verdict
string.

## Live examples

All five domain scenarios are synthetic. They contain no real participant, customer, analytics, or
project data. The two dogfood scenarios use public Xerify package and source evidence. Claims use
CLI-declared provenance; Xerify does not pretend that declaration is remote attestation.

| Example                                                                                            | Target invocation provider / model   | Observed    | Exit |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------- | ---: |
| [Research paper](research-paper.md) — the claimed outcome was never measured                       | Anthropic / `claude-fable-5`         | `unclear`   |   11 |
| [Game production plan](game-design.md) — capacity arithmetic does not fit                          | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Website decision](website-decision.md) — the matrix selects the other option                      | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Data analysis](data-analysis.md) — an aggregate that reverses under stratification                | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Outbound-data review](outbound-data-policy.md) — pseudonymization is not authorization            | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Dogfood: Cursor adapter](dogfood-cursor-adapter.md) — Xerify checks its own source                | OpenAI / `gpt-5.6-sol`               | `confirmed` |    0 |
| [Dogfood: npm package boundary](dogfood-package-boundary.md) — what the published package contains | Anthropic / `claude-fable-5`         | `confirmed` |    0 |

Five of seven did not pass. That ratio is the point: a verifier that mostly agrees is not adding
information.

## Reading an example

Each page separates six things:

1. **Claim** — the proposition to falsify, not a request to agree.
2. **Reproduce** — the exact command, runnable as written.
3. **Evidence** — the only bounded material sent to the target provider.
4. **Observed normalized result** — selected fields after Xerify's strict parser, never raw provider
   output.
5. **Why this verdict** — what the verifier actually attacked, and what a weaker check would have
   missed.
6. **What would change it** — the concrete evidence that would move the result, in both directions.

The reproduction commands consume quota. Review the evidence file first and replace model IDs with
exact IDs available to your account.

## Machine-readable catalogue

[index.jsonl](index.jsonl) holds one compact normalized record per verification example, one JSON object per line.
An agent can search it before opening any Markdown page.

It deliberately excludes raw provider transport, result IDs, durations, account and session data, and
cost/usage fields.

```sh
# Every example that did not pass
grep -v '"exitCode":0' docs/examples/index.jsonl

# Everything about outbound data
grep -i 'outbound' docs/examples/index.jsonl
```

## Evidence files

[evidence/](evidence/) holds the exact bounded material each verification received. These files are
**hash-anchored verification artifacts**: the local run history records a SHA-256 of the evidence at
call time, so editing a file breaks the correspondence between the record and the document.

For that reason evidence files are **English-only and are not translated**. The prose pages in this
directory are localized; the evidence they reference is not.

## What these examples do not claim

- Not proof. A `confirmed` verdict means no counterexample was found in the supplied evidence.
- Not reproducible verbatim. Model releases change; two of the runs here required a second attempt.
- Not an endorsement of any model. A provider name is never a quality guarantee — see the two
  consecutive exit `6` results in the Cursor adapter dogfood.

## Related

- [Documentation index](../README.md)
- [JSON and exit-code contract](../json-contract.md)
- [Provider adapters](../provider-adapters.md)
- [Security policy](../../SECURITY.md)
