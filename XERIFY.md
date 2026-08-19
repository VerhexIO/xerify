# Xerify — Canonical Product Handoff

> Tarih: 2026-08-18
>
> Durum: `0.1.0` pre-release candidate; Cursor/OpenAI adversarial bidirectional dogfood green,
> history safety findings fixed, brand çalışması outsource, npm owner auth green/publish pending
>
> Authority: Bu dosya yeni Xerify session'ına taşınacak tek başlangıç kaynağıdır. Deckent
> `DIRECTIVES.md`, sprint state'i, `.tasks/` veya XVerify implementation'ı Xerify authority'si
> değildir.

## 1. Ürün kararı

Xerify; bir provider/model tarafından üretilen iş, iddia veya cevabın gerektiğinde farklı bir
provider/model tarafından shell üzerinden sorgulanmasını ve hafifçe doğrulanmasını sağlayan,
bağımsız ve açık kaynak bir developer tool'dur.

Ürün küçük bir yüzeye sahip olacak fakat incomplete veya demo olmayacaktır. Basitlik;
orchestration katmanlarını taşımamak, tek-hop verification yapmak ve platform davranışını dürüstçe
standardize etmek demektir.

Temel cümle:

> Ask another provider. Get a clear second opinion.

Xerify, Deckent'ten önce ekosisteme kazandırılacak bağımsız bir ön-reklam ürünü ve Deckent'in daha
sonra kullanabileceği hafif bir verification primitive'idir.

## 2. Kesin ürün sınırı

Xerify şunları yapar:

- `provider:model` → farklı `provider:model` arasında tek-hop soru/doğrulama.
- Installed provider CLI/subscription oturumlarını user-owned local machine üzerinde kullanma.
- API key ile doğrudan provider çağrısı yapabilme.
- Shell pipeline/stdin içeriğini context olarak doğrulayıcıya iletme.
- Human-readable terminal sonucu ve stable JSON output üretme.
- `confirmed | refuted | unclear` şeklinde küçük, typed sonuç kontratı.
- CLI core'unu local STDIO ve remote Streamable HTTP MCP üzerinden sunabilme.
- Linux, macOS, Windows native ve WSL üzerinde aynı semantics.

Xerify şunları yapmaz:

- Goal/Mission/Flow/Run/Sprint orchestration.
- Brain, worker pool, task DAG, autonomous routing veya promotion learning.
- `.tasks/`, `.brain/`, Markdown state machine veya Markdown tabanlı execution authority.
- Dashboard, project manager veya full agent operating system.
- Recursive verifier zinciri, majority-vote swarm veya background fleet.
- Provider output'undan shell command çalıştırma.
- Formal verification, bug-free guarantee veya mathematical proof iddiası.
- Kullanıcı subscription credentials/token'larını merkezi servise yükleme.

## 3. Shell-first UX

Canonical CLI adı `xerify` olacaktır. CLI contract MCP'den bağımsız ve stable kalır.

Doğrudan soru:

```sh
xerify ask --from provider-x:model-x1 --to provider-y:model-y1 \
  "Bu yaklaşımda gözden kaçan kritik hata var mı?"
```

Shell çıktısını doğrulatma:

```sh
npm test 2>&1 | xerify ask \
  --from provider-x:model-x1 \
  --to provider-y:model-y1 \
  --question "Test sonucu bu değişikliğin doğru çalıştığını gösteriyor mu?"
```

Git diff doğrulama:

```sh
git diff --cached | xerify verify \
  --from provider-x:model-x1 \
  --to provider-y:model-y1 \
  --claim "Bu diff concurrency bug'ını eksiksiz kapatıyor."
```

Machine-readable kullanım:

```sh
git diff --cached | xerify verify \
  --from provider-x:model-x1 \
  --to provider-y:model-y1 \
  --claim "Değişiklik güvenli." \
  --json
```

Stable JSON result:

```json
{
  "schemaVersion": 1,
  "id": "xrf_...",
  "from": { "provider": "provider-x", "model": "model-x1", "provenance": "declared" },
  "to": { "provider": "provider-y", "model": "model-y1", "provenance": "declared" },
  "verdict": "confirmed",
  "summary": "...",
  "findings": [],
  "evidence": [],
  "assumptions": [],
  "limitations": [],
  "unverifiedClaims": [],
  "usage": null,
  "durationMs": 0,
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Kurallar:

- `from.provider === to.provider` ise verification başlamadan typed error.
- `from` kimliği host tarafından kanıtlanamıyorsa `provenance: declared` olarak raporlanır; tahmin
  yapılmaz.
- Timeout, invalid structured output veya provider failure sonucu `unclear`; asla fake
  `confirmed` değil.
- Verification input/output truncation sonucu fail-closed `unclear`; truncated evidence ile
  `confirmed` üretilmez.
- STDOUT yalnız requested result içindir; progress ve loglar STDERR'e gider.
- Shell interpolation kullanılmaz. Provider command'ları executable + argv array olarak spawn
  edilir; default `shell: false`.
- Context varsayılan olarak STDIN'den gelir. Provider cevabı executable input'a dönüşmez.

## 4. Hafif runtime mimarisi

```text
Shell / Codex / Claude Code / Cursor / VS Code
                     │
              CLI veya MCP tool
                     │
              Xerify Core Library
              ├── request validator
              ├── provider separation
              ├── provider adapter registry
              ├── timeout/cancellation
              ├── structured result parser
              └── optional JSONL audit writer
                     │
          ┌──────────┴──────────┐
          │                     │
 local subscription CLI    direct provider API
          │                     │
          └──────── verifier result ────────┘
