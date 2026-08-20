# Game production plan: the arithmetic does not fit the constraints

A two-person team, ten weeks, a fixed feature list, and no permission to cut anything. The claim is
that this works. Capacity arithmetic says it does not.

This example also documents a **real reproduction failure** — see "A note on reproducibility" below.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `cursor:cursor-grok-4.6-high-fast` through the `cursor` adapter
- Evidence: [game-design.md](evidence/game-design.md)
- Observed on 2026-08-20: `refuted`, exit `10` (second attempt; see below)

## Claim

> The complete launch scope can be delivered by the two-person team within ten weeks, without
> overtime, contractors, feature cuts, or schedule extension.

## Reproduce

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## Observed normalized result

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## Why this verdict

This is the cleanest kind of refutation: the claim and its own constraints are internally
inconsistent, and the contradiction is arithmetic rather than a matter of judgement. 800 available
hours cannot absorb 1,120 required hours when every escape hatch is closed by the same document.

The verifier also refused the most tempting rescue — "maybe they will just be faster than estimated"
— on the grounds that the evidence says the team is inexperienced in the riskiest scope. Optimism is
not evidence.

## What would change it

- **Toward `confirmed`:** a re-estimate below 800 hours _including_ the 20% reserve, or removal of one
  of the four constraints. Adding a third engineer, extending to fourteen weeks, or cutting one
  feature each produce a different, verifiable claim.
- **Toward `unclear`:** an estimate given as a range with no stated confidence, where the lower bound
  fits inside capacity.

## Decision

Block. Re-plan before committing to a date. The refutation names four specific levers, any one of
which produces a claim that can pass.

## A note on reproducibility

The command above was issued twice, unchanged. The first attempt returned exit `6`
(`INVALID_PROVIDER_RESPONSE`) — the model did not emit the required JSON. The second attempt returned
the exit `10` verdict shown here. Both runs are recorded in the local run history with identical
recorded statement and evidence hashes.

The `cursor` adapter has no provider-side schema enforcement; its structured-verification column in
the [built-in matrix](../provider-adapters.md) reads "prompt contract; core validation". Treat exit
`6` from `cursor` or `command` adapters as retryable, bound your retries, and never retry a verdict
you simply disliked. See [failure modes](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes).
