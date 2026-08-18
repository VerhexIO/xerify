<p align="center">
  <img src="assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Ask another provider. Get a clear second opinion.</strong></p>

Xerify is a shell-first, open-source tool for bounded cross-provider questions and verification. It can use provider CLIs already authenticated on your machine, direct APIs, or an explicitly configured executable. The same core and schemas power the CLI, library, local STDIO MCP server, and Streamable HTTP MCP server.

Xerify provides a second opinion, not formal proof or guaranteed truth. Provider output is untrusted data and is never executed.

> **Release status:** `0.1.0` is a pre-release candidate. Public CI is green on Ubuntu, macOS, and Windows with Node 20/24, including external install and MCP Inspector smoke; an owner-approved Claude live verification is also recorded. WSL, Cursor host smoke, externally sourced brand approval, and published signed npm/GitHub artifacts remain release gates.

## Install

After the first public release:

```sh
npm install --global xerify
xerify --help
xerify --json doctor
```

From a source checkout:

```sh
npm ci
npm run check
npm link
xerify --help
```

Node.js 20 or newer is required. Node.js 24 is the primary development lane.

## Quick start

Ask an open-ended question. Piped input becomes bounded context:

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "What is the highest-risk issue in this change?"
```

Verify a concrete claim with a different provider organization:

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "This change closes the race without introducing a regression"
```

`--from` and `--to` identify provider organizations, not host applications. Claude used in Cursor is still `anthropic`; Codex used from an IDE is still `openai`. Same-provider verification fails before a model call.

Live provider calls can consume subscription quota or incur API charges. Setup commands are non-billable:

```sh
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

## Commands

```text
xerify ask
xerify verify
xerify doctor
xerify providers list
xerify providers probe
xerify config show
xerify config validate
xerify mcp stdio
xerify mcp http
xerify request
```

Global `--json`, `--timeout`, and `--log` options may appear before or after a subcommand. JSON mode writes one undecorated envelope to stdout. Important verification exits are `0` confirmed, `10` refuted, and `11` unclear; transport and schema failures have separate typed exits. See [the JSON contract](docs/json-contract.md).

`xerify request` is a bounded adapter-debug escape hatch. Even when its envelope uses `operation: "verify"`, it does not enforce author provenance, provider separation, verdict parsing, or verification exit semantics.

## Providers

The default config exposes the official `codex` and `claude` CLI adapters. Additional built-ins are `openai-api`, `anthropic-api`, `openai-compatible`, and a shell-free generic `command` adapter.

API keys are read from named environment variables; secret values are rejected from config and never printed by diagnostics. Usage and cost are reported only when the provider supplies them. See [provider adapters](docs/provider-adapters.md).

## Configuration

Project configuration lives at `xerify.config.json`. User configuration uses the platform-native config directory. Precedence is flags, environment, project file, user file, then defaults.

Hermetic automation may point `XERIFY_USER_CONFIG_PATH` at a dedicated file without changing the process home directory.

```json
{
  "$schema": "./node_modules/xerify/schemas/config.schema.json",
  "providers": {
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY"
    },
    "localVerifier": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/verifier",
      "args": ["--model", "{model}", "--operation", "{operation}"],
      "authKind": "local",
      "structuredOutput": true
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  }
}
```

Only `{model}` and `{operation}` are expanded for a command adapter. Xerify invokes an executable plus argument array with `shell: false` and sends prompt/context through stdin.

Every live `ask` or `verify` request must name an exact model in `--to provider:model`; configuration does not silently choose or guess a model.

## MCP

For local hosts:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "xerify",
      "args": ["mcp", "stdio"]
    }
  }
}
```

The server exposes `xerify_ask`, `xerify_verify`, and `xerify_capabilities`. SDK v2 modern (`2026-07-28`) and legacy negotiation are served from one factory and are exercised by a pinned Inspector smoke.

Streamable HTTP binds to `127.0.0.1:8787` by default:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

A non-loopback bind requires both `--allow-public` and a bearer token supplied through `--token-env`. See [MCP operation and security](docs/mcp.md).

## Development and evidence

```sh
npm run check
npm run smoke:mcp
npm run assets:logo
```

Normal tests are hermetic and never require a provider account. The live smoke is separately gated by `XERIFY_LIVE_CONFIRM_BILLABLE=YES` and an explicit provider/model selection. Architecture, release evidence, and remaining host/OS gates are recorded in [the architecture guide](docs/architecture.md), [provider matrix](docs/provider-adapters.md), and [release guide](docs/release.md).

## Security and license

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability or operating the HTTP server. Xerify is released under the [MIT License](LICENSE); third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
