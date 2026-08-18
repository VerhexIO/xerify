# Architecture

Xerify is one ESM package with four public surfaces—CLI, library, STDIO MCP, and Streamable HTTP MCP—over one core execution path.

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## Module boundaries

- `src/core` owns public requests/results, prompts, different-provider enforcement, verdict parsing, error types, limits, and audit projection.
- `src/providers` implements a neutral adapter contract and built-in CLI/API/command adapters. It does not import CLI rendering.
- `src/process` and `src/platform` own executable resolution, environment allowlisting, bounded streams, timeout/cancellation, and process-tree termination.
- `src/config` parses strict JSON from `.xerify/xverify-config.json`, records each resolved field's
  source, redacts optional literal API keys, and initializes private project state/log metadata
  without overwriting existing files.
- `src/cli` maps commands to the core and renders either human output or one stable JSON envelope.
- `src/mcp` registers the same Zod schemas and core functions with MCP SDK v2. HTTP authentication remains at the transport boundary.

The package root exports the core, config, adapters, and MCP factories for programmatic use. Test fixtures are never imported by production code.

## Request flow

1. Strict CLI, library, or MCP input validation establishes provider/model identity and byte/time limits. Public callers cannot self-attest `observed`; target identity must be `declared`.
2. Verification rejects unknown provenance and equal invocation-provider identities before adapter resolution.
3. The registry chooses an explicit adapter ID when supplied, otherwise a configured adapter for the target provider identity.
4. The adapter invokes one executable with `shell: false` or one bounded HTTP request. Prompt and context do not enter shell arguments.
5. Provider output is byte-bounded and normalized. A provider-compatible structured schema is derived from the canonical Zod field definitions; core validation then enforces the full bounds.
6. The core returns an `AskResult` or complete `VerifyResult`; failures after provider admission become an honest `unclear` result with a typed `failure` and cause-specific exit.
7. Optional JSONL audit logging projects metadata only. Prompt, context, answer, findings, raw response, headers, and secret values are excluded.

## Trust boundaries

Claim/context and provider output are untrusted. The verifier is instructed to treat supplied
material as evidence, attempt falsification, and ignore embedded commands, role changes, verdict
directives, and schema changes. This is an evaluation-integrity mitigation, not a prompt-injection
guarantee. Xerify never evaluates provider output as a command, source file, MCP instruction, or
configuration. Direct API keys resolve from a named environment variable first and an explicitly
configured literal fallback second; diagnostics never expose either. Official CLI auth stores are
accessed only through the official executable; Xerify does not parse or copy them.

Codex and Claude adapters pin `openai` and `anthropic` invocation-provider identities in code.
Cursor pins `cursor` regardless of the upstream model named by its exact model ID; `auto` is rejected
because it cannot preserve model provenance. `command` and `openai-compatible` labels are
owner-controlled declarations, not remote attestation; their cross-provider guarantee is only as
strong as that configuration.

Provider separation measures invocation/billing/control-plane diversity. It does not prove that two
channels use different model vendors, weights, training data, or blind spots. OpenAI direct and a
GPT model through Cursor are different invocation providers but may share model lineage.

Official command adapters execute from fresh restrictive temporary workspaces rather than the user
repository. Codex ignores user rules/config and is read-only; Claude disables customizations, tools,
slash commands, and persistence; Cursor uses read-only ask mode plus its sandbox. Cursor's lack of a
categorical account-level MCP-disable flag remains documented residual risk.

STDIO stdout is reserved for MCP frames. Streamable HTTP defaults to loopback and validates Host and Origin. Public binding requires an explicit flag and bearer authentication.

## Compatibility

- Runtime floor: Node.js 20; primary development runtime: Node.js 24.
- Public schema version: `1`.
- MCP SDK major: `2`; modern protocol revision: `2026-07-28`; legacy clients remain served.
- Existing public fields cannot be removed or reinterpreted without a breaking release. Additive optional fields are allowed.

The command-outcome decision and its rationale are recorded in
[ADR 0001](decisions/0001-command-outcomes.md). Invocation-provider identity is fixed by
[ADR 0002](decisions/0002-invocation-provider-identity.md).
