# Changelog

All notable changes to Xerify are documented here. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

## [0.2.0] - 2026-08-20

First release driven by an outside field report against `0.1.0`. Every finding in it was reproduced
against `0.1.1` before being fixed, and the design of each fix was put through `xerify verify`
against the `codex` channel.

### Added

- `failure.providerMessage`: the provider's own sentence about why it failed. Xerify's `message`
  stays a fixed sentence per failure code and remains what a caller branches on. Without the new
  field a stale CLI, an expired login, and a rejected model all reported
  `Provider process exited unsuccessfully`, which names no cause. Provider text is untrusted, so it
  is reduced to one stated error line (or the last four lines when the output states none),
  stripped of escape sequences and control characters, redacted against credential patterns, and
  bounded to 501 characters. `docs/json-contract.md` describes the pipeline and what the field does
  not promise.

  Verified against the exact failure the report describes. `--to openai:<unknown-model> --adapter
codex` reported only `Codex CLI exited unsuccessfully`; it now reports
  `The '<unknown-model>' model is not supported when using Codex with a ChatGPT account.` Codex
  delivers that sentence wrapped twice — an event whose `message` is the API's JSON error body
  serialized into a string — so the diagnostic unwraps repeatedly, up to a fixed bound, rather than
  reporting the envelope.

  Four gaps in that pipeline were found by putting its own design through `xerify verify`, each one
  fixed before release: `Authorization: Basic <base64>` matched none of the credential patterns
  because the header name contains no `key`/`token`/`secret`; a multi-pair `Cookie` header lost only
  its first pair; an `npm_…` token showed that a vendor prefix list is not a strategy, so an
  unbroken run of 24 or more alphanumerics mixing letters and digits is now redacted whatever
  issued it; sanitisation covered only 7-bit escape sequences and C0 controls, leaving carriage
  return and the C1 range — including U+009B, which a terminal reads exactly as `ESC [`; and the
  URL-userinfo rule required a colon, so `https://username@host/path` was not userinfo as far as it
  was concerned.

- `reportsCost` on provider capabilities. `usage.costUsd` arrives as `null` both from an adapter
  that never reports cost and from a run that genuinely cost nothing; a caller summing cost across
  runs could not tell those apart. Only the Claude CLI adapter reports cost. The MCP capability
  schema declares its provider entries field by field and is `.strict()`, so the new field reached
  the CLI but was dropped from the MCP surface until a contract test pinned the two key sets
  together.
- The resolved adapter ID is recorded on a run history record. A bare `--to provider:model` is
  answered by the first adapter claiming that identity, so a record that named only the provider did
  not say which adapter actually ran.
- Contract tests covering published-schema freshness, the compiled `VERSION`, the exact version
  pinned by every localized README's install command, request-schema projection, agreement between
  the MCP capability schema and `ProviderCapabilities`, the adapter ID recorded on a run history
  record, and the opposite cached-token conventions of the two official CLIs.

### Fixed

- Published request and config JSON Schemas listed fields as required that Xerify itself supplies.
  They were exported from the output projection, where every `.default()` field is already
  populated. `ask-request` required `['to','question','context','limits']` and now requires
  `['to','question']`; the `command` adapter branch of `config.schema.json` required eight fields and
  now requires three, which is what README and `docs/configuration.md` have always shown. An editor
  wired to `$schema` reported errors on a config Xerify accepts.
- Claude input tokens were under-reported on every cached turn. Claude's `cache_creation_input_tokens`
  and `cache_read_input_tokens` sit outside `input_tokens` and are billed on top; a measured run
  reported `input_tokens: 2` against a real charge of $0.130107. Codex's `cached_input_tokens` is the
  opposite — a subset of `input_tokens`, confirmed against Codex v0.148.0, where a turn reporting
  input 17607 / cached 11008 / output 5 is summarised by Codex itself as `tokens used 6,604` — so it
  is deliberately not added.
- The advertised MCP input schema required `to.provenance`, whose only legal value is `declared`,
  costing every caller a field it could not vary.
- The checked-in JSON Schemas were regenerated. `generate:schemas` is not part of `npm run check`, so
  `providerMessage` was capped at 501 in code while the published artifact declared 2000. A contract
  test now regenerates every schema and fails on any difference.
- Redaction missed credential-bearing headers whose names contain none of `key`, `token`, `secret`,
  `password`, or `credential`. `Authorization: Basic <base64>` reached provider diagnostics verbatim.
  `Authorization`, `Proxy-Authorization`, and `Cookie` values are now redacted regardless of scheme.
- The envelope builders in `src/cli/output.ts` had no declared return types, so nothing checked that
  a required envelope field was present. They are typed now.
