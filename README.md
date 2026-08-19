<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Ask another provider. Get a clear second opinion.</strong></p>

Xerify is a shell-first, open-source tool for bounded cross-provider questions and verification. It can use provider CLIs already authenticated on your machine, direct APIs, or an explicitly configured executable. The same core and schemas power the CLI, library, local STDIO MCP server, and Streamable HTTP MCP server.

Xerify is created and developed by **Verhex**, with community contributions, and distributed under
the MIT License.

Xerify provides a second opinion, not formal proof or guaranteed truth. Provider output is untrusted data and is never executed.

> **Release status:** `0.1.0` is a pre-release candidate. Public CI is green on Ubuntu, macOS, and Windows with Node 20/24, including external install and MCP Inspector smoke. The invocation-provider identity contract has live Cursor/OpenAI proof in both directions, and the logo geometry/palette are owner-approved. WSL, first npm publication/Trusted Publisher setup, and signed GitHub artifacts remain release gates.

## Install

After the first public release:

```sh
npm install --global xerify@latest
xerify --help
xerify --json health
xerify init
```

From a source checkout:

```sh
npm ci
npm run check
npm link
xerify --help
xerify init
```

Node.js 20 or newer is required. Node.js 24 is the primary development lane.
For a project-local install after publication, use `npm install --save-dev xerify@latest` and invoke
it with `npx xerify`. A guarded `postinstall` initializes `.xerify/` for a declared direct local
dependency or an explicit root `--save-dev/--save-prod` install. Global, nested transitive, no-save,
and `npx` installs do not write into the current project; run `xerify init` explicitly in those
cases. Set `XERIFY_SKIP_AUTO_INIT=1` to opt out. See the documented npm hoisting limitation before
using Xerify as another package's dependency.
See [installation and upgrades](docs/installation.md) for project-local, global, `npx`, lifecycle,
upgrade, removal, and clean-install verification instructions.

## Quick start

Ask an open-ended question. Piped input becomes bounded context:

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "What is the highest-risk issue in this change?"
```

Verify a concrete claim with a different invocation provider:

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "This change closes the race without introducing a regression"
```

`--from` and `--to` identify the service that performs or performed the invocation. Cursor Agent is
always `cursor`, regardless of whether its exact model ID names GPT, Claude, Gemini, Grok, Composer,
or another model. Direct Codex/OpenAI is `openai`; direct Claude/Anthropic is `anthropic`.
Same-provider verification fails before a model call.

This measures channel/control-plane diversity, not model-lineage independence. For example,
`openai:gpt-x → cursor:gpt-x` is admitted but may share the same upstream model and blind spots.

Only the target adapter is called. `--from` declares who authored the existing artifact, so both
OpenAI → Anthropic and Anthropic → OpenAI work without introducing an author-orchestration layer.

Live provider calls can consume subscription quota or incur API charges. Setup commands are non-billable:

```sh
xerify --json doctor
xerify --json health
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

## Commands

```text
xerify ask
xerify verify
xerify health
xerify doctor
xerify providers list
xerify providers probe
xerify config show
xerify config validate
xerify mcp stdio
xerify mcp http
xerify request
xerify init
xerify runs list
xerify runs show 1
xerify runs search "race condition"
xerify runs archive 1
xerify runs restore 1
xerify runs delete 1 --yes
```

Global `--json`, `--timeout`, and `--log` options may appear before or after a subcommand. JSON mode writes one undecorated envelope to stdout. Important verification exits are `0` confirmed, `10` refuted, and `11` unclear; transport and schema failures have separate typed exits. See the [complete CLI reference](docs/cli-reference.md) and [JSON contract](docs/json-contract.md).

`xerify request` is a bounded adapter-debug escape hatch. Even when its envelope uses `operation: "verify"`, it does not enforce author provenance, provider separation, verdict parsing, or verification exit semantics.

## Providers

The default config exposes the official `codex` and `claude` CLI adapters. Additional built-ins are
the invocation-provider-pinned Cursor `agent` adapter, `openai-api`, `anthropic-api`,
`openai-compatible`, and a shell-free generic `command` adapter.

Direct API keys should be read from named environment variables. A literal `apiKey` is supported as
an explicit fallback for basic local setups, but the config is git-ignored, must be owner-only on
POSIX, and is always redacted from CLI diagnostics. Usage and cost are reported only when the
provider supplies them. See [provider adapters](docs/provider-adapters.md) and [project
configuration](docs/configuration.md).

## Configuration

Project-local npm installation runs a guarded, non-overwriting init; `xerify init` is the explicit
idempotent fallback. Configuration lives at `.xerify/xverify-config.json`; secret-safe
audit metadata goes to `.xerify/logs/audit.jsonl` and is ignored by the generated
`.xerify/.gitignore`. Each `ask`/`verify` also gets a sequential, content-addressed record under
`.xerify/runs/`; archived records move to `.xerify/archive/`. Initialization adds `.xerify/` to the
project root `.gitignore`, `.npmignore`, and `.dockerignore` without replacing existing content.
The config itself is also ignored because it may contain an optional literal
API key. User configuration uses the platform-native config directory with the same
`xverify-config.json` filename. Precedence is flags, environment, project file, user file, then
defaults.

Hermetic automation may point `XERIFY_USER_CONFIG_PATH` at a dedicated file without changing the process home directory.

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY"
    },
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
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
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

The transparent default stores the claim/question, supplied context, SHA-256 evidence manifest,
normalized Xerify result, lifecycle events, and final exit outcome locally. It never stores raw
transport output or credentials. Sensitive projects can select `captureInput: "metadata"` or
`"none"`, and `captureOutput: "metadata"` or `"none"`. `runs show` does not print evidence content
unless `--include-evidence` is explicit. One `runs/HEAD.json` preserves monotonic IDs without a
per-run reservation tree; `archive/index.jsonl` lets humans and agents find archived verification
heads without scanning every record. See [local run history](docs/run-history.md).

Only `{model}` and `{operation}` are expanded for a command adapter. Xerify invokes an executable plus argument array with `shell: false` and sends prompt/context through stdin.

Every live `ask` or `verify` request must name an exact model in `--to provider:model`; configuration does not silently choose or guess a model.

For Cursor, configure one `cursor` adapter and use `--to cursor:EXACT_MODEL_ID`. Exact model IDs are
opaque Cursor catalog identifiers; Xerify does not reinterpret their upstream vendor. `auto` fails
before a call because it cannot produce deterministic model provenance. Use `agent models` to choose an exact ID. Token values never belong in
`.xerify/xverify-config.json` unless the user explicitly accepts local secret-file custody. Prefer
environment-variable names; literal `apiKey` is a fallback and is never printed. The full
precedence, permission, environment, and user-path rules are in
[configuration](docs/configuration.md).

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

## Contributing and compatibility

```sh
npm run check
npm run smoke:mcp
npm run assets:logo
```

Normal tests are hermetic and never require a provider account. Source contributions follow the
[contribution guide](https://github.com/VerhexIO/xerify/blob/main/CONTRIBUTING.md); the public
runtime, host, schema, and provider support boundary is documented in
[compatibility](docs/compatibility.md). Injection defenses and residual boundaries are documented
in [SECURITY.md](SECURITY.md); prompt instructions reduce risk but cannot make any LLM
prompt-injection-proof.

## Security and license

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability or operating the HTTP server.
Subscription, direct API, Cursor, CLI, and MCP combinations are mapped in [provider and access
channels](docs/channels.md). Xerify is created and developed by **Verhex**, with community
contributions, and distributed under the [MIT License](LICENSE). Third-party notices are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
