[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Mimari

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Bu kılavuz, `docs/decisions/` altındaki kabul edilmiş kayıtlar, genel şemalar ve bunların test edilmiş sözleşmeleri, Xerify'in yaşayan ürün ve mimari otoritesidir. Bir davranış, yalnızca içsel bir notta geçtiği için genel sayılmaz; belgeler, uygulanmış ve test edilmiş yolla eşleşmelidir.

Xerify, tek bir çekirdek yürütme yolu üzerinde dört genel yüzeye sahip tek bir ESM paketidir — CLI, kitaplık, STDIO MCP ve Streamable HTTP MCP.

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## Modül sınırları

- `src/core`; genel istekleri/sonuçları, prompt'ları, farklı-sağlayıcı zorunluluğunu, karar ayrıştırmasını, hata türlerini, sınırları ve denetim projeksiyonunu sahiplenir.
- `src/providers`, tarafsız bir adaptör sözleşmesini ve yerleşik CLI/API/command adaptörlerini uygular. CLI render işlemini içe aktarmaz.
- `src/process` ve `src/platform`; çalıştırılabilir dosya çözümlemesini, ortam değişkeni izin listesini, sınırlı akışları, zaman aşımı/iptali ve süreç ağacı sonlandırmasını sahiplenir.
- `src/config`, `.xerify/xverify-config.json` dosyasından katı JSON ayrıştırır, her çözümlenmiş alanın
  kaynağını kaydeder, isteğe bağlı sabit API anahtarlarını gizler ve var olan dosyaların üzerine
  yazmadan özel proje durumu/günlük meta verisini başlatır.
- `src/history`, etkin çalıştırmaları doğrudan kaydeder, tek bir atomik `HEAD.json` üzerinden
  monoton kimlikler tahsis eder ve insan/ajan aramaları için yakalama politikasına uygun,
  yalnızca-ekleme yapılan bir arşiv indeksi tutar.
- `src/cli`, komutları çekirdeğe eşler ve ya insan tarafından okunabilir çıktı ya da tek bir kararlı JSON zarfı render eder.
- `src/mcp`, aynı Zod şemalarını ve çekirdek fonksiyonları MCP SDK v2 ile kaydeder. HTTP kimlik doğrulaması taşıma sınırında kalır.

Paket kökü, programatik kullanım için çekirdeği, config'i, adaptörleri ve MCP fabrikalarını dışa aktarır. Test fixture'ları hiçbir zaman üretim kodu tarafından içe aktarılmaz.

## İstek akışı

1. Katı CLI, kitaplık veya MCP girdi doğrulaması, sağlayıcı/model kimliğini ve bayt/zaman sınırlarını belirler. Genel çağıranlar `observed` değerini kendileri onaylayamaz; hedef kimliği `declared` olmalıdır.
2. Doğrulama, adaptör çözümlemesinden önce bilinmeyen kökeni ve eşit çağrı sağlayıcısı kimliklerini reddeder.
3. Kayıt (registry), verildiğinde açık bir adaptör kimliğini, aksi halde hedef sağlayıcı kimliği için yapılandırılmış bir adaptörü seçer.
4. Adaptör; `shell: false` ile tek bir çalıştırılabilir dosyayı veya tek bir sınırlı HTTP isteğini çağırır. Prompt ve bağlam hiçbir zaman shell argümanlarına girmez.
5. Sağlayıcı çıktısı bayt cinsinden sınırlandırılır ve normalleştirilir. Sağlayıcıyla uyumlu, yapılandırılmış bir şema kanonik Zod alan tanımlarından türetilir; ardından çekirdek doğrulaması tüm sınırları zorunlu kılar.
6. Çekirdek bir `AskResult` veya tam bir `VerifyResult` döndürür; sağlayıcı kabulünden sonraki başarısızlıklar, türü belirlenmiş bir `failure` ve nedene özgü bir exit ile birlikte dürüst bir `unclear` sonucuna dönüşür.
7. İsteğe bağlı JSONL denetim kaydı yalnızca meta veriyi yansıtır. Prompt, bağlam, yanıt, findings, ham yanıt, başlıklar ve gizli değerler dışarıda bırakılır.

## Güven sınırları

İddia/bağlam ve sağlayıcı çıktısı güvenilmeyen olarak kabul edilir. Doğrulayıcıya, verilen materyali kanıt olarak ele alması, çürütmeyi denemesi ve gömülü komutları, rol değişikliklerini, karar talimatlarını ve şema değişikliklerini yok sayması talimatı verilir. Bu, bir prompt injection garantisi değil, değerlendirme bütünlüğüne yönelik bir azaltma önlemidir. Xerify, sağlayıcı çıktısını hiçbir zaman bir komut, kaynak dosya, MCP talimatı veya yapılandırma olarak değerlendirmez. Doğrudan API anahtarları önce adlandırılmış bir ortam değişkeninden, ardından açıkça yapılandırılmış sabit bir yedekten çözümlenir; tanılamalar ikisini de asla açığa çıkarmaz. Resmi CLI kimlik doğrulama depolarına yalnızca resmi çalıştırılabilir dosya üzerinden erişilir; Xerify bunları ayrıştırmaz veya kopyalamaz.

Codex ve Claude adaptörleri, `openai` ve `anthropic` çağrı sağlayıcısı kimliklerini kod içinde sabitler. Cursor, tam model kimliğinin işaret ettiği asıl model ne olursa olsun `cursor`'ı sabitler; `auto` reddedilir, çünkü model kökenini koruyamaz. `command` ve `openai-compatible` etiketleri, uzaktan doğrulama değil sahibinin denetlediği beyanlardır; bunların sağlayıcılar-arası garantisi ancak o yapılandırma kadar güçlüdür.

Sağlayıcı ayrımı, çağrı/faturalandırma/kontrol düzlemi çeşitliliğini ölçer. İki kanalın farklı model üreticileri, ağırlıklar, eğitim verisi veya kör noktalar kullandığını kanıtlamaz. Doğrudan OpenAI ile Cursor üzerinden erişilen bir GPT modeli farklı çağrı sağlayıcılarıdır, ama model soyunu paylaşıyor olabilir.

Resmi command adaptörleri, kullanıcı deposu yerine yeni ve kısıtlayıcı geçici çalışma alanlarından çalışır. Codex, kullanıcı kurallarını/yapılandırmasını yok sayar ve salt okunurdur; Claude, özelleştirmeleri, araçları, slash komutlarını ve kalıcılığı devre dışı bırakır; Cursor, salt okunur ask modunu ve kendi sandbox'ını kullanır. Cursor'un hesap düzeyinde kategorik bir MCP devre dışı bırakma bayrağının bulunmaması, belgelenmiş artakalan bir risk olarak kalır.

STDIO'nun stdout'u MCP çerçeveleri için ayrılmıştır. Streamable HTTP varsayılan olarak loopback kullanır ve Host ile Origin'i doğrular. Genel bağlama, açık bir bayrak ve bearer kimlik doğrulaması gerektirir.

## Uyumluluk

- Çalışma zamanı alt sınırı: Node.js 20; birincil geliştirme çalışma zamanı: Node.js 24.
- Genel şema sürümü: `1`.
- MCP SDK ana sürümü: `2`; modern protokol revizyonu: `2026-07-28`; eski istemcilere hizmet vermeye devam edilir.
- Var olan genel alanlar, uyumluluğu bozan bir sürüm olmadan kaldırılamaz veya yeniden yorumlanamaz. Ekleyici, isteğe bağlı alanlara izin verilir.

Komut sonucu kararı ve gerekçesi [ADR 0001](../../decisions/0001-command-outcomes.md) belgesinde kayıtlıdır. Çağrı sağlayıcısı kimliği [ADR 0002](../../decisions/0002-invocation-provider-identity.md) tarafından sabitlenir.
