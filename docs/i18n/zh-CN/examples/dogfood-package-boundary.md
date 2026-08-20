[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Dogfood：已发布的 npm 包里到底有什么

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 在核查一条关于自身发行边界的主张，用的是自动生成的回执，而不是人工总结。

- 作者声明：`openai:gpt-5.6-sol`
- 验证方：通过 `claude` 适配器调用的 `anthropic:claude-fable-5`
- 证据：[dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- 观测于 2026-08-20：`confirmed`，退出码 `0`

## 主张

> 针对 `xverify-cli@0.1.0` 提供的 npm dry-run 回执显示，所列出的每一个必需运行时、示例和本地化路径均存在，也没有任何包内路径匹配所列的内部或本地状态禁止规则。

## 复现

先重新生成回执——文档一旦发生变化，`entryCount` 和 `unpackedSize` 就会跟着变化：

```sh
npm pack --dry-run --json --ignore-scripts
```

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime, example, and localization path as present, and reports no package path matching its listed internal or local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## 观测到的标准化结果

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.0 lists eight required paths under requiredPathsPresent and reports every one as true. Its forbiddenMatches array is empty against the fourteen listed forbidden rules, and none of the sixteen topLevelEntries matches any forbidden rule such as src/, tests/, .github/, .xerify/, AGENTS.md, or CONTRIBUTING.md.",
  "materialFindings": [
    "[info] All eight required paths are reported present, covering runtime, example, and localization categories.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the fourteen rules yields no match.",
    "[low] The receipt shows entryCount 229 but enumerates only 16 top-level entries, so forbiddenMatches cannot be independently recomputed from a full file manifest; it can only be read as the receipt's own report.",
    "[info] The name discrepancy between the pre-publication candidate name xerify and the published name xverify-cli is explained in the evidence prose and does not contradict the claim."
  ]
}
```

## 裁定原因

注意这条主张的范围划定得有多谨慎：它说的是**回执报告了什么**，而不是**注册表实际提供了什么**。正是这种范围限定，才让它具备可验证性。像“已发布的包不包含任何源码文件”这样的主张，凭这份证据是无法验证的，因为证据只是一次本地 dry run。

那条 `low` 级发现，是验证方从另一侧守住这条边界。它注意到 `forbiddenMatches: []` 无法被独立重新计算，因为回执只列出了 16 个顶层条目，而总文件数是 229。也就是说，它其实是在信任回执自身的断言——而它把这一点明说了出来，没有悄悄把一个汇总字段当成事实真相。

候选包名 `xerify` 被 npm 以“非限定名称”为由拒绝；最终发布的分发包是 `xverify-cli`，安装后的可执行文件叫 `xerify`。验证方核实了这种命名差异是有说明的，而不是自相矛盾。

## 哪些因素会改变裁定

- **倾向 `refuted`：** 只要 `requiredPathsPresent` 里有任意一项报告为 `false`，或者 `forbiddenMatches` 非空。把 `src/` 重新加回 `package.json` 的 `files` 数组就能复现这种情况。
- **倾向 `unclear`：** 如果回执里的汇总字段被去掉，验证方就没有依据来核实主张里的具体断言。

## 决策

可以作为发布门禁的候选项继续推进。建议再配一项能从完整文件列表重新计算 `forbiddenMatches` 的检查，因为验证方已经正确指出，它无法凭这份证据独立完成这个计算。
