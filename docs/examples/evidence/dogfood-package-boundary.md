# Generated public evidence: xverify-cli npm dry-run package receipt

Evidence set: `dogfood-package-boundary-2026-08-20-r3`

This is sanitized metadata from `npm pack --dry-run --json --ignore-scripts`, taken for the `0.1.1`
release after the documentation set was moved out of the npm artifact and served from the repository
instead, and after TypeScript source maps were excluded. It contains public package paths and counts
only — no source text, credential, local run state, provider response, or release artifact content.

Documentation is intentionally absent from the tarball: `docs/` appears in the forbidden rules below.
The deterministic mock provider lives at `tools/` rather than under `docs/` because it is a runnable
tool rather than documentation, and it still ships.

Source maps are excluded because they reference `../../src/*.ts` paths and carry no
`sourcesContent`; with `src/` absent from the package they could not resolve for any consumer.

```json
{
  "package": "xverify-cli@0.1.1",
  "filename": "xverify-cli-0.1.1.tgz",
  "entryCount": 109,
  "unpackedSize": 344005,
  "topLevelEntries": [
    "CHANGELOG.md",
    "LICENSE",
    "README.de.md",
    "README.es.md",
    "README.fr.md",
    "README.md",
    "README.tr.md",
    "README.zh-CN.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "dist",
    "package.json",
    "schemas",
    "scripts",
    "skills",
    "tools"
  ],
  "requiredPathsPresent": {
    "dist/cli/entry.js": true,
    "schemas/config.schema.json": true,
    "skills/xerify/SKILL.md": true,
    "scripts/postinstall.mjs": true,
    "tools/mock-provider.mjs": true,
    "README.md": true
  },
  "forbiddenPathRules": [
    ".agents/",
    ".claude/",
    ".codex/",
    ".cursor/",
    ".deckent/",
    ".github/",
    ".xerify/",
    "assets/",
    "artifacts/",
    "design/",
    "docs/",
    "src/",
    "tests/",
    "AGENTS.md",
    "XERIFY.md",
    "CONTRIBUTING.md"
  ],
  "forbiddenMatches": [],
  "sourceMapCount": 0
}
```

The bounded claim is about what this dry-run receipt reports. It does not attest that the registry
serves the same bytes.
