[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# MCP

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 通过 MCP SDK v2 暴露其共享核心。STDIO 和 Streamable HTTP 这两种传输方式，用的是同一套 server factory、工具、输入模式、输出模式、提供方注册表和取消路径。

## 工具

| 工具                  | 作用                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| `xerify_ask`          | 调用一个已配置的提供方，获取开放式的第二意见。对项目只读，开放世界语义，非幂等。 |
| `xerify_verify`       | 调用另一个调用提供方，返回一个严格的裁定。对项目只读，开放世界语义，非幂等。     |
| `xerify_capabilities` | 列出本地适配器与协议能力元数据，不发起提供方调用。只读且幂等。                   |

提供方调用可能消耗配额或产生费用。MCP host 在调用 `xerify_ask` 或 `xerify_verify` 之前，应当先取得用户批准。

MCP 调用方可以声明 author 的来源标识，但不能自证为 `observed`。传入的主张/context 会被当作不受信任的证据来处理；其中夹带的指令不会改变验证任务本身。这能缓解、但无法彻底消除模型层面的 prompt 注入。

MCP 的 `ask` 和 `verify` 调用，会经过与 CLI、library 相同的项目本地历史封装层。捕获行为由 `xverify-config.json`
决定；原始的 MCP 传输帧和 bearer token 都不会被存储。历史管理仍然只是一个本地 CLI 接入面（`xerify runs ...`），而不是一个 MCP
工具，因此远程调用方无法归档或删除宿主的记录。

以编程方式调用 `createXerifyMcpServer` 和
`createXerifyMcpFactory` 时，必须提供一个 `RunHistoryStore`。如果是有意关闭持久化，应显式配置一个
`enabled: false` 的 store；不传这个参数，不会被静默当作“不记录历史”来处理。

## 本地 STDIO

构建或全局安装 Xerify，然后为 host 配置好可执行文件和参数数组：

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

如果没有全局安装，MCP host 也可以直接解析公开的 npm 包：

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.1", "xerify", "mcp", "stdio"]
    }
  }
}
```

在长期使用的 host 配置里，应当锁定一个经过审查的具体版本；只有在明确希望自动升级时，才使用 `@latest`。

stdout 不会写入任何 banner 或诊断信息。诊断信息一律发往 stderr，以保证 JSON-RPC 的帧结构完整。

锁定版本的冒烟测试，会用 Inspector `2.2.0` 在新旧两代协议下分别校验编译后的 server：

```sh
npm run smoke:mcp
```

测试会分别把 `protocolEra` 锁定为 `modern` 和 `legacy`，并要求全部三个工具模式都能被发现。现代客户端会协商 `server/discover` 和 `2026-07-28`；旧版客户端走的是 initialize 时代的路径。

## 官方注册表元数据

Xerify 的仓库中包含 `server.json`，npm 清单里也有与之对应的
`mcpName: "io.github.verhexio/xerify"`。这条注册表条目把 `xverify-cli` 标识为 npm 包，
锁定了 package/server 版本，声明了 STDIO 传输方式，并给出了固定的 `mcp stdio`
参数。有一项契约测试专门防止这些字段出现偏差。

官方 MCP Registry 只是一条免费的发现型元数据通道，不是执行宿主，也不是包镜像。必须先有确切版本
的 Xerify 发布到 npm，发布负责人才能通过身份认证，用 `mcp-publisher` 发布 `server.json`。Registry 目前还处于预览阶段，因此客户端
应该保留一份直连、锁定版本的 npm 配置作为稳定的回退方案。参见官方
[Registry quickstart](https://modelcontextprotocol.io/registry/quickstart) 和 [npm package
rules](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx)。

## Streamable HTTP

回环（loopback）方式运行不需要 bearer token：

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

MCP 端点是 `/mcp`。如果要绑定非回环地址，需要把一个高熵 token 放进环境变量，并显式确认这是一次公网绑定：

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

如果同时缺少确认和身份认证，公网绑定会被拒绝。这道边界会以恒定时间比较 bearer token，校验 Host 和 Origin，把身份认证信息映射进类型化的 MCP 请求上下文，并且绝不会把 token 写进命令输出或审计日志。

内置的 bearer 模式适合可控范围内的部署。面向公网的多用户服务、TLS 终止、授权策略、OAuth 生命周期、限流，以及长期租户管理，这些都应该放在 Xerify 前面的部署边界里去做——本地 server 本身并不提供这些能力。

关于渠道选择、订阅/API 行为、零成本的本地运行方式，以及已评估过的
Cloudflare Workers 远程路径，参见[提供方与访问渠道](channels.md)。托管免费不代表提供方的推理调用也免费，也不意味着可以集中托管本地订阅凭据。
