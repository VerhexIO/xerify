# Changelog

All notable changes to Xerify are documented here. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

### Added

- Complete six-language documentation set under `docs/i18n/<lang>/`. Every consumer guide, the
  security policy, and every worked-example page is now available in Turkish, German, Simplified
  Chinese, Spanish, and French. English remains canonical; `docs/examples/evidence/` stays
  English-only because those files are hash-anchored verification artifacts.
- `docs/examples/failure-modes.md`: a catalogue of every non-`confirmed` outcome with its observed
  output, cause, and the change that yields a usable result. Covers a missing provider CLI, an
  unauthenticated provider CLI, same-provider rejection, Cursor `auto`, prose and off-schema
  responses, nonzero provider exits, timeouts, output truncation, adapter-selection ambiguity, and
  observed run-to-run flakiness.
- `docs/examples/no-account-walkthrough.md`: reproduces every verdict and every typed failure with
  zero provider quota.
- `tools/mock-provider.mjs`: a deterministic mock provider that makes the walkthrough
  and the failure catalogue reproducible without a provider account.

### Changed

- Reran every worked example against live providers and rewrote each page with the observed result
  plus "why this verdict" and "what would change it" sections.
- Retargeted the Cursor adapter dogfood example at the schema-enforcing `codex` adapter after two
  consecutive Cursor attempts returned exit `6`; the page documents both attempts.
- Regenerated the npm package-boundary example evidence against the published `xverify-cli@0.1.0`.
- The worked-example contract test now asserts that an example's author and target invocation
  providers differ, instead of pinning a single author provider.
- `skills/xerify/SKILL.md` now distinguishes the two causes of an `unclear` verdict and points at
  the failure catalogue and the zero-quota walkthrough.

## [0.1.0] - 2026-08-19

### Added

- Stable shell-first ask, verify, diagnostics, provider discovery, project init/config, raw request, and MCP commands.
- Shared schema-first core with typed errors, bounded resources, explicit truncation, audit projection, and different-provider enforcement.
- Official Codex and Claude CLI adapters, invocation-provider-pinned Cursor Agent CLI adapter,
  OpenAI and Anthropic API adapters, OpenAI-compatible HTTP, and generic command adapters.
- Isolated `.xerify/xverify-config.json` project state with secret-safe ignored audit logs.
- Guarded direct-install auto-initialization, aggregate non-billable `health`, and redacted optional
  literal API-key fallback for basic local setups.
- Sequential content-addressed `.xerify/runs` records shared by CLI and MCP, with configurable
  capture policy plus explicit list/show/archive/restore/delete lifecycle commands.
- Adversarially hardened run sequencing with exact safe-range arithmetic, collision revalidation,
  malformed-entry rejection, disjoint history/archive roots, and explicit
  fixed-namespace/external-mutation limits.
- Invocation-provider identity contract: every Cursor Agent model is `cursor`; direct vendor
  CLI/API calls retain their vendor provider, and health/MCP report the identity basis explicitly.
- Minimal npm artifact allowlist excluding source, tests, internal authority, runtime state, and
  brand/review assets.
- MCP SDK v2 STDIO and Streamable HTTP surfaces with modern and legacy negotiation.
- Hermetic unit, contract, integration, Inspector, package, security, and release evidence tooling.
- Exact monochrome SVG brand system, deterministic PNG exports, and companion agent skill.
- Seven bounded, observed verification examples across research, game production, website
  selection, analytics, outbound-data policy, and Xerify dogfooding, plus a compact AI-readable
  JSONL catalog and contract checks.

### Changed

- Renamed the public npm distribution from the rejected `xerify` candidate to `xverify-cli`; the
  Xerify product name, repository, MCP name, and `xerify` executable remain unchanged.
- Added consumer README and consolidated manuals in English, Turkish, German, Simplified Chinese,
  Spanish, and French, with CI-validated local document references.
- Replaced per-run sequence reservation directories with one atomic `runs/HEAD.json`, added
  capture-policy-safe run heads, and introduced an append-only searchable `archive/index.jsonl` for
  archived/restored/deleted verification history.
- Separated consumer documentation from maintainer procedures, narrowed the npm documentation
  allowlist, and removed local agent/design/review/generated-release material from the public source
  boundary.
- Redacted complete provider endpoint URLs from config inspection, applied private POSIX mode checks
  to explicit endpoints, and stopped classifying unauthenticated remote compatible endpoints as
  definitely local/auth-free.
