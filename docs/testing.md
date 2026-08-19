# Testing and live verification

## Non-billable deterministic gates

These commands do not require a provider account or make a model call:

```sh
npm ci
npm run check
npm run generate:schemas
npm run smoke:mcp
npm run smoke:install
```

`check` runs formatting, lint, TypeScript checking, hermetic unit/contract/integration tests, and a
build. Fake executables cover provider JSON/JSONL parsing, stdin transport, process limits, timeout,
abort, malformed output, and the verification exit contract. `smoke:install` packs and installs the
actual artifact through both global and direct local installs in clean temporary projects. It proves
that global install has no project side effect, direct install performs guarded auto-init, forbidden
development/brand paths are absent, and the installed CLI/MCP chain works. `smoke:mcp` exercises the
STDIO server through the pinned MCP Inspector.

Deterministic means the harness, schemas, admission checks, bounds, and expected exits are fixed. It
does not mean an LLM's prose is byte-for-byte reproducible. Official CLI transports expose no common
seed/temperature contract. Xerify therefore asserts stable semantic invariants—such as a direct
synthetic contradiction returning `refuted`/exit `10`—and validates the full schema without snapshotting
provider prose.

## Opt-in billable matrix

`npm run smoke:live` sends a fixed synthetic false claim plus an embedded verdict-injection string.
It accepts only a structured `refuted` result, exit `10`, no failure, exact provider/model echo, and
no truncation. It prints a sanitized evidence record and never persists the prompt or raw response.

Required variables:

| Variable                           | Meaning                                          |
| ---------------------------------- | ------------------------------------------------ |
| `XERIFY_LIVE_CONFIRM_BILLABLE=YES` | explicit acknowledgement after owner approval    |
| `XERIFY_LIVE_ADAPTER`              | target transport: `claude`, `codex`, or `cursor` |
| `XERIFY_LIVE_FROM`                 | declared author `provider:model`                 |
| `XERIFY_LIVE_TO`                   | exact target `provider:model`                    |
| `XERIFY_LIVE_EXECUTABLE`           | optional executable/path override                |
| `XERIFY_LIVE_TIMEOUT_MS`           | optional lifecycle timeout, default `180000`     |

OpenAI-authored claim to Anthropic through Claude CLI:

```sh
XERIFY_LIVE_CONFIRM_BILLABLE=YES \
XERIFY_LIVE_ADAPTER=claude \
XERIFY_LIVE_FROM=openai:EXACT_AUTHOR_MODEL \
XERIFY_LIVE_TO=anthropic:EXACT_CLAUDE_MODEL \
npm run smoke:live
```

Anthropic-authored claim through Cursor Agent:

```sh
XERIFY_LIVE_CONFIRM_BILLABLE=YES \
XERIFY_LIVE_ADAPTER=cursor \
XERIFY_LIVE_FROM=anthropic:EXACT_AUTHOR_MODEL \
XERIFY_LIVE_TO=cursor:EXACT_CURSOR_MODEL \
npm run smoke:live
```

The author adapter is not invoked: `from` is provenance metadata for an existing artifact. Direction
means `declared author invocation provider → target invocation provider`; any configured target
transport can be used when the identities differ. Every model reached through Cursor Agent uses the
`cursor` identity. This does not prove different upstream model lineage.

Normal CI never runs this command. Live calls may consume quota or incur charges and require explicit
owner approval for the exact scoped synthetic or project evidence being sent.

Recorded Linux x64 / Node 24 evidence before the identity-contract migration remains historical
transport evidence, not release proof for the new provider labels. Post-migration evidence now
covers direct Codex/OpenAI to Cursor and a Cursor-authored observation back to direct Codex/OpenAI.
In both directions an under-scoped or overbroad first claim remained `unclear` before the corrected
bounded claim became `confirmed`. The fixed synthetic injection/refutation contract also passed on
Cursor Grok and Cursor GPT, while two Cursor Claude exact-model attempts failed strict response
schema validation and correctly remained non-success. See [Platform and host
evidence](platform-evidence.md). A future model/CLI/OS combination remains unproven until that lane
is executed; model availability from one Cursor account is not a universal supported-model promise.

Gemini CLI subscription is not an admitted channel. A Gemini model invoked by Cursor is tested and
reported as `cursor`; a future direct Google API/CLI lane would be `google`.
