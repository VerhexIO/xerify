# Platform and host evidence

Support claims require recorded execution, not architecture inference. The repository supplies the same hermetic gate to each host and OS; a blank or pending cell is not described as supported evidence.

| Environment                        | Current evidence                                                                                           | Next proof                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Linux x64, Node 24, plain terminal | 71+ hermetic tests, clean external install, modern/legacy Inspector, real Codex/Claude non-billable probes | Opt-in billable provider call                      |
| Linux, Node 20/24                  | Workflow defined                                                                                           | First public CI run                                |
| macOS, Node 20/24                  | Workflow defined                                                                                           | First public CI run and native architecture record |
| Windows native, Node 20/24         | Workflow defined                                                                                           | First public CI run from PowerShell and cmd        |
| WSL x64, Node 24                   | Dedicated self-hosted workflow defined                                                                     | Runner execution                                   |
| Cursor Composer                    | Project handoff defined                                                                                    | Owner-run host/MCP smoke                           |
| VS Code                            | Terminal and MCP configuration are host-compatible by design                                               | Host smoke                                         |
| Codex and Claude Code hosts        | Official provider binaries probed on Linux; host UI is not provider identity                               | Host smoke                                         |

## Cursor Composer handoff

Cursor supports project MCP configuration at `.cursor/mcp.json` and manages a local STDIO command. After opening the committed repository in Cursor:

```sh
npm ci
npm run check
npm run smoke:install
npm link
```

Create `.cursor/mcp.json` locally (it is intentionally not committed because it depends on install location):

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

In Composer, confirm `xerify_capabilities`, `xerify_ask`, and `xerify_verify` appear. Invoke only `xerify_capabilities` first; it is non-billable. Before an ask/verify call, record the Composer model's provider organization and choose a different target. A Claude-family Composer model is `anthropic`; choosing a second Anthropic model does not satisfy cross-provider verification.

Run the billable smoke only with owner confirmation and an exact model:

```sh
XERIFY_LIVE_CONFIRM_BILLABLE=YES \
XERIFY_LIVE_PROVIDER=claude \
XERIFY_LIVE_MODEL=MODEL_ID \
npm run smoke:live
```

Record Cursor version, OS/architecture, shell, selected author provider/model, Xerify target adapter/model, command/tool used, exit/verdict, and whether truncation occurred. Do not record prompt content, auth material, or raw provider payload.
