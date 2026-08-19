# Changelog

All notable changes to Xerify are documented here. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

### Added

- Added seven bounded, observed verification examples across research, game production, website
  selection, analytics, outbound-data policy, and Xerify dogfooding, plus a compact AI-readable
  JSONL catalog and contract checks.

### Changed

- Replaced per-run sequence reservation directories with one atomic `runs/HEAD.json`, added
  capture-policy-safe run heads, and introduced an append-only searchable `archive/index.jsonl` for
  archived/restored/deleted verification history.
- Separated consumer documentation from maintainer procedures, narrowed the npm documentation
  allowlist, and removed local agent/design/review/generated-release material from the public source
  boundary.

### Release gates

- Legal/name review, WSL evidence, Trusted Publisher setup, and signed release artifacts are
  pending.

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
