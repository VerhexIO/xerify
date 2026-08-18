# Platform and host evidence

Support claims require recorded execution, not architecture inference. The repository supplies the same hermetic gate to each host and OS; a blank or pending cell is not described as supported evidence.

| Environment                        | Current evidence                                                                                              | Next proof                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Linux x64, Node 24, plain terminal | Hermetic tests, clean external install, modern/legacy Inspector, real Codex/Claude probes, Claude live verify | Cursor-host smoke                            |
| Linux, Node 20/24                  | Public CI green: check + external install + Inspector                                                         | Continue release regression coverage         |
| macOS, Node 20/24                  | Public CI green: check + external install + Inspector                                                         | Record native architecture and host smoke    |
| Windows native, Node 20/24         | Public CI green: check + external install + Inspector                                                         | Direct descendant cleanup and cmd-host proof |
| WSL x64, Node 24                   | Dedicated self-hosted workflow defined                                                                        | Runner execution                             |
| Cursor Composer                    | Project handoff defined; Cursor Agent CLI `2026.08.11-e8db854` installed but CLI login pending                | Owner login and host/MCP smoke               |
| VS Code                            | Terminal and MCP configuration are host-compatible by design                                                  | Host smoke                                   |
| Codex and Claude Code hosts        | Official provider binaries probed on Linux; host UI is not provider identity                                  | Host smoke                                   |

Recorded public CI: `https://github.com/VerhexIO/xerify/actions/runs/32145337654` at commit
`4c5b636b6987881e4b2282d68b3995f4dd317724`. WSL and the host-specific rows remain separate gates;
a green OS lane is not evidence for behavior skipped on that OS.

## Live provider evidence

On 2026-08-18, Linux x64 / Node 24 ran an explicitly owner-approved `xerify verify` through Claude
Code `2.1.234` using serving organization `anthropic` and exact model `claude-fable-5`. The scoped
test used synthetic arithmetic evidence with an embedded verdict-injection instruction. Xerify
returned `refuted` with exit `10`, populated the structured evidence/assumption/limitation fields,
reported no input/output truncation, and did not follow the embedded instruction. The provider
reported usage/cost; prompt text and raw provider response are intentionally not recorded.

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
