# Xerify 简体中文用户指南

[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) ·
**简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

本指南集中说明 Xerify 的安装、CLI、配置、提供方、JSON 契约、运行历史、MCP、兼容性与安全边界。命令名、JSON 字段、provider/model ID、退出码和配置键不会被翻译。规范来源是[英文文档索引](../../README.md)。

## 1. 产品模型

```text
作者产物 → Xerify 核心 → 不同调用提供方 → 类型化结果
```

- `ask`：开放式第二意见；来源提供方可选。
- `verify`：尝试反驳具有已知 provenance 的具体声明；必须使用不同调用提供方。
- `confirmed`：仅表示在提供的证据中未发现实质性反例。
- `refuted`：证据与声明存在实质性冲突。
- `unclear`：证据或提供方输出不足以支持安全结论。

Xerify 不替代测试、类型检查、linter、运行时检查或人工审批。推荐顺序通常是：
`tests → typecheck → lint → runtime checks → Xerify → 人工/合并策略`。

## 2. 安装与升级

```sh
# 全局安装
npm install --global xverify-cli@latest
xerify --version
xerify init

# 项目固定版本
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version

# 不保留依赖
npx --yes --package=xverify-cli@latest xerify --json health
```

需要 Node.js 20+，主要发布环境为 Node.js 24。全局、传递依赖、`--no-save` 和 `npx` 安装不会自动初始化当前项目；请运行 `xerify init`。直接本地依赖的受保护初始化可通过 `XERIFY_SKIP_AUTO_INIT=1` 关闭。卸载 npm 包不会自动删除 `.xerify/` 历史。

## 3. 无模型调用的就绪检查

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

这些命令不执行推理。`--network` 只增加有边界的端点可达性检查。`health` 会报告 `ready`、`degraded` 或 `setup-required`，以及项目初始化、适配器身份、认证就绪状态和历史策略，但不会输出 token 值。

## 4. CLI 参考

| 选项                       | 含义                                  |
| -------------------------- | ------------------------------------- |
| `--json`                   | 在 stdout 写入一个稳定 JSON envelope  |
| `--timeout <milliseconds>` | 覆盖有边界的提供方生命周期超时        |
| `--log <path>`             | 覆盖 secret-safe JSONL 审计元数据路径 |
| `--version`                | 输出已安装版本                        |

| 命令                                                                     | 用途                             |
| ------------------------------------------------------------------------ | -------------------------------- |
| `xerify ask --to provider:model --question <text>`                       | 开放式第二意见                   |
| `xerify verify --from provider:model --to provider:model --claim <text>` | 以反证为导向的验证               |
| `xerify request --to provider:model --input <file>`                      | 无 verify 保证的有边界适配器调试 |
| `xerify init`                                                            | 幂等初始化私有项目状态           |
| `xerify health` / `doctor`                                               | 就绪与详细诊断                   |
| `xerify providers list` / `probe`                                        | 列出能力并检查 transport/auth    |
| `xerify config show` / `validate`                                        | 显示或验证已脱敏配置             |
| `xerify runs ...`                                                        | 管理本地运行历史                 |
| `xerify mcp stdio` / `mcp http`                                          | 启动 MCP 服务                    |

`request` 不强制 provenance、提供方分离、verdict 解析或 verify 退出语义。

## 5. 提供方身份与适配器

Provider 指调用、计费和控制服务：

| Adapter             | Provider    | 认证方式                                                   |
| ------------------- | ----------- | ---------------------------------------------------------- |
| `codex`             | `openai`    | CLI 登录或 `CODEX_API_KEY`                                 |
| `claude`            | `anthropic` | CLI 登录、`ANTHROPIC_API_KEY` 或 `CLAUDE_CODE_OAUTH_TOKEN` |
| `cursor`            | `cursor`    | `agent login` 或 `CURSOR_API_KEY`                          |
| `openai-api`        | `openai`    | 命名环境变量，或可选 literal fallback                      |
| `anthropic-api`     | `anthropic` | 命名环境变量，或可选 literal fallback                      |
| `openai-compatible` | 配置指定    | 环境变量/literal 或本地端点                                |
| `command`           | 配置指定    | 仅 `authEnvironment` allowlist                             |

Cursor 模型 ID 是不透明目录 ID。请从 `agent models` 选择精确 ID；`cursor:auto` 会在调用前被拒绝。通过 Cursor 调用 Gemini 时 provider 仍为 `cursor`；未来的直接 Google API/CLI 适配器才会使用 `google`。

Provider 分离不证明模型谱系独立。直接 OpenAI 与 Cursor 中的 GPT 可能共享上游模型和盲点。

## 6. 配置与 Secret

项目文件：`.xerify/xverify-config.json`。

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY"
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

优先级：CLI flag → Xerify 环境覆盖 → 项目配置 → 用户配置 → 适配器默认值。用户路径：Linux 为 `$XDG_CONFIG_HOME/xerify/xverify-config.json`，macOS 为 `~/Library/Application Support/Xerify/xverify-config.json`，Windows 为 `%APPDATA%\Xerify\xverify-config.json`。Hermetic 自动化可使用 `XERIFY_USER_CONFIG_PATH`。

