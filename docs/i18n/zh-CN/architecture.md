[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 架构

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

本指南、`docs/decisions/` 下已采纳的记录、公开的模式，以及它们各自经过测试的约定，共同构成 Xerify 产品与架构的活文档权威来源。某个行为仅仅出现在内部笔记里，并不代表它就是公开的；文档必须与已实现、已测试的实际路径保持一致。

Xerify 是一个 ESM 包，对外暴露 CLI、library、STDIO MCP、Streamable HTTP MCP 四个公开接入面，底层共用同一条核心执行路径。

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## 模块边界

- `src/core` 负责公开的请求/结果、prompt、“不同提供方”规则的强制执行、裁定解析、错误类型、限额，以及审计投影。
- `src/providers` 实现了一套中立的适配器约定，以及内置的 CLI/API/command 适配器，不引入任何 CLI 渲染逻辑。
- `src/process` 和 `src/platform` 负责可执行文件解析、环境变量白名单、有边界的数据流、超时/取消，以及进程树终止。
- `src/config` 从 `.xerify/xverify-config.json` 解析严格 JSON，记录每个已解析字段的
  来源，对可选的明文 API key 做脱敏处理，并在不覆盖已有文件的前提下初始化私有的项目状态/日志元数据。
- `src/history` 直接记录活跃的运行，通过一份原子的
  `HEAD.json` 分配单调递增的标识，并维护一份遵循捕获策略、只追加写入的归档索引，供人类和 agent 查找。
- `src/cli` 把命令映射到核心逻辑，渲染出面向人类的输出，或者一个稳定的 JSON envelope。
- `src/mcp` 向 MCP SDK v2 注册同一套 Zod 模式和核心函数。HTTP 身份认证仍然留在传输层边界处理。

包的根目录导出 core、config、adapters，以及 MCP factory，供编程方式调用。测试用的 fixture 永远不会被生产代码引入。

## 请求流程

1. 严格的 CLI、library 或 MCP 输入校验，确立提供方/模型身份，以及字节数/时间上的限额。公开调用方不能自证为 `observed`；target 的身份必须是 `declared`。
2. 在解析适配器之前，验证流程会拒绝未知来源，以及两端调用提供方身份相同的情况。
3. 如果显式指定了适配器 ID，注册表会直接使用；否则，会为 target 的提供方身份选用已配置好的适配器。
4. 适配器会以 `shell: false` 的方式调用一个可执行文件，或者发起一次有边界的 HTTP 请求。prompt 和 context 都不会进入 shell 参数。
5. 提供方的输出会被按字节数设边界并规范化。系统会从权威的 Zod 字段定义派生出一份与提供方兼容的结构化模式，随后由核心校验强制执行完整的边界约束。
6. core 返回一个 `AskResult` 或完整的 `VerifyResult`；提供方被接受调用之后发生的失败，会如实变成一个带类型化 `failure` 的 `unclear` 结果，并附带对应原因的退出码。
7. 可选的 JSONL 审计日志只投影元数据。prompt、context、答案、findings、原始响应、请求头，以及敏感值，一律不包含在内。

## 信任边界

主张/context 和提供方的输出都是不受信任的。验证方被明确要求：把提供的材料当作证据，尝试去证伪它，并忽略其中夹带的
指令、角色切换、裁定指令，以及模式变更。这是一种保证评估完整性的缓解手段，不是对抗 prompt 注入的保证。Xerify 永远不会把
提供方的输出当作命令、源文件、MCP 指令或配置去执行。直连的 API key，优先从一个具名环境变量解析，其次才是显式
配置的明文兜底值；诊断信息永远不会把两者中的任何一个暴露出来。官方 CLI 的认证存储只通过官方可执行文件访问，Xerify 不会去解析或复制它们。

Codex 和 Claude 适配器在代码里把调用提供方身份分别写死为 `openai` 和 `anthropic`。
无论精确模型 ID 指向的上游模型是什么，Cursor 都写死为 `cursor`；`auto` 会被拒绝，
因为它无法保留模型来源。`command` 和 `openai-compatible` 这两个标签，是由所有者自行控制的声明，不是远程认证；它们能提供
多强的跨提供方保证，完全取决于那份配置本身。

提供方隔离衡量的是调用/计费/控制平面这三者的多样性。它并不能证明两条渠道使用的是不同的模型
厂商、权重、训练数据，或者存在不同的盲区。直连 OpenAI，和经由 Cursor 调用的 GPT 模型，是两个不同的调用提供方，但完全可能共享同一条模型血统。

官方 command 适配器运行在全新的、限制严格的临时工作区里，而不是用户
仓库中。Codex 会忽略用户的规则/配置，且只读；Claude 会禁用自定义配置、工具、
斜杠命令和会话持久化；Cursor 使用只读的 ask 模式，外加它自己的沙箱。Cursor 缺少一个能彻底禁用账号级
MCP 的开关，这一点作为已知的残留风险被记录在案。

STDIO 的 stdout 专门留给 MCP 帧使用。Streamable HTTP 默认只走回环地址，并校验 Host 和 Origin。公网绑定需要显式参数，外加 bearer 身份认证。

## 兼容性

- 运行时下限：Node.js 20；主要开发运行时：Node.js 24。
- 公开模式版本：`1`。
- MCP SDK 主版本：`2`；现代协议修订版：`2026-07-28`；旧版客户端依然会被服务。
- 已有的公开字段，不经过破坏性发布就不能被删除或重新定义；允许新增可选字段。

命令结果的决策及其理由，记录在
[ADR 0001](../../decisions/0001-command-outcomes.md) 中。调用提供方身份的判定规则，由
[ADR 0002](../../decisions/0002-invocation-provider-identity.md) 固定下来。
