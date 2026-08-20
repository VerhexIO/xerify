<p align="center">
  <a href="README.md">English</a> ·
  <strong>Türkçe</strong> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Başka bir sağlayıcıya sor. Net bir ikinci görüş al.</strong></p>

Xerify; sınırlandırılmış, sağlayıcılar arası soru sorma ve doğrulama için shell odaklı, açık kaynaklı
bir araçtır. Bilgisayarınızda giriş yapılmış resmi sağlayıcı CLI'larını, doğrudan API'leri veya açıkça
yapılandırılmış bir çalıştırılabilir dosyayı kullanabilir. CLI, JavaScript/TypeScript kütüphanesi,
yerel STDIO MCP ve Streamable HTTP MCP aynı çekirdeği ve şemaları kullanır.

Xerify, **Verhex** tarafından topluluk katkılarıyla geliştirilir ve MIT Lisansı altında dağıtılır.
Xerify, Verhex'in ajan tabanlı işletim sistemi olan **Deckent**'in sağlayıcılar arası doğrulama
katmanıdır; burada bağımsız, kendi başına çalışan bir araç olarak sunulur ve Deckent'e hiçbir
bağımlılığı yoktur. Sonuç bir ikinci görüştür; matematiksel ispat, güvenlik sertifikası veya garanti
edilmiş gerçek değildir. Sağlayıcı çıktısı güvenilmeyen veridir ve hiçbir zaman çalıştırılmaz.

> **Yayın durumu:** `0.1.0` yayın adayıdır. npm dağıtım adı `xverify-cli`, ürün ve terminal komutu
> `xerify` olarak kalır.

## Kurulum

İlk genel npm yayını sonrasında:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify init
```

Projeye sabitlenmiş geliştirme bağımlılığı:

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version
```

Bağımlılık kaydetmeden çalıştırma:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Node.js 20 veya üstü gerekir; ana yayın hattı Node.js 24'tür. Ayrıntılar için [Türkçe tüketici
kılavuzuna](docs/i18n/tr/README.md) ve kanonik [kurulum belgesine](docs/installation.md) bakın.

## Hızlı başlangıç

Açık uçlu bir ikinci görüş isteyin; pipe edilen girdi sınırlandırılmış bağlam olur:

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "Bu değişiklikteki en yüksek risk nedir?"
```

Somut bir iddiayı farklı bir çağrı sağlayıcısıyla çürütmeye çalışın:

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "Bu değişiklik yarış durumunu regresyon oluşturmadan kapatıyor"
```

`--from` ve `--to`, çağrıyı yapan/yapmış olan kontrol ve faturalama hizmetini belirtir. Cursor Agent
üzerinden seçilen modelin adında GPT, Claude, Gemini veya Grok geçse bile sağlayıcı `cursor` olur.
Doğrudan Codex/OpenAI `openai`, doğrudan Claude/Anthropic `anthropic` kimliğidir. Aynı sağlayıcıyla
`verify`, model çağrısından önce reddedilir.

Bu ayrım kanal çeşitliliğini ölçer; model ağırlıklarının, eğitim verisinin veya kör noktaların
bağımsız olduğunu kanıtlamaz.

## Kararlar ve çıkış kodları

| Sonuç       | Exit | Çağıranın davranışı                              |
| ----------- | ---: | ------------------------------------------------ |
| `confirmed` |    0 | Devam adayı; mevcut kanıt içinde karşı örnek yok |
| `refuted`   |   10 | İddiayı engelle                                  |
| `unclear`   |   11 | Daha güçlü kanıt, tekrar veya insan incelemesi   |

Timeout, sağlayıcı hatası, geçersiz şema ve truncation ayrı sıfır-dışı kodlarla fail-closed kalır.
`unclear`, başarıya çevrilmez.

## Güvenli ve ücretsiz kurulum kontrolleri

Aşağıdaki komutlar model çağrısı yapmaz:

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
xerify --json config validate
```

`--network` yalnızca sınırlı endpoint erişilebilirlik kontrolü ekler; inference çağrısı yapmaz.
Canlı `ask` ve `verify` çağrıları abonelik kotası tüketebilir veya API ücreti doğurabilir.

## Yerel durum ve geçmiş

`xerify init`, proje kökünde ezmeden `.xerify/` oluşturur ve `.gitignore`, `.npmignore` ve
`.dockerignore` dosyalarına koruma ekler:

```text
.xerify/
├── xverify-config.json
├── logs/audit.jsonl
├── runs/HEAD.json
├── runs/000001/
└── archive/index.jsonl
```

Aktif kayıtlar `runs/` altında görünür; `xerify runs archive 1` bunları arşive taşır. Kompakt
`archive/index.jsonl`, insan ve AI araçlarının binlerce geçmiş kaydı tüm dosyaları açmadan aramasını
sağlar. Ham sağlayıcı taşıma çıktısı ve kimlik bilgileri geçmişe yazılmaz.

## MCP

Global kurulum için yerel STDIO:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "xerify",
      "args": ["mcp", "stdio"]
    }
  }
}
```

Sabit npm sürümüyle:

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

Sunucu `xerify_ask`, `xerify_verify` ve ücretsiz `xerify_capabilities` araçlarını sunar. HTTP
varsayılan olarak `127.0.0.1` üzerinde çalışır; loopback dışı bind, hem `--allow-public` hem de
ortam değişkeninden bearer token gerektirir.

## Xerify'i kim geliştiriyor

Xerify, **[Verhex](https://github.com/VerhexIO)** tarafından tasarlanır, geliştirilir ve sürdürülür.

Kökeni **Deckent**'e dayanır — Verhex'in ajan tabanlı işletim sistemine; orkestratörün dayandığı
yeteneklerden biri de bir iddiayı kontrol etmesi için ikinci bir sağlayıcıya sormaktır. Xerify, bu
yeteneğin bağımsız, açık kaynaklı halidir: kendi başına kurulur, Deckent'e ihtiyaç duymaz ve ona
hiçbir bağımlılık taşımaz.

Bu depoda yalnızca Xerify [MIT Lisansı](LICENSE) kapsamındadır. Deckent, ayrı bir Verhex ürünüdür ve
burada lisanslanmamıştır.

## Dokümantasyon

- [Türkçe kapsamlı kılavuz](docs/i18n/tr/README.md)
- [Altı dil ve kanonik İngilizce belgeler](docs/README.md)
- [Çalışılmış doğrulama örnekleri](docs/examples/README.md)
- [Güvenlik politikası](SECURITY.md)
- [MIT Lisansı](LICENSE)

Çeviriyle kanonik İngilizce sözleşme çelişirse test edilmiş İngilizce şema ve belgeler geçerlidir.
