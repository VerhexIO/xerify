[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Proje kurulumu ve yapılandırması

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, projeye özgü durumu depo kök dizininin dışında tutar. Xerify'i doğrudan yerel bir bağımlılık olarak kurmak, var olan dosyaların üzerine yazmadan otomatik başlatma yapar:

```sh
npm install --save-dev xverify-cli@latest
```

Genel (global) kurulumlar, iç içe geçişli kurulumlar, kaydetmeyen (no-save) kurulumlar, `npx` ile yapılan kurulumlar ve `XERIFY_SKIP_AUTO_INIT=1` ile yapılan kurulumlar geçerli projeye hiçbir şey yazmaz. Bu durumlarda başlatmayı elle yapın:

```sh
npx --yes --package=xverify-cli@latest xerify init
```

Bu komut idempotenttir ve var olan bir yapılandırmanın veya `.gitignore` dosyasının üzerine asla yazmaz:

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

npm, ilk bağımlılık yaşam döngüsünden önce doğrudan/geçişli ayrımını kategorik olarak bildirmez. Bu yüzden Xerify, ya var olan bir kök manifest/lock bildirimini ya da açık bir kaydetme bayrağıyla tam kök `node_modules/xverify-cli` konumunun birlikteliğini kabul eder. Bir paket yöneticisi, geçişli bir Xerify bağımlılığını bu konuma taşıyabilir (hoist); başlatıcı yine de üzerine yazmaz ve git tarafından yok sayılır, ama Xerify'i başka bir paketin içine gömen kütüphane yazarları `XERIFY_SKIP_AUTO_INIT=1` ayarlamalıdır.

Kanonik proje dosya adı `.xerify/xverify-config.json`'dır. Oluşturulan `.gitignore`, hem çalışma zamanı günlüklerini hem de token barındırabilen yapılandırmayı Git dışında tutar. Yapılandırmasını kesinlikle gizli bilgiden arındırılmış tutan kullanıcılar dosyayı bilerek zorla ekleyebilir, ama bunu yaptıklarında her commit öncesinde dosyayı yeniden gözden geçirmelidirler. Göreli bir proje `logPath` değeri, paket kurulumundan değil bulunan proje kökünden çözümlenir. Bir alt dizinde başlatılan komutlar, en yakın kanonik proje yapılandırmasını bulmak için üst dizinleri tarar; projede yapılandırılmış göreli bir günlük yolu o proje köküne bağlı kalır.

## Temel yapılandırma

`xerify init`, ayrıca `.xerify/`'i kök `.gitignore`, `.npmignore` ve `.dockerignore` dosyalarına idempotent biçimde ekler. Küçük, işaretli bir satır ekler ve var olan yok sayma kurallarını asla değiştirmez.

`xerify init`, geçerli bir başlangıç dosyası üretir:

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

Geçmiş yolları, bulunan proje kökünden çözümlenir. `captureInput` için `full`, `metadata` veya `none` değerleri; `captureOutput` için `normalized`, `metadata` veya `none` değerleri kabul edilir. Şeffaf varsayılanlar, yerel çalışmayı anlaşılır kılmak için seçilmiştir. Müşteri verisi, tescilli kaynak kodu veya kalıcı olarak saklanmaması gereken başka bir materyalle çalışmadan önce yalnızca metadata modlarını kullanın. Etkin ve arşiv yolları ayrık olmalıdır: birbirine eşit olamaz veya iç içe yerleştirilemezler. Yollardan birini değiştirmek farklı bir sıra ad alanı başlatır. Tam dosya listesi ve yaşam döngüsü komutları için [yerel çalıştırma geçmişi](run-history.md) sayfasına bakın.

Boş bir `providers` alanı, yerleşik `codex` ve `claude` adaptörlerini korur. Yalnızca kullandığınız iletişim kanallarını ekleyin. Örneğin:

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

`$schema`, yalnızca editör için bir ipucudur; Xerify onu ne indirir ne de çalıştırır. Projeye özel bir kurulumda, çevrimdışı tamamlama için bu değer `../node_modules/xverify-cli/schemas/config.schema.json` ile değiştirilebilir.

Yapılandırma katıdır. command veya CLI adaptörleri üzerinde genel `token`, `secret`, sessiz `defaultModel` ve kimlik bilgisi alanları reddedilir. Doğrudan `openai-api`, `anthropic-api` ve `openai-compatible` adaptörleri yalnızca tam olarak `apiKey` isteğe bağlı alanını kabul eder.

Önerilen sıralama:

1. Adlandırılmış ortam değişkenini (`apiKeyEnvironment`) kullanın.
2. Abonelik tabanlı adaptörler için resmi CLI tarafından yönetilen kimlik doğrulamasını kullanın.
3. Ortam değişkeni yönetiminin pratik olmadığı tek kullanıcılı yerel kurulumlarda yalnızca sabit `apiKey` değerini kullanın.

İkisi birden bulunduğunda ortam değişkeni önceliklidir. Sabit API anahtarları ve tam sağlayıcı `endpoint` değerleri, `config show` ve `config validate` tarafından `[REDACTED]` olarak gösterilir; kısmi URL maskeleme ise bilerek uygulanmaz, çünkü kimlik bilgileri userinfo, yol, keyfi sorgu anahtarları veya fragment içinde yer alabilir. `health`, `doctor`, hatalar, promptlar ve denetim kayıtları bu değerleri asla açığa çıkarmaz. POSIX sistemlerde, `apiKey` içeren veya açıkça yapılandırılmış bir sağlayıcı endpoint'i barındıran bir yapılandırma, izinleri yalnızca sahibine özel olmadıkça (`chmod 600 .xerify/xverify-config.json`) reddedilir. Başlatıcı bu izin modunu zaten oluşturur. Bir adaptörün yerleşik varsayılan endpoint'i tek başına, aksi halde gizli bilgi barındırmayan bir dosyayı özel hale getirmez. Windows'ta dosyayı sahibine özel bir ACL ile koruyun. Bu dosyayı asla commit etmeyin, destek çıktısına yapıştırmayın veya doğrulama kanıtı olarak göndermeyin.

## Çözümleme ve ortam değişkenleri

Öncelik sırası şöyledir: CLI bayrağı, Xerify ortam değişkeni geçersiz kılması, proje yapılandırması, kullanıcı yapılandırması ve son olarak adaptör varsayılanı. Kullanıcı yapılandırması da aynı `xverify-config.json` dosya adını kullanır:

| Ortam   | Kullanıcı yapılandırma yolu                                                                      |
| ------- | ------------------------------------------------------------------------------------------------ |
| Linux   | `$XDG_CONFIG_HOME/xerify/xverify-config.json`, aksi halde `~/.config/xerify/xverify-config.json` |
| macOS   | `~/Library/Application Support/Xerify/xverify-config.json`                                       |
| Windows | `%APPDATA%\Xerify\xverify-config.json`                                                           |

`XERIFY_USER_CONFIG_PATH`, izole (hermetic) otomasyon için özel bir kullanıcı yapılandırma dosyası seçer. Çalışma zamanı sınırları `XERIFY_TIMEOUT_MS`, `XERIFY_MAX_INPUT_BYTES` ve `XERIFY_MAX_OUTPUT_BYTES` ile geçersiz kılınabilir. Bir CLI `--timeout` veya `--log` bayrağı en yüksek önceliğe sahiptir.

Sağlayıcı/kimlik doğrulama değişkenleri yalnızca ilgili adaptöre iletilir:

| Adaptör       | Kabul edilen kimlik doğrulama/yapılandırma ortam değişkenleri                                 |
| ------------- | --------------------------------------------------------------------------------------------- |
| Codex CLI     | `CODEX_HOME`, `CODEX_API_KEY`; normal CLI girişi de desteklenmeye devam eder                  |
| Claude CLI    | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`; normal CLI girişi de desteklenmeye devam eder |
| Cursor Agent  | `CURSOR_API_KEY`, `CURSOR_API_ENDPOINT`; normal `agent login` da desteklenmeye devam eder     |
| OpenAI API    | önce adlandırılmış ortam değişkeni; isteğe bağlı sabit `apiKey` yedeği                        |
| Anthropic API | önce adlandırılmış ortam değişkeni; isteğe bağlı sabit `apiKey` yedeği                        |
| Genel command | yalnızca `authEnvironment` içinde listelenen adlar                                            |

`PATH`, ev/yapılandırma konumları, geçici dizin değişkenleri ve yerel ayar (locale) gibi platform temelleri, resmi CLI'ların kendi güvenli kimlik doğrulama depolarını bulabilmesi için iletilir. Üst sürecin ortamının geri kalanı körlemesine kopyalanmaz.

Bilinçli olarak model seçimi için bir ortam değişkeni yoktur. Her canlı istek tam bir `--to provider:model` taşır; kaynak kökeni için tam bir `--from provider:model` kullanılır. Model kimliklerini, `agent models` gibi sağlayıcının kendi ücretsiz keşif komutuyla bulun; asla bir takma ad tahmin etmeyin.

## Sağlık kontrolü ve sağlayıcı keşfi

Önce toplu, ücretsiz hazırlık görünümünü kullanın:

```sh
xerify --json health
xerify --json health --network
```

`health`; `ready`, `degraded` veya `setup-required` durumunu, geçerli projenin başlatılıp başlatılmadığını ve yapılandırılmış/bağlı her adaptörle birlikte çağrı sağlayıcısı kimliğini bildirir. Ayrıca kanıt içeriğini okumadan çözümlenmiş geçmiş yollarını ve yakalama politikasını da raporlar. Varsayılan davranış bir modele çağrı yapmaz veya API uç noktalarını yoklamaz. `--network`, sınırlı uç nokta erişilebilirlik kontrolleri ekler; yine de bir çıkarım isteği yapmaz. Çalışma zamanı/MCP ayrıntıları için `doctor`, seçili bir adaptör için ise `providers probe` kullanın.

`openai-compatible` için yalnızca; açık anahtar yapılandırması, userinfo, sorgu parametresi veya fragment içermeyen sade bir loopback endpoint'i `local` / `not-required` olarak raporlanır. URL içine gömülü materyal, loopback üzerinde bile config kökenli auth `unknown` olarak raporlanır. `apiKeyEnvironment` veya `apiKey` içermeyen bir uzak endpoint de `unknown` olarak kalır; Xerify bir URL'den bir ağ geçidinin genel mi olduğunu, URL üzerinden kimlik bilgisi mi taşıdığını, yoksa başka bir kimlik doğrulama şeması mı uyguladığını çıkarsamaz. Kimlik bilgisi materyalini bir endpoint URL'sine koymak yerine adlandırılmış bir anahtar ortam değişkenini tercih edin.

## Denetim kaydı sözleşmesi

JSONL denetim kaydı; zaman damgası, command, exit, sağlayıcı/model kökeni, karar, süre, sağlayıcının bildirdiği usage, kırpılma ve türü belirlenmiş hata kategorisini içerir. Promptları, iddiaları, bağlamı, yanıtları, findings'i, ham sağlayıcı yanıtlarını, yetkilendirme verilerini ve kimlik bilgisi yollarını ise bilerek dışarıda bırakır. Yeni POSIX dosyaları `0600` modundadır; symlink veya normal olmayan hedefler reddedilir. Günlükler operasyonel meta veridir — ne bir dökümdür ne de bir kararın doğru olduğunun kanıtıdır.
