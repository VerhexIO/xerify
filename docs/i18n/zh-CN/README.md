[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# Xerify 文档

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

公开模式、架构决策记录（ADR）、安全政策和不可变的验证证据，均以英文为准。各语言版本的手册完整讲解消费者工作流程，但命令名称、JSON 字段、提供方/模型标识符、退出码和配置键始终保持英文原样。译文与已测试的约定不一致时，以英文约定为准；发现翻译偏差请提交反馈。

## 消费者指南

- [安装与升级](installation.md)
- [项目配置](configuration.md)
- [CLI 参考](cli-reference.md)
- [提供方适配器](provider-adapters.md)
- [提供方与访问渠道](channels.md)
- [JSON 与退出码约定](json-contract.md)
- [本地运行历史](run-history.md)
- [MCP](mcp.md)
- [兼容性与支持边界](compatibility.md)
- [架构](architecture.md)
- [验证实例演练](examples/README.md)
- [无账号演练](examples/no-account-walkthrough.md) — 零提供方配额下的每一种结果
- [失败模式](examples/failure-modes.md) — 每一种类型化失败、成因与修复方法
- [安全政策](security.md)

## 规范性文档与机器可读资料

- [已采纳的架构决策](../../decisions/)
- [已发布的 JSON 模式](../../../schemas/)
- [机器可读示例索引](../../examples/index.jsonl)
- [不可变示例证据](../../examples/evidence/) — 仅英文，哈希锚定
- [确定性模拟提供方](../../../tools/mock-provider.mjs)

产品名为 **Xerify**，npm 发行包为 **`xverify-cli`**，安装后的可执行命令为 **`xerify`**。