```

Tek canonical core bulunur. CLI ve MCP aynı function'ı çağırır; business logic surface'lerde
yeniden yazılmaz.

Default olarak daemon, database veya persistent task queue yoktur. Her invocation bounded ve
terminaldir. İstenirse `--log <path>` ile append-only JSONL audit kaydı açılır; default kapalıdır.

## 5. Provider adapter contract

Her adapter şu küçük contract'ı uygular:

```ts
interface ProviderAdapter {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  probe(input: ProbeInput): Promise<ProbeResult>;
  invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult>;
}
```

Adapter sınıfları:

1. Official CLI adapter: local subscription veya CLI-managed API auth.
2. Aggregator/provider CLI adapter: invocation service identity'si adapter tarafından pinlenir;
   exact model ID request'te taşınır.
3. Direct API adapter: environment/vault üzerinden API key.
4. Generic command adapter: kullanıcı tarafından tanımlanan executable + argv + structured output.
5. Local model adapter: Ollama/OpenAI-compatible local endpoint.

Credentials:

- Xerify subscription token/cookie okumaz veya export etmez; official CLI kendi auth'unu yönetir.
- API secrets config dosyasına plaintext yazılmaz; named environment variables kullanılır.
- Managed remote subscription relay yoktur. Subscription execution user-owned local executor'da
  kalır.

## 6. MCP 2.0 kararı

Doğru teknik isimlendirme:

- `@modelcontextprotocol/server` TypeScript SDK v2 stable line.
- Target protocol revision: `2026-07-28` modern era.
- Legacy compatibility: `2024-10-07`–`2025-11-25` era clients.

Xerify MCP server, SDK v2 ile yazılır. Modern revision desteklenir fakat modern-only pin yapılmaz;
SDK'nin version negotiation/legacy serving desteği açık tutulur. Böylece güncel ve geriden gelen
Codex, Claude Code, Cursor ve VS Code host'ları aynı binary'ye bağlanabilir.

İlk MCP transport:

- Local STDIO: ücretsiz, hosting gerektirmez, subscription/local evidence için canonical.

Aynı server factory daha sonra şu transportu da sunabilir:

- Streamable HTTP: remote/API use case, OAuth/bearer auth ve multi-user deployment.

MCP tool set küçük kalır:

```text
xerify_ask
xerify_verify
xerify_capabilities
```

Her tool stable structured output schema taşır. MCP tool input ve CLI option'ları aynı shared schema
tarafından üretilir; surface drift kabul edilmez.

MCP runtime kuralları:

- STDOUT yalnız JSON-RPC protocol channel'dır; loglar STDERR'e gider.
- Server connection başına clean state kullanır.
- Timeout ve cancellation `AbortSignal` üzerinden gerçek provider process'ine ulaşır.
- Tool annotations side-effect gerçeğini doğru taşır.
- Host modern MCP Tasks destekliyorsa kullanılabilir; core correctness buna bağımlı olmaz.
- Legacy/modern conformance ayrı fixture'larla doğrulanır.

## 7. Every-environment matrix

Support promise baştan şu matrisi kapsar:

| Dimension | Required support                                    |
| --------- | --------------------------------------------------- |
| OS        | Linux, macOS, Windows native, WSL                   |
| CPU       | x64, arm64 where runtime/provider CLI exists        |
| Shell     | bash, zsh, fish entry; PowerShell and cmd entry     |
| Host      | Codex, Claude Code, Cursor, VS Code, plain terminal |
| Transport | local STDIO; Streamable HTTP                        |
| Auth      | local subscription CLI, API key, local endpoint     |
| Output    | interactive text, JSON, piped stdin/stdout          |

Platform design rules:

- Core path handling Node platform API'leriyle yapılır; `/proc`, POSIX-only signal veya shell syntax
  core'a sızmaz.
- Process spawn executable/argv tabanlıdır. Windows `.cmd`/`.exe` resolution platform adapter'da
  çözülür.
- Graceful abort + force termination her platformda adapter üzerinden uygulanır.
- Unsupported provider CLI/OS combination typed `unsupported`; silent fallback yoktur.
- Temp files OS temp directory altında, restrictive permissions ve guaranteed cleanup ile
  yönetilir.
- UTF-8, CRLF/LF, path-with-spaces ve non-ASCII path test matrix'ine dahildir.

## 8. Verification semantics

Verifier'dan istenen küçük response:

```json
{
  "verdict": "confirmed | refuted | unclear",
  "summary": "short explanation",
  "findings": [
    {
      "severity": "critical | high | medium | low | info",
      "message": "finding",
      "evidence": "optional bounded citation"
    }
  ],
  "evidence": [
    { "reference": "supplied file/location/range", "observation": "bounded observation" }
  ],
  "assumptions": [],
  "limitations": [],
  "unverifiedClaims": []
}
```

Xerify response'u exact schema ile doğrular. Karmaşık host adjudication, settlement veya immutable
evidence ledger taşımaz. Güvenilirliğin küçük çekirdeği şunlardır:

- claim'i doğrulamaya çalışmadan önce adversarial biçimde falsify etme,
- claim/context'i talimat değil untrusted evidence olarak sınırlama,
- farklı provider zorunluluğu,
- bounded input/output,
- strict schema,
- honest `unclear`,
- timeout/cancellation,
- secret-safe process execution,
- stable machine output.

`confirmed`, sağlanan evidence altında material counterexample bulunamadığını ifade eder; formal proof
değildir. Evidence reference'ları verifier'ın supplied context'e işaretleridir, bağımsız doğrulanmış
citation değildir. Prompt-injection sınırı riski azaltır fakat LLM düzeyinde mutlak garanti vermez.

## 9. Logo direction

Wordmark: `Xerify`.

`X` glyph'i iki görsel parçaya ayrılır:

1. Üst parça, X'in merkezde birleşen ve `V` gibi okunan iki üst koludur. Bu V-benzeri parça
   `erify` wordmark'ının hemen solunda/yanında yer alır.
2. Alt parça, standard check `✓` işaretinin yatay aynası olan detached mirrored-check formudur.
   V-benzeri üst parçanın altında konumlanır ve iki parça birlikte uzaktan tekrar `X` olarak okunur.

Anlam katmanları:

- `X`: cross-provider / another model.
- `V`: verify.
- Mirrored check: second opinion / reverse check.
- `erify`: okunabilir ürün adı.

Logo üretim kuralları:

- İlk master asset exact SVG/vector olarak çizilir; raster AI logo kullanılmaz.
- Primary wordmark horizontal; icon-only composite X ayrıca üretilir.
- 16px favicon'da X/check ayrımı kaybolmamalı.
- Primary tasarım monochrome çalışmalıdır; renk paleti owner seçimi yapılana kadar `OPEN`.
- Gradient, shadow, 3D veya decorative effect yoktur.
- Light/dark, monochrome ve icon-only variant zorunludur.
- SVG path'leri pixel-grid ve optical alignment ile elle doğrulanır.

Logo acceptance:

- İlk bakışta `Xerify` okunmalı.
- Alt mirrored-check tek başına rastgele çizgi gibi görünmemeli.
- V-benzeri üst parça `Verify` kelimesi sanılacak kadar ayrışmamalı; composite X korunmalı.
- Küçük boyutta ve tek renkte anlamını korumalı.

## 10. Brand/name status

`Xerify` working name olarak kabul edilmiştir. 2026-08-18 preliminary web/package aramasında exact
aynı developer verification ürünü veya exact npm package collision kanıtı bulunmadı. Bu sonuç legal
availability veya domain availability kanıtı değildir.

Public launch öncesi zorunlu:

- trademark clearance,
- domain/DNS ownership check,
- npm, GitHub org/repo ve social handle reservation,
- confusingly-similar names için legal review.

## 11. Open-source ve repository

- Ayrı standalone GitHub repository.
- License working decision: MIT; final repository bootstrap sırasında owner confirmation.
- Public language: English. Turkish maintainer/operator notes ayrı olabilir.
- Deckent source tree import edilmez; gerekli fikirler clean, small contract olarak yeniden kurulur.
- Deckent daha sonra public Xerify package/binary'sini normal consumer olarak kullanabilir.

Bu handoff dosyası yeni boş repository'ye kopyalanacak. Bu Deckent alt klasörü kalıcı product source
değildir.

## 12. Yeni session için execution order

1. Empty standalone repository oluştur ve bu dosyayı root'a taşı.
2. Exact name/domain/package/trademark clearance sonucunu kaydet.
3. Runtime/language decision'ı doğrula; TypeScript + Node LTS working direction.
4. CLI ve shared request/result schema'yı önce contract testleriyle sabitle.
5. Generic command adapter + official Codex/Claude CLI adapter'larını platform-safe spawn ile bağla.
6. API adapter contract'ını bağla; secrets yalnız environment/credential store.
7. MCP SDK v2 server factory, STDIO transport ve legacy/modern negotiation'ı ekle.
8. Codex, Claude Code, Cursor, VS Code ve plain terminal real-binary smoke matrix'ini çalıştır.
9. Exact SVG logo + light/dark/icon assets üret ve küçük-boyut visual QA yap.
10. README, SECURITY, CONTRIBUTING, release signing ve package provenance ile public launch gate'ini
    kapat.

## 13. Open decisions

Yalnız gerçekten owner kararı gerektiren maddeler:

- Final primary/accent color palette.
- Exact public repository owner/org.
- Package distribution: `xerify`, scoped npm package veya standalone binary kombinasyonu.
- Remote Streamable HTTP server'ın community/free hosting modeli.
- İlk public provider adapter listesi ve supported exact model matrix'i.

## 14. Language ve runtime kararı

### Seçim

Xerify implementation dili **TypeScript**, runtime'ı **Node.js ESM** olacaktır.

- Public runtime floor: Node.js `>=20`.
- Development ve primary CI lane: Node.js 24.
- Package format: ESM-first.
- TypeScript output: Node-compatible JavaScript + `.d.ts` declarations.
- MCP dependency: `@modelcontextprotocol/server@^2.0.0`.
- Runtime validation: Zod v4 veya MCP SDK v2'nin desteklediği bir Standard Schema implementation.

### Ölçülmüş gerekçe

2026-08-18 host toolchain kontrolü:

- Node.js `v24.15.0` mevcut.
- npm `11.12.1` mevcut.
- Python 3 ve `uv` mevcut.
- Rust `cargo/rustc` kurulu değil.

TypeScript seçiminin ürün gerekçesi yalnız kurulu toolchain değildir:

1. Resmî MCP SDK v2 TypeScript package split'i server/client/core contract'larını doğrudan verir.
2. Codex, Claude Code ve Cursor MCP örnekleri Node/STDIO package dağıtımıyla doğal çalışır.
3. Provider CLI process management, JSON/JSONL parsing ve HTTP API adapter'ları aynı runtime'da
   küçük kalır.
4. npm global install, `npx` ve project-local install aynı artifact'i kullanabilir.
5. Shared Zod schemas CLI, MCP ve SDK surface'leri arasında gerçekten tek kaynak olabilir.

### Neden Rust değil?

Rust tek binary, hızlı startup ve güçlü process control sağlar; fakat bu ürünün ayırt edici ihtiyacı
MCP SDK v2 uyumu ve hızlı provider adapter gelişimidir. Hostta toolchain de kurulu değildir. Rust,
bu aşamada resmî TypeScript SDK semantics'ini yeniden üretme veya FFI/sidecar ihtiyacı doğurur.
Standalone native binary gelecekte ölçülmüş startup/distribution sorunu çıkarsa ayrı bir packaging
kararı olarak değerlendirilebilir; core contract bugün Rust'a bölünmez.

### Neden Python değil?

Python subprocess ve HTTP için yeterlidir; ancak installed global CLI, ESM MCP ecosystem'i, exact
schema sharing ve package-level TypeScript SDK consumer deneyimi için ek venv/packaging friction
getirir. Xerify'ın primary ecosystem'i coding-agent hosts olduğu için Python seçilmez.

## 15. Repository ve package mimarisi

Tek repository ve tek publishable package ile başlanır; iç sınırlar baştan modülerdir. Gereksiz
monorepo veya package explosion yoktur.

```text
xerify/
├── XERIFY.md                  # product/development authority
├── README.md                  # public English entry
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
│   ├── cli/
│   │   ├── entry.ts
│   │   ├── commands/
│   │   │   ├── ask.ts
│   │   │   ├── verify.ts
│   │   │   ├── doctor.ts
│   │   │   ├── providers.ts
│   │   │   ├── config.ts
│   │   │   └── mcp.ts
│   │   └── output.ts
│   ├── core/
│   │   ├── contracts.ts
│   │   ├── execute.ts
│   │   ├── verdict.ts
│   │   ├── errors.ts
│   │   └── limits.ts
│   ├── providers/
│   │   ├── contract.ts
│   │   ├── registry.ts
│   │   ├── command.ts
│   │   ├── codex.ts
│   │   ├── claude.ts
│   │   ├── openai-api.ts
│   │   ├── anthropic-api.ts
│   │   └── openai-compatible.ts
│   ├── process/
│   │   ├── spawn.ts
│   │   ├── terminate.ts
│   │   └── executable-resolution.ts
│   ├── platform/
│   │   ├── contract.ts
│   │   ├── posix.ts
│   │   └── windows.ts
│   ├── config/
│   │   ├── schema.ts
│   │   ├── resolve.ts
│   │   └── paths.ts
│   ├── mcp/
│   │   ├── server.ts
│   │   ├── tools.ts
│   │   ├── stdio.ts
│   │   └── http.ts
│   └── index.ts                # library API
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   │   └── fake-provider/
│   └── platform/
├── assets/
│   └── logos/
│       ├── source/
│       ├── full-horizontal/
│       ├── icon-only/
│       └── monochrome/
├── docs/
│   ├── architecture.md
│   ├── provider-adapters.md
│   ├── mcp.md
│   ├── json-contract.md
│   └── brand.md
└── scripts/
    ├── verify-install.mjs
    └── export-logo.mjs
