# Contributing

Xerify is built and maintained by Verhex, and is the standalone open-source form of the
cross-provider verification layer used by Deckent, the Verhex agentic operating system. Bug reports, documentation corrections, and focused
proposals are welcome. Opening an issue or pull request does not guarantee that a change will be
accepted, scheduled, or supported; maintainers retain product scope and release decisions.

Use the issue templates for reproducible bugs and feature proposals. Security vulnerabilities and
accidentally exposed credentials must use private vulnerability reporting, never a public issue.
Discuss a material feature, new provider, public contract change, dependency, or architectural
direction in an issue before investing in an implementation. Small typo and narrowly scoped test
fixes may go directly to a pull request.

Public code, documentation, issue content, and commit messages are English. Remove credentials,
account identifiers, customer data, private prompts, raw provider responses, and local `.xerify/`
history before sharing logs or reproductions.

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

## Pull-request expectations

- Keep one coherent change per pull request and explain user-visible behavior.
- Add or update tests in proportion to the risk and update consumer documentation when behavior
  changes.
- Complete the pull-request template, including provider-call and sensitive-data declarations.
- Do not commit generated release artefacts, design workspaces, review images, local agent files,
  `.deckent/`, `.xerify/`, credentials, auth stores, or raw provider output.
- Do not run billable provider calls merely to strengthen a pull request. Maintainers decide whether
  a separately approved live check is necessary.

The project does not currently require a contributor license agreement. By submitting a
contribution, you confirm that you have the right to provide it and license it under the project's
MIT License. Do not submit code or content whose license is incompatible or unknown.
