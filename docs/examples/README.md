# Worked verification examples

These examples show the complete Xerify shape: a bounded claim, the evidence that may leave the
machine, one exact target model, a normalized result, and the exit decision a caller should make.
They are observed runs from 2026-08-19, not canned verdicts or promises that a future model release
will produce identical prose.

All five domain scenarios are synthetic. They contain no real participant, customer, analytics, or
project data. The two dogfood scenarios use public Xerify package/code evidence. Claims were authored
through Codex/OpenAI and use CLI-declared provenance; Xerify does not pretend that declaration is
remote attestation.

| Example                                                      | Target invocation provider / model   | Observed result | Exit |
| ------------------------------------------------------------ | ------------------------------------ | --------------- | ---: |
| [Research paper](research-paper.md)                          | Anthropic / `claude-fable-5`         | `unclear`       |   11 |
| [Game production plan](game-design.md)                       | Cursor / `cursor-grok-4.6-high-fast` | `refuted`       |   10 |
| [Website decision](website-decision.md)                      | Anthropic / `claude-fable-5`         | `refuted`       |   10 |
| [Data analysis](data-analysis.md)                            | Cursor / `cursor-grok-4.6-high-fast` | `refuted`       |   10 |
| [Outbound-data review](outbound-data-policy.md)              | Anthropic / `claude-fable-5`         | `refuted`       |   10 |
| [Dogfood: Cursor adapter](dogfood-cursor-adapter.md)         | Cursor / `cursor-grok-4.6-high-fast` | `confirmed`     |    0 |
| [Dogfood: npm package boundary](dogfood-package-boundary.md) | Anthropic / `claude-fable-5`         | `confirmed`     |    0 |

The machine-oriented [index.jsonl](index.jsonl) contains one compact normalized record per final
example. An agent can search it before opening an individual Markdown document or evidence file.
It deliberately excludes raw provider transport, result IDs, durations, account/session data, and
cost/usage fields.

## Reading an example

Each page separates four things:

1. **Claim** — the proposition to falsify, not a request to agree.
2. **Evidence** — the only bounded material sent to the target provider.
3. **Observed normalized result** — selected fields after Xerify's strict parser, never raw provider
   output.
4. **Decision** — exit `0` may proceed as a candidate, `10` blocks, and `11` requires more evidence
   or human review. Provider/schema/timeout failures remain typed nonzero outcomes.

The reproduction commands can consume quota. Review the evidence file first and replace model IDs
with exact IDs available to your account. A repeat is a new verification, not a replay guarantee.

## Fail-closed observations during preparation

The preparation itself found useful negative behavior:

- Cursor/Grok handled the bounded game and data cases, but two code-heavy npm-boundary attempts did
  not match the strict result schema. Xerify returned typed `unclear` with
  `INVALID_PROVIDER_RESPONSE`/exit `6`; those attempts are not presented as confirmations.
- A prose-only archive-index dogfood attempt was `unclear` because it cited source symbols without
  supplying primary excerpts. Xerify did not turn a plausible architectural description into proof.

These observations are why the final dogfood records use primary or generated public evidence and
why a model/provider name alone is never a quality guarantee.