```

Dependency direction:

```text
cli ─┐
mcp ─┼──> core ───> provider contract ───> provider adapters
sdk ─┘                 │
                      └──> process/platform adapters
```

Yasak bağımlılıklar:

- `core` → CLI veya MCP import edemez.
- Provider adapter → CLI renderer import edemez.
- MCP handler içinde business logic yeniden yazılamaz.
- Platform-specific branch'ler core verification semantics içine dağıtılamaz.
- Test fixture'ı production implementation yerine geçemez.

## 16. Public CLI command contract

Top-level help bütün product surface'i göstermelidir:

```text
xerify ask
xerify verify
xerify health
xerify doctor
xerify init
xerify providers list
xerify providers probe
xerify config show
xerify config validate
xerify mcp stdio
xerify mcp http
xerify request
```

### `xerify ask`

Bir provider/model'e doğrudan second-opinion sorusu gönderir. Verification verdict zorunlu değildir;
cevap ve usage döner.

```sh
xerify ask --to anthropic:MODEL_ID "Question"
printf '%s' "context" | xerify ask --to openai:MODEL_ID --question "Question"
```

### `xerify verify`

Claim + optional stdin context'i farklı provider'a gönderir ve strict typed verdict ister.

```sh
git diff --cached | xerify verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "The change closes the race without regression"
```

`--from` provenance confidence:

- `observed`: provider adapter/host metadata ile kanıtlandı.
- `declared`: caller verdi; doğrulanamadı.
- `unknown`: exact identity yok; enforced different-provider verification yapılamaz.

Public CLI/MCP request şeması caller'ın `observed` self-attestation yapmasına izin vermez. Mevcut public
yüzey `declared` veya `unknown` kabul eder; `unknown` çağrı öncesi reddedilir. `observed`, yalnız gelecekte
host/adapter metadata'sından güvenilir biçimde üretilebilecek result/internal capability olarak korunur.

### `xerify doctor`

Auth gerektirmeden mümkün olan bütün setup truth'unu döndürür:

```sh
xerify --json doctor
```

Kontroller:

- Xerify/Node/OS/architecture versions.
- Config paths ve parse durumu.
- Kurulu provider executables.
- Her adapter için auth source category; secret değer yok.
- MCP SDK/server version.
- STDIO safety ve temp directory.
- API endpoint reachability yalnız explicit `--network` ile.

### `xerify health`

Model çağrısı yapmadan aggregate project readiness döndürür:

```sh
xerify --json health
```

Status `ready`, `degraded` veya `setup-required` olur. Project init/config discovery, configured ve
linked adapter sayısı, invocation-provider identity listesi ve probe sonuçları tek stable envelope
içinde yer alır. `--network` yalnız bounded endpoint reachability ekler; inference çağrısı yapmaz.

### Provider discovery

```sh
xerify --json providers list
xerify --json providers probe --provider codex
xerify --json providers probe --all --timeout 5000
```

`list` configured capabilities'i, `probe` canlı executable/auth/reachability truth'unu döndürür.
Probe provider çağrısı yapmaz ve ücret tüketmez; bunu yapamayan adapter dürüstçe bildirir.

### Config commands

```sh
xerify config show
xerify --json config validate
```

Resolved config secret-redacted gösterilir. Source (`flag`, `env`, `project`, `user`, `default`) her
alan için izlenebilir olmalıdır. Literal key yalnız `[REDACTED]` olarak görünür.

### MCP commands

```sh
xerify mcp stdio
xerify mcp http --host 127.0.0.1 --port 8787
```

HTTP default olarak loopback dışına bind etmez. Public bind auth olmadan reddedilir.

### Raw escape hatch

```sh
xerify request --to provider:model --input request.json
```

Bu komut configured adapter'ın exact request/response envelope'unu test eder; arbitrary shell veya
arbitrary unauthenticated HTTP proxy değildir. Provider output yine bounds, redaction ve JSON error
contract'ından geçer.

Raw envelope `operation: "verify"` seçse bile bu komut `xerify verify` değildir: author provenance,
different-provider admission, verdict parsing veya `0/10/11` verification exit semantics sağlamaz.

## 17. Stable JSON ve exit-code policy

Global `--json`, subcommand'den önce veya sonra kabul edilir. JSON mode'da STDOUT tek JSON object
veya açıkça belgelenmiş JSONL stream'dir; terminal decoration yoktur.

Success envelope:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "command": "verify",
  "data": {}
}
```

