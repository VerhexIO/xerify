[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# JSON 与退出码约定

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

全局参数 `--json` 既可以放在子命令前面，也可以放在后面。Xerify 只向 stdout 输出一个紧凑的 JSON 对象（末尾带一个换行符），不附加任何终端修饰。

成功时：

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

调用前错误或命令本身出错时：

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

`ask` 和 `verify` 的 `data` 字段，与它们各自 MCP 工具使用同一套模式（schema）。已发布的 Draft 2020-12 产物存放在 `schemas/` 目录，由运行时的 Zod 模式生成。

`provider` 指的是发起调用、承担计费、掌握控制权的那个服务方：无论具体模型 ID 是什么，经由 Cursor Agent 发起的调用一律记为 `cursor`；直连 Codex/OpenAI 记为 `openai`；直连 Claude/Anthropic 记为 `anthropic`。这套身份判定衡量的是调用渠道是否多样，而不是上游模型是否彼此独立。`health` 和 MCP 的能力信息会明确报告 `identityBasis: "invocation-provider"`。

验证成功时的返回内容可以附加 `evidence`、`assumptions`、`limitations`、`unverifiedClaims` 四个字段，出于兼容性考虑，它们都是可选的。结构化的提供方适配器会要求这四个字段全部返回；使用旧版返回格式的 command 适配器依然会被接受。`evidence` 中的条目是验证方在给定上下文里找到的、有边界的引用，而不是经过独立核实的引用来源。

## 验证结果

`confirmed`、`refuted`，以及真正意义上的 `unclear`，都属于已完成的验证结果。而一旦提供方生命周期启动，超时、取消、提供方失败、结构化输出无效，或者验证输入/输出被截断，同样会返回一个完整的 `VerifyResult`，其 `verdict` 为 `"unclear"`，并附带一个具体类型的 `failure`。证据一旦被截断，就绝不可能得到 `confirmed` 的结果。进程的退出码会保留更底层的错误原因。

这意味着，即使退出码非零，调用方也必须解析 stdout。

| 退出码 | 含义                                                 |
| -----: | ---------------------------------------------------- |
|    `0` | 命令执行成功：ask 已给出回答，或验证结果为 confirmed |
|    `2` | 输入/配置无效、提供方相同，或来源无法证明            |
|    `3` | 提供方可执行文件、端点或身份认证不可用               |
|    `4` | 超时或被取消                                         |
|    `5` | 提供方、进程或 API 传输失败                          |
|    `6` | 提供方响应无效、不完整，或不符合模式                 |
|   `10` | 验证结果为 refuted                                   |
|   `11` | 验证结果为 unclear，且没有更底层的失败原因           |

未匹配到任何结果的发现类操作同样算作成功。缺失的 usage 数值会保持为 `null`——Xerify 不会去估算 token 数量或费用。输入/输出截断会在结果元数据中明确标出。

## 兼容性策略

- 每一个公开的 envelope 和结果都带有 `schemaVersion: 1`。
- 删除或重新定义已有字段属于破坏性变更。
- 新增可选字段属于增量式变更。
- 未知的输入/配置字段会被严格模式拒绝。
- 公开的请求模式在 author 的来源标识上接受 `declared` 或 `unknown`，但 target 必须是 `declared`；调用方传入的 `observed` 会被拒绝，而 author 为 `unknown` 时又无法通过“不同提供方”的准入规则。
- 敏感值、原始的 authorization 请求头、令牌片段、凭据路径、prompt/context、回答文本，以及 findings，都不会进入类型化错误或审计记录。
