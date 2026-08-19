# Data analysis: aggregate conversion hides device mix

This synthetic A/B table makes the pooled rate look decisive while device assignment is severely
imbalanced.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `cursor:cursor-grok-4.6-high-fast` through the `cursor` adapter
- Evidence: [data-analysis.md](evidence/data-analysis.md)
- Observed: `refuted`, exit `10`

## Claim

> Variant B causally improves conversion for users and should be rolled out to all mobile and
> desktop traffic based on the aggregate result.

## Reproduce

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 180000 verify \
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
  "summary": "The pooled lift is an allocation artifact: B is worse on desktop, only slightly higher on a small mobile cell, and lacks evidence for causal interpretation.",
  "materialFindings": [
    "Desktop is a direct counterexample to universal rollout: B is 76% versus A at 80%.",
    "The aggregate advantage coincides with B receiving far more high-converting desktop traffic."
  ],
  "failure": null
}
```

Decision: block a universal rollout. Investigate sample-ratio mismatch, restore valid randomization,
report uncertainty, and analyze predeclared segments before making a causal claim.