Error envelope:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

Secrets, raw auth headers, token fragments veya credential paths error'a yazılmaz.

Exit codes:

| Code | Meaning                                                 |
| ---: | ------------------------------------------------------- |
|    0 | command succeeded; `ask` answered or `verify=confirmed` |
|    2 | invalid CLI input/config                                |
|    3 | provider/auth unavailable                               |
|    4 | timeout/cancelled                                       |
|    5 | transport/process/API failure                           |
|    6 | invalid provider response/schema                        |
|   10 | verification `refuted`                                  |
|   11 | verification `unclear`                                  |

Empty discovery sonucu success'tir ve exit `0` döner. `refuted` ve `unclear`, CI/shell composition
için success sayılmaz; JSON payload yine tam sonuç taşır.

Schema compatibility:

- Mevcut field kaldırmak/yeniden anlamlandırmak breaking change'dir.
- Yeni optional field additive olabilir.
- Her public envelope `schemaVersion` taşır.
- Golden JSON fixtures backward-compatibility testidir.

## 18. Config ve auth resolution

Config Markdown değildir. Canonical format strict JSON'dur ve TypeScript schema ile exact validate
edilir. Owner kararıyla project state root'u `.xerify/`, canonical project config dosyası
`.xerify/xverify-config.json`'dır.

