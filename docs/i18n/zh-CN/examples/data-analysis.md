[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# 数据分析：分层后逆转的汇总指标

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

总体数字显示，B 版本遥遥领先。可一旦按设备拆分，B 在桌面端反而落后。这就是辛普森悖论，也是最容易出现在你自己仪表盘里的一种陷阱。

- 作者声明：`openai:gpt-5.6-sol`
- 验证方：通过 `cursor` 适配器调用的 `cursor:cursor-grok-4.6-high-fast`
- 证据：[data-analysis.md](../../../examples/evidence/data-analysis.md)
- 观测于 2026-08-20：`refuted`，退出码 `10`

## 主张

> B 版本从因果上提升了用户转化率，根据汇总结果，应当在全部移动端和桌面端流量上推广。

## 复现

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## 观测到的标准化结果

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "The aggregate B win is a mix-shift artifact, not a causal improvement. Device allocation is severely imbalanced; B is worse on desktop and only trivially higher on a small mobile sample. A universal rollout from the aggregate rate is contradicted by the stratified table.",
  "materialFindings": [
    "[critical] Simpson's paradox: B's aggregate conversion (64.92% vs 20.83%) is explained by B receiving most high-converting desktop traffic, not by a within-device treatment effect.",
    "[critical] Desktop counterexample: B converts at 76.0% versus A's 80.0%, so rolling B to all desktop traffic would be expected to reduce conversion in that segment.",
    "[high] Mobile does not support a rollout decision: B is 0.5pp higher on 200 visitors versus A's 1,000, with no uncertainty interval.",
    "[high] No identification evidence for a causal claim: no randomization receipt, sample-ratio-mismatch check, interval estimate, or mix adjustment. Device share is 83.3% mobile for A versus 16.7% for B."
  ]
}
```

## 裁定原因

这条主张其实捆绑了三层断言：B 提升了转化率、这种提升是**因果性**的、由此应当全面推广。验证方逐一击破，并找到了最有力的反驳：数据本身就包含一个**直接反例**——B 在桌面端的表现反而更差。

64.92% 对 20.83% 这组汇总数字，算术上并没有错，只是建立在一次被混杂的流量分配之上。如果验证的问题是“这个数字算得对不对”，答案是肯定的；但验证的问题是“这个数字能不能支撑这个决策”，答案就是否定的。

## 哪些因素会改变裁定

- **倾向 `confirmed`：** 需要有随机化凭证、样本比例失配检查、分设备的区间估计，并且分设备效应在两端都为正。主张本身也需要收窄——“提升转化率”和“应当全面推广”并不是同一条主张。
- **倾向 `unclear`：** 如果流量分配均衡、区间估计又较宽，数据就会既不支持也不反驳这条主张，而不是像现在这样直接反驳它。

## 决策

阻止全面推广。分层数据表本身就包含了反驳这条主张所提建议的反例。若只在移动端推广，那是另一条主张，需要单独验证。
