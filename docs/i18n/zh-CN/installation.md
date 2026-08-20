[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · **简体中文** · [Español](../es/README.md) · [Français](../fr/README.md)

# 安装与升级

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

Xerify 需要 Node.js 20 或更高版本，官方发布运行时以 Node.js 24 为主。公开的 npm 包名为 `xverify-cli`；产品名称与安装后的 CLI 命令始终是 `xerify`。

## 选择安装方式

当 Xerify 作为跨项目共用的工作站工具时，选择全局安装：

```sh
npm install --global xverify-cli@latest
xerify --version
xerify init
```

当需要把 Xerify 锁定在某个仓库中时，将其安装为项目开发依赖：

```sh
npm install --save-dev xverify-cli@latest
npx xerify --version
```

只想快速检查一下能力、又不打算保留依赖时：

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

务必带上 `@`，写成 `xverify-cli@latest`。少了它，`npm install xverify-cli latest` 会被 npm 理解成要安装两个包名，效果完全不同。

自动化流程要求可复现结果时，把 `latest` 换成具体版本号：

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
```

## 项目初始化

直接把 Xerify 装成项目本地依赖时，会触发一个带保护机制的初始化流程：只在所在项目根目录创建 `.xerify/`，绝不覆盖已有配置，也不会调用任何提供方，并自动为 Git、npm、Docker 加上忽略规则。全局安装、传递依赖、`--no-save` 安装以及 `npx` 方式都不会初始化当前目录，这些情况下需要手动执行：

```sh
xerify init
```

不想让安装生命周期自动触发初始化，就在安装前设置 `XERIFY_SKIP_AUTO_INIT=1`。npm 并不能在首次安装时百分之百区分直接依赖和被提升的传递依赖，因此把 Xerify 内嵌进库里的作者，应该设置这个变量，改由自己的显式流程完成初始化。

不发起任何模型调用，也能验证配置是否生效：

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers probe --all --timeout 5000
```

`providers probe` 默认只检查本地可执行文件与鉴权是否就绪；只有确实需要做有限的端点可达性检查时，才加上 `--network`。

## 升级与卸载

升级时沿用当初的安装方式：

```sh
npm update --global xverify-cli
# 或者，在锁定版本的项目里
npm install --save-dev xverify-cli@latest
```

卸载 npm 包不会删除项目的运行历史或配置。确认运行历史、归档、配置和审计元数据都不再需要之后，再单独检查并删除 `.xerify/`。

## MCP 安装

本地 STDIO MCP 用的是同一个包，不需要另外下载服务端：

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

宿主配置要经得起供应链审查，就把包版本钉死。MCP Registry 里的条目只是解析到这个 npm 包的发现元数据，并不会另外托管一份 Xerify 服务，也不会在远程复用本地的提供方凭据。STDIO 和 HTTP 的具体设置见 [MCP](mcp.md)。

## 包内容

npm 制品包含编译后的运行时/库产物、公开模式、面向消费者的文档、配套的 agent skill、带保护机制的初始化器，以及许可证与安全声明。它有意排除了源码测试、发布工具链、本地 `.xerify/` 状态、内部 agent/编排文件、设计工作区、生成的发布产物，以及品牌评审材料。

Xerify 由 Verhex 开发和维护，以 MIT 许可证发布。它是 Deckent（Verhex 的智能体操作系统）的跨提供方验证层，以独立工具的形式发布；安装 Xerify 既不需要、也不会安装 Deckent。规范的源码仓库与问题跟踪器均可从包元数据中的链接找到。
