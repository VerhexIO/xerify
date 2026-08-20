[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 提供方适配器

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 按发起调用、承担计费、掌控账号的服务来判定提供方身份。不管背后具体是什么模型，只要经 Cursor
Agent 发起调用，一律记为 `cursor`；直连 Codex/OpenAI 记为 `openai`，直连 Claude/Anthropic 记为
`anthropic`。

这条边界衡量的是调用渠道的多样性，而不是模型厂商或模型血统上的独立性。直连 OpenAI 与经 Cursor 调用 GPT
会被视为两个不同的提供方，但它们背后可能共享同样的盲点。

所有内置适配器都返回同一种有边界的 `InvokeResult`。用量数据完全来自提供方的响应；缺失的 token 或
费用字段一律保持 `null`，Xerify 不会自行估算。

官方适配器把调用提供方身份直接写死在代码里。而 `command` 和 `openai-compatible` 这两种适配器的身份来自
所有者自己配置的信息，并非远端认证；因此这两种适配器上的跨提供方约束，强度完全取决于配置本身是否
可靠。

## 内置矩阵

| 适配器类型          | 提供方身份  | 传输方式                      | 鉴权方式                                                        | 结构化验证                                  |
| ------------------- | ----------- | ----------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| `codex`             | `openai`    | 官方 `codex` CLI              | 已登录的 CLI 或 `CODEX_API_KEY`                                 | `codex exec --output-schema`                |
| `claude`            | `anthropic` | 官方 `claude` CLI             | 已登录的 CLI、`ANTHROPIC_API_KEY`，或 `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                   |
| `cursor`            | `cursor`    | 官方 Cursor `agent` CLI       | 已登录的 Cursor 或 `CURSOR_API_KEY`                             | prompt 约定；核心校验                       |
| `openai-api`        | `openai`    | Responses API                 | 优先读环境变量；可选字面量兜底                                  | `text.format.type=json_schema`，strict 模式 |
| `anthropic-api`     | `anthropic` | Messages API                  | 优先读环境变量；可选字面量兜底                                  | `output_config.format.type=json_schema`     |
| `openai-compatible` | 由配置决定  | 兼容 chat-completions 的 HTTP | 可选的环境变量或字面量密钥                                      | `response_format.type=json_schema`          |
| `command`           | 由配置决定  | 可执行文件 + 参数数组         | 配置好的环境变量白名单                                          | prompt 约定；响应仍由核心校验               |

这些适配器所依据的官方文档分别是 [Codex 非交互模式指南](https://learn.chatgpt.com/docs/non-interactive-mode)、
[Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)、[OpenAI 结构化输出指南](https://developers.openai.com/api/docs/guides/structured-outputs)，
以及 [Anthropic 结构化输出指南](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)。
Cursor 的行为遵循官方的 [Agent CLI 概览](https://cursor.com/docs/cli/overview) 和
[CLI 参数参考](https://cursor.com/docs/cli/reference/parameters)。

## Codex CLI

可执行文件：`codex`。Xerify 把 prompt 通过 stdin 传入，并以临时会话、只读沙箱、忽略用户规则/配置、
JSONL 事件流的方式调用 `codex exec`，验证时还会附带一份精确的 output-schema 文件。该 schema 文件存放在
权限为 `0600` 的临时目录中，并在 `finally` 块里删除。

最后一条 `item.completed` agent 消息即为提供方的输出。`turn.completed.usage` 会映射 `input_tokens`
和 `output_tokens`；费用字段始终是 `null`。出现 error 事件、失败的 turn、非零退出码、超时或取消，都绝不
会被当成成功的回答上报。

`xerify providers probe --provider codex` 只会定位可执行文件并运行 `codex login status`，不会发起任何
模型请求。

## Claude CLI

可执行文件：`claude`。Xerify 使用带 JSON 输出的 print 模式，关闭会话持久化、禁用工具、禁用斜杠命令、
采用非交互式权限处理，并开启安全模式。每次调用都运行在一个全新的、权限为 `0700` 的临时目录中，而不是
用户项目本身。验证请求通过 `--json-schema` 传入规范的 JSON Schema；提供方的结果则取自
`structured_output`。

`usage.input_tokens`、`usage.output_tokens` 和 `total_cost_usd` 只在响应中存在时才会被映射。非成功的
subtype 或非零退出码都会被判定为提供方失败。`xerify providers probe --provider claude` 只运行
`claude auth status --json`，不涉及模型调用。

用于生成的严格 schema 派生自规范的 Zod 字段定义，并去掉了提供方不支持的校验约束。收到响应后，核心
的 Zod 校验会重新施加所有边界限制。

## Cursor Agent CLI

可执行文件：`agent`。只要是通过 Cursor Agent 访问的模型，其调用提供方身份一律是 `cursor`：

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

运行 `agent models` 查看可用列表，然后把其中某个精确的 ID 以 `cursor:MODEL_ID` 的形式传入。Xerify 把
模型 ID 当作 Cursor 目录中的一个不透明标识符，不会根据 `gpt-`、`claude-`、`gemini-` 之类的前缀去反推
提供方身份。`auto` 会在调用发生之前就被拒绝，因为它无法把实际调用的精确模型保留在来源中；只要
本机安装的 Cursor 账号能看到，Composer、Kimi、GLM、GPT、Claude、Gemini、Grok 的显式 ID 都可以使用。

当前版本没有直连 Gemini CLI 订阅的适配器。经 Cursor 托管访问的 Gemini，身份仍然是 Cursor 调用。未来如果
推出直连 Google API 或 CLI 的适配器，其身份会是 `google`。

该适配器把 prompt 通过 stdin 传入，并以 JSON 输出方式调用 `agent -p --mode ask --sandbox enabled`。它
只信任一个全新的、空的、权限为 `0700` 的临时工作区，显式传入该工作区，并在 `finally` 中删除。Cursor 没
有提供 JSON-Schema 输出参数，因此验证用的 prompt 会直接携带规范约定，Xerify 再用同一套核心 Zod schema
去校验返回的 `result`。格式不合规的纯文本或围栏 JSON，都会按失败即拒绝（fail-closed）原则标记为
`unclear`；永远不会被转换成 `confirmed`。

Cursor 目前的 CLI 没有一个参数能彻底关闭用户配置的所有 MCP 服务器。Ask 模式本身是只读的，工作区也是
空的，但账号层面的 Cursor 行为仍然是一条残留的信任边界。不要在配置了不受信任的全局扩展/MCP 的 Cursor
账号下运行此适配器，也不要向其发送任何密钥。`xerify providers probe --provider <cursor-adapter-id>` 只
运行 `agent status`，不涉及模型调用，也不会解析或打印账号身份。

结构化输出是否合规，因具体模型和 Cursor 版本而异——因为 Cursor 本身不提供 schema 强制参数。在 Linux
x64、Cursor Agent `2026.08.11-e8db854` 环境下，`cursor-grok-4.6-high-fast` 和 `gpt-5.6-sol-high` 这两
个精确模型通过了固定的注入/证伪测试；`gpt-5.6-sol-high` 还完成了有边界的核心代码验证。同一批证据中，
`claude-sonnet-5-high` 和 `claude-sonnet-5-thinking-high` 返回的输出未通过 Xerify 的严格 schema，因此
被类型化为 `unclear`、退出码 `6`。这是一份如实记录的观测矩阵，不是对某个模型家族或未来 Cursor 版本的
普遍承诺。

## 直连 API

OpenAI 适配器以 `store: false` 向 `/v1/responses` 发起请求；Anthropic 适配器以
`anthropic-version: 2023-06-01` 向 `/v1/messages` 发起请求。prompt 在发出前会做字节数上限约束，响应也
是流式且有边界的，取消和超时都通过 `AbortSignal` 实现。

在 Anthropic 一侧，触发 `max_tokens` 会被视为无效/不完整响应，`refusal` 则是不可重试的提供方失败。
在 OpenAI 一侧，`status` 不是 `completed`、响应缺少预期的输出块、JSON 格式错误，以及结构化输出被截断，
都会被判定为类型化失败。

API 密钥优先从配置好的环境变量中解析。直连 API 适配器只在面向本地个人用户的场景下，才把字面量
`apiKey` 当作兜底方案。这类配置默认被 git 忽略，在 POSIX 系统上必须是 `0600` 权限，并且在
`config show/validate` 的输出中会被脱敏；密钥永远不会出现在 `health`/`doctor` 的返回值里，也不会被写入
提供方 prompt 或审计日志。

完整配置的 endpoint 值同样会在配置输出中被脱敏，并使得该配置在 POSIX 系统上对权限位敏感——这是为了
避免对嵌在 URL 任意位置的凭据做不安全的局部遮盖。对 openai-compatible 适配器而言，只有纯粹的回环
endpoint 才会被判定为 `local`／`not-required`；一旦 URL 带有 userinfo、查询参数或 fragment，鉴权状态就
会变成 `unknown`，来源标注为配置本身。没有显式声明密钥的远端 endpoint，同样会把鉴权状态报告为
`unknown`。

## 通用命令

通用适配器从不对 shell 字符串求值。配置里只提供一个可执行文件和一个参数数组，其中只有 `{model}` 和
`{operation}` 这两个占位符会被展开。prompt/上下文通过 stdin 传入。通用命令默认运行在一个全新的、权限为
`0700` 的临时目录中；只有编程方式使用 SDK 时才能显式指定 `cwd`。子进程能继承到的环境变量，仅限于平台
必需项，加上适配器显式声明的 `authEnvironment` 列表。

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## 准入证据

封闭环境下的契约测试覆盖了 CLI 事件解析、结构化负载、用量映射、鉴权缺失、HTTP 请求结构、超时/取消、
非法输出、输出边界、CRLF、Unicode，以及带空格的路径。进程集成测试还会验证 POSIX 下子进程信号的传递。

| 环境                | 封闭包证据         | 官方二进制探测  | 可能计费的真实调用 |
| ------------------- | ------------------ | --------------- | ------------------ |
| Linux, Node 20/24   | 公开 CI            | 依主机/账号而定 | 仅显式开启         |
| macOS, Node 20/24   | 公开 CI            | 依主机/账号而定 | 仅显式开启         |
| Windows, Node 20/24 | 公开 CI            | 依主机/账号而定 | 仅显式开启         |
| WSL, Node 20/24     | 需在目标主机上验证 | 依主机/账号而定 | 仅显式开启         |

常规测试从不使用真实的提供方账号。真实调用的 smoke 测试必须显式开启，并且要清楚地当作可能产生费用
的操作来对待。这些检查对最终用户意味着什么，参见[兼容性与支持边界](compatibility.md)。
