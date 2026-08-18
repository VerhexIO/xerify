# Provider adapters

Xerify identifies a provider by the organization serving the model, not by the host application.
For example, Claude used through Cursor is still `anthropic`; changing the host does not satisfy the
different-provider rule.

Every built-in adapter returns the same bounded `InvokeResult`. Usage values come only from the
provider response. Missing token or cost fields remain `null`; Xerify does not estimate them.

## Built-in matrix

| Adapter kind        | Provider identity | Transport                        | Authentication                                                        | Structured verification                              |
| ------------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| `codex`             | `openai`          | official `codex` CLI             | existing CLI login or `CODEX_API_KEY`                                 | `codex exec --output-schema`                         |
| `claude`            | `anthropic`       | official `claude` CLI            | existing CLI login, `ANTHROPIC_API_KEY`, or `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                            |
| `openai-api`        | `openai`          | Responses API                    | environment variable, default `OPENAI_API_KEY`                        | `text.format.type=json_schema`, strict               |
| `anthropic-api`     | `anthropic`       | Messages API                     | environment variable, default `ANTHROPIC_API_KEY`                     | `output_config.format.type=json_schema`              |
| `openai-compatible` | configured        | chat-completions-compatible HTTP | optional environment variable                                         | `response_format.type=json_schema`                   |
| `command`           | configured        | executable plus argument array   | configured environment allowlist                                      | prompt contract; response is still validated by core |

The official references used by these adapters are the [Codex non-interactive
guide](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude Code CLI
reference](https://code.claude.com/docs/en/cli-reference), [OpenAI structured output
guide](https://developers.openai.com/api/docs/guides/structured-outputs), and [Anthropic structured
output guide](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

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
tools, non-interactive permission handling, and safe mode. Verification supplies the canonical JSON
Schema through `--json-schema`; the provider result comes from `structured_output`.

`usage.input_tokens`, `usage.output_tokens`, and `total_cost_usd` are mapped when present. A
non-success subtype or non-zero exit is a provider failure. `xerify providers probe --provider
claude` runs `claude auth status --json` without a model call.

## Direct APIs

The OpenAI adapter posts to `/v1/responses` with `store: false`. The Anthropic adapter posts to
`/v1/messages` with `anthropic-version: 2023-06-01`. Prompts are byte-bounded before the request,
responses are stream-bounded, and cancellation/timeout use `AbortSignal`.

Anthropic `max_tokens` is an invalid/incomplete response and `refusal` is a non-retryable provider
failure. OpenAI responses whose status is not `completed`, responses without the expected output
block, malformed JSON, and truncated structured output are typed failures.

API keys are read only from the configured environment variable. They are not accepted in config,
returned by `doctor`, placed in provider prompts, or written to audit logs.

## Generic command

The generic adapter never evaluates a shell string. Configuration provides one executable and an
argument array; only `{model}` and `{operation}` placeholders are expanded. Prompt/context is sent
on stdin. Child environment forwarding is limited to platform essentials plus the adapter's explicit
`authEnvironment` list.

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

| Environment         | Hermetic evidence       | Official binary probe                    | Billable live smoke       |
| ------------------- | ----------------------- | ---------------------------------------- | ------------------------- |
| Linux x64, Node 24  | green locally           | Codex and Claude available/authenticated | pending explicit approval |
| Linux, Node 20      | CI pending              | CI/account independent                   | opt-in only               |
| macOS, Node 20/24   | CI pending              | host-specific                            | opt-in only               |
| Windows, Node 20/24 | CI pending              | host-specific                            | opt-in only               |
| WSL, Node 20/24     | dedicated proof pending | host-specific                            | opt-in only               |

Normal tests never use a provider account. A live smoke must be explicitly enabled and clearly
treated as potentially billable.
