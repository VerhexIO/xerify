# Website decision: the matrix selects the other option

An architecture decision claims a winner. The approved scoring matrix says otherwise, and it says so
twice — once on totals, once on a gate.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [website-decision.md](evidence/website-decision.md)
- Observed on 2026-08-20: `refuted`, exit `10`

## Claim

> Under the approved weighted decision matrix, the custom SSR application with a dedicated database
> is the selected website architecture.

## Reproduce

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
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
  "failure": null,
  "summary": "Recomputing the approved weighted matrix confirms the stated totals: the managed static build + headless CMS scores 4.8 while the custom SSR app + database scores 3.3, so the matrix selects the static option by 1.5 points. The SSR option also scores 2 on operational burden, below the gate threshold of 3, with no documented exception.",
  "materialFindings": [
    "[high] Weighted totals directly contradict the claim: 4.8 versus 3.3 under the approved scoring rule.",
    "[medium] The SSR option is independently blocked by the operational-burden gate: it scores 2 against a threshold of 3, and the evidence states no documented exception exists.",
    "[info] The only criterion where SSR wins is editorial workflow (5 vs 4, weight 20), insufficient to offset security exposure, operational burden, and cost predictability."
  ]
}
```

## Why this verdict

The verifier did not take the matrix totals on faith — it **recomputed them** from the per-criterion
scores and weights, and confirmed the arithmetic before contradicting the claim. That distinction
matters: a refutation that merely quotes a conflicting number is weaker than one that reproduces the
calculation.

It then found a second, independent reason. Even if the totals had been close, the SSR option fails
the operational-burden gate on its own. Two unrelated grounds for the same conclusion make this
refutation robust to a single scoring error.

## What would change it

- **Toward `confirmed`:** a revised weight set under which SSR's editorial-workflow advantage
  outweighs its deficits, _and_ a documented exception to the operational-burden gate. Both are
  required — clearing the totals alone still leaves the gate.
- **Toward `unclear`:** evidence that the matrix was superseded, or that the approval status of the
  weights is disputed.

## Decision

Block. The claim contradicts the approved decision record. Either select the static option or amend
the matrix through whatever process approved it — but do not ship a decision that the record does
not support.
