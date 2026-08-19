# Compatibility and support boundaries

Xerify supports Node.js 20 and 24 on Ubuntu, macOS, and Windows through the public CI matrix. Node.js
24 is the primary release lane. WSL uses the Linux runtime path, but host-specific provider
authentication and process behavior should be checked with `xerify health` on the actual machine.
The `0.1.0` release candidate's full check, clean-install smoke, and release audit also pass on WSL2
with Node.js 24.

## Supported surfaces

| Surface               | Contract                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| CLI                   | Human output plus stable `--json` envelopes and documented exit codes    |
| JavaScript/TypeScript | ESM package exports with bundled declarations                            |
| MCP STDIO             | Local server, modern and legacy protocol negotiation                     |
| MCP Streamable HTTP   | Loopback by default; authenticated explicit opt-in for non-loopback bind |

The public JSON/schema version is `1`. Additive optional fields may appear in compatible releases;
removal or reinterpretation of an existing public field requires a breaking release.

## Provider channels

Built-in adapters cover Codex CLI, Claude CLI, Cursor Agent, OpenAI API, Anthropic API,
OpenAI-compatible HTTP, and an explicitly configured command. Availability depends on the selected
channel, installed executable, account, exact model ID, authentication, region, and provider
policy. Xerify does not promise that a model visible to one account exists for another.

Run these non-billable checks in the consuming environment:

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Provider probes establish local transport readiness, not model quality or truth. A successful live
call proves only the exact adapter/provider/model path used for that request. Provider prose is not
byte-deterministic, so Xerify guarantees schema, bounds, fail-closed outcomes, and typed errors—not
identical wording.

## Outcome boundary

`confirmed` means no material counterexample was found within the supplied evidence. It is not
formal verification, a security certification, or automatic permission to merge or execute a
change. `refuted` blocks the claim; `unclear`, timeout, truncation, invalid output, and provider
failure remain non-success and require retry, stronger evidence, or human review.

Normal package and CI checks do not require provider credentials or make model calls. Live provider
testing is always explicit and may consume subscription quota or incur API charges.

For adapter-specific restrictions see [provider adapters](provider-adapters.md). For data and prompt
boundaries see [SECURITY.md](../SECURITY.md).
