# Generated public evidence: xverify-cli npm dry-run package receipt

Evidence set: `dogfood-package-boundary-2026-08-20`

This is sanitized metadata from `npm pack --dry-run --json --ignore-scripts`, taken after the
package was published to npm as `xverify-cli`. It contains public package paths and counts only —
no source text, credential, local run state, provider response, or release artifact content.

The pre-publication candidate name was `xerify`; npm rejected that unscoped name and the published
distribution is `xverify-cli`. The installed executable is still `xerify`.

```json
{
  "package": "xverify-cli@0.1.0",
  "filename": "xverify-cli-0.1.0.tgz",
  "entryCount": 229,
  "unpackedSize": 706272,
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
    "docs/examples/index.jsonl": true,
    "docs/examples/tools/mock-provider.mjs": true,
    "docs/i18n/tr/README.md": true
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
  "forbiddenMatches": []
}
```

The bounded claim is about what this dry-run receipt reports. It does not attest that the registry
serves the same bytes, and both `entryCount` and `unpackedSize` change whenever documentation prose
changes.
