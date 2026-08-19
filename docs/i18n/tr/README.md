# Xerify Türkçe tüketici kılavuzu

[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) ·
[简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

Bu belge, Xerify'ın kurulum, CLI, yapılandırma, sağlayıcı, JSON, geçmiş, MCP, uyumluluk ve güvenlik
sınırlarını Türkçe olarak tek yerde açıklar. Komut adları, JSON alanları, provider/model kimlikleri,
çıkış kodları ve config anahtarları çevrilmez. Kanonik normatif kaynak [İngilizce dokümantasyon
indeksidir](../../README.md).

## 1. Ürün modeli

Xerify, mevcut bir iddiayı veya soruyu tam olarak bir hedef sağlayıcıya gönderir:

```text
yazarın artefaktı → Xerify çekirdeği → farklı çağrı sağlayıcısı → typed sonuç
```

- `ask`: açık uçlu ikinci görüş; kaynak sağlayıcı zorunlu değildir.
- `verify`: provenance'ı bilinen somut iddiayı çürütmeye çalışır; farklı sağlayıcı zorunludur.
- `confirmed`: verilen kanıt içinde maddi karşı örnek bulunmadı.
- `refuted`: kanıt iddiayla maddi olarak çelişiyor.
- `unclear`: kanıt veya sağlayıcı çıktısı güvenli karar için yetersiz.

Xerify test, typecheck, linter veya insan incelemesinin yerine geçmez. Doğru sıra genellikle
`tests → typecheck → lint → runtime checks → Xerify → insan/merge politikası`dır.

## 2. Kurulum ve yükseltme

Node.js 20+ gerekir; Node.js 24 ana yayın hattıdır.

```sh
# İş istasyonunda global
npm install --global xverify-cli@latest
xerify --version
xerify init

# Projeye sabitlenmiş
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version

# Kalıcı bağımlılık olmadan
npx --yes --package=xverify-cli@latest xerify --json health
```

Global, transitif, `--no-save` ve `npx` kurulumları mevcut projeyi otomatik başlatmaz. Açıkça
`xerify init` çalıştırın. Yerel doğrudan dependency kurulumu korumalı `postinstall` ile `.xerify/`
oluşturabilir. `XERIFY_SKIP_AUTO_INIT=1` bunu kapatır. Kaldırmak geçmişi silmez; `.xerify/` ayrı
incelenip istenirse silinmelidir.

## 3. İlk sağlık kontrolü

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Bunlar inference yapmaz. `health --network`, sınırlı ağ erişilebilirliği ekler fakat modele içerik
göndermez. `ready`, `degraded` veya `setup-required` durumu; proje init durumu; adapter kimliği;
auth hazırlığı ve history politikası raporlanır. Token değerleri gösterilmez.

## 4. CLI referansı

Global seçenekler komuttan önce veya sonra gelebilir:

| Seçenek          | Anlamı                                         |
| ---------------- | ---------------------------------------------- |
| `--json`         | stdout'a tek kararlı JSON envelope yazar       |
| `--timeout <ms>` | sağlayıcı yaşam döngüsü timeout'unu değiştirir |
| `--log <path>`   | secret-safe JSONL audit yolunu değiştirir      |
| `--version`      | kurulu sürümü yazar                            |

Ana komutlar:

| Komut                                                                    | İşlev                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `xerify ask --to provider:model --question <text>`                       | açık uçlu ikinci görüş                          |
| `xerify verify --from provider:model --to provider:model --claim <text>` | falsification odaklı doğrulama                  |
| `xerify request --to provider:model --input <file>`                      | doğrulama garantisi vermeyen adapter debug yolu |
| `xerify init`                                                            | `.xerify/` durumunu idempotent başlatır         |
| `xerify health [--network]`                                              | toplu hazırlık görünümü                         |
| `xerify doctor [--network]`                                              | ayrıntılı runtime/MCP tanısı                    |
| `xerify providers list`                                                  | adapter yeteneklerini listeler                  |
| `xerify providers probe --all [--network]`                               | taşıma/auth hazırlığını sınar                   |
| `xerify config show`                                                     | kaynaklarıyla redacted config gösterir          |
| `xerify config validate`                                                 | config'i strict doğrular                        |
| `xerify runs list/search/show/archive/restore/delete`                    | yerel kayıt yaşam döngüsü                       |
| `xerify mcp stdio`                                                       | yerel STDIO MCP                                 |
| `xerify mcp http`                                                        | Streamable HTTP MCP                             |

`request`, `verify` değildir: provenance, farklı sağlayıcı, verdict parse ve verify exit semantiğini
uygulamaz.

## 5. Sağlayıcı kimliği ve adapter'lar

Provider, modeli üreten marka değil çağrı/faturalama/kontrol hizmetidir:

| Adapter             | Provider             | Auth kanalı                                                         |
| ------------------- | -------------------- | ------------------------------------------------------------------- |
| `codex`             | `openai`             | resmi CLI login veya `CODEX_API_KEY`                                |
| `claude`            | `anthropic`          | resmi CLI login, `ANTHROPIC_API_KEY` veya `CLAUDE_CODE_OAUTH_TOKEN` |
| `cursor`            | `cursor`             | `agent login` veya `CURSOR_API_KEY`                                 |
| `openai-api`        | `openai`             | named env, isteğe bağlı literal fallback                            |
| `anthropic-api`     | `anthropic`          | named env, isteğe bağlı literal fallback                            |
| `openai-compatible` | config'te belirtilir | named env/literal veya local endpoint                               |
| `command`           | config'te belirtilir | yalnız `authEnvironment` allowlist                                  |

Cursor'da model ID opaque katalog değeridir. `agent models` çıktısından exact ID seçilir;
`cursor:auto` provenance belirleyemediği için çağrıdan önce reddedilir. Cursor üzerinden Gemini
seçilirse provider `cursor`; gelecekte doğrudan Google API/CLI çağrısı olursa `google` olur.

Provider ayrımı model soyunun bağımsızlığını kanıtlamaz. Örneğin doğrudan OpenAI ile Cursor'daki GPT
farklı çağrı provider'larıdır fakat upstream model ortak olabilir.

## 6. Proje config'i ve secret yönetimi

Kanonik dosya `.xerify/xverify-config.json`:

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
      "apiKeyEnvironment": "OPENAI_API_KEY"
    }
  },
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

