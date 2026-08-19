# Project setup and configuration

Xerify keeps project-specific state out of the repository root. Installing Xerify as a direct local
dependency initializes it automatically without overwriting existing files:

```sh
npm install --save-dev xerify@latest
```

Global installs, nested transitive installs, no-save installs, `npx`, and installs with
`XERIFY_SKIP_AUTO_INIT=1` do not write to the current project. Initialize explicitly in those cases:

```sh
npx xerify init
```

The command is idempotent and never overwrites an existing config or `.gitignore`:

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

npm does not expose a categorical direct/transitive flag before the first dependency lifecycle.
Xerify therefore accepts either an existing root manifest/lock declaration or the combination of an
explicit save flag and the exact root `node_modules/xerify` location. A package manager could hoist
a transitive Xerify dependency into that location; the initializer remains non-overwriting and
git-ignored, but library authors should set `XERIFY_SKIP_AUTO_INIT=1` when embedding Xerify.

The canonical project filename is `.xerify/xverify-config.json`. The generated `.gitignore` keeps
both runtime logs and the token-capable config out of Git. Users who keep configuration strictly
secret-free may deliberately force-add it, but must review it again before every commit. A relative
project `logPath` is resolved from the discovered project root, not from the package installation.
Commands started in a subdirectory search parent directories for the nearest canonical project
config; a project-configured relative log path remains anchored to that project root.

## Basic config

`xerify init` also adds `.xerify/` to the root `.gitignore`, `.npmignore`, and `.dockerignore`
idempotently. It appends a small marked entry and never replaces existing ignore rules.

`xerify init` generates a valid starting file:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {},
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

History paths are resolved from the discovered project root. `captureInput` accepts `full`,
`metadata`, or `none`; `captureOutput` accepts `normalized`, `metadata`, or `none`. The transparent
defaults are intended for understandable local operation. Use metadata-only modes before handling
customer data, proprietary source, or other material that must not persist. Active and archive
paths must be disjoint: they cannot be equal or nested inside one another. Changing either path
starts a different sequence namespace. See [local run history](run-history.md) for the exact files
and lifecycle commands.

Empty `providers` keeps the built-in `codex` and `claude` adapters. Add only the transports you use.
For example:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY",
      "apiKey": "optional-literal-fallback"
    },
    "anthropicApi": {
      "kind": "anthropic-api",
      "apiKeyEnvironment": "ANTHROPIC_API_KEY",
      "maxTokens": 4096
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

`$schema` is an editor hint only; Xerify does not fetch or execute it. A project-local installation
may replace it with `../node_modules/xerify/schemas/config.schema.json` for offline completion.

Config is strict. Generic `token`, `secret`, silent `defaultModel`, and credential fields on command
or CLI adapters are rejected. Direct `openai-api`, `anthropic-api`, and `openai-compatible` adapters
accept the exact optional field `apiKey`.

The recommended order is:

1. Use the named environment variable (`apiKeyEnvironment`).
2. Use official CLI-managed authentication for subscription adapters.
3. Use literal `apiKey` only for a single-user local setup where environment management is
   impractical.

When both are present, the environment variable wins. Literal values are redacted as
`[REDACTED]` by `config show` and `config validate`; `health`, `doctor`, errors, prompts, and audit
records never expose them. On POSIX, a config containing `apiKey` is rejected unless its permissions
are owner-only (`chmod 600 .xerify/xverify-config.json`). The initializer creates this mode. On
Windows, protect the file with an owner-only ACL. Never commit, paste into support output, or send
this file as verification evidence.

## Resolution and environment variables

Precedence is CLI flag, Xerify environment override, project config, user config, then adapter
default. User config uses the same `xverify-config.json` filename:

| Environment | User config path                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Linux       | `$XDG_CONFIG_HOME/xerify/xverify-config.json`, otherwise `~/.config/xerify/xverify-config.json` |
| macOS       | `~/Library/Application Support/Xerify/xverify-config.json`                                      |
| Windows     | `%APPDATA%\Xerify\xverify-config.json`                                                          |

`XERIFY_USER_CONFIG_PATH` selects a dedicated user-config file for hermetic automation. Runtime
limits may be overridden with `XERIFY_TIMEOUT_MS`, `XERIFY_MAX_INPUT_BYTES`, and
`XERIFY_MAX_OUTPUT_BYTES`. A CLI `--timeout` or `--log` flag has highest precedence.

Provider/auth variables are forwarded only to the relevant adapter:

| Adapter         | Accepted auth/config environment                                                   |
| --------------- | ---------------------------------------------------------------------------------- |
| Codex CLI       | `CODEX_HOME`, `CODEX_API_KEY`; normal CLI login remains supported                  |
| Claude CLI      | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`; normal CLI login remains supported |
| Cursor Agent    | `CURSOR_API_KEY`, `CURSOR_API_ENDPOINT`; normal `agent login` remains supported    |
| OpenAI API      | named environment variable first; optional literal `apiKey` fallback               |
| Anthropic API   | named environment variable first; optional literal `apiKey` fallback               |
| Generic command | only names listed in `authEnvironment`                                             |

Platform essentials such as `PATH`, home/config locations, temporary-directory variables, and
locale are forwarded so official CLIs can find their own secure auth stores. The rest of the parent
environment is not copied blindly.

There is intentionally no model-selection environment variable. Every live request carries an exact
`--to provider:model`; source provenance uses exact `--from provider:model`. Find model IDs with the
provider's own non-billable discovery command, such as `agent models`, and never guess an alias.

## Health and provider discovery

Use the aggregate non-billable readiness view first:

```sh
xerify --json health
xerify --json health --network
```

`health` reports `ready`, `degraded`, or `setup-required`, whether the current project is
initialized, and every configured/linked adapter plus invocation-provider identity. It also
reports the resolved history paths and capture policy without reading evidence content. The default
does not call a model or probe API endpoints. `--network` adds bounded endpoint reachability checks;
it still does not make an inference request. Use `doctor` for runtime/MCP details and `providers
probe` for a selected adapter.

## Audit log contract

The JSONL audit records timestamp, command, exit, provider/model provenance, verdict, duration,
provider-reported usage, truncation, and typed failure category. It deliberately omits prompts,
claims, context, answers, findings, raw provider responses, authorization data, and credential
paths. New POSIX files are mode `0600`; symlink/non-regular targets are rejected. Logs are operational
metadata, not a transcript and not proof that a verdict is correct.
