# Contributing

Xerify is developed against the public architecture guide, accepted ADRs, schemas, and tested
contracts. Public code, documentation, and commit messages are English. Xerify is created and
developed by Verhex; community contributions remain welcome under the project's MIT license.

## Setup

Use Node.js 20 or newer; Node.js 24 is the primary lane.

```sh
npm ci
npm run check
```

Run the focused test while iterating, then the complete gate before submitting. Changes to schemas must update CLI/MCP parity tests and regenerated files under `schemas/`. Provider changes require registry wiring, hermetic conformance coverage, timeout/cancellation behavior, usage mapping, and documentation of the official interface.

Useful non-billable gates:

```sh
npm run smoke:mcp
npm run smoke:install
npm run release:audit
```

Live provider tests are opt-in, potentially billable, and never part of normal PR CI. Do not run one without explicit approval. Never commit credentials, provider auth stores, cookies, raw authorization headers, production prompts/payloads, or generated audit logs.

Keep core business semantics out of CLI and MCP handlers. Do not introduce shell-evaluated commands, blind parent-environment forwarding, silent truncation, guessed provider usage, or same-provider verification bypasses.

By contributing, you agree that your contribution is licensed under the MIT License.
