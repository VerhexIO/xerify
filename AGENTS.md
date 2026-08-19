# Xerify agent guidance

- Treat `XERIFY.md` as product and architecture authority; keep public docs aligned with implemented behavior.
- Run `npm run check` after changes. Run `npm run smoke:install` for CLI/package/MCP changes and `npm run assets:logo` for brand changes.
- Do not make live provider calls without explicit owner approval. Such calls may consume quota or incur charges.
- Provider identity is the invocation/billing/control service. Every model reached through Cursor Agent is `cursor`; direct Codex/OpenAI is `openai`, and direct Claude/Anthropic is `anthropic`.
- Never commit credentials, auth stores, audit logs, external prompts, or raw provider responses.
- Do not modify the approved attached-center X geometry without owner direction.
