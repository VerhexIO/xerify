<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.tr.md">Türkçe</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <strong>简体中文</strong> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>向另一家提供方提问，获得清晰的第二意见。</strong></p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/readme/xerify-verification-flow.gif" alt="Xerify 流程：来自提供方 A 的既有声明经过有边界的证据和不同提供方门禁，提供方 B 尝试证伪，Xerify 返回 confirmed、refuted 或 unclear 结果" width="960">
</p>

Xerify 是一个面向 shell 的开源工具，用于有边界的跨提供方提问和验证。它可以使用本机已登录的官方提供方 CLI、直接 API，或显式配置的可执行程序。CLI、JavaScript/TypeScript 库、本地 STDIO MCP 与 Streamable HTTP MCP 共用同一套核心逻辑和 Schema。

Xerify 由 **Verhex** 开发和维护，并接受社区贡献，以 MIT 许可证发布。它是 **Deckent**（Verhex 的智能体操作系统）的跨提供方验证层，在本仓库中作为独立工具发布——Xerify 可以独立运行，不依赖 Deckent。它提供的是第二意见，而不是形式化证明、安全认证或真相保证。提供方输出始终被视为不可信数据，绝不会被直接执行。

> **发布状态：** `0.2.0` 是一个早期公开发布版本，以 `xverify-cli` 的包名发布到 npm。公开 CI 在 Ubuntu、macOS、Windows 上针对 Node 20/24 均为绿色，涵盖外部安装和 MCP Inspector 冒烟测试；同一套检查、干净安装冒烟测试和发布审计，在 WSL2 + Node 24 环境下同样通过。调用提供方身份约定已经有 Cursor/OpenAI 双向的实测验证。已发布的 `0.1.0` tarball 是在发布工作流之外抵达 registry 的，因此不带 npm 来源认证（provenance attestation）；`0.1.1` 及后续版本由工作流发布，并主动申请这项认证。公开的 schema、JSON envelope 和退出码是稳定的；提供方接入面目前还比较小，API 仍可能扩展。

## 安装

首次公开发布到 npm 后：

```sh
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify init
```

固定为项目开发依赖：

```sh
npm install --save-dev --save-exact xverify-cli@0.2.0
npx xerify --version
```

不保存依赖直接运行：

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

需要 Node.js 20 或更高版本；Node.js 24 是主要发布环境。请阅读[简体中文用户指南](docs/i18n/zh-CN/README.md)和规范的[英文安装文档](docs/installation.md)。

## 快速开始

请求开放式第二意见；管道输入会成为有边界的上下文：

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "这项变更中风险最高的问题是什么？"
```

让不同调用提供方尝试反驳一项具体声明：

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "这项变更在不引入回归的情况下修复了竞态条件"
```

`--from` 和 `--to` 表示执行调用、计费和控制请求的服务。通过 Cursor Agent 选择的模型始终属于 `cursor`，即使模型 ID 中包含 GPT、Claude、Gemini 或 Grok。直接 Codex/OpenAI 为 `openai`，直接 Claude/Anthropic 为 `anthropic`。同一提供方的 `verify` 会在模型调用前被拒绝。

这种分离衡量的是调用渠道多样性，并不证明模型权重、训练数据或盲点彼此独立。

## 结果与退出码

| 结果        | Exit | 调用方应采取的行动                         |
| ----------- | ---: | ------------------------------------------ |
| `confirmed` |    0 | 可作为继续候选；现有证据中未发现实质性反例 |
| `refuted`   |   10 | 阻止该声明                                 |
| `unclear`   |   11 | 补充证据、重试或进行人工审查               |

超时、提供方失败、无效 Schema 和截断会以各自的非零退出码保持 fail-closed；`unclear` 不会被转换为成功。

## 不产生模型费用的诊断

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
xerify --json config validate
```

这些命令不会调用模型。`--network` 只增加有边界的端点可达性检查。实时 `ask` 和 `verify` 可能消耗订阅额度或产生 API 费用。

## 适配器路径与模型 ID

command 适配器运行在一个私有的空目录中，而不是在你的项目目录里，因此 **`executable` 和 `args` 中的每一个路径都必须是绝对路径**。像 `./tools/verifier.mjs` 这样的相对路径会相对该私有目录解析，导致进程无法启动。现在，失败信息会引用解释器给出的原话，其中指明了它实际查找过的目录：

```json
{
  "code": "PROVIDER_FAILURE",
  "providerMessage": "Error: Cannot find module '/tmp/xerify-command-rBJrxX/tools/verifier.mjs'"
}
```

确切的 ID 来自提供方本身，而不是 Xerify；只有 Cursor 提供列出模型的命令：

| 适配器                                             | 确切模型 ID 的来源                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cursor`                                           | `agent models`                                                                        |
| `codex`                                            | 你的 Codex 账户和 CLI 版本；`codex --help` 会显示 `--model`，CLI 也会指出它拒绝的模型 |
| `claude`                                           | 你的 Anthropic 账户和 CLI 版本；`claude --help` 会显示 `--model`                      |
| `openai-api`、`anthropic-api`、`openai-compatible` | 提供方针对你的密钥给出的模型列表                                                      |

当某个提供方拒绝一个模型时，它自己的原话会通过 `providerMessage` 回传——这通常是了解它到底能接受什么的最快方式。

## 本地状态与 MCP

`xerify init` 会以非覆盖方式创建 `.xerify/`，并为 Git、npm 和 Docker ignore 文件添加保护。活动记录位于 `runs/`，归档记录位于 `archive/`；`archive/index.jsonl` 是供人类和 AI 工具快速搜索的紧凑索引。

固定 npm 版本的本地 STDIO MCP：

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.2.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

全局安装会把 `xerify` 放到 `PATH` 上；项目本地安装则不会。这时可以让 host 直接指向入口文件——这样也省去了 `npx` 这层间接调用，服务器启动更快：

```json
{
  "mcpServers": {
    "xerify": {
      "command": "node",
      "args": ["./node_modules/xverify-cli/dist/cli/entry.js", "mcp", "stdio"]
    }
  }
}
```

服务器提供 `xerify_ask`、`xerify_verify` 和 `xerify_capabilities`。端点地址是 `http://127.0.0.1:8787/mcp`；根路径会返回 `404`。该命令启动时会打印完整 URL，请直接读取这个输出，而不要自己拼接地址。HTTP 默认只绑定 `127.0.0.1`；非 loopback 绑定必须同时使用 `--allow-public` 和来自命名环境变量的 bearer token。

## Xerify 由谁打造

Xerify 由 **[Verhex](https://github.com/VerhexIO)** 设计、开发和维护。

它起源于 **Deckent**——Verhex 的智能体操作系统。在 Deckent 中，请第二个提供方核查一条主张，是编排器所依赖的能力之一。Xerify 就是这项能力的独立开源形态：它可以单独安装，不需要 Deckent，也不依赖它。

本仓库中，只有 Xerify 采用 [MIT 许可证](LICENSE)。Deckent 是 Verhex 的另一款独立产品，不在本仓库的许可范围内。

## 文档

- [完整简体中文用户指南](docs/i18n/zh-CN/README.md)
- [六种语言文档索引](docs/README.md)
- [真实记录的验证示例](docs/examples/README.md)
- [安全策略](SECURITY.md)
- [MIT 许可证](LICENSE)

若翻译与测试过的英文契约冲突，以规范英文 Schema 和文档为准。
