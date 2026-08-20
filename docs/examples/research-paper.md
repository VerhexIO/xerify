# Research paper: the claimed outcome was never measured

A fictional study reports a short-term quiz difference. The claim is about retention after six
months. Those are not the same thing, and the gap between them is the whole example.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [research-paper.md](evidence/research-paper.md)
- Observed on 2026-08-20: `unclear`, exit `11`, `failure: null`

## Claim

> Students who use the tutoring assistant retain at least 15% more course material after six months
> than students who use the existing study guide.

## Reproduce

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## Observed normalized result

```json
{
  "verdict": "unclear",
  "exitCode": 11,
  "failure": null,
  "summary": "The claim asserts at least 15% greater retention after six months, but the supplied evidence contains no six-month measurement of any kind. The only observed outcome is a two-week quiz difference (78% vs 66%), which measures a different timeframe and construct and cannot substantiate the claim. The evidence also cannot refute the claim, since no six-month data contradicts it.",
  "materialFindings": [
    "[high] No six-month retention outcome exists in the supplied evidence, so the central quantity of the claim was never measured.",
    "[medium] The two-week quiz result is the only outcome data; extrapolating it to the claimed outcome is unjustified, with no confidence interval or adjusted analysis reported.",
    "[medium] Assignment was not randomized, so even the observed two-week difference may reflect selection effects.",
    "[medium] Differential attrition (8% vs 31%, 21 of 105 enrolled) plausibly biases the observed group difference."
  ]
}
```

## Why this verdict

`unclear` is the correct answer, and it is the hardest one for a naive integration to handle.

The evidence is not silent — it contains a real, statistically eye-catching result (78% vs 66%, a
relative difference of about 18.2%, comfortably over the claimed 15%). A system tuned to find
supporting numbers would call this `confirmed`. The verifier instead noticed that the number answers
a **different question** than the claim asks: immediate quiz performance is not six-month retention.

It also declined to swing the other way. Nothing in the evidence contradicts the six-month claim
either; the data simply does not exist. `refuted` would have been just as wrong as `confirmed`.

Note that `failure` is `null`. This is a judgement about evidence, not a transport problem. See
[failure modes](failure-modes.md) for the exit `11` cases that carry a non-null `failure` and mean
something entirely different.

## What would change it

- **Toward `confirmed`:** a six-month assessment with a reported effect size and interval, plus
  either randomized assignment or a credible adjustment for self-selection and the 8%-vs-31%
  attrition gap.
- **Toward `refuted`:** a six-month assessment showing a difference below 15%.
- **Still `unclear`:** adding more two-week data. Increasing precision on the wrong endpoint does not
  move a claim about a different endpoint.

## Decision

Do not treat the immediate score as long-term evidence. Collect the six-month outcome, or route the
claim to human review. This is the intended `UNKNOWN → review` behavior, never `UNKNOWN → pass`.
