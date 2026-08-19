# Research paper: missing long-term evidence

This fictional study reports a short-term quiz difference, while the claim concerns retention after
six months.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [research-paper.md](evidence/research-paper.md)
- Observed: `unclear`, exit `11`

## Claim

> Students who use the tutoring assistant retain at least 15% more course material after six months
> than students who use the existing study guide.

## Reproduce

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 180000 verify \
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
  "summary": "The claim concerns six-month retention, but no outcome was collected after the two-week quiz. The short-term difference cannot confirm or directly refute the six-month claim.",
  "materialFindings": [
    "The claimed endpoint was never measured.",
    "The two-week result is a different endpoint and is exposed to self-selection and differential attrition."
  ],
  "failure": null
}
```

Decision: do not treat the immediate score as long-term evidence. Collect the six-month outcome or
send the claim to human review. This is the intended `UNKNOWN → review`, never `UNKNOWN → pass`,
behavior.