Precedence, yüksekten düşüğe:

1. Explicit CLI flag.
2. Standard provider environment variable.
3. Project config: `<project>/.xerify/xverify-config.json`.
4. User config: platform-native config directory.
5. Adapter default.

Platform-native user config:

- Linux: `$XDG_CONFIG_HOME/xerify/xverify-config.json`, fallback
  `~/.config/xerify/xverify-config.json`.
- macOS: `~/Library/Application Support/Xerify/xverify-config.json`.
- Windows: `%APPDATA%\Xerify\xverify-config.json`.

Config örneği:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "codex": {
      "kind": "codex",
      "executable": "codex"
    },
    "claude": {
      "kind": "claude",
      "executable": "claude"
    },
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
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

Config model seçmez. Her live request exact `provider:model` taşır; Xerify model ID tahmin etmez.
Direct HTTP adapter config'i basic local kullanım için optional literal `apiKey` kabul eder; named
environment variable varsa her zaman önceliklidir. Diğer arbitrary `token`/`secret` alanları ve CLI
adapter credential değerleri reddedilir. Literal key config'i POSIX'te mode `0600` değilse fail-closed
reddedilir; Windows owner-only ACL operatör sorumluluğudur. `config show/validate`, `health`, `doctor`,
error ve audit yüzeyleri değeri asla basmaz.

Direct local npm install guarded `postinstall` ile existing dosyayı overwrite etmeden `.xerify/`,
config, logs directory ve config/logları dışlayan `.gitignore` üretir. Global, nested-transitive,
no-save ve `npx` install current project'e yazmaz; npm first-install hoisting directness ambiguity
documented residual'dır ve `XERIFY_SKIP_AUTO_INIT=1` opt-out sunulur. `xerify init`
explicit/idempotent fallback'tir.

`xerify.dev` domain'i sahiplik doğrulanana kadar örnek schema URL'si publish edilmez; repository-local
schema kullanılır.

Auth kuralları:

- Standard environment variables tercih edilir.
- Subscription adapter official CLI auth store'unu yalnız CLI üzerinden kullanır.
- Credential dosyası parse edilmez, kopyalanmaz veya loglanmaz.
- CLI raw API key flag kabul etmez; direct adapter env-first, literal-config-fallback uygular.
- `health` ve `doctor` yalnız `present/missing` ve source category (`env`/`config`) gösterir.

## 19. Process, safety ve resource contract

Shell-first, shell-string-first demek değildir.

Provider invocation:

```ts
spawn(executable, argv, {
  shell: false,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
```

Zorunlu davranış:

- Prompt/context STDIN üzerinden iletilir; argv içine büyük veya secret content konmaz.
- STDOUT/STDERR ayrı bounded buffer veya stream olarak okunur.
- Timeout bütün lifecycle'ı kapsar: spawn, auth wait, provider call, parse.
- Cancellation önce graceful signal, sonra bounded grace, sonra platform adapter force termination.
- Child ve descendant cleanup macOS/Linux process group ve Windows Job Object/`taskkill` adapter'ıyla
  gerçeklenir; unsupported durumda typed failure.
- Environment allowlist/redaction uygulanır; bütün parent environment blind forward edilmez.
- `PATH`, provider-required auth vars ve explicit allowlist dışı secrets child'a taşınmaz.
- Temp artifact atomic create, restrictive permission, finally cleanup kullanır.
- Provider çıktısı hiçbir koşulda shell'e pipe edilip execute edilmez.
- Codex, Claude ve Cursor model çağrıları user repository'sinden değil fresh restrictive temp
  workspace'ten çalışır. Claude safe mode/no-tools, Cursor ask/read-only+sandbox kullanır. Cursor
  CLI'nin account-level MCP'leri kategorik kapatan bayrağı olmadığı açık residual boundary'dir.

Input/output limits config'ten resolve edilir ve result'a gerçek truncation metadata'sı yazılır.
Sessiz truncation yoktur.

## 20. Provider adapter SPI

```ts
type AuthKind = "subscription" | "api-key" | "local" | "unknown";

interface ProviderCapabilities {
  provider: string;
  transports: readonly ("command" | "http")[];
  authKinds: readonly AuthKind[];
  structuredOutput: boolean;
  reportsUsage: boolean;
  supportsAbort: boolean;
}

interface ProviderAdapter {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  probe(input: ProbeInput): Promise<ProbeResult>;
  invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult>;
}
```

Adapter sonucu provider-neutral envelope'a normalize edilir fakat raw provider response optional,
bounded debug evidence olarak tutulabilir. Raw response default human output'a basılmaz.

Built-in adapter admission standardı:

