# Dogfood: what the published npm package actually contains

Xerify verifying a claim about its own distribution boundary, using a generated receipt rather than
a human summary.

- Author declaration: `openai:gpt-5.6-sol`
- Verifier: `anthropic:claude-fable-5` through the `claude` adapter
- Evidence: [dogfood-package-boundary.md](evidence/dogfood-package-boundary.md)
- Observed on 2026-08-20: `confirmed`, exit `0`

## Claim

> The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime,
> example, and localization path as present, and reports no package path matching its listed internal
> or local-state forbidden rules.

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
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime, example, and localization path as present, and reports no package path matching its listed internal or local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Observed normalized result

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.0 lists eight required paths under requiredPathsPresent and reports every one as true. Its forbiddenMatches array is empty against the fourteen listed forbidden rules, and none of the sixteen topLevelEntries matches any forbidden rule such as src/, tests/, .github/, .xerify/, AGENTS.md, or CONTRIBUTING.md.",
  "materialFindings": [
    "[info] All eight required paths are reported present, covering runtime, example, and localization categories.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the fourteen rules yields no match.",
    "[low] The receipt shows entryCount 229 but enumerates only 16 top-level entries, so forbiddenMatches cannot be independently recomputed from a full file manifest; it can only be read as the receipt's own report.",
    "[info] The name discrepancy between the pre-publication candidate name xerify and the published name xverify-cli is explained in the evidence prose and does not contradict the claim."
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
entries but 229 total files. So it is trusting the receipt's own assertion — and it said so instead
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