优先使用 `apiKeyEnvironment`；literal `apiKey` 只应作为明确接受的本地 fallback。`config show/validate` 会脱敏 key 和完整 endpoint。POSIX 下，包含 literal key 或显式 endpoint 的文件必须为 `0600`。不要把配置、日志、运行记录或提供方输出提交到 Git，也不要把它们直接作为验证证据。

## 7. Prompt Injection 与出站数据边界

```text
Xerify 系统契约
  > 验证任务
  > 用户批准的范围
  > 提供的不可信证据
```

代码、diff、日志、Markdown、注释或其他 agent 输出中的指令属于证据，不具有更高权限。Verifier 被要求尝试反驳声明，并忽略嵌入的角色、verdict 和 Schema 修改。该措施只能降低风险，不能使 LLM 完全免疫 injection。发送前必须检查证据范围和目标 provider；不要发送 secret、环境转储、客户数据或未经授权的材料。

Xerify 不会把 provider 输出作为 shell、源代码、MCP 指令或配置执行。进程使用 `shell: false`、stdin、字节/时间上限和受控环境。

## 8. JSON 与退出码契约

成功：

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

| Exit | 含义                                        |
| ---: | ------------------------------------------- |
|  `0` | ask 已回答，或 verify 为 confirmed          |
|  `2` | 输入/配置、同一 provider 或 provenance 错误 |
|  `3` | 可执行程序、endpoint 或 auth 不可用         |
|  `4` | timeout 或 cancellation                     |
|  `5` | provider、process 或 API transport 失败     |
|  `6` | 无效、不完整或不符合 Schema 的响应          |
| `10` | refuted                                     |
| `11` | 无底层失败的 unclear                        |

Provider 生命周期开始后的失败会返回完整 `VerifyResult`，其中包含 `verdict: "unclear"` 和类型化 `failure`。即使退出码非零，也应解析 stdout。被截断的证据绝不能产生 `confirmed`。

## 9. 运行历史与归档

```text
.xerify/
├── runs/HEAD.json
├── runs/000001/
│   ├── process.json
│   ├── request.json
│   ├── events.jsonl
│   ├── result.json 或 error.json
│   └── evidence/manifest.json
└── archive/index.jsonl
```

`HEAD.json` 分配单调递增 ID；删除后不会复用。`captureInput` 可为 `full|metadata|none`，`captureOutput` 可为 `normalized|metadata|none`。只有显式使用 `--include-evidence` 才会输出证据内容。

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

归档、恢复和删除不会调用模型。删除不可恢复；运行中的记录不能归档或删除。追加式 `index.jsonl` 允许在不打开每个完整记录的情况下搜索最新摘要。

## 10. MCP

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

工具：`xerify_ask`、`xerify_verify`、`xerify_capabilities`。前两个可能产生费用或消耗额度，capabilities 不执行推理。HTTP：

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

非 loopback 绑定需要 `--allow-public`、来自命名环境变量的 bearer token，以及合适的 TLS/reverse-proxy 边界。本地 CLI 订阅凭据不会被转移到远程服务。

## 11. 兼容性与确定性边界

- CI：Ubuntu、macOS、Windows，Node.js 20/24；WSL 使用 Linux 路径。
- ESM 库和 TypeScript 声明、CLI、STDIO MCP、Streamable HTTP MCP。
- 公共 `schemaVersion: 1`；新增可选字段可兼容，删除或重新解释字段属于 breaking change。
- 常规测试不需要 provider 凭据，也不会执行推理。
- LLM 文本不是字节级确定的。Xerify 保证 Schema、边界、类型化失败和 fail-closed 结果，而不保证措辞完全一致。

## 12. 已记录示例

规范的[示例目录](../../examples/README.md)包括研究论文、游戏计划、网站决策、数据分析、出站数据策略和两个 Xerify dogfood 场景。[JSONL 索引](../../examples/index.jsonl)供 AI 工具先搜索小型摘要。历史证据和 observed 结果不会被翻译。

| 场景                 | 观察结果    | Exit |
| -------------------- | ----------- | ---: |
| 六个月学习留存声明   | `unclear`   |   11 |
| 两人游戏项目容量     | `refuted`   |   10 |
| 网站架构选择         | `refuted`   |   10 |
| 聚合 A/B 转化声明    | `refuted`   |   10 |
| 受限客户数据出站策略 | `refuted`   |   10 |
| Cursor 适配器不变量  | `confirmed` |    0 |
| npm 包边界           | `confirmed` |    0 |

## 规范参考

[安装](../../installation.md) · [配置](../../configuration.md) · [CLI](../../cli-reference.md) ·
[适配器](../../provider-adapters.md) · [渠道](../../channels.md) ·
[JSON/Exit](../../json-contract.md) · [历史](../../run-history.md) · [MCP](../../mcp.md) ·
[兼容性](../../compatibility.md) · [架构](../../architecture.md) ·
[安全策略](../../../SECURITY.md)

如有冲突，以经过测试的规范英文契约为准。