- Resmî CLI/API documentation link'i.
- Exact executable/endpoint ve auth source.
- Structured-output strategy.
- Usage field mapping; provider raporlamıyorsa `null`, estimate uydurulmaz.
- Timeout/abort behavior.
- Linux/macOS/Windows/WSL proof matrix.
- Hermetic fake-provider tests ve en az bir live opt-in smoke.

Provider identity invocation ve billing/control service bazındadır. Codex CLI/OpenAI API `openai`,
Claude CLI/Anthropic API `anthropic`, Cursor Agent ise seçilen upstream modelden bağımsız olarak
`cursor` kimliği taşır. Aynı exact model doğrudan OpenAI'dan çağrıldığında `openai:gpt-x`, Cursor
üzerinden çağrıldığında `cursor:gpt-x` olur. Generic command ve compatible gateway label'ları
owner-controlled declared identity'dir.

Bu karar channel/control-plane diversity ölçer; model-vendor veya lineage bağımsızlığı garanti
etmez. `openai:gpt-x → cursor:gpt-x` farklı invocation provider olarak admitted olabilir fakat aynı
upstream modelin blind spot'larını paylaşabilir. Public dil bunu “independent truth” veya
“independent model” olarak sunmaz.

Tek Cursor adapter instance'ı `cursor` provider'ına pinlenir ve exact model ID'yi Agent'a geçirir.
`auto`, terminal model provenance'ını deterministik kaydedemediği için pre-call reddedilir. Diğer
exact Cursor model ID'leri upstream family tahmini yapılmadan opaque model identifier olarak kabul
edilir. İki Cursor modelinin birbirini verify etmesi aynı-provider olduğu için reddedilir.

## 21. MCP SDK v2 implementation contract

