[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# 网站架构决策：矩阵选的是另一个方案

一份架构决策主张分出了胜者。但经过批准的评分矩阵给出了不同的结论，而且是从两个角度分别说明的——一次在总分上，一次在门槛项上。

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

- 作者方声明：`openai:gpt-5.6-sol`
- 验证方：`anthropic:claude-fable-5`，通过 `claude` 适配器
- 证据：[website-decision.md](../../../examples/evidence/website-decision.md)
- 实测于 2026-08-20：`refuted`，退出码 `10`

## 主张

> 按照已批准的加权决策矩阵，配备独立数据库的定制 SSR 应用，是被选中的网站架构方案。

## 复现

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## 观测到的规范化结果

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Recomputing the approved weighted matrix confirms the stated totals: the managed static build + headless CMS scores 4.8 while the custom SSR app + database scores 3.3, so the matrix selects the static option by 1.5 points. The SSR option also scores 2 on operational burden, below the gate threshold of 3, with no documented exception.",
  "materialFindings": [
    "[high] Weighted totals directly contradict the claim: 4.8 versus 3.3 under the approved scoring rule.",
    "[medium] The SSR option is independently blocked by the operational-burden gate: it scores 2 against a threshold of 3, and the evidence states no documented exception exists.",
    "[info] The only criterion where SSR wins is editorial workflow (5 vs 4, weight 20), insufficient to offset security exposure, operational burden, and cost predictability."
  ]
}
```

## 为什么是这个裁定

验证方没有直接相信矩阵给出的总分，而是根据各项评分和权重**重新算了一遍**，确认算术无误之后，才对主张提出反驳。这个区别很重要：一个只是引用了矛盾数字的证伪，比一个重新推演出计算过程的证伪要弱得多。

接着它又找到了第二个、彼此独立的理由。就算总分再接近，SSR 方案本身也过不了运维负担这道门槛。两条互不相关的理由指向同一个结论，让这次证伪即便某一项打分有误，也依然站得住。

## 什么情况会改变结果

- **转向 `confirmed`：** 一套修订后的权重，让 SSR 在编辑工作流上的优势能压过它的其他劣势，_并且_ 还要有一份针对运维负担门槛的书面例外批准。两者缺一不可——光是总分过关，门槛项依然拦着。
- **转向 `unclear`：** 有证据表明该矩阵已被取代，或者权重的批准状态本身存在争议。

## 结论

拦下。这条主张与已批准的决策记录相矛盾。要么改选静态方案，要么按照当初批准这份矩阵的流程去修改它——但不要交付一个记录本身都不支持的决策。
