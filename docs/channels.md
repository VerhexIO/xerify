# Provider and access channels

Xerify has two independent dimensions: the surface that receives a request and the adapter that
reaches a verifier. CLI, library, STDIO MCP, and Streamable HTTP MCP all call the same core; choosing
MCP does not change provider identity, billing, schema, or exit/verdict semantics.

## Adapter channels

| Channel                 | Auth owner                                       | Where it runs            | Best use                                                | Main limitation                                    |
| ----------------------- | ------------------------------------------------ | ------------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| Codex CLI subscription  | official `codex` login or `CODEX_API_KEY`        | user's machine           | OpenAI target without copying a subscription credential | requires installed/authenticated CLI               |
| Claude CLI subscription | official `claude` login, OAuth token, or API key | user's machine           | Anthropic target through `claude -p`                    | requires installed/authenticated CLI               |
| Cursor subscription     | official `agent login` or `CURSOR_API_KEY`       | user's machine           | any exact model ID exposed by Cursor                    | provider is `cursor`; upstream lineage may overlap |
| OpenAI direct API       | named environment; optional literal fallback     | any trusted runtime      | automation/server deployment                            | API billing and secret custody                     |
| Anthropic direct API    | named environment; optional literal fallback     | any trusted runtime      | automation/server deployment                            | API billing and secret custody                     |
| OpenAI-compatible HTTP  | optional named environment or literal key        | local or remote endpoint | local models and compatible gateways                    | provider label is owner-controlled                 |
| Generic command         | explicit environment allowlist                   | user's machine           | another local verifier executable                       | executable is owner-trusted code                   |

Subscription execution stays on the user-owned machine. Xerify never reads a CLI's token/cookie
store; the official executable handles its own login. A remote Xerify service cannot magically reuse
a user's local subscription: install the STDIO server locally, or use a direct API adapter with an
explicit server-side key policy.

## CLI examples

OpenAI artifact to Claude subscription:

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

Anthropic artifact to Codex subscription:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

Anthropic artifact to an exact model through Cursor:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

Direct API calls use the same command and result. Only `--adapter` changes, for example
`--adapter openaiApi` or `--adapter anthropicApi`. Model IDs always remain explicit.

There is no Gemini CLI subscription adapter in this release. A Gemini-named model selected through
Cursor remains `cursor:EXACT_MODEL_ID`; a future direct Google API/CLI adapter would use `google`.

## MCP surfaces

Local STDIO is the recommended zero-hosting-cost MCP channel and is the only remote-tool surface that
naturally preserves local CLI subscriptions:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@latest", "xerify", "mcp", "stdio"]
    }
  }
}
```

For a pinned and supply-chain-reviewable setup, install a fixed version and use its resolved binary
instead of `npx -y ...@latest`. `xerify_capabilities` is non-billable; `xerify_ask` and
`xerify_verify` can consume provider quota.

Loopback Streamable HTTP is also free to operate on the user's machine. Internet-facing HTTP needs
TLS, authentication, authorization, rate limiting, secret custody, and an API-only provider policy;
it must not become a relay for local subscription credentials.

## Free MCP distribution and future hosting

The selected zero-hosting-cost distribution path is npm plus the official MCP Registry. The
Registry stores discovery/launch metadata and points to the public `xverify-cli` npm package; it does not
host Xerify's code. The repository `server.json` fixes the package version, STDIO transport, and
`mcp stdio` launch arguments. The package's matching `mcpName` proves the npm/Registry association.
Because the Registry is in preview, a pinned
`npx -y --package=xverify-cli@<version> xerify mcp stdio` host entry remains the deterministic
fallback. See the official [Registry
quickstart](https://modelcontextprotocol.io/registry/quickstart) and [package type
rules](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

This distribution channel is local execution: no hosting account, no public ingress, and no central
credential store. If Verhex later needs a public API-backed MCP, Cloudflare Workers remains the
selected evaluation target because its official Agents SDK supports Streamable HTTP MCP and the
Workers Free plan provides a bounded free tier. See Cloudflare's official [remote MCP
guide](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/). This is a
deployment roadmap item, not a claim that the present Node listener can be uploaded unchanged.

A Worker cannot spawn a user's local Codex/Claude/Cursor CLI. The remote variant would therefore
admit direct API adapters only, require OAuth/scoped authorization, fail closed at platform limits,
and keep provider charges separate from hosting cost. No authless public Xerify verifier will be
shipped.
