# Generated public evidence: Xerify npm dry-run package receipt

Evidence set: `dogfood-package-boundary-2026-08-19-r3`

This is sanitized metadata from `npm pack --dry-run --json --ignore-scripts` after the worked-example
paths were added. It contains public package paths only—no source text, credential, local run state,
provider response, or release artifact content.

```json
{
  "package": "xerify@0.1.0",
  "filename": "xerify-0.1.0.tgz",
  "entryCount": 217,
  "unpackedSize": 598652,
  "topLevelEntries": [
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "dist",
    "docs",
    "package.json",
    "schemas",
    "scripts",
    "skills"
  ],
  "requiredPathsPresent": {
    "dist/cli/entry.js": true,
    "schemas/config.schema.json": true,
    "skills/xerify/SKILL.md": true,
    "scripts/postinstall.mjs": true,
    "docs/examples/README.md": true,
    "docs/examples/index.jsonl": true
  },
  "forbiddenPathRules": [
    ".agents/",
    ".codex/",
    ".cursor/",
    ".deckent/",
    ".github/",
    ".xerify/",
    "assets/",
    "artifacts/",
    "design/",
    "src/",
    "tests/",
    "AGENTS.md",
    "XERIFY.md",
    "CONTRIBUTING.md"
  ],
  "forbiddenMatches": [],
  "exampleFiles": [
    "docs/examples/README.md",
    "docs/examples/data-analysis.md",
    "docs/examples/dogfood-cursor-adapter.md",
    "docs/examples/dogfood-package-boundary.md",
    "docs/examples/evidence/data-analysis.md",
    "docs/examples/evidence/dogfood-cursor-adapter.md",
    "docs/examples/evidence/dogfood-package-boundary.md",
    "docs/examples/evidence/game-design.md",
    "docs/examples/evidence/outbound-data-policy.md",
    "docs/examples/evidence/research-paper.md",
    "docs/examples/evidence/website-decision.md",
    "docs/examples/game-design.md",
    "docs/examples/index.jsonl",
    "docs/examples/outbound-data-policy.md",
    "docs/examples/research-paper.md",
    "docs/examples/website-decision.md"
  ]
}
```

The bounded claim is about what this dry-run receipt reports. It does not attest that the registry
serves the same bytes, and the byte count can change when documentation prose changes.
