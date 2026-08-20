[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# 游戏制作计划：工时算不过来

两人团队，十周工期，功能列表锁死，一项都不许砍。主张是：这样能做完。但产能账一算，答案是做不完。

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

这个例子还记录了一次**真实的复现失败**——详见下文“关于可复现性的说明”。

- 作者方声明：`openai:gpt-5.6-sol`
- 验证方：`cursor:cursor-grok-4.6-high-fast`，通过 `cursor` 适配器
- 证据：[game-design.md](../../../examples/evidence/game-design.md)
- 实测于 2026-08-20：`refuted`，退出码 `10`（第二次尝试；详见下文）

## 主张

> 完整的发布范围可以由这个两人团队在十周内完成交付，且不需要加班、不聘请外包、不砍任何功能、也不延期。

## 复现

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## 观测到的规范化结果

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## 为什么是这个裁定

这是最干净利落的一种证伪：主张本身和它自己设下的约束互相矛盾，而且这种矛盾是算术层面的，不涉及主观判断。当同一份文件把所有退路都堵死时，800 小时的可用产能，怎么也塞不下 1,120 小时的所需工时。

验证方也没有接受那个最诱人的救场理由——“也许他们做起来会比估算的快”——因为证据显示，这个团队在风险最高的那部分范围上恰恰缺乏经验。乐观不是证据。

## 什么情况会改变结果

- **转向 `confirmed`：** 重新估算后的总工时（_含_ 20% 风险储备）低于 800 小时，或者去掉四项约束中的任意一项。增加第三名工程师、把工期延长到十四周、或砍掉一项功能，都会产生一个不同的、可核验的新主张。
- **转向 `unclear`：** 估算给出一个没有标注置信度的区间，且区间下限落在产能范围之内。

## 结论

拦下。先重新规划，再承诺日期。这次证伪给出了四个具体的调整杠杆，调整其中任意一个，都能得到一个能通过核验的新主张。

## 关于可复现性的说明

上面这条命令原封不动地执行了两次。第一次返回退出码 `6`（`INVALID_PROVIDER_RESPONSE`）——模型没有输出所需的 JSON。第二次才返回了这里展示的、退出码为 `10` 的裁定。两次运行都被记录进了本地运行历史，主张文本和证据的哈希值完全一致。

`cursor` 适配器在提供方一侧不做模式（schema）强制校验；它在[内置矩阵](../provider-adapters.md)里的结构化验证列写的是“prompt 约定；核心校验”。因此，`cursor` 或 `command` 适配器返回的退出码 `6`，应当当作可重试来处理——但要给重试设上限，而且绝不能仅仅因为不喜欢某个裁定结果就去重试。参见[失败模式](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes)。
