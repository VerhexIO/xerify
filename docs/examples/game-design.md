# Game design: production scope exceeds capacity

This fictional plan fixes both scope and team capacity, making feasibility falsifiable with simple
arithmetic.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `cursor:cursor-grok-4.6-high-fast` through the `cursor` adapter
- Evidence: [game-design.md](evidence/game-design.md)
- Observed: `refuted`, exit `10`

## Claim

> The complete launch scope can be delivered by the two-person team within ten weeks, without
> overtime, contractors, feature cuts, or schedule extension.

## Reproduce

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 180000 verify \
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
  "summary": "The plan requires 1,120 hours before contingency and 1,344 with the required reserve, but fixed capacity is 800 hours.",
  "materialFindings": [
    "The pre-contingency plan is already 320 hours over capacity.",
    "The required reserve increases the shortfall to 544 hours, while every capacity lever is forbidden."
  ],
  "failure": null
}
```

Decision: block the schedule as written. Change scope, capacity, date, or constraints before asking
again; a second model cannot create missing person-hours.
