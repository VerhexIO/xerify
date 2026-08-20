# Dogfood: verifying Xerify's own Cursor adapter

Xerify checking a claim about its own source. The interesting part is not the verdict — it is that
the first two attempts never produced one.

- Author declaration: `anthropic:claude-opus-5`
- Verifier: `openai:gpt-5.6-sol` through the `codex` adapter
- Evidence: [dogfood-cursor-adapter.md](evidence/dogfood-cursor-adapter.md)
- Observed on 2026-08-20: `confirmed`, exit `0`

## Claim

> CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before
> starting the Cursor process.

## Reproduce

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Observed normalized result

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The supplied snippets adequately support the bounded claim: provider identity is returned explicitly as \"cursor\", and the exact \"auto\" model is rejected before temporary-workspace creation or the documented process-invocation point. No material counterexample appears within the supplied evidence.",
  "materialFindings": [
    "[low] The model normalization is narrower than it may appear: values such as \"auto [suffix]\" leave trailing whitespace before comparison and may bypass the gate. This does not contradict rejection of the exact tested value \"auto\", but it could be a regression path if annotated model strings are valid inputs.",
    "[info] The process-prevention test indirectly demonstrates non-execution because the configured executable cannot resolve, while the source ordering directly places validation before workspace and process creation."
  ]
}
```

## Why this verdict

`confirmed` here means something narrow and worth stating precisely: _within the supplied excerpts_,
no counterexample to the bounded claim was found. It is not an audit of the adapter, and it is not a
proof.

The valuable output is the `low` finding, which nobody asked for. The verifier noticed that model
normalization splits on `[` and trims, so a value such as `auto [something]` may not normalize to the
exact string the gate compares against. That is a hypothetical regression path, not a present bug —
but it is precisely the kind of observation a second opinion exists to surface.

Read `confirmed` as _"no counterexample found in what you sent"_, never as _"correct"_.

## What would change it

- **Toward `refuted`:** a source path where `CursorAdapter` derives its provider identity from the
  model ID, or where the `auto` rejection runs after process spawn.
- **Toward `unclear`:** supplying only prose descriptions of the adapter rather than primary source
  excerpts. During preparation, a prose-only dogfood attempt returned `unclear` for exactly this
  reason — Xerify does not turn a plausible architectural description into proof.

## A note on the verifier choice

This claim is about the Cursor adapter, so verifying it _through_ Cursor was the original design.
That did not work. Two consecutive attempts against `cursor:cursor-grok-4.6-high-fast` returned exit
`6` (`INVALID_PROVIDER_RESPONSE`); the model never emitted the required JSON. The claim was
re-targeted at the schema-enforcing `codex` adapter, which produced a verdict on the first attempt.

The subject of a claim and the channel that verifies it are independent choices. When a verdict must
be machine-consumed, prefer an adapter that pins the output schema at the provider. See
[failure modes](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6).

## Decision

Proceed as a candidate. Track the `low` finding as a potential hardening item rather than a defect.
