# Dogfood: npm dry-run package boundary

Xerify verified a sanitized, generated receipt from its own npm dry-run. The claim is deliberately
about what the receipt reports, not an unsigned promise about future registry bytes.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [dogfood-package-boundary.md](evidence/dogfood-package-boundary.md)
- Observed: `confirmed`, exit `0`

## Claim

> The supplied npm dry-run receipt for `xerify@0.1.0` reports the required runtime and
> worked-example paths present and reports no package path matching its listed internal/local-state
> forbidden rules.

## Reproduce

Regenerate the receipt before repeating this command; entry counts and byte sizes legitimately
change when package content changes.

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 180000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xerify@0.1.0 reports the required runtime and worked-example paths present and reports no package path matching its listed internal/local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Observed normalized result

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "summary": "All six required-path fields are true and forbiddenMatches is empty; the visible top-level and example paths contain no contradiction.",
  "materialFindings": [
    "The runtime, schema, skill, initializer, examples README, and JSONL index are reported present.",
    "No visible top-level or example path matches the fourteen forbidden rules.",
    "The full 217-entry manifest was not supplied, so the empty forbidden result cannot be independently recomputed."
  ],
  "failure": null
}
```

Decision: the bounded receipt statement is a proceed candidate. Publication still requires the
local package audit, install smoke, CI, provenance/signing, and registry checks; Xerify did not
replace them.
