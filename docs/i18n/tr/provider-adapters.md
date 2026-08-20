[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Sağlayıcı adaptörleri

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify bir sağlayıcıyı, çağrıyı yapan/faturalandıran/kontrol eden hizmete göre tanımlar. Cursor Agent, tam model kimliğinin işaret ettiği asıl model ne olursa olsun `cursor`'dur. Doğrudan Codex/OpenAI `openai`, doğrudan Claude/Anthropic ise `anthropic`'tir.

Bu sınır kanal çeşitliliğini ölçer, model sağlayıcısının veya soyunun bağımsızlığını değil. Doğrudan OpenAI ile Cursor üzerinden erişilen GPT, farklı sağlayıcılar olarak kabul edilir ama asıl modelin kör noktalarını paylaşıyor olabilir.

Her yerleşik adaptör aynı sınırlı `InvokeResult` değerini döndürür. Usage değerleri yalnızca sağlayıcı yanıtından gelir. Eksik token veya maliyet alanları `null` olarak kalır; Xerify bunları tahmin etmez.

Resmi adaptörler, çağrı sağlayıcısı kimliğini kod içinde sabitler. `command` ve `openai-compatible` adaptörlerindeki kimlik ise uzaktan doğrulama değil, sahibinin denetlediği bir yapılandırmadır; bu adaptörler için sağlayıcılar-arası zorunluluk ancak o yapılandırma kadar güçlüdür.

## Yerleşik adaptör matrisi

| Adaptör türü        | Sağlayıcı kimliği | İletişim kanalı                            | Kimlik doğrulama                                                        | Yapılandırılmış doğrulama                                       |
| ------------------- | ----------------- | ------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `codex`             | `openai`          | resmi `codex` CLI                          | var olan CLI girişi veya `CODEX_API_KEY`                                | `codex exec --output-schema`                                    |
| `claude`            | `anthropic`       | resmi `claude` CLI                         | var olan CLI girişi, `ANTHROPIC_API_KEY` veya `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                                       |
| `cursor`            | `cursor`          | resmi Cursor `agent` CLI'ı                 | var olan Cursor girişi veya `CURSOR_API_KEY`                            | prompt sözleşmesi; çekirdek doğrulama                           |
| `openai-api`        | `openai`          | Responses API                              | önce ortam değişkeni; isteğe bağlı sabit yedek                          | `text.format.type=json_schema`, strict                          |
| `anthropic-api`     | `anthropic`       | Messages API                               | önce ortam değişkeni; isteğe bağlı sabit yedek                          | `output_config.format.type=json_schema`                         |
| `openai-compatible` | yapılandırılan    | chat-completions uyumlu HTTP               | isteğe bağlı ortam değişkeni veya sabit anahtar                         | `response_format.type=json_schema`                              |
| `command`           | yapılandırılan    | çalıştırılabilir dosya artı argüman dizisi | yapılandırılmış ortam izin listesi                                      | prompt sözleşmesi; yanıt yine de çekirdek tarafından doğrulanır |

Bu adaptörlerin dayandığı resmi kaynaklar: [Codex etkileşimsiz kullanım kılavuzu](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude Code CLI referansı](https://code.claude.com/docs/en/cli-reference), [OpenAI yapılandırılmış çıktı kılavuzu](https://developers.openai.com/api/docs/guides/structured-outputs) ve [Anthropic yapılandırılmış çıktı kılavuzu](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Cursor davranışı ise resmi [Agent CLI genel bakışı](https://cursor.com/docs/cli/overview) ve [CLI parametre referansı](https://cursor.com/docs/cli/reference/parameters) belgelerini izler.

## Codex CLI

Çalıştırılabilir dosya: `codex`. Xerify, prompt'u stdin üzerinden gönderir ve doğrulama için geçici bir oturum, salt okunur sandbox, yok sayılan kullanıcı kuralları/yapılandırması, JSONL olayları ve tam bir output-schema dosyasıyla `codex exec` komutunu çalıştırır. Şema dosyası `0600` modunda geçici bir dizinde tutulur ve bir `finally` bloğunda silinir.

Son `item.completed` ajan mesajı, sağlayıcı çıktısı haline gelir. `turn.completed.usage`, `input_tokens` ve `output_tokens` alanlarını eşler; maliyet `null` olarak kalır. Bir hata olayı, başarısız bir tur, sıfırdan farklı bir çıkış kodu, zaman aşımı veya iptal, hiçbir zaman başarılı bir yanıt olarak raporlanmaz.

`xerify providers probe --provider codex`, çalıştırılabilir dosyayı bulur ve `codex login status` komutunu çalıştırır. Bir model isteği yapmaz.

## Claude CLI

Çalıştırılabilir dosya: `claude`. Xerify; JSON çıktılı print modunu, devre dışı oturum kalıcılığını, araçsız çalışmayı, devre dışı slash komutlarını, etkileşimsiz izin yönetimini ve safe mode'u kullanır. Her çağrı, kullanıcının projesi yerine yeni ve `0700` modunda bir geçici dizinden çalışır. Doğrulama, kanonik JSON Schema'yı `--json-schema` üzerinden sağlar; sağlayıcı sonucu ise `structured_output`'tan gelir.

`usage.input_tokens`, `usage.output_tokens` ve `total_cost_usd` mevcut olduklarında eşlenir. Başarısız bir alt tür veya sıfırdan farklı bir çıkış kodu, bir sağlayıcı hatası sayılır. `xerify providers probe --provider claude`, model çağrısı yapmadan `claude auth status --json` komutunu çalıştırır.

Katı üretim şeması, kanonik Zod alan tanımlarından türetilir ve sağlayıcının desteklemediği doğrulama kısıtları çıkarılarak sadeleştirilir. Çekirdek Zod doğrulaması, yanıt alındıktan sonra tüm sınırları yeniden uygular.

## Cursor Agent CLI

Çalıştırılabilir dosya: `agent`. Cursor Agent üzerinden erişilen her model için çağrı sağlayıcısı kimliği Cursor'dur:

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

`agent models` komutunu çalıştırın ve listelenen tam kimliklerden birini `cursor:MODEL_ID` biçiminde verin. Xerify, model kimliğini opak bir Cursor katalog tanımlayıcısı olarak ele alır; `gpt-`, `claude-` veya `gemini-` gibi öneklerden sağlayıcı kimliği çıkarsamaz. `auto`, kökende kullanılan tam modeli koruyamadığı için bir çağrı yapılmadan reddedilir; kurulu Cursor hesabı bunları sunduğu sürece açık Composer, Kimi, GLM, GPT, Claude, Gemini ve Grok kimlikleri kabul edilir.

Bu sürümde doğrudan bir Gemini CLI abonelik adaptörü bulunmuyor. Cursor üzerinden barındırılan Gemini, yine bir Cursor çağrısı olarak kalır. İleride eklenecek doğrudan bir Google API veya CLI adaptörü `google` kimliğini taşırdı.

Adaptör, prompt'u stdin üzerinden gönderir ve JSON çıktılı `agent -p --mode ask --sandbox enabled` komutunu kullanır. Güveni yalnızca yeni, boş ve `0700` modunda geçici bir çalışma alanına verir, bu çalışma alanını açıkça sağlar ve bir `finally` bloğunda kaldırır. Cursor bir JSON-Schema çıktı bayrağı sunmadığından doğrulama prompt'u kanonik sözleşmeyi taşır ve Xerify, dönen `result` değerini aynı çekirdek Zod şemasıyla doğrular. Geçersiz düz metin veya fenced JSON, fail-closed biçimde `unclear`'a dönüşür; hiçbir zaman `confirmed`'e çevrilmez.

Cursor'un mevcut CLI'ında, kullanıcı tarafından yapılandırılmış her MCP sunucusunu kategorik olarak devre dışı bırakan bir bayrak yok. Ask modu salt okunur ve çalışma alanı boş olsa da hesap düzeyindeki Cursor davranışı hâlâ artakalan bir güven sınırı oluşturur. Güvenilmeyen genel eklentiler/MCP yapılandırmasına sahip bir Cursor hesabı altında gizli bilgi göndermeyin veya bu adaptörü çalıştırmayın. `xerify providers probe --provider <cursor-adapter-id>`, model çağrısı yapmadan `agent status` komutunu çalıştırır; hesap kimliğini ne ayrıştırır ne de yazdırır.

Yapılandırılmış çıktı uyumluluğu, modele ve sürüme göre değişir; çünkü Cursor bir şema zorlama bayrağı sunmaz. Cursor Agent `2026.08.11-e8db854` ile Linux x64 üzerinde, tam olarak `cursor-grok-4.6-high-fast` ve `gpt-5.6-sol-high` modelleri sabit injection/çürütme sözleşmesini geçti; `gpt-5.6-sol-high` ayrıca sınırlı çekirdek-kod doğrulamasını da tamamladı. Aynı kanıt penceresinde `claude-sonnet-5-high` ve `claude-sonnet-5-thinking-high`, Xerify'in katı şemasını geçemeyen çıktılar döndürdü ve bu nedenle türü belirlenmiş `unclear`/exit `6` olarak kaldı. Bu dürüst bir gözlem matrisidir — bir model ailesi veya gelecekteki bir Cursor sürümü hakkında evrensel bir taahhüt değildir.

## Doğrudan API'ler

OpenAI adaptörü, `store: false` ile `/v1/responses` uç noktasına istek gönderir. Anthropic adaptörü ise `anthropic-version: 2023-06-01` ile `/v1/messages` uç noktasına istek gönderir. Prompt'lar istekten önce bayt cinsinden sınırlandırılır, yanıtlar akış düzeyinde sınırlandırılır ve iptal/zaman aşımı için `AbortSignal` kullanılır.

Anthropic'te `max_tokens`, geçersiz/eksik bir yanıt sayılır ve `refusal`, yeniden denenemeyen bir sağlayıcı hatasıdır. OpenAI'de durumu `completed` olmayan yanıtlar, beklenen çıktı bloğunu içermeyen yanıtlar, bozuk JSON ve kırpılmış yapılandırılmış çıktı; türü belirlenmiş hatalar olarak ele alınır.

API anahtarları önce yapılandırılmış ortam değişkeninden çözümlenir. Doğrudan API adaptörleri, sabit bir `apiKey` değerini yalnızca basit yerel kurulumlar için bir yedek olarak kabul eder. Böyle bir yapılandırma varsayılan olarak git tarafından yok sayılır, POSIX'te `0600` modunda olmalıdır ve `config show/validate` çıktısından gizlenir; anahtarlar `health`/`doctor` tarafından asla döndürülmez, sağlayıcı prompt'larına konmaz veya denetim kayıtlarına yazılmaz.

Tam olarak yapılandırılmış endpoint değerleri de yapılandırma çıktısından gizlenir ve POSIX yapılandırmasını izin moduna duyarlı hale getirir. Bu, bir URL'nin herhangi bir yerine gömülü kimlik bilgilerinin güvensiz biçimde kısmen maskelenmesini önler. OpenAI uyumlu adaptörlerde yalnızca sade bir loopback endpoint'i `local` / `not-required` sayılır; userinfo, sorgu parametreleri veya fragment'ler kimlik doğrulamasını config kökenli `unknown` yapar. Açık bir anahtar bildirimi içermeyen bir uzak endpoint de kimlik doğrulamasını `unknown` olarak raporlar.

## Genel command

Genel adaptör hiçbir zaman bir shell dizesini değerlendirmez. Yapılandırma, tek bir çalıştırılabilir dosya ve bir argüman dizisi sağlar; yalnızca `{model}` ve `{operation}` yer tutucuları genişletilir. Prompt/bağlam stdin üzerinden gönderilir. Yapılandırılmış genel komutlar varsayılan olarak yeni, `0700` modunda bir geçici dizinden çalışır; yalnızca programatik SDK açık bir `cwd` sağlayabilir. Alt süreç ortam değişkeni iletimi, platform temelleri artı adaptörün açık `authEnvironment` listesiyle sınırlıdır.

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## Kabul kanıtı

İzole sözleşme testleri; CLI olay ayrıştırmasını, yapılandırılmış yükleri, usage eşlemesini, eksik kimlik doğrulamasını, HTTP istek biçimini, zaman aşımı/iptali, geçersiz çıktıyı, çıktı sınırlarını, CRLF'i, Unicode'u ve boşluklu yolları kapsar. Süreç entegrasyon testi ayrıca POSIX alt süreç sinyallemesini de doğrular.

| Ortam               | İzole paket kanıtı             | Resmi ikili dosya yoklaması | Ücretli canlı duman testi     |
| ------------------- | ------------------------------ | --------------------------- | ----------------------------- |
| Linux, Node 20/24   | genel CI                       | host/hesaba özgü            | yalnızca isteğe bağlı katılım |
| macOS, Node 20/24   | genel CI                       | host/hesaba özgü            | yalnızca isteğe bağlı katılım |
| Windows, Node 20/24 | genel CI                       | host/hesaba özgü            | yalnızca isteğe bağlı katılım |
| WSL, Node 20/24     | hedef host üzerinde doğrulanır | host/hesaba özgü            | yalnızca isteğe bağlı katılım |

Normal testler hiçbir zaman bir sağlayıcı hesabı kullanmaz. Canlı bir duman testi açıkça etkinleştirilmeli ve olası ücretlendirmeye tabi olduğu net biçimde göz önünde bulundurulmalıdır. Bu kontrollerin tüketici tarafından nasıl yorumlanması gerektiği için [uyumluluk ve destek sınırları](compatibility.md) sayfasına bakın.
