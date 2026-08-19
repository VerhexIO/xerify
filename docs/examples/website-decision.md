# Website decision: recompute the approved matrix

This fictional architecture decision is bounded to an approved weighted matrix rather than an
open-ended technology preference.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [website-decision.md](evidence/website-decision.md)
- Observed: `refuted`, exit `10`

## Claim

> Under the approved weighted decision matrix, the custom SSR application with a dedicated database
> is the selected website architecture.

## Reproduce

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 180000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## Observed normalized result

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "summary": "The managed static build plus headless CMS scores 4.8; custom SSR scores 3.3 and also fails the operational-burden gate.",
  "materialFindings": [
    "Independent recomputation matches both matrix totals.",
    "The SSR option scores 2 on operational burden and has no required exception."
  ],
  "failure": null
}
```

Decision: the recorded matrix selects the static/CMS option. A different business decision is
possible only by changing the requirements, weights, scores, or override record—not by relabeling
the existing result.
