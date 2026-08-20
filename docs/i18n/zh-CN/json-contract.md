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

### `providerMessage`

一个类型化的 `failure` 可以附带一个可选的 `providerMessage`。Xerify 自己的 `message` 对每种失败 `code` 都是固定的一句话，是调用方应该据以做分支判断的内容；`providerMessage` 则是提供方对同一次失败给出的原话，是给人阅读的内容。如果没有它，过期的 CLI、失效的登录状态、被拒绝的模型，都只会统一报出 `Provider process exited unsuccessfully`，看不出具体成因。

该字段携带的是提供方的输出，因此会被当作不受信任的内容处理，在进入结果之前要经过一套固定的处理流程：

- 最多保留一行明确声明的错误信息；如果输出中没有明确声明错误，则保留最后四行并用 `|` 连接——每一行都先单独完成脱敏，再拼接在一起；
- OSC 和 CSI 序列会被整体移除——连同其负载（payload）一起，无论是 7 位形式（`ESC ]`、`ESC [`）还是 8 位形式（U+009D、U+009B），因为能够识别 8 位控制符的终端，读到 U+009B 的效果和读到 `ESC [` 完全一样。除制表符和换行符外，其余所有控制字符都会被替换为一个空格：C0、DEL 以及 C1 范围内的字符一视同仁，回车符也包括在内。其他任何转义序列都会以同样的方式丢掉其引导符，只保留不带控制功能的可打印结尾部分；
- `Authorization`、`Proxy-Authorization`、`Cookie`、`Set-Cookie` 请求头会被整行替换——包括请求头名称和该行其余全部内容，因为这类请求头可能携带多个值，只处理第一个会把其余部分漏掉；
- `Bearer` 令牌、JWT、URL userinfo、已知的厂商密钥前缀，以及标签中含有 `key`、`token`、`secret`、`password` 或 `credential` 的任意 `label: value` 键值对，一律替换为 `[REDACTED]`；
- 剩余内容中，任何一段连续 24 位以上、字母与数字混合的不间断字符串都会被替换为 `[REDACTED]`，用来覆盖发行方不在前缀列表上的凭据。值得保留的标识符能够躲过这条规则，因为它们会被拆成较短的片段：`claude-opus-4-5-20251101` 中最长的一段连续字符是八位；
- 长度绝不超过 501 个字符：超出这个上限的内容会被截断为 500 个字符，并在末尾加上一个省略号 `…`；
- 当提供方没有给出任何可用内容时，直接省略该字段，而不是发送一个空字符串。

最终留下来的是一段有边界的引述，而不是一个被解析过的字段：它除了 `string` 之外没有任何模式（schema）可言，措辞是提供方自己的，会随提供方变化而变化，其中还可能包含提供方自己选择打印出来的文件系统路径。不要依据它做分支判断。

脱敏是针对提供方撰写文本的一层纵深防御，而不是一种证明。上面列出的就是实际生效的规则；没有任何一套有限的规则集合能被证明覆盖提供方可能编造出的每一种凭据，最后一条规则之所以存在，正是因为前缀列表已经被证明做不到这一点。请把 `providerMessage` 当作结果中最不可信的字符串，也不要把它转发到任何不能接受出现凭据的地方。

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
- 敏感值、原始的 authorization 请求头、令牌片段、凭据路径、prompt/context、回答文本，以及 findings，都不会被 Xerify 放入类型化错误或审计记录。
- 唯一会把提供方撰写的文本带入类型化错误的字段是 `providerMessage`，它会依照[验证结果](#providermessage)一节所述方式完成脱敏并保持有边界。其中可能出现提供方自己选择打印的路径，但不可能出现凭据。
