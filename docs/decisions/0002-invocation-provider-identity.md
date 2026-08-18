# ADR 0002: Invocation-provider identity

- Status: accepted
- Date: 2026-08-19

## Context

The pre-release implementation originally assigned Cursor models to an inferred upstream vendor
from model-name prefixes. That made Cursor GPT `openai`, Cursor Claude `anthropic`, and so on. The
mapping was incomplete, coupled identity to changing catalog names, and hid the operational fact
that authentication, billing, policy, execution, and response delivery were controlled by Cursor.

Xerify needs one deterministic meaning for the `provider` field across CLI, API, MCP, history,
health, and verdict admission.

## Decision

`provider` identifies the invocation/billing/control service used for the model call:

- Codex CLI and OpenAI API: `openai`
- Claude CLI and Anthropic API: `anthropic`
- Cursor Agent, for every exact Cursor model ID: `cursor`
- owner-configured command/gateway: its declared provider label

Cursor model IDs are opaque catalog identifiers. Xerify rejects `auto` because the request and
result could not preserve the exact selected model. It does not infer provider identity from model
prefixes. Two Cursor calls are same-provider even when their model IDs name different upstream
families. A direct OpenAI call and Cursor GPT are different invocation providers.

## Consequences

Provider separation now measures channel and control-plane diversity. It does not prove different
model vendors, weights, training data, or blind spots. Public documentation must state this limit;
“different provider” must not be expanded into “independent model” or “independent truth.”

Health and MCP capabilities expose `identityBasis: "invocation-provider"`. Cursor configuration
uses one adapter with `provider: "cursor"`. Legacy pre-release Cursor configs that label an upstream
vendor are rejected rather than silently reinterpreted.

There is no Gemini CLI subscription adapter in this release. A Gemini-named model invoked through
Cursor is `cursor`; a future direct Google API/CLI adapter would be `google`.

The change happened before the first npm publication, so the public schema remains version 1. Live
records created under the superseded mapping are historical transport evidence, not release proof
for the accepted identity contract.
