# Security Policy

## Reporting

Do not open a public issue for a suspected vulnerability or accidentally exposed credential. Use
[GitHub private vulnerability reporting](https://github.com/VerhexIO/xerify/security/advisories/new).
Include the affected version, impact, reproduction, and any suggested mitigation; omit live
credentials and sensitive production payloads.

No version is publicly supported before the first signed release. After launch, the latest minor release line will receive security fixes; the support table will be updated here.

## Security model

Xerify treats both supplied evidence and provider output as untrusted data. Verification prompts explicitly classify claim/context as evidence rather than instructions and require adversarial falsification. This reduces instruction-confusion risk but does not make an LLM prompt-injection-proof. Xerify never executes model output and never evaluates a configured shell string. Process adapters spawn one executable and argument array with `shell: false`, forward an allowlisted environment, send prompt/context on stdin, bound stdout/stderr, and terminate process trees on timeout or cancellation.

The effective instruction order is Xerify's verification contract, the selected operation, the
owner-approved evidence scope, then the untrusted claim/context. Text inside code, diffs, logs,
comments, documents, or previous model output cannot legitimately change the task, verdict rules, or
response schema. The model may still mishandle that boundary, so core schema validation and
fail-closed outcomes remain mandatory.

Official CLI adapters do not run from the user's repository. Codex uses an ephemeral read-only
sandbox with user config/rules ignored. Claude uses a fresh mode-`0700` temporary directory, safe
mode, no tools, no slash commands, and no session persistence. Cursor uses a fresh mode-`0700`
workspace, read-only ask mode, and its sandbox. Cursor Agent does not currently expose a switch that
categorically disables all account-configured MCP servers; this is a residual boundary, not a hidden
guarantee. Direct API adapters have no local filesystem/tool access. A generic command adapter is
explicitly owner-configured code, runs from a fresh temporary directory by default, and still
inherits the security of that executable and its allowed environment.

Direct API secrets should be read from named environment variables. For basic single-user setups,
direct HTTP adapters also accept an explicit literal `apiKey` fallback; environment wins when both
exist. Provider endpoint URLs are also sensitive because credentials can be embedded in userinfo,
paths, query values, or fragments. The config is git-ignored by default; literal-key or explicit
endpoint config is rejected on POSIX unless mode `0600`; and config inspection replaces both
literal keys and complete endpoint values with `[REDACTED]`. Windows users must apply an owner-only
ACL. Prefer named key environments instead of URL-carried credentials. A compatible endpoint with
userinfo, query parameters, or a fragment—and any remote endpoint without an explicit key
declaration—reports authentication as unknown rather than claiming none is required. Official CLI
credential stores are used only through the official CLI. Optional audit
JSONL excludes prompts, context, answers, findings, raw provider payloads, authorization data, and
credential paths. New POSIX log files use mode `0600` and `O_NOFOLLOW`; every platform rejects
non-regular opened targets. Windows does not provide the same atomic no-follow guarantee, so place
audit logs in an owner-controlled directory.

Project state lives under `.xerify/`; a guarded direct-install lifecycle or `xerify init` creates
`.xerify/xverify-config.json`, private log/run/archive directories, and ignore protection in the
project root `.gitignore`, `.npmignore`, and `.dockerignore`. These protections are defense in depth,
not access control: manually forcing files into Git, npm, or a container context can still disclose
them.

Run history is intentionally more detailed than the secret-safe audit log. With the default
`captureInput: "full"`, claims, questions, and supplied context are stored locally in `.xerify/runs`;
normalized results may contain provider-authored findings. Raw transport responses, auth data, and
environment snapshots are never written. Use `metadata` or `none` capture modes for sensitive
projects, restrict filesystem access, and apply a retention/deletion policy. `runs show` requires
`--include-evidence` before printing evidence content. Each run also has a bounded discovery
`head`: full capture contains a short claim/question preview, metadata capture contains only a
digest, and none capture contains no input-derived content. Archived runs are discoverable through
`.xerify/archive/index.jsonl`; that index contains the bounded head and operational metadata, never
context, answers, findings, evidence bodies, or raw provider output. Its record digest helps locate
and compare a snapshot, but the index is not a tamper-proof ledger against processes running as the
same user. Prefer `xerify runs search` or the index before opening matching full records.
The lifecycle is non-overwriting, makes no network/provider call, and skips global,
nested-transitive, no-save, and `npx` installs. npm's first-install direct/transitive hoisting
ambiguity remains documented; embedders can set `XERIFY_SKIP_AUTO_INIT=1`. Do not force-add project
state or weaken the generated ignore rules.

Streamable HTTP defaults to loopback, validates Host and Origin, and requires explicit confirmation plus bearer authentication for non-loopback binds. Operators remain responsible for TLS, secret rotation, network policy, rate limiting, multi-user authorization, and safe log collection.

## Limitations

A `confirmed` verdict means the verifier found no material counterexample under the supplied evidence and reported limitations; it is not a security guarantee, formal verification, or permission to execute a change. Cross-provider review can still share model lineage, training data, blind spots, or compromised context. Evidence references are model-reported pointers, not validated citations. Keep sensitive inputs scoped and review all findings independently.

Provider separation is based on the invocation/billing/control service. A model reached through
Cursor is `cursor` even when its catalog ID names GPT, Claude, or Gemini. Therefore a direct vendor
call and Cursor can satisfy the provider check while still using related or identical upstream model
lineage. Treat channel diversity as defense in depth, never as proof of model independence.

No prompt-only technique can fully prevent injection. Before a live call, inspect the exact bounded
stdin scope; exclude credentials, environment dumps, customer data, unrelated source, and auth
stores. Prefer generated diffs/test output over a whole repository. Keep provider CLI, extensions,
plugins, MCP configuration, and account policy trusted and up to date. Treat `unclear`, truncation,
invalid structured output, timeout, or adapter failure as non-success and require independent tests
before acting on any verdict.
