[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# 免账号演练：零配额，覆盖每一种结果

了解 Xerify 的行为，不需要提供方账号、API 密钥，也不需要登录。本页使用包内自带的确定性模拟提供方，演示**每一种裁定和每一种类型化失败**。

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

这里的操作都不会联网，也不会产生任何费用。下面展示的每一段输出，都是直接运行对应命令后得到的真实结果。

## 为什么用模拟提供方

Xerify 的 `command` 适配器可以运行任意可执行文件：把 prompt 写入其 stdin，再从 stdout 读取响应。至于这段响应是不是语言模型生成的，它并不关心。因此，一段固定输出的脚本同样是合法的提供方——而且由于响应完全由你掌控，每个结果都可以稳定复现。

这个模拟提供方位于 `tools/mock-provider.mjs`，只接受一个参数——场景名称，会忽略传入的 prompt，直接打印固定的响应。

> **可用性说明：** 模拟提供方从 `0.1.1` 起随包分发。它不在 `0.1.0` 的 tarball 里——如果用的是那个版本，请使用仓库的源码检出，或者把该文件从仓库中复制到自己的项目里，并把 `args` 指向这份副本。本页其余内容不受影响，照常可用。

## 准备工作

首先找到安装路径。模拟提供方必须以**绝对路径**引用——`command` 适配器每次都在全新的临时目录中运行，相对路径永远无法解析。

```sh
# 从源码检出运行
MOCK="$PWD/tools/mock-provider.mjs"

# 从全局 npm 安装运行
MOCK="$(npm root -g)/xverify-cli/tools/mock-provider.mjs"

# 从项目本地安装运行
MOCK="$PWD/node_modules/xverify-cli/tools/mock-provider.mjs"

echo "$MOCK"
```

接下来写一份一次性配置，为每个场景各注册一个适配器。把它放在临时目录中，就不会碰到你项目里真正的配置。

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH` 让 Xerify 指向这份文件，不会动到你的主目录，也不会碰你项目里的 `.xerify/`。`history.enabled: false` 则确保这次演练不会写入任何运行记录。

用两个 shell 变量把后面的命令写短一些：

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

继续之前，先检查一下配置是否生效：

```sh
xerify --json providers list
```

你会看到上面这十个模拟适配器，**再加上**内置的 `codex`（`openai`）和 `claude`（`anthropic`）适配器，以及你自己项目配置里定义的其他适配器。配置是与默认值合并的，而不是替换默认值，所以具体数量取决于你的环境。

每个模拟适配器都特意配了独立的 `provider` 身份。同一提供方之间的核验会被拒绝，如果共用一个身份，下面所有命令都会被挡住。给每个适配器分配独立身份，还有个好处：避免和内置适配器冲突——当两个适配器共用同一个身份时，先注册的那个生效，而内置适配器总是先注册。参见[失败模式](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3)。

## 三种裁定

### `confirmed` — 退出码 `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

退出码为 `0`。注意 `failure: null`——这是一个真实的裁定结果，而不是失败时的兜底值。

### `refuted` — 退出码 `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

退出码为 `10`。在真实运行中，`findings` 数组才是核心内容所在；关于包含四五条具体发现的裁定，参见[验证实例](README.md)。

### `unclear` — 退出码 `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

退出码为 `11`，且 `failure: null`。这是验证方在说*“现有证据不足以下结论”*——这是一个认知层面的结果，不是故障。可以拿它和下文那些同样与退出码 `11` 相邻、但 `failure` 字段非空的类型化失败对比一下。

## 各类型化失败

下面每条命令都是一行搞定。关于每种结果的完整说明，以及在真实部署中如何修复，参见[失败模式](failure-modes.md)。

```sh
# 1. 可执行文件完全不存在 -> 退出码 3，ok:false，PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. 两侧使用了同一个调用提供方 -> 退出码 2，未联系任何提供方
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. 提供方以自然语言散文作答 -> 退出码 6，INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. 提供方返回被截断的 JSON -> 退出码 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. JSON 合法，但 verdict 取值不合法 -> 退出码 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. 提供方进程以非零状态退出 -> 退出码 5，PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. 提供方响应慢于 --timeout -> 退出码 4，TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. 响应超出输出上限 -> 退出码 6，truncation.output 为 true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

按顺序预期的退出码依次是：`3`、`2`、`6`、`6`、`6`、`5`、`4`、`6`。

这里最值得细看的是第 3 种情况。模拟提供方回复的是 `Yes, that looks right to me. I would ship it.`——用大白话表达了明确无误的赞同。可 Xerify 仍然返回 `unclear`，退出码 `6`，因为按照契约，用散文表达的赞同并不构成裁定。这种拒绝，正是这个产品的价值所在。

## 一次性检查全部结果

用一个循环就能断言所有退出码，作为集成场景的冒烟测试很合适：

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## 清理

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

整个过程不会向你的项目写入任何内容。如果你删掉了 `"history": { "enabled": false }` 从而开启了历史记录，别忘了同时删除 `.xerify/runs/`。

## 接下来可以看看

- [失败模式](failure-modes.md) — 每种失败的成因，以及在生产环境中的修复方法
- [验证实例](README.md) — 同样的场景换成真实提供方，会出现真实的分歧
- [项目配置](../configuration.md) — 优先级、权限，以及完整的配置模式
- [CLI 参考](../cli-reference.md) — 全部命令与参数
