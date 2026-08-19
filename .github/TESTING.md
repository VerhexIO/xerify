# Maintainer testing

This file describes source-checkout validation and is intentionally excluded from the npm package.

## Hermetic gates

```sh
npm ci
npm run check
npm run smoke:mcp
npm run smoke:install
npm run release:audit
```

These gates use fixtures and clean temporary installs. They do not require a provider account or
make a model call. `check` runs formatting, lint, TypeScript, unit/contract/integration tests, and a
build. `smoke:install` validates the packed consumer artifact and installed CLI/MCP path.

## Live provider gate

`npm run smoke:live` is opt-in and potentially billable. Do not run it without explicit owner
approval for the exact provider, model, and bounded evidence scope.

Required variables:

| Variable                           | Meaning                                          |
| ---------------------------------- | ------------------------------------------------ |
| `XERIFY_LIVE_CONFIRM_BILLABLE=YES` | explicit acknowledgement after owner approval    |
| `XERIFY_LIVE_ADAPTER`              | target transport: `claude`, `codex`, or `cursor` |
| `XERIFY_LIVE_FROM`                 | declared author `provider:model`                 |
| `XERIFY_LIVE_TO`                   | exact target `provider:model`                    |
| `XERIFY_LIVE_EXECUTABLE`           | optional executable/path override                |
| `XERIFY_LIVE_TIMEOUT_MS`           | optional lifecycle timeout                       |

The harness sends a fixed synthetic contradiction with an embedded verdict-injection string and
requires a structured `refuted` result, exit `10`, exact provider/model echo, no failure, and no
truncation. It must not retain prompt text, raw provider output, session identifiers, auth material,
or account data.
