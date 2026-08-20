[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# 研究论文：主张的结果从未被测量

一项虚构的研究报告了一个短期测验分数差异。而这次要核查的主张，说的是六个月后的记忆留存率。两者根本不是一回事——这道鸿沟，正是本例要说明的全部重点。

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

- 作者方声明：`openai:gpt-5.6-sol`
- 验证方：`anthropic:claude-fable-5`，通过 `claude` 适配器
- 证据：[research-paper.md](../../../examples/evidence/research-paper.md)
- 实测于 2026-08-20：`unclear`，退出码 `11`，`failure: null`

## 主张

> 使用该助教工具的学生，六个月后对课程内容的记忆留存率，比使用现有学习指南的学生高出至少 15%。

## 复现

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## 观测到的规范化结果

```json
{
  "verdict": "unclear",
  "exitCode": 11,
  "failure": null,
  "summary": "The claim asserts at least 15% greater retention after six months, but the supplied evidence contains no six-month measurement of any kind. The only observed outcome is a two-week quiz difference (78% vs 66%), which measures a different timeframe and construct and cannot substantiate the claim. The evidence also cannot refute the claim, since no six-month data contradicts it.",
  "materialFindings": [
    "[high] No six-month retention outcome exists in the supplied evidence, so the central quantity of the claim was never measured.",
    "[medium] The two-week quiz result is the only outcome data; extrapolating it to the claimed outcome is unjustified, with no confidence interval or adjusted analysis reported.",
    "[medium] Assignment was not randomized, so even the observed two-week difference may reflect selection effects.",
    "[medium] Differential attrition (8% vs 31%, 21 of 105 enrolled) plausibly biases the observed group difference."
  ]
}
```

## 为什么是这个裁定

`unclear` 才是正确答案，也是最容易被简单粗暴的集成方式判错的一种。

证据并非空白——它确实包含一个统计上很抢眼的结果（78% 对 66%，相对差异约 18.2%，远超主张中的 15%）。一个只顾着找支持性数字的系统，大概率会把这判成 `confirmed`。但验证方看出，这个数字回答的是**另一个问题**：当场测验的成绩，不等于六个月后的记忆留存。

它同样没有走向另一个极端。证据里也没有任何东西反驳这条六个月的主张——相关数据根本不存在。判成 `refuted` 会和判成 `confirmed` 一样错。

注意 `failure` 是 `null`。这是一次关于证据的判断，不是传输层面的问题。至于那些退出码同为 `11`、但 `failure` 字段非空、含义完全不同的情况，参见[失败模式](failure-modes.md)。

## 什么情况会改变结果

- **转向 `confirmed`：** 一份六个月后的评估，报告了效应量和置信区间，并且要么采用了随机分组，要么对自选择偏差和 8% 对 31% 的流失率差距做了可信的校正。
- **转向 `refuted`：** 一份六个月后的评估，显示差异低于 15%。
- **仍是 `unclear`：** 再补充更多两周期的数据也没用。在错误的观测终点上提高精度，并不能推动一个关于另一个终点的主张。

## 结论

不要把即时分数当成长期证据。要么去收集六个月后的结果，要么把这条主张交给人工复核。这正是设计中 `UNKNOWN → review` 的行为，而不是 `UNKNOWN → pass`。
