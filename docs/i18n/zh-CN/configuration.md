[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 项目搭建与配置

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 不会把项目专属状态堆在仓库根目录。把 Xerify 装成项目本地直接依赖时，会自动完成初始化，且不覆盖已有文件：

```sh
npm install --save-dev xverify-cli@latest
```

全局安装、嵌套的传递依赖安装、`--no-save` 安装、`npx` 方式，以及设置了 `XERIFY_SKIP_AUTO_INIT=1` 的安装，都不会往当前项目写入任何内容。这些情况下需要显式初始化：

```sh
npx --yes --package=xverify-cli@latest xerify init
```

该命令是幂等的，绝不会覆盖已有的配置或 `.gitignore`：

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

在首次依赖生命周期触发之前，npm 并不能明确标出这是直接依赖还是传递依赖。因此 Xerify 的判断依据是：要么根清单/锁文件里已经声明了它，要么同时满足显式的 save 参数与精确的根级 `node_modules/xverify-cli` 路径。包管理器完全可能把某个传递依赖的 Xerify 提升到这个位置；初始化器本身不会覆盖文件、也已被 git 忽略，但把 Xerify 内嵌进库里的作者，仍应设置 `XERIFY_SKIP_AUTO_INIT=1`。

规范的项目文件名是 `.xerify/xverify-config.json`。自动生成的 `.gitignore` 会把运行日志和可能带令牌的配置都排除在 Git 之外。如果确定配置里完全不含密钥，用户可以主动强制添加它，但每次提交前都要重新检查一遍。相对形式的项目级 `logPath` 是相对发现到的项目根目录解析的，不是相对包安装位置。在子目录中执行命令时，会向上逐级查找最近的规范项目配置；项目配置里的相对日志路径始终锚定在该项目根目录。

## 基本配置

`xerify init` 还会以幂等方式把 `.xerify/` 加进根目录的 `.gitignore`、`.npmignore`、`.dockerignore`：只追加一小段带标记的条目，绝不替换已有的忽略规则。

`xerify init` 会生成一份可直接使用的初始文件：

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {},
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

运行历史路径同样相对发现到的项目根目录解析。`captureInput` 可取 `full`、`metadata` 或 `none`；`captureOutput` 可取 `normalized`、`metadata` 或 `none`。默认的透明模式是为了让本地操作一目了然。在处理客户数据、专有源码或其他不能落盘保留的内容之前，请切换到仅元数据模式。活动目录和归档目录必须互不重叠：不能相同，也不能互相嵌套。改动任一路径都会开启新的序列命名空间。具体文件与生命周期命令见[本地运行历史](run-history.md)。

`providers` 留空时，内置的 `codex` 和 `claude` 适配器仍然可用。只需要按需添加实际会用到的传输方式，例如：

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY",
      "apiKey": "optional-literal-fallback"
    },
    "anthropicApi": {
      "kind": "anthropic-api",
      "apiKeyEnvironment": "ANTHROPIC_API_KEY",
      "maxTokens": 4096
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

`$schema` 只是给编辑器看的提示，Xerify 本身不会拉取或执行它。项目本地安装可以把它换成 `../node_modules/xverify-cli/schemas/config.schema.json`，以便离线补全。

配置校验很严格：command 或 CLI 类适配器上出现通用的 `token`、`secret`、隐性的 `defaultModel` 等凭据字段，一律会被拒绝。只有直连的 `openai-api`、`anthropic-api`、`openai-compatible` 适配器才接受可选字段 `apiKey`，且字段名必须精确匹配。

推荐的优先顺序是：

1. 优先使用具名环境变量（`apiKeyEnvironment`）。
2. 订阅制适配器使用官方 CLI 托管的登录认证。
3. 只有在单用户本地环境、管理环境变量确实不现实时，才使用字面量 `apiKey`。

两者都存在时，环境变量优先。`config show` 和 `config validate` 会把字面量 API 密钥和完整的提供方 `endpoint` 都输出为 `[REDACTED]`；这里刻意不做部分 URL 遮蔽，因为凭据可能藏在用户信息段、路径、任意查询参数或片段里。`health`、`doctor`、错误信息、prompt 和审计记录，都不会暴露这些值。在 POSIX 系统上，配置文件一旦包含 `apiKey` 或显式配置的提供方 endpoint，就必须是仅所有者可读写权限（`chmod 600 .xerify/xverify-config.json`），否则会被拒绝；初始化器创建的文件默认就是这个权限。仅仅使用适配器内置的默认 endpoint，并不会让原本不含密钥的文件因此变得私密。在 Windows 上，请用仅所有者的 ACL 保护该文件。这份文件绝不能提交进版本控制、粘贴进支持工单，或作为验证证据发送出去。

## 解析顺序与环境变量

优先级从高到低依次是：CLI 参数、Xerify 环境变量覆盖、项目配置、用户配置，最后才是适配器默认值。用户配置使用同样的文件名 `xverify-config.json`：

| 系统环境 | 用户配置路径                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------ |
| Linux    | `$XDG_CONFIG_HOME/xerify/xverify-config.json`，未设置时为 `~/.config/xerify/xverify-config.json` |
| macOS    | `~/Library/Application Support/Xerify/xverify-config.json`                                       |
| Windows  | `%APPDATA%\Xerify\xverify-config.json`                                                           |

`XERIFY_USER_CONFIG_PATH` 可以为封闭式自动化流程指定专属的用户配置文件。运行时限制可以用 `XERIFY_TIMEOUT_MS`、`XERIFY_MAX_INPUT_BYTES`、`XERIFY_MAX_OUTPUT_BYTES` 覆盖。CLI 的 `--timeout` 或 `--log` 参数优先级最高。

提供方/鉴权相关的环境变量，只会转发给对应的适配器：

| 适配器          | 支持的鉴权/配置环境变量                                             |
| --------------- | ------------------------------------------------------------------- |
| Codex CLI       | `CODEX_HOME`、`CODEX_API_KEY`；仍支持常规 CLI 登录                  |
| Claude CLI      | `ANTHROPIC_API_KEY`、`CLAUDE_CODE_OAUTH_TOKEN`；仍支持常规 CLI 登录 |
| Cursor Agent    | `CURSOR_API_KEY`、`CURSOR_API_ENDPOINT`；仍支持常规的 `agent login` |
| OpenAI API      | 优先使用具名环境变量；可选字面量 `apiKey` 作为兜底                  |
| Anthropic API   | 优先使用具名环境变量；可选字面量 `apiKey` 作为兜底                  |
| Generic command | 仅接受 `authEnvironment` 中列出的名称                               |

`PATH`、主目录/配置目录、临时目录变量、locale 这些平台级必需项会被转发，好让官方 CLI 能找到自己的安全凭据存储；父进程环境里的其余变量不会被无差别地复制过去。

刻意没有提供用于选择模型的环境变量：每一次真实请求都必须带上精确的 `--to provider:model`；标注来源时同样要用精确的 `--from provider:model`。模型 ID 请用提供方自己的免费发现命令查询，比如 `agent models`，不要凭猜测使用别名。

## 健康检查与提供方发现

先用这个免费的聚合就绪视图看一眼整体状态：

```sh
xerify --json health
xerify --json health --network
```

`health` 会报告 `ready`、`degraded` 或 `setup-required`，当前项目是否已初始化，以及每一个已配置/已链接的适配器和调用提供方身份。它还会给出解析后的运行历史路径与采集策略，但不会读取证据内容本身。默认情况下不会调用模型，也不会探测 API 端点；加上 `--network` 会增加有限的端点可达性检查，但依然不会发起推理请求。需要运行时/MCP 细节用 `doctor`，需要针对某个适配器单独检查用 `providers probe`。

对 `openai-compatible` 而言，只有裸的回环（loopback）端点、且不带显式密钥配置、用户信息、查询参数或片段时，才会被报告为 `local`／`not-required`。只要 URL 里带了内联信息，即便是回环地址，也会连同配置来源一起报告为鉴权 `unknown`。没有配置 `apiKeyEnvironment` 或 `apiKey` 的远程端点同样保持 `unknown`：Xerify 不会仅凭 URL 去推断某个网关是否公开、是否通过 URL 携带凭据，或采用了其他鉴权方式。把凭据放进具名的密钥环境变量，始终优于把它写进端点 URL。

## 审计日志约定

JSONL 审计日志记录时间戳、命令、退出结果、提供方/模型来源、裁定、耗时、提供方报告的用量、截断情况，以及分类后的失败类型。它刻意不记录 prompt、主张、上下文、回答、发现、提供方的原始响应、授权数据和凭据路径。POSIX 系统上新建的文件权限固定为 `0600`；符号链接或非常规文件目标会被拒绝。这些日志只是运维元数据，既不是完整记录，也不能证明某个裁定就是正确的。
