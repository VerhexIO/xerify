# Data analysis: an aggregate that reverses under stratification

The headline number says variant B wins by a mile. Split by device and B loses on desktop. This is
Simpson's paradox, and it is the example most likely to appear in your own dashboards.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `cursor:cursor-grok-4.6-high-fast` through the `cursor` adapter
- Evidence: [data-analysis.md](evidence/data-analysis.md)
- Observed on 2026-08-20: `refuted`, exit `10`

## Claim

> Variant B causally improves conversion for users and should be rolled out to all mobile and desktop
> traffic based on the aggregate result.

## Reproduce

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## Observed normalized result

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "The aggregate B win is a mix-shift artifact, not a causal improvement. Device allocation is severely imbalanced; B is worse on desktop and only trivially higher on a small mobile sample. A universal rollout from the aggregate rate is contradicted by the stratified table.",
  "materialFindings": [
    "[critical] Simpson's paradox: B's aggregate conversion (64.92% vs 20.83%) is explained by B receiving most high-converting desktop traffic, not by a within-device treatment effect.",
    "[critical] Desktop counterexample: B converts at 76.0% versus A's 80.0%, so rolling B to all desktop traffic would be expected to reduce conversion in that segment.",
    "[high] Mobile does not support a rollout decision: B is 0.5pp higher on 200 visitors versus A's 1,000, with no uncertainty interval.",
    "[high] No identification evidence for a causal claim: no randomization receipt, sample-ratio-mismatch check, interval estimate, or mix adjustment. Device share is 83.3% mobile for A versus 16.7% for B."
  ]
}
```

## Why this verdict

The claim bundles three assertions — that B improves conversion, that the improvement is _causal_,
and that a universal rollout follows. The verifier attacked each separately and found the strongest
possible objection: a **direct counterexample within the supplied data**. B is worse on desktop.

The 64.92%-versus-20.83% aggregate is not wrong arithmetic; it is a correct calculation over a
confounded allocation. Verifying "is this number right?" would have passed. Verifying "does this
number support this decision?" does not.

## What would change it

- **Toward `confirmed`:** a randomization receipt, a sample-ratio-mismatch check, per-device interval
  estimates, and a within-device effect that is positive on both segments. The claim would also need
  narrowing — "improves conversion" is not the same claim as "should be rolled out everywhere".
- **Toward `unclear`:** balanced allocation with wide intervals. Then the data would neither support
  nor contradict the claim, rather than contradicting it as it does now.

## Decision

Block the universal rollout. The stratified table contains a counterexample to the claim's own
recommendation. A mobile-only rollout is a different claim and needs its own verification.
