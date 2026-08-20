[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Dogfood：验证 Xerify 自身的 Cursor 适配器

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 在核查一条关于自身源码的主张。有意思的不是裁定结果本身，而是前两次尝试根本没能给出裁定。

- 作者声明：`anthropic:claude-opus-5`
- 验证方：通过 `codex` 适配器调用的 `openai:gpt-5.6-sol`
- 证据：[dogfood-cursor-adapter.md](../../../examples/evidence/dogfood-cursor-adapter.md)
- 观测于 2026-08-20：`confirmed`，退出码 `0`

## 主张

> `CursorAdapter` 报告的提供方为 `cursor`，不做模型前缀推断，并且在启动 Cursor 进程之前就拒绝 `auto` 模型。

## 复现

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## 观测到的标准化结果

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The supplied snippets adequately support the bounded claim: provider identity is returned explicitly as \"cursor\", and the exact \"auto\" model is rejected before temporary-workspace creation or the documented process-invocation point. No material counterexample appears within the supplied evidence.",
  "materialFindings": [
    "[low] The model normalization is narrower than it may appear: values such as \"auto [suffix]\" leave trailing whitespace before comparison and may bypass the gate. This does not contradict rejection of the exact tested value \"auto\", but it could be a regression path if annotated model strings are valid inputs.",
    "[info] The process-prevention test indirectly demonstrates non-execution because the configured executable cannot resolve, while the source ordering directly places validation before workspace and process creation."
  ]
}
```

## 裁定原因

这里的 `confirmed` 含义很窄，值得说清楚：**在所提供的代码片段范围内**，没有找到这条有边界的主张的反例。这不是对该适配器的审计，也不是证明。

真正有价值的产出是那条没人主动要求的 `low` 级发现。验证方注意到，模型名称的归一化逻辑会按 `[` 分割并裁剪空白，因此像 `auto [something]` 这样的值，归一化后未必等于门禁比较用的确切字符串。这只是一条假设性的回归路径，不是当下存在的缺陷——但这正是“第二意见”存在的意义：把这类观察暴露出来。

把 `confirmed` 理解成“在你提交的材料里没找到反例”，而不是“这是正确的”。

## 哪些因素会改变裁定

- **倾向 `refuted`：** 如果存在一条源码路径，`CursorAdapter` 从模型 ID 推导出提供方身份，或者 `auto` 的拒绝逻辑发生在进程启动之后。
- **倾向 `unclear`：** 如果只提供关于适配器的文字描述，而不是一手源码片段。在准备这个案例期间，一次只给文字描述的 dogfood 尝试就因为这个原因返回了 `unclear`——Xerify 不会把一段听起来合理的架构描述当成证明。

## 关于验证方选择的说明

这条主张是关于 Cursor 适配器本身的，所以最初的设计是**通过** Cursor 来验证它。结果没有成功：连续两次针对 `cursor:cursor-grok-4.6-high-fast` 的尝试都以退出码 `6`（`INVALID_PROVIDER_RESPONSE`）收场，模型始终没有给出要求的 JSON。于是主张被改为交给强制约束输出模式的 `codex` 适配器处理，第一次尝试就给出了裁定。

主张的对象和验证它所用的通道，是两个独立的选择。当裁定结果需要被机器消费时，优先选择能在提供方一侧固定输出模式的适配器。参见[失败模式](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6)。

## 决策

可以作为候选项继续推进。把那条 `low` 级发现作为潜在的加固项跟踪，而不是当作缺陷处理。
