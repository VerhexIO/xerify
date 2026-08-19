# Provider adapters

Xerify identifies a provider by the invocation/billing/control service. Cursor Agent is `cursor`
regardless of the upstream model named by its exact model ID. Direct Codex/OpenAI is `openai` and
direct Claude/Anthropic is `anthropic`.

This boundary measures channel diversity, not model-vendor or lineage independence. OpenAI direct
and GPT through Cursor are admitted as different providers but may share upstream blind spots.

Every built-in adapter returns the same bounded `InvokeResult`. Usage values come only from the
provider response. Missing token or cost fields remain `null`; Xerify does not estimate them.

Official adapters pin invocation-provider identity in code. The identity on `command` and
`openai-compatible` adapters is owner-controlled configuration rather than remote attestation;
cross-provider enforcement for those adapters is only as strong as that configuration.

## Built-in matrix

| Adapter kind        | Provider identity | Transport                        | Authentication                                                        | Structured verification                              |
| ------------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| `codex`             | `openai`          | official `codex` CLI             | existing CLI login or `CODEX_API_KEY`                                 | `codex exec --output-schema`                         |
| `claude`            | `anthropic`       | official `claude` CLI            | existing CLI login, `ANTHROPIC_API_KEY`, or `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                            |
| `cursor`            | `cursor`          | official Cursor `agent` CLI      | existing Cursor login or `CURSOR_API_KEY`                             | prompt contract; core validation                     |
| `openai-api`        | `openai`          | Responses API                    | environment first; optional literal fallback                          | `text.format.type=json_schema`, strict               |
| `anthropic-api`     | `anthropic`       | Messages API                     | environment first; optional literal fallback                          | `output_config.format.type=json_schema`              |
| `openai-compatible` | configured        | chat-completions-compatible HTTP | optional environment or literal key                                   | `response_format.type=json_schema`                   |
| `command`           | configured        | executable plus argument array   | configured environment allowlist                                      | prompt contract; response is still validated by core |

The official references used by these adapters are the [Codex non-interactive
guide](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude Code CLI
reference](https://code.claude.com/docs/en/cli-reference), [OpenAI structured output
guide](https://developers.openai.com/api/docs/guides/structured-outputs), and [Anthropic structured
output guide](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
Cursor behavior follows the official [Agent CLI overview](https://cursor.com/docs/cli/overview) and
[CLI parameter reference](https://cursor.com/docs/cli/reference/parameters).

## Codex CLI

Executable: `codex`. Xerify sends the prompt on stdin and invokes `codex exec` with an ephemeral
session, read-only sandbox, ignored user rules/config, JSONL events, and an exact output-schema file
for verification. The schema file lives in a mode-`0600` temporary directory and is removed in a
`finally` block.

The final `item.completed` agent message becomes provider output. `turn.completed.usage` maps
`input_tokens` and `output_tokens`; cost remains `null`. An error event, failed turn, non-zero exit,
timeout, or cancellation is never reported as a successful answer.

`xerify providers probe --provider codex` resolves the executable and runs `codex login status`.
It does not make a model request.

## Claude CLI

Executable: `claude`. Xerify uses print mode with JSON output, disabled session persistence, no
tools, disabled slash commands, non-interactive permission handling, and safe mode. Each call runs
from a fresh mode-`0700` temporary directory rather than the user's project. Verification supplies
the canonical JSON Schema through `--json-schema`; the provider result comes from
`structured_output`.

`usage.input_tokens`, `usage.output_tokens`, and `total_cost_usd` are mapped when present. A
non-success subtype or non-zero exit is a provider failure. `xerify providers probe --provider
claude` runs `claude auth status --json` without a model call.

The strict generation schema is derived from canonical Zod field definitions and stripped of
provider-unsupported validation constraints. Core Zod validation re-applies all bounds after receipt.

## Cursor Agent CLI

Executable: `agent`. Cursor is the invocation-provider identity for every model reached through
Cursor Agent:

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

Run `agent models` and pass one exact listed ID as `cursor:MODEL_ID`. Xerify treats the model ID as an
opaque Cursor catalog identifier and does not infer provider identity from prefixes such as `gpt-`,
`claude-`, or `gemini-`. `auto` is rejected before a call because it cannot preserve the exact model
used in provenance; explicit Composer, Kimi, GLM, GPT, Claude, Gemini, and Grok IDs are admissible if
the installed Cursor account exposes them.

There is no direct Gemini CLI subscription adapter in this release. Cursor-hosted Gemini remains a
Cursor invocation. A future direct Google API or CLI adapter would carry `google` identity.

The adapter sends the prompt on stdin and uses `agent -p --mode ask --sandbox enabled` with JSON
output. It grants trust only to a new empty mode-`0700` temporary workspace, supplies that workspace
explicitly, and removes it in `finally`. Cursor does not expose a JSON-Schema output flag, so the
verification prompt carries the canonical contract and Xerify validates the returned `result` with
the same core Zod schema. Invalid prose or fenced JSON becomes fail-closed `unclear`; it is never
converted to `confirmed`.

Cursor's current CLI has no flag that categorically disables every user-configured MCP server. Ask
mode is read-only and the workspace is empty, but account-level Cursor behavior remains a residual
trust boundary. Do not send secrets or run this adapter under a Cursor account with untrusted global
extensions/MCP configuration. `xerify providers probe --provider <cursor-adapter-id>` runs `agent
status` without a model call and does not parse or print account identity.

Structured-output compliance is model- and release-specific because Cursor exposes no schema
enforcement flag. On Linux x64 with Cursor Agent `2026.08.11-e8db854`, exact models
`cursor-grok-4.6-high-fast` and `gpt-5.6-sol-high` passed the fixed injection/refutation contract;
`gpt-5.6-sol-high` also completed bounded core-code verification. In the same evidence window,
`claude-sonnet-5-high` and `claude-sonnet-5-thinking-high` returned output that failed Xerify's
strict schema and therefore remained typed `unclear`/exit `6`. This is an honest observed matrix,
not a universal promise about a model family or future Cursor release.

## Direct APIs

The OpenAI adapter posts to `/v1/responses` with `store: false`. The Anthropic adapter posts to
`/v1/messages` with `anthropic-version: 2023-06-01`. Prompts are byte-bounded before the request,
responses are stream-bounded, and cancellation/timeout use `AbortSignal`.

Anthropic `max_tokens` is an invalid/incomplete response and `refusal` is a non-retryable provider
failure. OpenAI responses whose status is not `completed`, responses without the expected output
block, malformed JSON, and truncated structured output are typed failures.

API keys resolve from the configured environment variable first. Direct API adapters accept a
literal `apiKey` only as a fallback for local basic-user setups. Such config is git-ignored by
default, must be mode `0600` on POSIX, and is redacted from `config show/validate`; keys are never
returned by `health`/`doctor`, placed in provider prompts, or written to audit logs.

## Generic command

The generic adapter never evaluates a shell string. Configuration provides one executable and an
argument array; only `{model}` and `{operation}` placeholders are expanded. Prompt/context is sent
on stdin. Configured generic commands run from a fresh mode-`0700` temporary directory by default;
the programmatic SDK alone may supply an explicit `cwd`. Child environment forwarding is limited to
platform essentials plus the adapter's explicit `authEnvironment` list.

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## Admission evidence

Hermetic contract tests cover CLI event parsing, structured payloads, usage mapping, missing auth,
HTTP request shape, timeout/cancellation, invalid output, output bounds, CRLF, Unicode and spaced
paths. The process integration test also verifies POSIX descendant signalling.

| Environment         | Hermetic package evidence | Official binary probe | Billable live smoke |
| ------------------- | ------------------------- | --------------------- | ------------------- |
| Linux, Node 20/24   | public CI                 | host/account-specific | opt-in only         |
| macOS, Node 20/24   | public CI                 | host/account-specific | opt-in only         |
| Windows, Node 20/24 | public CI                 | host/account-specific | opt-in only         |
| WSL, Node 20/24     | verify on target host     | host/account-specific | opt-in only         |

Normal tests never use a provider account. A live smoke must be explicitly enabled and clearly
treated as potentially billable. See [compatibility and support boundaries](compatibility.md) for
the consumer-facing interpretation of these checks.
