# Dogfood: what the published npm package actually contains

Xerify verifying a claim about its own distribution boundary, using a generated receipt rather than
a human summary.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [dogfood-package-boundary.md](evidence/dogfood-package-boundary.md)
- Observed on 2026-08-20: `confirmed`, exit `0`

## Claim

> The supplied npm dry-run receipt for xverify-cli@0.1.1 reports every listed required runtime and
> tool path as present, reports no package path matching its listed internal, documentation or
> local-state forbidden rules, and reports zero source map files.

## Reproduce

Regenerate the receipt first — `entryCount` and `unpackedSize` change whenever documentation changes:

```sh
npm pack --dry-run --json --ignore-scripts
```

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.1 reports every listed required runtime and tool path as present, reports no package path matching its listed internal, documentation or local-state forbidden rules, and reports zero source map files." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Observed normalized result

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.1 reports exactly what the bounded claim states: all six paths in requiredPathsPresent are true; forbiddenMatches is an empty array against the 16 listed internal/documentation/local-state rules; and sourceMapCount is 0. An independent cross-check of the 16 topLevelEntries against the forbiddenPathRules yields no match, so the receipt is internally consistent.",
  "materialFindings": [
    "[info] All six requiredPathsPresent entries are reported true, covering the runtime entry, schema, skill, postinstall script, mock-provider tool, and README.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the 16 forbiddenPathRules yields no match.",
    "[info] sourceMapCount is 0, matching the claim of zero source map files.",
    "[low] The receipt enumerates only the 16 top-level entries of 109 total, so forbiddenMatches is accepted as the receipt's own computed report rather than independently recomputed."
  ]
}
```

## Why this verdict

Note how carefully the claim is scoped: it is about **what the receipt reports**, not about what the
registry serves. That scoping is what makes it verifiable at all. A claim like "the published package
contains no source files" would be unverifiable from this evidence, because the evidence is a local
dry run.

The `low` finding is the verifier policing that boundary from the other side. It observed that
`forbiddenMatches: []` cannot be independently recomputed, because the receipt lists 16 top-level
entries but 109 total files. So it is trusting the receipt's own assertion — and it said so instead
of quietly treating a summary field as ground truth.

The candidate name `xerify` was rejected by npm as an unscoped name; the published distribution is
`xverify-cli` and the installed executable is `xerify`. The verifier checked that this discrepancy
was explained rather than contradictory.

## What would change it

- **Toward `refuted`:** any `requiredPathsPresent` entry reporting `false`, or a non-empty
  `forbiddenMatches`. Adding `src/` back to the `files` array in `package.json` reproduces this.
- **Toward `unclear`:** a receipt with the summary fields removed, leaving the verifier no basis for
  the claim's specific assertions.

## Decision

Proceed as a candidate for a publish gate. Pair it with a check that recomputes `forbiddenMatches`
from the full file list, since the verifier correctly flagged that it could not do so from this
evidence.
