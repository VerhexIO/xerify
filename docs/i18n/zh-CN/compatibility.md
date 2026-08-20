[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 兼容性与支持边界

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 通过公开的 CI 矩阵，在 Ubuntu、macOS、Windows 上支持 Node.js 20 和 24；Node.js
24 是主要的发布通道。WSL 走的是 Linux 运行时路径，但涉及具体宿主的提供方身份认证和进程行为，仍需要在实际机器上用 `xerify health` 检查一遍。
`0.1.0` 候选版本的完整检查、干净安装冒烟测试和发布审计，在 WSL2 + Node.js 24 环境下同样通过。

## 支持的接入面

| 接入面                | 约定                                                          |
| --------------------- | ------------------------------------------------------------- |
| CLI                   | 面向人类的输出，加上稳定的 `--json` envelope 和文档化的退出码 |
| JavaScript/TypeScript | ESM 包导出，附带打包好的类型声明                              |
| MCP STDIO             | 本地 server，支持新旧两代协议协商                             |
| MCP Streamable HTTP   | 默认回环；非回环绑定需要显式开启并完成身份认证                |

公开的 JSON/schema 版本是 `1`。兼容版本里可以新增可选字段；删除或重新定义已有的公开字段，则需要一次破坏性发布。

## 提供方渠道

内置适配器覆盖 Codex CLI、Claude CLI、Cursor Agent、OpenAI API、Anthropic API、
OpenAI 兼容 HTTP，以及显式配置的 command。具体能否使用，取决于所选渠道、已安装的可执行文件、账号、精确的
模型 ID、身份认证、地区，以及提供方自身的政策。Xerify 不保证某个账号能看到的模型，另一个账号也一定能看到。

在实际使用环境中运行下面这些不产生费用的检查：

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

提供方探测验证的是本地传输是否就绪，而不是模型质量或结论是否正确。一次成功的实际
调用，只能证明那次请求所用的适配器/提供方/模型路径是通的。提供方生成的文字并非逐字节确定性输出，所以 Xerify 保证的是模式、边界、失败即拒绝（fail-closed）的结果和类型化错误——而不是完全一致的措辞。

## 结果边界

`confirmed` 的意思是：在给定证据范围内，没有找到实质性的反例。它不是
形式化验证，不是安全认证，也不会自动授权合并或执行某项变更。`refuted` 会拦下这条主张；`unclear`、超时、截断、输出无效，以及提供方
失败，都属于非成功状态，都需要重试、补充更强的证据，或者交给人工复核。

常规的包检查和 CI 检查不需要提供方凭据，也不会发起模型调用。针对真实提供方的测试永远是显式触发的，并且可能消耗订阅配额或产生 API 费用。

关于具体适配器的限制，参见[提供方适配器](provider-adapters.md)。关于数据和 prompt 边界，参见 [SECURITY.md](security.md)。
