# Dogfood: Cursor adapter identity and `auto` rejection

Xerify verified one of its own adapter invariants. The live record predates this documentation edit,
and the public evidence page is a trimmed view of the same relevant code/test behavior.

- Recorded run: local `xrun_000013` (not distributed in the npm package)
- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `cursor:cursor-grok-4.6-high-fast` through the `cursor` adapter
- Recorded evidence SHA-256:
  `88c9bb902dd37727fc604092d8e3942c605096c291a9c20d51d2e0ac565ef367`
- Public review evidence: [dogfood-cursor-adapter.md](evidence/dogfood-cursor-adapter.md)
- Observed: `confirmed`, exit `0`

## Claim

> `CursorAdapter` has two specific deterministic behaviors: `capabilities()` returns provider
> `cursor` without inspecting the requested model ID, and `invoke()` rejects model `auto` before
> starting the Cursor process.

## Reproduce against the public review surface

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 180000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Recorded normalized result

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "summary": "capabilities() returns a constant cursor provider and invoke() calls the exact-model guard before temporary workspace or process creation.",
  "materialEvidence": [
    "The capability method has no requested-model input and returns provider cursor literally.",
    "assertExactCursorModel(input.model) is the first invoke statement.",
    "The must-not-run hermetic test receives INVALID_INPUT/exit 2 for model auto."
  ],
  "failure": null
}
```

Decision: this bounded invariant is a proceed candidate, not formal proof of every Cursor adapter
behavior. The verifier explicitly noted that the test does not call `capabilities()` and that the
record contained source rather than an executed test receipt.
