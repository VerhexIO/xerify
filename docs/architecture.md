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
- `src/config` parses strict JSON and records each resolved field's source.
- `src/cli` maps commands to the core and renders either human output or one stable JSON envelope.
- `src/mcp` registers the same Zod schemas and core functions with MCP SDK v2. HTTP authentication remains at the transport boundary.

The package root exports the core, config, adapters, and MCP factories for programmatic use. Test fixtures are never imported by production code.

## Request flow

1. Strict CLI, library, or MCP input validation establishes provider/model identity and byte/time limits. Public callers cannot self-attest `observed`; target identity must be `declared`.
2. Verification rejects unknown provenance and same-provider organizations before adapter resolution.
3. The registry chooses an explicit adapter ID when supplied, otherwise a configured adapter for the target organization.
4. The adapter invokes one executable with `shell: false` or one bounded HTTP request. Prompt and context do not enter shell arguments.
5. Provider output is byte-bounded and normalized. A provider-compatible structured schema is derived from the canonical Zod field definitions; core validation then enforces the full bounds.
6. The core returns an `AskResult` or complete `VerifyResult`; failures after provider admission become an honest `unclear` result with a typed `failure` and cause-specific exit.
7. Optional JSONL audit logging projects metadata only. Prompt, context, answer, findings, raw response, headers, and secret values are excluded.

## Trust boundaries

Claim/context and provider output are untrusted. The verifier is instructed to treat supplied material as evidence, attempt falsification, and ignore embedded commands, role changes, verdict directives, and schema changes. This is an evaluation-integrity mitigation, not a prompt-injection guarantee. Xerify never evaluates provider output as a command, source file, MCP instruction, or configuration. Direct API keys are looked up only by environment-variable name. Official CLI auth stores are accessed only through the official executable; Xerify does not parse or copy them.

Official adapters pin provider organization identity in code. `command` and `openai-compatible` adapter organization labels are owner-controlled configuration, not remote attestation; their cross-provider guarantee is only as strong as that configuration.

STDIO stdout is reserved for MCP frames. Streamable HTTP defaults to loopback and validates Host and Origin. Public binding requires an explicit flag and bearer authentication.

## Compatibility

- Runtime floor: Node.js 20; primary development runtime: Node.js 24.
- Public schema version: `1`.
- MCP SDK major: `2`; modern protocol revision: `2026-07-28`; legacy clients remain served.
- Existing public fields cannot be removed or reinterpreted without a breaking release. Additive optional fields are allowed.

The command-outcome decision and its rationale are recorded in [ADR 0001](decisions/0001-command-outcomes.md).