Öncelik: CLI flag → Xerify env override → proje config → kullanıcı config → adapter varsayılanı.
Kullanıcı dosyası Linux'ta `$XDG_CONFIG_HOME/xerify/xverify-config.json`, macOS'ta
`~/Library/Application Support/Xerify/xverify-config.json`, Windows'ta
`%APPDATA%\Xerify\xverify-config.json` yolundadır. Hermetik otomasyon
`XERIFY_USER_CONFIG_PATH` kullanabilir.

Öneri: token değerini config'e değil `apiKeyEnvironment` ile adlandırılmış ortam değişkenine koyun.
Literal `apiKey` yalnız bilinçli local fallback'tir. `config show/validate` key ve tam endpoint'i
`[REDACTED]` yapar. POSIX'te literal key veya explicit endpoint içeren dosya `0600` olmalıdır.
Config, log, run ve provider çıktısını commit etmeyin veya doğrulama kanıtına eklemeyin.

## 7. Prompt injection ve outbound güvenliği

Güven sırası:

```text
Xerify sistem sözleşmesi
  > doğrulama görevi
  > kullanıcı tarafından onaylanan kapsam
  > gönderilen güvenilmeyen kanıt
```

Kod, diff, log, Markdown, yorum ve başka agent çıktısındaki komutlar talimat değil kanıttır. Prompt,
verifier'dan iddiayı çürütmeye çalışmasını ve embedded verdict/role/schema direktiflerini yok saymasını
ister. Bu risk azaltır fakat hiçbir LLM'i injection-proof yapmaz. Göndermeden önce evidence kapsamını
ve hedef provider'ı inceleyin; secrets, env dump, müşteri verisi veya yetkisiz kaynak göndermeyin.

Xerify provider çıktısını shell, kaynak kodu, MCP talimatı veya config olarak çalıştırmaz. Process
adapter'ları `shell: false`, stdin, sınırlı byte/time ve kontrollü environment kullanır.

## 8. JSON ve exit sözleşmesi

Başarı envelope'u:

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Komut/ön-çağrı hatası:

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

| Exit | Anlam                                              |
| ---: | -------------------------------------------------- |
|  `0` | ask cevaplandı veya verify confirmed               |
|  `2` | input/config, same-provider veya provenance hatası |
|  `3` | executable/endpoint/auth kullanılamıyor            |
|  `4` | timeout veya cancellation                          |
|  `5` | provider/process/API transport hatası              |
|  `6` | geçersiz/eksik/schema dışı provider cevabı         |
| `10` | refuted                                            |
| `11` | alt seviye hata olmadan unclear                    |