- Provider diagnostics selected the last lines of the output unconditionally, which is the wrong end
  of a stack trace. A crashing interpreter reported `code: 'MODULE_NOT_FOUND', | requireStack: [] |
} | Node.js v24.15.0` while the line naming the cause sat five lines above. A stated error line now
  wins over the tail.

### Documentation

- The README now opens with a compact eight-second workflow animation: an existing claim from
  provider A enters Xerify as bounded evidence, only provider B is invoked to attempt
  falsification, and the result returns as `confirmed`, `refuted`, or `unclear`. Its generated
  background is composited beneath deterministic text and the owner-approved Xerify SVG geometry.
- Where each adapter's exact model IDs come from. Only Cursor exposes a listing command; for the
  others the ID comes from the account and CLI version, and a rejected model now says so itself.
- The MCP Streamable HTTP endpoint is `/mcp`; the root path returns `404`. The command prints the
  full URL on startup.
- An MCP host entry for a project-local install, which has no `xerify` on `PATH`.
- Command-adapter paths must be absolute. The adapter runs in a private empty directory, so
  `"args": ["tools/verifier.mjs"]` resolves against that directory and never starts. The failure now
  quotes the interpreter, which names the directory it searched. Documented in English and in all
  five translations.
- `docs/json-contract.md` no longer states that raw authorization headers and credential paths
  cannot appear in a typed error without qualification. It names `providerMessage` as the one field
  carrying provider-authored text, lists the rules applied to it, and says plainly that they are
  defence in depth rather than a proof.

### Compatibility

This is a minor rather than a patch release, even though SemVer would permit either at `0.x`,
because two things a careful consumer may depend on now behave differently. An `npm` range of
`^0.1.1` upgrades to `0.1.2` on its own and does not reach `0.2.0`, so the bump is what makes the
change something a consumer opts into.

- **Provider-authored text now reaches results, and disk.** `0.1.1` normalized every nonzero
  provider exit to a fixed sentence and deliberately discarded the provider's output; its test was
  named "normalizes nonzero provider exit without exposing stderr". `providerMessage` reverses that
  on purpose. The text is bounded and redacted, but it is provider-authored, there is no switch to
  turn it off, and under the default capture policy it is written to
  `.xerify/runs/<id>/result.json` along with the rest of the result. A project that chose Xerify
  partly because provider output never entered its records should decide about this rather than
  receive it.
- **Claude token counts changed for cached turns.** `inputTokens` now includes
  `cache_creation_input_tokens` and `cache_read_input_tokens`. The previous numbers were wrong — a
  measured run reported `input_tokens: 2` against a $0.130107 charge — but anyone aggregating usage
  across versions will see a discontinuity at this release rather than a correction.
- `providerMessage` is also a new optional field on a failure body the published `verify-result`
  schema marks `additionalProperties: false`, as is `reportsCost` on the MCP capabilities response.
  A consumer validating against a **copied-out** `0.1.1` schema file will reject both. Schemas ship
  inside the package, so a consumer validating against the schema from its own install is
  unaffected.
- Relaxations only, safe in both directions: `ask-request` and `verify-request` now require fewer
  fields, the `command` adapter branch of `config.schema.json` requires three instead of eight, and
  `to.provenance` defaults instead of being demanded from the caller.

## [0.1.1] - 2026-08-20

### Packaging

- Documentation is served from the repository instead of the npm artifact. The package drops from
  336 entries and 1,483,898 bytes to 109 entries and 342,060 bytes, a 77% reduction. `docs/` is now
  in the forbidden-path rules of both the install smoke and the release audit.
- TypeScript source maps are excluded. Every `.js.map` in the published `0.1.0` resolved to
  `../../src/*.ts`, none carried `sourcesContent`, and `src/` has never shipped, so none of them
  could resolve for any consumer.
- The deterministic mock provider moved to `tools/mock-provider.mjs` and still ships. It is a
  runnable tool rather than documentation, and the zero-quota walkthrough has to work from an npm
  install.
- The release workflow now passes `--provenance` explicitly and fails the run if the registry did
  not record an attestation. `0.1.0` reached the registry outside the workflow and carries none.

### Added

- A contract test pinning the compiled `VERSION` constant to the package manifest and to
  `server.json`. Both were hardcoded and nothing kept them in step, so a release could have shipped
  a binary reporting the wrong version.

### Added

- `docs/examples/dogfooding.md`: a log of 26 verification rounds spent putting five findings about
  Xerify through `xerify verify` against both the `codex` and `cursor` channels. Nine came back
  `confirmed`, two came back `refuted` because a claim was wrong, and twelve came back `unclear`
  because the evidence did not establish what the claim asserted. The page names the four rejection
  classes, quotes the verifier objections verbatim, shows the envelope shape that finally passed,
  and records what this channel structurally cannot verify.

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
