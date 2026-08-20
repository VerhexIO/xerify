[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · **简体中文** · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Dogfood：让一条主张拿到 `confirmed`，要花多大力气

> 规范的权威来源是英文文档。如果译文与已测试的约定存在冲突，以已测试的英文约定为准。

本页是一份记录，不是教程。围绕 Xerify 自身的五项发现，分别用 `xerify verify` 在两条独立通道——`codex`（`openai`）和 `cursor`——上核验，一共花了 **26 轮**。只有一项发现第一次就通过；还有一轮拿到了 `refuted`，因为那条主张本身就是错的。

下面记的是实际发生的过程，包括那些最后证明是主张作者自己错了的部分。如果你打算用 Xerify 核查自己的工作，这就是你会经历的样子。

## 记录

|   # | 主张                  | 通道   | 裁定            | 退出码 | 原因                                                 |
| --: | --------------------- | ------ | --------------- | -----: | ---------------------------------------------------- |
|   1 | source maps           | codex  | `unclear`       |     11 | 主张覆盖了全部 86 个文件，证据只提供了 1 个          |
|   2 | source maps           | cursor | `unclear`       |      6 | 不符合 schema，没有给出裁定                          |
|   3 | source maps           | codex  | `unclear`       |     11 | 数量是汇总出来的，无法核查                           |
|   4 | source maps           | codex  | `unclear`       |     11 | 根本没考虑 `sourceRoot`；86 行里只给了 9 行          |
|   5 | source maps           | cursor | `unclear`       |     11 | 同样两点质疑，独立复现                               |
|   6 | source maps           | codex  | **`refuted`**   |     10 | 主张本身就是错的：这些 map *确实*设置了 `sourceRoot` |
|   7 | source maps           | cursor | **`refuted`**   |     10 | 同样的证伪，独立复现                                 |
|   8 | source maps           | codex  | `unclear`       |     11 | 工件没有和 registry 做加密绑定                       |
|   9 | source maps           | cursor | `unclear`       |      6 | 不符合 schema                                        |
|  10 | source maps           | codex  | **`confirmed`** |      0 | —                                                    |
|  11 | source maps           | cursor | **`confirmed`** |      0 | —                                                    |
|  12 | adapter precedence    | codex  | `unclear`       |     11 | 运行记录没绑定到某个提交；命令被省略了               |
|  13 | adapter precedence    | cursor | `unclear`       |      6 | 不符合 schema                                        |
|  14 | adapter precedence    | codex  | **`confirmed`** |      0 | —                                                    |
|  15 | adapter precedence    | cursor | **`confirmed`** |      0 | —                                                    |
|  16 | npm provenance        | codex  | **`confirmed`** |      0 | —                                                    |
|  17 | npm provenance        | cursor | **`confirmed`** |      0 | —                                                    |
|  18 | relative-path trap    | codex  | `unclear`       |     11 | 这组 A/B 改动了两个变量，不是一个                    |
|  19 | relative-path trap    | codex  | **`confirmed`** |      0 | —                                                    |
|  20 | relative-path trap    | cursor | **`confirmed`** |      0 | —                                                    |
|  21 | `.claude/` ignore gap | codex  | `unclear`       |     11 | 没证明全部 152 个错误都是解析错误                    |
|  22 | `.claude/` ignore gap | codex  | `unclear`       |     11 | 复现过程是汇总的，只给了一条原始消息                 |
|  23 | `.claude/` ignore gap | codex  | `unclear`       |     11 | 复现过程没绑定到声明的那个提交                       |
|  24 | `.claude/` ignore gap | codex  | `unclear`       |     11 | 主张的两半分属不同提交                               |
|  25 | `.claude/` ignore gap | codex  | `unclear`       |     11 | 沙箱里没法验证 git 历史                              |
|  26 | `.claude/` ignore gap | cursor | **`confirmed`** |      0 | —                                                    |

**总计：`confirmed` 9 次，`refuted` 2 次，`unclear` 15 次。** 这 15 次 `unclear` 里，3 次是传输失败（退出码 `6`），另外 12 次是真正意义上的“你的证据不足以证明这一点”式判断。

五项发现里，有四项在两条通道上都拿到了 `confirmed`；另一项在一条通道上拿到了 `confirmed`，在另一条上撞到了硬性上限——参见[这条通道验证不了什么](#这条通道验证不了什么)。

## 为什么有 12 轮都被打回“你的证据不足以证明这一点”

这 12 次异议，全都落在四类问题里。这四类值得记住，因为你也会撞上同样的四类。

### 1. 主张比证据走得更远

第 1 轮。主张说全部 86 个 map 文件都不可用，证据却只给了一个。

> 现有证据只能证明：已发布的某一个 `.js.map` 文件引用了一个缺失的 `package/src`
> 文件，且未嵌入 `sourcesContent`，但无法证明这条主张对全部 86 个 map 文件都成立
> [……] 证据还区分了 43 个 `.js.map` 文件和 43 个 `.d.ts.map` 文件，而主张所陈述的属性
> 只涉及 `.js.map` 文件。

解决办法不是把主张改得更保守，而是把全部 86 个都检查一遍，把结果放进证据包里。一个连“我查了一个，其余的默认一样”都能接受的验证方，起不到任何作用。

第 1 轮里还藏着第二处夸大，又过了好几轮才被发现：主张说这些 map 文件*对所有消费者*都不可用。可只要开发者把仓库克隆到 `node_modules` 旁边，那些路径就是能解析的。证据永远支撑不了“所有消费者”这个说法，主张只能收窄到工件本身能证明的部分：源文件*无法从包内部*解析。

### 2. 证据是你写的摘要，不是工件本身

第 3、4、22、23 轮。一张你自己生成的表格，不过是把结论穿上了数据的外衣。

> 现有证据与主张本身自洽，但它是一份派生出来、不可信的摘要，而不是原始工件数据；
> 没有 map JSON 的直接摘录和完整的 tarball 文件清单，就无法排除实质性反例的存在。

真正管用的做法：直接给出 registry API 的原始响应、完整的 `tar -tzf` 清单，以及每一个 map 文件的 JSON——只省略掉 base64 编码的 `mappings` 字段本身。ESLint 那个案例则是给出全部 152 条消息的 `--format json` 输出，而不是终端输出的尾部片段。

只要你的证据里还写着“扫描发现 N/M”这种句子，你就还在这一类问题里。

### 3. 工件没有和你所说的东西绑定

第 8 轮。主张说的是“npm 实际提供的 tarball”，证据说的却是 `/tmp` 里的一个文件。

> 被分析的 tarball 只给出了 SHA-256 摘要，而 registry 元数据提供的却是
> SHA-1 和 SHA-512 完整性校验值。既没有给出匹配的 SHA-1，也没有 SHA-512 计算结果，
> 工件身份也就没能确立。

解决办法是去计算 registry 实际公布的那两种摘要，并证明它们能对上：

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

同一类问题也适用于关于源码的主张：点名具体的提交，给出 `git rev-parse HEAD` 的结果，再给出 `git status --porcelain` 的结果，让读者知道工作树是干净的。

### 4. 不止一个变量在变，或者两半根本不在同一个地方

第 18 轮。一组本该只隔离一个变量的 A/B 对比，实际上没有做到。

> “这两份配置唯一的差异是脚本路径写的是相对路径还是绝对路径”这句话，
> 字面上就是错的：它们的 provider map 键名和 provider 名称也不一样。

这话说得没错。两份配置分别用 `rel-test` 和 `abs-test` 作为 provider 身份标识。解决办法是让两份配置用同一个身份标识，并附上 `diff` 输出，让“只变了一个变量”这句话能被核查，而不只是嘴上说说。

第 24 轮是同一类问题换了身衣服。主张说的是“在提交 `1d65f17`”发生的事，可复现步骤删掉的却是 `HEAD` 上配置里的一行——而那一行是后面某个提交才加进去的。同一句话的两半，分别活在两个不同的提交里。

> [……] 这些证据不足以证明复现是从声明的 HEAD 出发、只做了展示出来的那处修改
> [……] 证据里关于受影响文件路径的说法本身也自相矛盾。

解决办法是不要再假装这是一个事实，而是老老实实说成两个事实，各自绑定各自的提交。

## 反过来证伪了作者本人的那两轮

第 6、7 轮，是这页里最有用的部分。

主张里包含一条子断言：_“86 个 map 文件里没有一个设置了 `sourceRoot`”_。生成这个数字的扫描脚本是用 Python 写的，它是这样检测这个字段的：

```python
sr = d.get('sourceRoot')
if sr:                 # 在 Python 中，"" 是假值（falsy）
    haveroot += 1
```

86 个 map 文件其实每一个都设置了 `sourceRoot`——只是设成了空字符串。扫描脚本数出来的却是零。两条通道在同一轮里各自独立地抓到了这个问题：

> **codex：** 这条主张按字面写法就是实质性错误的：每一个提供的 map JSON 都显式地把
> `"sourceRoot"` 设成了空字符串，这与“没有一个设置 `sourceRoot`”的断言相矛盾。除此之外，
> 证据支持这条主张更窄的那种解读 [……]

> **cursor：** 提供的证据里存在实质性矛盾：map 文件确实显式包含了 `"sourceRoot"` 字段
> （设成了空字符串），所以“86 个 map 文件里没有一个设置 `sourceRoot`”这条子主张，
> 按字面写法就是错的。

空的 `sourceRoot` 不会给路径加任何前缀，所以实质性的结论站得住。*但主张原本的表述*站不住。它被改成了“全部 86 个 map 文件都把 `sourceRoot` 设成了空字符串，因此不会添加任何前缀”，两轮之后拿到了 `confirmed`。

注意这个问题能被抓到，是有前提的：原始的 map JSON 就在证据包里。要是证据还停留在第 3 轮那张摘要表——写着 `maps with a sourceRoot set: 0 of 86` 的那张——两个验证方都不会有异议，一条错误的陈述就会被报告为已验证。

**把工件本身发过去，而不是你对它的解读。这就是全部机制所在。**

## 真正管用的做法

到了第四项发现，两轮就够了。改变的是这些：

1. **把主张收窄到证据真正能证明的范围。** 不检查全部，就不要用“每一个”“总是”“全部”这类词；没有隔离变量，就不要建立因果关系。
2. **把原始输出放进证据包。** 命令回显、API 响应、完整的文件清单，JSON 只省略掉无关的二进制字段。你自己做的表格，该放进主张里，而不是证据里。
3. **把工件绑定住。** 用和 registry 公布的摘要能对上的哈希值，或者一个提交哈希加上一份干净的 `git status`。
4. **每次对比只变一个变量，** 并附上 `diff` 输出，让读者自己也能核查。
5. **拆开复合主张。** 如果两半说的是两种不同的状态，那就是两条主张，不是一条。
6. **附上确切的命令本身，** 而不是对你运行了什么的描述。

第一次尝试就拿到 `confirmed`，通常说明这条主张提得太弱，没什么提出的必要。做好反复迭代的准备。

## 一份通过了的证据包

这是第 10、11 轮背后那份证据包的样子：

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

它承载的主张是：

> 在 npm registry 提供的 `xverify-cli@0.1.0` tarball 里，没有一个 `.map` 文件能从包内部
> 解析出它声明的源文件：全部 86 个 map 文件都把 `sourceRoot` 设成了空字符串，因此不会添加任何前缀；
> 没有一个嵌入了 `sourcesContent`；每一个声明的源文件都解析到 `src/` 目录下的某个路径；
> 而这个 tarball 里根本不存在任何 `src/` 条目。

注意这个写法：主张陈述了四个可核查的事实，外加一个从这些事实机械推出的结论。整条主张里，没有任何一处需要验证方相信作者的判断。

## 这条通道验证不了什么

第 25 轮撞到了一堵墙，而这堵墙是设计使然，不是缺陷。

> [……] 历史上的仓库状态无法被独立核实，因为当前可用的工作区本身并不是一个 Git 仓库，
> 也不包含任何被引用的文件或提交对象。

验证方在 stdin 上收到的，是一份有边界的证据。它没法运行 `git log`，没法打开你的仓库，也没法重新执行你的命令。所以，一条主张如果其真假取决于验证方够不着的东西——git 历史、私有 registry、你 CI 的状态——那么一份文字记录只能*支持*它，永远没法*证实*它。Codex 说这份记录和主张内部自洽，但仍然返回了 `unclear`，这才是正确答案。

Cursor 面对同样的证据，给出的却是 `confirmed`。这种分歧本身就很说明问题：两条通道对“一段贴上来的文字记录到底值多少”划出了不同的界线。这不代表哪一条通道出了故障。

提前把这一点规划进去。关于**能放进证据包里的工件**的主张，验证效果好；关于**历史、基础设施或流程**的主张，验证效果差——这种情况下，该找的是一份签名记录或者一份读者能独立核查的 CI 日志。

## 通道可靠性，实测数据

这 26 轮下来：

| 通道                | 轮数 | 给出了裁定 | 退出码 `6` 的 schema 失败 |
| ------------------- | ---: | ---------: | ------------------------: |
| `codex`（`openai`） |   16 |         16 |                         0 |
| `cursor`            |   10 |          7 |                         3 |

`cursor` 适配器在提供方一侧不做 schema 强制校验——它在[内置矩阵](../provider-adapters.md)里对应那一行写的是“prompt 约定；核心校验”——所以只要模型不遵守输出指令，就会产生退出码 `6`，而且给不出裁定。`cursor` 或 `command` 适配器返回的退出码 `6`，应当当作可重试来处理，但要给重试设上限。

不要为了把 `refuted` 拗成 `confirmed` 而不断重试。那是在“挑裁定”，会把第二意见变成一种昂贵的自我认同方式。

## 花费如何

5 项发现，一共花了 26 轮计费调用。轮次分布很不均衡，值得提前规划：

- 第 1 项发现，从零摸索规则：**11 轮**
- 第 5 项发现，撞上了通道本身的上限：**6 轮**
- 第 2 项发现：4 轮 · 第 4 项发现：3 轮 · 第 3 项发现，已经套用了上面的做法：**2 轮**

你验证的第一项发现，会是最贵的那个。把反复迭代的成本预算进去；先用[模拟提供方](no-account-walkthrough.md)把证据包和退出码的处理调对，再去花配额换模型的判断。

## 相关内容

- [失败模式](failure-modes.md) — 每一种类型化失败，及其产生原因
- [零账号演练](no-account-walkthrough.md) — 零配额下的每一种结果
- [验证实例演练](README.md) — 各个领域的实际场景
- [提供方适配器](../provider-adapters.md) — 哪些适配器强制执行输出模式
