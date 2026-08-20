[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# CLI 参考

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

所有命令共用同一套经过校验的配置和核心逻辑，与库和 MCP 服务器完全一致。全局选项既可以放在子命令之前，也可以放在之后：

| 选项                       | 说明                                |
| -------------------------- | ----------------------------------- |
| `--json`                   | 向 stdout 输出一份稳定的 JSON 信封  |
| `--timeout <milliseconds>` | 覆盖有边界的提供方生命周期超时时间  |
| `--log <path>`             | 覆盖不含密钥的 JSONL 审计元数据路径 |
| `--version`                | 打印已安装的 Xerify 版本            |

## 验证与适配器命令

| 命令                                                                         | 用途                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `xerify ask [question]`                                                      | 开放式第二意见；stdin 内容作为有边界的上下文   |
| `xerify ask --question <text> --to <provider:model>`                         | stdin 已提供上下文时的明确写法                 |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | 面向证伪的验证，使用不同的调用提供方           |
| `xerify request --to <provider:model> --input <file>`                        | 原始的、有边界的适配器调试请求；不提供验证保证 |

`ask` 和 `verify` 都支持 `--adapter <id>` 和 `--context-label <label>`。`ask` 的 `--from` 是可选的；`verify`
则要求来源已知或已显式声明。所有实际调用目标都必须给出精确的模型 ID。若 `--from` 与 `--to` 指向同一个
提供方，或 Cursor 目标写成 `auto`，请求会在真正触发提供方调用之前就失败。

## 初始化、配置与健康检查

| 命令                                       | 用途                                       |
| ------------------------------------------ | ------------------------------------------ |
| `xerify init`                              | 幂等地初始化项目私有的 `.xerify/` 状态目录 |
| `xerify health [--network]`                | 汇总项目和适配器的就绪状态                 |
| `xerify doctor [--network]`                | 详细诊断运行时、配置、MCP 与适配器         |
| `xerify providers list`                    | 列出已配置的能力，不发起推理调用           |
| `xerify providers probe --provider <id>`   | 探测单个适配器的可执行文件与鉴权就绪情况   |
| `xerify providers probe --all [--network]` | 探测所有适配器；网络检查仍不涉及推理       |
| `xerify config show`                       | 显示解析后的配置及其来源，密钥已脱敏       |
| `xerify config validate`                   | 校验项目/用户配置，打印脱敏后的解析结果    |

`health`、`doctor`、配置相关命令、run 相关命令、能力发现，以及默认的提供方探测，都不会调用模型。加上
`--network` 之后，也只是多做一次有限的端点可达性检查。

## 运行历史

| 命令                                              | 用途                                       |
| ------------------------------------------------- | ------------------------------------------ |
| `xerify runs list [--archived] [--limit <count>]` | 列出活跃记录，或已建立索引的归档摘要       |
| `xerify runs search <query> [--limit <count>]`    | 按 head/提供方/模型/裁定元数据搜索归档记录 |
| `xerify runs show <run> [--archived]`             | 显示一条规范化的记录                       |
| `xerify runs show <run> --include-evidence`       | 显式包含已捕获的证据内容                   |
| `xerify runs archive <run>`                       | 将一条活跃记录移入归档                     |
| `xerify runs restore <run>`                       | 恢复一条已归档的记录                       |
| `xerify runs delete <run> --yes [--archived]`     | 永久删除一条记录                           |

`<run>` 既可以写十进制序号（`1`），也可以写稳定 ID（`xrun_000001`）。归档、恢复、删除都只是本地文件系统
操作，不会调用任何提供方。正在运行中的记录无法被归档或删除。

归档列表以 `.xerify/archive/index.jsonl` 作为精简目录。其中每条摘要都带有符合采集策略、可安全展示的
`head` 字段，方便人和 agent 在打开完整记录之前先判断哪些记录可能匹配。`runs search` 正是基于这份目录做
检索，不需要逐条打开归档记录。

## MCP 服务器

| 命令                                                                         | 用途                                 |
| ---------------------------------------------------------------------------- | ------------------------------------ |
| `xerify mcp stdio`                                                           | 通过 STDIO 提供本地 MCP 服务         |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | 提供回环地址上的 Streamable HTTP MCP |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | 显式开启带鉴权的公网绑定             |

STDIO 模式下，stdout 专门用于承载协议帧，不能挪作他用。非回环地址的 HTTP 服务，必须同时提供
`--allow-public` 和一个通过指定环境变量传入的 bearer token。
