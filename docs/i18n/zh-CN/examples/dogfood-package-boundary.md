[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Dogfood：已发布的 npm 包里到底有什么

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 在核查一条关于自身发行边界的主张，用的是自动生成的回执，而不是人工总结。

- 作者声明：`openai:gpt-5.6-sol`
- 验证方：通过 `claude` 适配器调用的 `anthropic:claude-fable-5`
- 证据：[dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- 观测于 2026-08-20：`confirmed`，退出码 `0`

## 主张

> 针对 `xverify-cli@0.1.1` 提供的 npm dry-run 回执显示，所列出的每一个必需运行时和工具路径均存在，没有任何包内路径匹配所列的内部、文档或本地状态禁止规则，并且显示 source map 文件数为零。

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
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.1 reports every listed required runtime and tool path as present, reports no package path matching its listed internal, documentation or local-state forbidden rules, and reports zero source map files." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## 观测到的标准化结果

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.1 reports exactly what the bounded claim states: all six paths in requiredPathsPresent are true; forbiddenMatches is an empty array against the 16 listed internal/documentation/local-state rules; and sourceMapCount is 0. An independent cross-check of the 16 topLevelEntries against the forbiddenPathRules yields no match, so the receipt is internally consistent.",
  "materialFindings": [
    "[info] All six requiredPathsPresent entries are reported true, covering the runtime entry, schema, skill, postinstall script, mock-provider tool, and README.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the 16 forbiddenPathRules yields no match.",
    "[info] sourceMapCount is 0, matching the claim of zero source map files.",
    "[low] The receipt enumerates only the 16 top-level entries of 109 total, so forbiddenMatches is accepted as the receipt's own computed report rather than independently recomputed."
  ]
}
```

## 裁定原因

注意这条主张的范围划定得有多谨慎：它说的是**回执报告了什么**，而不是**注册表实际提供了什么**。正是这种范围限定，才让它具备可验证性。像“已发布的包不包含任何源码文件”这样的主张，凭这份证据是无法验证的，因为证据只是一次本地 dry run。

那条 `low` 级发现，是验证方从另一侧守住这条边界。它注意到 `forbiddenMatches: []` 无法被独立重新计算，因为回执只列出了 16 个顶层条目，而总文件数是 109。也就是说，它其实是在信任回执自身的断言——而它把这一点明说了出来，没有悄悄把一个汇总字段当成事实真相。

候选包名 `xerify` 被 npm 以“非限定名称”为由拒绝；最终发布的分发包是 `xverify-cli`，安装后的可执行文件叫 `xerify`。验证方核实了这种命名差异是有说明的，而不是自相矛盾。

## 哪些因素会改变裁定

- **倾向 `refuted`：** 只要 `requiredPathsPresent` 里有任意一项报告为 `false`，或者 `forbiddenMatches` 非空。把 `src/` 重新加回 `package.json` 的 `files` 数组就能复现这种情况。
- **倾向 `unclear`：** 如果回执里的汇总字段被去掉，验证方就没有依据来核实主张里的具体断言。

## 决策

可以作为发布门禁的候选项继续推进。建议再配一项能从完整文件列表重新计算 `forbiddenMatches` 的检查，因为验证方已经正确指出，它无法凭这份证据独立完成这个计算。