Provider yaşam döngüsü başladıktan sonraki başarısızlıklar typed `failure` taşıyan tam
`VerifyResult` ve `verdict: "unclear"` döndürür; stdout, nonzero exit'te de parse edilmelidir.
Truncated kanıt `confirmed` olamaz.

## 9. Run geçmişi ve arşiv

```text
.xerify/
├── runs/HEAD.json
├── runs/000001/
│   ├── process.json
│   ├── request.json
│   ├── events.jsonl
│   ├── result.json veya error.json
│   └── evidence/manifest.json
└── archive/index.jsonl
```

`HEAD.json` monotonik sıra ayırır; silinen ID tekrar kullanılmaz. `captureInput`:
`full|metadata|none`, `captureOutput`: `normalized|metadata|none` olabilir. Evidence içeriği ancak
`runs show 1 --include-evidence` ile yazdırılır.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archive/restore/delete model çağrısı yapmaz. Delete kalıcıdır; çalışan kayıt arşivlenemez veya
silinemez. `index.jsonl`, tüm record dosyalarını açmadan en güncel küçük process özetini aramaya
yarar.

## 10. MCP

Global binary ile STDIO:

```json
{
  "mcpServers": {
    "xerify": { "command": "xerify", "args": ["mcp", "stdio"] }
  }
}
```

Sabit npm paketiyle:

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

Araçlar: `xerify_ask`, `xerify_verify`, `xerify_capabilities`. İlk ikisi ücret/kota tüketebilir;
capabilities inference yapmaz. HTTP varsayılanı:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

Loopback dışı bind için TLS/reverse proxy sınırı yanında `--allow-public` ve named env bearer token
zorunludur. Xerify'ın local CLI abonelik credential'ları uzak servise taşınmaz.

## 11. Uyumluluk ve deterministik sınır

- CI: Ubuntu, macOS, Windows; Node.js 20/24. WSL Linux yolunu kullanır.
- ESM library + TypeScript declaration, CLI, STDIO MCP, Streamable HTTP MCP.
- Public `schemaVersion: 1`; additive optional alanlar uyumludur, kaldırma/yeniden yorumlama breaking'dir.
- Normal testler provider credential istemez ve inference yapmaz.
- LLM prose byte-deterministik değildir. Xerify şema, bound, typed failure ve fail-closed sonucu
  deterministikleştirir; aynı cümleleri garanti etmez.

## 12. Çalışılmış örnekler

Kanonik [örnekler rehberi](../../examples/README.md) araştırma, oyun planı, web sitesi kararı, veri
analizi, outbound veri politikası ve iki Xerify dogfood süreci içerir. [Makine indeksi](../../examples/index.jsonl)
AI araçlarının önce küçük özetleri aramasını sağlar. Evidence dosyaları ve observed sonuçlar tarihsel
kayıt olduğu için çevrilmez.

| Senaryo                                   | Gözlenen sonuç | Exit |
| ----------------------------------------- | -------------- | ---: |
| Araştırmada altı aylık retention iddiası  | `unclear`      |   11 |
| İki kişilik oyun planı kapasitesi         | `refuted`      |   10 |
| Web sitesi mimari seçimi                  | `refuted`      |   10 |
| Aggregate A/B dönüşüm iddiası             | `refuted`      |   10 |
| Restricted müşteri verisi outbound kararı | `refuted`      |   10 |
| Cursor adapter invariant'ları             | `confirmed`    |    0 |
| npm paket sınırı receipt'i                | `confirmed`    |    0 |

## Kanonik referanslar

- [Kurulum](../../installation.md)
- [Config](../../configuration.md)
- [CLI](../../cli-reference.md)
- [Provider adapter'ları](../../provider-adapters.md)
- [Kanallar](../../channels.md)
- [JSON/exit](../../json-contract.md)
- [Run history](../../run-history.md)
- [MCP](../../mcp.md)
- [Uyumluluk](../../compatibility.md)
- [Mimari](../../architecture.md)
- [Security](../../../SECURITY.md)

Bir çeviri bu kaynaklarla veya yayınlanmış şemalarla çelişirse kanonik İngilizce sözleşme geçerlidir.
