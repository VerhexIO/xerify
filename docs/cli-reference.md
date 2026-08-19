# CLI reference

All commands use the same validated config and core as the library and MCP server. Global options
may appear before or after a subcommand:

| Option                     | Meaning                                            |
| -------------------------- | -------------------------------------------------- |
| `--json`                   | Write one stable JSON envelope to stdout           |
| `--timeout <milliseconds>` | Override the bounded provider lifecycle timeout    |
| `--log <path>`             | Override the secret-safe JSONL audit metadata path |
| `--version`                | Print the installed Xerify version                 |

## Verification and adapter commands

| Command                                                                      | Purpose                                                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `xerify ask [question]`                                                      | Open-ended second opinion; stdin is bounded context                         |
| `xerify ask --question <text> --to <provider:model>`                         | Unambiguous form when stdin supplies context                                |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | Falsification-oriented verification with different invocation providers     |
| `xerify request --to <provider:model> --input <file>`                        | Raw bounded adapter debug request; does not provide verification guarantees |

`ask` and `verify` also accept `--adapter <id>` and `--context-label <label>`. `ask` accepts
optional `--from`; `verify` requires known or declared source provenance. Every live target must
contain an exact model ID. Same-provider verification and Cursor `auto` fail before a provider
call.

## Setup, config, and health

| Command                                    | Purpose                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| `xerify init`                              | Idempotently initialize private project-local `.xerify/` state |
| `xerify health [--network]`                | Aggregate project and adapter readiness                        |
| `xerify doctor [--network]`                | Detailed runtime, config, MCP, and adapter diagnostics         |
| `xerify providers list`                    | List configured capabilities without an inference call         |
| `xerify providers probe --provider <id>`   | Probe one adapter's executable/auth readiness                  |
| `xerify providers probe --all [--network]` | Probe every adapter; network checks remain non-inference       |
| `xerify config show`                       | Show resolved config and sources with secrets redacted         |
| `xerify config validate`                   | Validate project/user config and print the redacted resolution |

`health`, `doctor`, config commands, run commands, capability discovery, and the default provider
probe do not call a model. `--network` adds bounded endpoint reachability only.

## Run history

| Command                                           | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `xerify runs list [--archived] [--limit <count>]` | List active or archived records              |
| `xerify runs show <run> [--archived]`             | Show one normalized record                   |
| `xerify runs show <run> --include-evidence`       | Explicitly include captured evidence content |
| `xerify runs archive <run>`                       | Move an active record into the archive       |
| `xerify runs restore <run>`                       | Restore an archived record                   |
| `xerify runs delete <run> --yes [--archived]`     | Permanently delete one record                |

`<run>` accepts the decimal sequence (`1`) or stable ID (`xrun_000001`). Archive, restore, and
delete are local filesystem operations and never call a provider. A running record cannot be
archived or deleted.

## MCP server

| Command                                                                      | Purpose                            |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| `xerify mcp stdio`                                                           | Serve local MCP over STDIO         |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | Serve loopback Streamable HTTP MCP |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | Explicit authenticated public bind |

STDIO reserves stdout for protocol frames. Non-loopback HTTP requires both `--allow-public` and a
bearer token supplied through a named environment variable.
