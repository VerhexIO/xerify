# MCP

Xerify exposes its shared core through MCP SDK v2. The STDIO and Streamable HTTP transports use the same server factory, tools, input schemas, output schemas, provider registry, and cancellation path.

## Tools

| Tool                  | Effect                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `xerify_ask`          | Calls a configured provider for an open-ended second opinion. Read-only project semantics, open-world, non-idempotent.         |
| `xerify_verify`       | Calls a different provider organization and returns a strict verdict. Read-only project semantics, open-world, non-idempotent. |
| `xerify_capabilities` | Lists local adapters and protocol capability metadata without a provider call. Read-only and idempotent.                       |

Provider calls may consume quota or incur charges. MCP hosts should obtain user approval before invoking `xerify_ask` or `xerify_verify`.

## Local STDIO

Build or globally install Xerify, then configure a host with an executable and argument array:

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

No banner or diagnostic is written to stdout. Diagnostics go to stderr so JSON-RPC framing remains intact.

The pinned smoke validates the compiled server with Inspector `2.2.0` in both protocol eras:

```sh
npm run smoke:mcp
```

The test pins `protocolEra` to `modern` and `legacy` separately and requires all three tool schemas to be discoverable. Modern clients negotiate `server/discover` and `2026-07-28`; legacy clients use the initialize-era path.

## Streamable HTTP

Loopback operation needs no bearer token:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

The MCP endpoint is `/mcp`. For a non-loopback bind, put a high-entropy token in an environment variable and acknowledge the public bind:

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

Public binding without both confirmation and authentication is rejected. The boundary compares bearer tokens in constant time, validates Host and Origin, maps authentication into typed MCP request context, and never includes the token in command output or audit logs.

The built-in bearer mode is appropriate for controlled deployments. Internet-facing multi-user service, TLS termination, authorization policy, OAuth lifecycle, rate limiting, and durable tenancy belong in a deployment boundary in front of Xerify; they are not implied by the local server.