Pinned architecture:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
```

MCP v2, TypeScript SDK major version'ıdır. Protocol revision ayrı olarak `2026-07-28`'dir.

Modern + legacy davranışı:

- Modern host: `server/discover`, request `_meta` envelope, 2026-07-28 semantics.
- Legacy host: `initialize`, 2024-10-07–2025-11-25 semantics.
- SDK v2 server factory iki era'yı aynı shared handlers/core üzerinden sunar.
- Tests modern-only, legacy-only ve auto negotiation path'lerini ayrı doğrular.
- Public STDIO command legacy host'u sessizce reddetmez.

MCP input/output schemas CLI schemas'dan türetilir. MCP-specific wrapper yalnız protocol content ve
structuredContent projection'ıdır.

Tool annotations:

- `xerify_ask`: external provider call yapar; read-only project semantics, open-world true,
  idempotent false.
- `xerify_verify`: external provider call yapar; read-only project semantics, open-world true,
  idempotent false.
- `xerify_capabilities`: local/config discovery; read-only true, idempotent true.

MCP server stdout kuralı absolute'dir: tek bir banner/debug `console.log` JSON-RPC channel'ını bozar.
Bütün diagnostics `console.error` veya injected logger ile STDERR'e gider.

Remote HTTP:

- Same server factory.
- Streamable HTTP.
- Loopback default.
- Host/Origin validation.
- Bearer/OAuth middleware server dış boundary'sinde.
- Per-request auth context core'a typed olarak aktarılır.
- Public network bind auth ve explicit confirmation olmadan başlamaz.

## 22. Testing ve verification strategy

Test pyramid küçük fakat gerçek production chain'i kapsar.

### Unit

- Request/result/error schemas.
- Different-provider rule.
- Verdict parsing ve invalid response → `unclear`.
- Config precedence ve secret redaction.
- Exit-code mapping.
- Windows/POSIX executable resolution.

### Contract

- CLI text/JSON golden fixtures.
- MCP tool schemas ile CLI schemas parity.
- Provider adapter conformance suite.
- MCP modern ve legacy protocol fixtures.

### Integration

- Fake provider executable child process.
- Delayed output, malformed JSON, huge output, stderr-only, nonzero exit.
- Timeout, cancellation ve descendant cleanup.
- Paths with spaces, non-ASCII, CRLF/LF.
- Missing auth/executable and provider unavailable.

### E2E / real binary

Package build sonrası source directory dışından:

```sh
command -v xerify
xerify --help
xerify --json doctor
printf 'context' | xerify ask --to fixture:echo --question 'test'
npx @modelcontextprotocol/inspector xerify mcp stdio
```

Bu smoke `/tmp` veya clean external directory'de koşar; yalnız `npm run` üzerinden kanıt kabul
edilmez.

### CI matrix

| OS      | Architecture/runtime                                         |
| ------- | ------------------------------------------------------------ |
| Ubuntu  | Node 20, Node 24                                             |
| macOS   | Node 20, Node 24; arm64 runner bulunduğunda native           |
| Windows | Node 20, Node 24; PowerShell + cmd                           |
| WSL     | dedicated integration lane veya documented self-hosted proof |

Quality gates:

- format/lint/typecheck.
- unit/contract/integration.
- package pack/install smoke.
- CLI help/JSON snapshots.
- MCP Inspector smoke.
- dependency audit + license inventory.
- no-secret fixture scan.

Live provider tests opt-in ve billable olarak etiketlenir; normal PR CI provider account'a bağlı
değildir.

Live harness deterministik transport/contract invariant'ı ölçer; LLM prose byte determinism iddia
etmez. Fixed synthetic contradiction + embedded injection evidence için exact provider/model echo,
strict schema, `refuted`, exit `10`, typed failure absence ve truncation absence zorunludur.

## 23. Distribution ve release

Primary distribution:

```sh
npm install --global xerify@latest
xerify --help
```

Exact unscoped npm name registry API ile doğrulanmadan claim edilmez. Collision varsa canonical
package scoped olabilir, binary adı yine `xerify` kalabilir.

Package contract:

```json
{
  "type": "module",
  "bin": {
    "xerify": "./dist/cli/entry.js"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Release gate:

- Reproducible clean install/build/test.
- `npm pack` content audit.
- Package provenance/signing.
- Changelog and semver.
- Git tag + release artifacts.
- SBOM/license inventory.
- Linux/macOS/Windows install proof.
- MCP v2 Inspector proof.

Published npm allowlist compiled `dist`, schemas, public docs, companion skill, legal/security
notices ve guarded postinstall entry ile sınırlıdır. `src`, tests, artifacts, `.xerify`, `XERIFY.md`
ve bütün brand/review assetleri pakete girmez. `prepack` build/schema generation gerçek npm lifecycle
script'idir; `smoke:install` forbidden path absence ve guarded auto-init davranışını test eder.

Optional future channels aynı binary contract'ını sarar:

- Homebrew formula.
- Scoop/WinGet package.
- Docker image yalnız remote HTTP/server use case.
- Standalone SEA/native bundle ancak Node dependency'nin gerçek adoption sorunu olduğu ölçülürse.

## 24. Logo engineering specification

### Core construction

Xerify mark tek bir arbitrary `X` font glyph'i değildir. Custom composite mark'tır:

```text
Upper component:            Lower component:
\          /                mirrored ✓
 \        /                 (standard check'in horizontal mirror'ı)
  \      /
   \    /
    \  /
     \/

Upper V + detached mirrored check = composite X
Composite X + erify = Xerify
```

Kullanıcının exact art direction'ı:

- X'in V'ye benzeyen üst kısmı `erify` wordmark'ının solunda ve onunla aynı primary reading line'da.
- X'in alt parçası, yatay aynalanmış check mark olarak V'nin altında.
- İki parça birlikte X okunur; ayrı bakıldığında V + reverse-check anlamı verir.
- Reverse-check “yanlış” veya “başarısız” ikonuna dönüşmemeli; yön cross-check/second-opinion
  hissini taşımalıdır.

### First SVG exploration grid

Bu koordinatlar approved final path değil, ilk vector exploration için deterministic başlangıçtır:

- Icon viewBox: `0 0 1000 1000`.
- Safe construction box: `120..880`.
- Upper V endpoints: yaklaşık `(170, 170)` ve `(830, 170)`.
- Upper V apex: yaklaşık `(500, 510)`.
- Mirrored-check bounding box: yaklaşık `170..830 × 500..850`.
- Upper/lower component optical gap: icon height'in `%4–7` aralığında test edilir.
- Stroke visual weight: icon width'in `%10–13` aralığında.
- Endpoint style: square veya subtly rounded iki varyant; decorative full-round yok.
- Primary diagonal angles mümkün olduğunca ortak geometric family'de tutulur.

Visual iteration üç geometry varyantı üretmelidir:

1. **Unified X:** iki parça küçük gap ile tek X gibi baskın okunur.
2. **Verify V:** upper V daha baskın, mirrored check secondary accent.
3. **Cross-check:** iki parça eşit ağırlıkta, icon-only kullanım güçlü.

Owner'ın tarifine en yakın varyant seçilmeden final asset adlandırılmaz.

### Wordmark

- Custom mark + lowercase `erify`.
- Geometric sans direction; public-license font veya converted custom outlines.
- `erify` font license repository'de belgelenir.
- X mark ile `e` arasındaki optical gap, wordmark x-height'ının `%18–30` aralığında denenir.
- V apex ile lowercase baseline ilişkisi optik olarak ayarlanır; yalnız matematiksel center kabul
  edilmez.
- `Xerify` tek kelime okunur; mark `V erify` şeklinde kopmamalıdır.

### Required assets

```text
assets/logos/source/xerify-master.svg
assets/logos/full-horizontal/xerify-horizontal-dark.svg
assets/logos/full-horizontal/xerify-horizontal-light.svg
assets/logos/icon-only/xerify-icon-dark.svg
assets/logos/icon-only/xerify-icon-light.svg
assets/logos/icon-only/xerify-icon-16.svg
assets/logos/icon-only/xerify-icon-32.svg
assets/logos/monochrome/xerify-black.svg
assets/logos/monochrome/xerify-white.svg
```

PNG exports:

- 32, 64, 128, 256, 512 ve 1024 px icon.
- Transparent background.
- Review/contact sheet white background üzerinde ayrıca üretilir.

### Clear space ve minimum size

- Horizontal wordmark clear space: composite X mark yüksekliğinin en az `%50`si.
- Icon-only clear space: mark yüksekliğinin en az `%25`i.
- Full wordmark minimum digital width: `120px`.
- Icon-only normal minimum: `24px`.
- 16px favicon ayrı optically simplified SVG olabilir; temel silhouette değişmez.
- Print wordmark minimum: `35mm`; icon-only `10mm`.

### Color

Final palette owner kararı bekliyor. Logo önce monochrome proof'u geçer.

Color exploration ancak monochrome geometry kabulünden sonra:

- Neutral/dark wordmark.
- Mirrored check için optional single accent.
- Light ve dark background WCAG-visible contrast.
- Gradient, shadow, glow, bevel veya 3D yok.

### Forbidden modifications

- Mark parçalarının yerini değiştirmek.
- Mirrored check'i normal check'e çevirmek.
- X'i font glyph'i ile değiştirmek.
- Stretch, rotate, outline, shadow veya gradient uygulamak.
- `erify` ile mark oranını keyfi değiştirmek.
- Küçük boyutta alt parçayı tamamen silmek.

### Logo acceptance test

- 1 saniyelik bakışta `Xerify` okunuyor mu?
- Mark tek başına X ve cross-check kavramlarını taşıyor mu?
- 16/24/32px'de gap kapanıyor veya çizgiler çamurlaşıyor mu?
- Black-on-white ve white-on-black çalışıyor mu?
- Color-blind kullanım accent olmadan anlamını koruyor mu?
- SVG'de font dependency, embedded raster, mask/filter veya gereksiz metadata var mı?
- Paths deterministic ve viewBox tight mı?

## 25. Brand messaging

Primary one-liner:

> Ask another provider. Get a clear second opinion.

Alternative product descriptor:

> Lightweight cross-provider verification for the shell and MCP.

Voice:

- Direct, technical, calm.
- “AI magic”, “guaranteed truth”, “formal proof” veya fear marketing yok.
- Uncertainty dürüstçe `unclear` olarak ifade edilir.
- Deckent ilişkisi endorsement olarak kullanılabilir; Xerify kendi başına anlaşılmalıdır.

Public claim boundaries:

- “Different-provider second opinion” denebilir.
- “Different-provider” invocation/billing/control service farklılığı demektir; upstream model
  üreticisi farklılığı demek değildir.
- “Provider-independent truth” denemez.
- “Works with every provider” yalnız capability matrix gerçekten kanıtlandığında denebilir.
- “Cross-platform” yalnız yayınlanan OS matrix'i green olduğunda denebilir.

## 26. Parallel Codex development protocol

Alperen bir session'da repository/product yönünü, başka Codex session'ında implementation'ı paralel
takip edecektir. Transcript taşıma yerine repository artifacts kullanılır.

Canonical coordination:

- `XERIFY.md`: product ve architecture authority.
- `docs/architecture.md`: implemented architecture projection.
- Issues/commits: work status ve evidence.
- Her task tek file-owner set'i belirtir.
- Aynı dosyada eşzamanlı iki writer yoktur.
- Handoff; changed files, verification commands, results, open risks ve next exact action içerir.

Parallel-safe work packages:

| Package                | Primary ownership                   | Can run with                           |
| ---------------------- | ----------------------------------- | -------------------------------------- |
| Core contracts         | `src/core/**`                       | Logo, docs                             |
| Provider SPI/adapters  | `src/providers/**`                  | MCP after shared schema freeze         |
| MCP v2 surface         | `src/mcp/**`                        | Provider adapters                      |
| CLI surface            | `src/cli/**`                        | MCP after shared schema freeze         |
| Platform process layer | `src/process/**`, `src/platform/**` | Logo, docs                             |
| Logo/brand             | `assets/logos/**`, `docs/brand.md`  | All code packages                      |
| Test infrastructure    | `tests/fixtures/**`                 | Production files if ownership disjoint |

Shared chokepoints:

- `package.json`, lockfile, `src/core/contracts.ts`, public README ve release config tek writer.
- Shared schema değişikliği CLI ve MCP parity testini aynı commit/package içinde günceller.
- Bir adapter'ın “done” olması yalnız unit test değil, registry + CLI/MCP invocation + real-binary
  fixture chain'ini gerektirir.

### 26.1 Project-local run record authority

Her `ask` ve `verify`, CLI/library/MCP yüzeyinden bağımsız olarak aynı history wrapper üzerinden
geçer. Default project state `.xerify/runs/<zero-padded-sequence>/`, archive state
`.xerify/archive/<sequence>/` altındadır. Tek ve sabit bir history namespace içinde sequence aktif
ve archive kayıtları birlikte taranarak monoton artar; content-free private reservation Xerify
lifecycle'ının sildiği highest sequence'in yeniden kullanılmasını engeller; public run ID
`xrun_<sequence>` olur. Reservation range ve boşluk bütünlüğü allocation sırasında fail-closed
doğrulanır. Configured root değişikliği yeni bir namespace'tir; aynı user yetkisiyle eşzamanlı dış
filesystem deletion/rename/mutation'a karşı integrity garantisi verilmez.

Canonical record; `process.json`, `request.json`, append-only `events.jsonl`, content-addressed
`evidence/manifest.json` ve policy izin veriyorsa evidence blob ile normalized `result.json` veya
typed `error.json` içerir. Raw provider transport output, credential/auth store, full environment
snapshot ve secret-safe audit'te yasak olan auth verisi kayıt contract'ına girmez. Crash sonrası
`running` kaydı dürüstçe kalabilir; host terminal verdict uydurmaz.

Default `captureInput=full`, `captureOutput=normalized` user-understandability kararıdır. Hassas
projeler `metadata` veya `none` seçebilir. Root `.gitignore`, `.npmignore` ve `.dockerignore`
`.xerify/` entry'sini non-overwriting/idempotent init ile alır. Archive/restore provider çağrısı
yapmaz; permanent delete explicit `--yes` ister ve recoverable değildir.
`running` kayıt archive/delete edilemez; in-flight terminal write path'i korunur.

## 27. Definition of Done

Xerify public-ready sayılmadan önce:

- `xerify --help`, `doctor`, `ask`, `verify`, provider discovery ve MCP commands wired.
- CLI/MCP aynı schemas ve core function'ları kullanıyor.
- Codex ve Claude official CLI adapters subscription-local çalışıyor; provider-pinned Cursor Agent
  adapter exact opaque model ID ve `auto` reddi ile registry'ye bağlı.
- En az bir direct API adapter ve generic command adapter çalışıyor.
- Same-provider call fail-fast.
- Timeout/cancel/invalid output honest typed result üretiyor.
- JSON schema/exit code contract golden-tested.
- Linux/macOS/Windows/WSL proof matrix kaydedilmiş.
- MCP SDK v2 modern + legacy Inspector proof'u mevcut.
- Clean external directory'den installed-binary smoke geçiyor.
- Secrets/logging/security review kapanmış.
- Exact logo SVG, variants ve 16/24/32px visual QA owner-approved.
- License, SECURITY, CONTRIBUTING, SBOM ve signed release artifacts mevcut.

## 28. Primary technical references

- MCP TypeScript SDK v2: <https://ts.sdk.modelcontextprotocol.io/v2/>
- MCP v2 protocol eras: <https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions>
- MCP v2 first server: <https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server>
- MCP specification repository: <https://github.com/modelcontextprotocol/modelcontextprotocol>
- Codex MCP: <https://learn.chatgpt.com/docs/extend/mcp>
- Codex non-interactive CLI: <https://learn.chatgpt.com/docs/non-interactive-mode>
- Claude Code MCP: <https://code.claude.com/docs/en/mcp>
- Claude Code CLI: <https://code.claude.com/docs/en/cli-reference>
- Cursor MCP: <https://cursor.com/docs/mcp>
