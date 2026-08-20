[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 提供方与访问渠道

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 有两个相互独立的维度：接收请求的入口，和实际连接到验证方的适配器。CLI、库、STDIO MCP、
Streamable HTTP MCP 最终都调用同一套核心逻辑；选择用 MCP 并不会改变提供方身份、计费方式、schema，
或者退出码/裁定的语义。

## 适配器渠道

| 渠道               | 鉴权归属                                    | 运行位置             | 最佳用途                             | 主要局限                                |
| ------------------ | ------------------------------------------- | -------------------- | ------------------------------------ | --------------------------------------- |
| Codex CLI 订阅     | 官方 `codex` 登录或 `CODEX_API_KEY`         | 用户本机             | 无需复制订阅凭据即可访问 OpenAI 目标 | 需要已安装并完成鉴权的 CLI              |
| Claude CLI 订阅    | 官方 `claude` 登录、OAuth token，或 API key | 用户本机             | 通过 `claude -p` 访问 Anthropic 目标 | 需要已安装并完成鉴权的 CLI              |
| Cursor 订阅        | 官方 `agent login` 或 `CURSOR_API_KEY`      | 用户本机             | Cursor 暴露的任意精确模型 ID         | 提供方身份是 `cursor`；上游血统可能重叠 |
| OpenAI 直连 API    | 指定的环境变量；可选字面量兜底              | 任意受信任的运行环境 | 自动化/服务端部署                    | API 计费与密钥保管                      |
| Anthropic 直连 API | 指定的环境变量；可选字面量兜底              | 任意受信任的运行环境 | 自动化/服务端部署                    | API 计费与密钥保管                      |
| OpenAI 兼容 HTTP   | 可选的指定环境变量或字面量密钥              | 本地或远端 endpoint  | 本地模型与兼容网关                   | 提供方标签由所有者自行配置              |
| 通用命令           | 显式的环境变量白名单                        | 用户本机             | 另一个本地验证方可执行文件           | 可执行文件是所有者信任的代码            |

基于订阅的执行始终留在用户自己的机器上。Xerify 从不读取 CLI 的 token/cookie 存储，登录完全由官方可执行
文件自己处理。远端的 Xerify 服务没办法凭空复用用户本地的订阅：要么把 STDIO 服务器装在本地，要么改用带
有明确服务端密钥策略的直连 API 适配器。

## CLI 示例

OpenAI 产出物，交给 Claude 订阅核查：

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

Anthropic 产出物，交给 Codex 订阅核查：

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

Anthropic 产出物，交给 Cursor 上的某个精确模型核查：

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

直连 API 调用用的是同一条命令、同一种结果，只是 `--adapter` 会换成别的值，比如 `--adapter openaiApi` 或
`--adapter anthropicApi`。模型 ID 始终要求写明确。

当前版本没有 Gemini CLI 订阅适配器。通过 Cursor 选中的 Gemini 系列模型，写法仍然是
`cursor:EXACT_MODEL_ID`；未来若有直连 Google API/CLI 的适配器，会使用 `google`。

## MCP 接入面

本地 STDIO 是推荐的零托管成本 MCP 渠道，也是唯一能天然保留本地 CLI 订阅的远程工具接入面：

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

如果需要固定版本、便于供应链审计的部署方式，请安装一个确定版本，直接使用其解析出的二进制文件，而不是
`npx -y ...@latest`。`xerify_capabilities` 不产生费用；`xerify_ask` 和 `xerify_verify` 则可能消耗
提供方配额。

在用户本机上运行回环地址的 Streamable HTTP，同样是免费的。而面向公网的 HTTP 服务则需要 TLS、鉴权、
授权、限流、密钥保管，以及仅使用 API 的提供方策略；它绝不能变成本地订阅凭据的转发通道。

## 免费 MCP 分发与未来的托管方案

选定的零托管成本分发路径是 npm 加官方 MCP Registry。Registry 保存的是发现/启动用的元数据，指向公开的
`xverify-cli` npm 包，本身并不托管 Xerify 的代码。仓库里的 `server.json` 固定了包版本、STDIO 传输方式，
以及 `mcp stdio` 启动参数。包里匹配的 `mcpName` 用来证明 npm 与 Registry 的关联关系。由于 Registry 目前
还在预览阶段，固定版本的 `npx -y --package=xverify-cli@<version> xerify mcp stdio` host 配置项仍然是
确定性的兜底方案。参见官方的 [Registry 快速上手](https://modelcontextprotocol.io/registry/quickstart) 和
[包类型规则](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx)。

这条分发渠道属于本地执行：没有托管账号，没有公网入口，也没有集中的凭据存储。如果 Verhex 以后需要一个
由公开 API 支撑的 MCP，Cloudflare Workers 仍是选定的评估目标，因为它官方的 Agents SDK 支持 Streamable
HTTP MCP，Workers 的免费套餐也提供了有限的免费额度。参见 Cloudflare 官方的
[remote MCP 指南](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
和 [Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)。这只是一项部署路线图，
并不是说现在这个 Node 监听器可以原封不动地上传上去。

Worker 没办法拉起用户本机的 Codex/Claude/Cursor CLI。因此远程版本只会接受直连 API 适配器，要求
OAuth/限定范围的授权，在触及平台限制时遵循失败即拒绝（fail-closed）原则处理，并且把提供方费用和
托管成本分开计算。Xerify 不会发布一个无需鉴权的公共验证服务。
