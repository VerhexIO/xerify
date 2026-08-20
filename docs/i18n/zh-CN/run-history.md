[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 本地运行历史

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

每一次 CLI、library 或 MCP 发起的 `ask`/`verify` 调用，都可以生成一条确定性的项目本地记录。这样一来，提供方调用变得可理解、可审查，而不必把原始传输输出本身变成一份产物。

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

序号在同一个固定的历史命名空间里递增，活跃记录和归档记录共用这一套序号。一份私有的 `runs/HEAD.json` 记录着最近分配到的序号、目录、稳定的运行 ID，以及更新时间。仅在并发分配期间才会出现一个短暂存在的 `.HEAD.lock`；它不会随运行次数增多而膨胀。展示用的目录名使用配置好的零填充位数（默认六位），而稳定 ID 则是 `xrun_000001` 这种形式；命令既可以接受这个 ID，也可以接受简写的 `1`。因此，删除运行 `000001` 之后，下一次操作不会再次变成 `000001`。旧版的 `.sequences/` 布局会被校验、并入 `HEAD.json`，并在下一次分配时移除。

## 记录文件

| 路径                        | 含义                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | 稳定运行 ID、序号、可搜索的 `head`、操作/接入面、生命周期状态、时间戳、目标适配器/提供方/模型，以及终态的退出码/裁定或类型化失败 |
| `request.json`              | 规范化后的 ask/verify 请求元数据、author/target 的来源标识、限额、context label、捕获策略、字节数与摘要                          |
| `events.jsonl`              | 只追加写入的生命周期事件：先是 `started`，随后是 `completed` 或 `failed`；archive/restore 事件同样只追加，不改写历史             |
| `result.json`               | 解析后的规范化 Xerify 结果，或者按 `captureOutput` 配置生成的仅元数据摘要；`none` 模式下不存在此文件                             |
| `error.json`                | 当无法存储终态规范化结果时，写入的一份对敏感信息安全的类型化错误                                                                 |
| `evidence/manifest.json`    | 证据 ID、标签/定位符、字节数、SHA-256 摘要，以及可选的已存文件名                                                                 |
| `evidence/001-<sha256>.txt` | 仅当 `captureInput` 为 `full` 时才有的、有边界的输入上下文；编号按证据顺序排列，并非另一套运行计数                               |

每条证据都带有定位符、字节数和 `sha256:` 摘要。在支持的平台上，文件以私有的 POSIX 权限模式创建，并以原子方式写入。进程崩溃时，可能会留下一条如实反映情况的 `running` 记录——Xerify 不会替它编造一个终态结果。运行目录是人类或 agent 检查的基本单元；这些 JSON 模式被有意设计得比 Deckent 的编排任务记录更小，因为 Xerify 记录的只是一次提供方请求，而不是一个 worker 计划或项目变更的完整生命周期。

## 可搜索的归档索引

`xerify runs archive <run>` 会把完整记录搬到 `archive/<number>/` 下，并向 `archive/index.jsonl` 追加一个紧凑的 JSON 对象。restore 和 delete 同样只追加新的生命周期对象，不会改写历史。每一行包含：

- 事件/位置/时间，以及它是来自命令本身还是崩溃后的对账修复；
- 一份完整但精简的 `process` 摘要，包含人类/agent 都能读懂的 `head`、提供方/模型、裁定、exit、status 和时间戳；
- `recordSha256`：覆盖该生命周期节点上精确的 process、request、规范化结果或类型化错误，以及证据清单。

某个 `runId` 的最后一行，就是它当前的索引状态。`xerify runs list --archived` 只读取这一份索引加上目录名，不会逐个打开每份归档的 process 文件。缺失的旧版或中断的生命周期条目，只会从受影响的目录里对账修复，并标记为 `source: "reconciled"`。人类可以直接对 JSONL 用 grep 查找，AI 工具则应该先读这份索引，再决定要不要打开对应的运行目录。

`head` 完全在本地生成，不会再发起一次模型调用。当 `captureInput` 为 `"full"` 时，它是经过空白字符规范化、有边界长度的主张/question 预览；为 `"metadata"` 时，只包含操作类型加上语句摘要；为 `"none"` 时，不含任何语句内容。这样可以避免索引绕过已配置的持久化策略。

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

archive 和 restore 本质上只是本地重命名，外加只追加的索引条目。delete 是不可逆的，需要显式加上 `--yes`，并会报告
`recoverable: false`。正在运行中的记录不能被 archive 或 delete，这样可以避免生命周期命令破坏一次尚未完成的终态写入。以上命令都不会调用任何提供方。

`runs search <query>` 会在运行 ID、`head`、操作、提供方/模型、适配器、status、裁定、exit/error 和时间戳这些字段中，匹配当前归档摘要的最新状态。它只读取那份紧凑索引，返回匹配到的 process 摘要；证据内容仍然需要通过 `runs show` 才能按需查看。
隔离环境下的历史契约测试会在 1,000 条已索引的归档摘要上执行列表和定向搜索，这些运行记录本身故意不被打开。

`captureInput: "full"` 会存下语句和上下文；`metadata` 只存字节数和哈希；`none` 两者都不存。`captureOutput: "normalized"`
存的是解析后的 Xerify 结果，`metadata` 存的是对敏感信息安全的摘要，`none` 则不写结果文件。原始的提供方传输输出、凭据、身份认证存储，以及环境变量转储，永远不会成为历史记录的字段。

自动生成的根目录忽略规则，会让 `.xerify/` 不进入 Git、不进入 npm 包、也不进入 Docker 构建上下文。它们不能替代文件系统权限或数据分级。在发送或持久化敏感证据之前，先检查一遍捕获策略。更改已配置的历史根目录，会启用一个不同的序号命名空间。如果同一用户的另一个进程并发地删除、重命名或修改它的私有历史目录树，Xerify 并不保证完整性。
