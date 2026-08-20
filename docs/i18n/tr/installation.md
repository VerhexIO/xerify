[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Kurulum ve yükseltmeler

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, Node.js 20 veya daha yenisini gerektirir. Node.js 24 birincil sürüm çalışma zamanıdır. Genel npm paketi `xverify-cli`'dir; ürün ve kurulu CLI komutu ise `xerify` olarak kalır.

## Bir kurulum modu seçin

Xerify, projeler arasında paylaşılan bir workstation aracıysa genel olarak kurun:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify init
```

Depo Xerify'i sabitlemesi gerektiğinde, proje geliştirme bağımlılığı olarak kurun:

```sh
npm install --save-dev xverify-cli@latest
npx xerify --version
```

Hızlı bir yetenek kontrolü için bir bağımlılık tutmadan çalıştırın:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

`@` işareti dahil olmak üzere `xverify-cli@latest` kullanın. `npm install xverify-cli latest`, npm'den iki ayrı paket adı kurmasını ister ve bununla eşdeğer değildir.

Yeniden üretilebilir otomasyon için, `latest` yerine tam bir sürümü sabitleyin:

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
```

## Proje başlatma

Doğrudan bir proje-yerel bağımlılık kurulumu, korumalı bir başlatıcı çalıştırır. `.xerify/`'i yalnızca kullanan projenin kökünde oluşturur, var olan bir yapılandırmanın asla üzerine yazmaz, hiçbir zaman bir sağlayıcıya çağrı yapmaz ve Git, npm ve Docker için yok sayma koruması ekler. Genel, geçişli, kaydetmeyen ve `npx` kurulumları geçerli dizini başlatmaz; bunu elle çalıştırın:

```sh
xerify init
```

Yaşam döngüsü tabanlı başlatma istenmediğinde, kurulumdan önce `XERIFY_SKIP_AUTO_INIT=1` ayarlayın. npm, her ilk kurulum doğrudan/geçişli hoisting durumunu kategorik olarak tanıyamaz; bu yüzden Xerify'i içine gömen kütüphanelerin bu değişkeni ayarlayıp kendi açık iş akışları üzerinden başlatma yapması gerekir.

Bir model çağrısı yapmadan ortaya çıkan kurulumu doğrulayın:

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers probe --all --timeout 5000
```

`providers probe`, varsayılan olarak yerel çalıştırılabilir dosya/kimlik doğrulama kullanılabilirliğini kontrol eder. `--network`'ü yalnızca sınırlı bir uç nokta erişilebilirlik kontrolü amaçlandığında ekleyin.

## Yükseltmeler ve kaldırma

Aynı kurulum modunu kullanarak yükseltin:

```sh
npm update --global xverify-cli
# ya da, sabitlenmiş bir proje içinde
npm install --save-dev xverify-cli@latest
```

npm paketini kaldırmak, proje geçmişini veya yapılandırmasını silmez. `.xerify/`'i yalnızca çalıştırma geçmişi, arşiv, yapılandırma ve denetim meta verisine artık ihtiyaç kalmadığında, ayrıca gözden geçirip kaldırın.

## MCP kurulumu

Yerel STDIO MCP aynı paketi kullanır; ikinci bir sunucu indirmesi yoktur:

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

Tedarik zinciri açısından incelenebilir bir host yapılandırması için paket sürümünü sabitleyin. MCP Registry girdisi, bu npm paketine çözümlenen keşif meta verisidir; başka bir Xerify hizmetini barındırmaz veya yerel sağlayıcı kimlik bilgilerini uzaktan yeniden kullanmaz. STDIO ve HTTP kurulumu için [MCP](mcp.md) sayfasına bakın.

## Paket içeriği

npm artefaktı; derlenmiş çalışma zamanı/kitaplık çıktısını, genel şemaları, tüketici belgelerini, eşlik eden ajan yeteneğini (skill), korumalı başlatıcıyı ve lisans/güvenlik bildirimlerini içerir. Kaynak testlerini, sürüm araçlarını, yerel `.xerify/` durumunu, içsel ajan/orkestrasyon dosyalarını, tasarım çalışma alanlarını, üretilen sürüm artefaktlarını ve marka inceleme materyalini ise bilerek dışarıda bırakır.

Xerify, Verhex tarafından geliştirilir ve MIT Lisansı altında dağıtılır. Xerify, Verhex'in ajan tabanlı işletim sistemi olan Deckent'in sağlayıcılar arası doğrulama katmanıdır ve bağımsız bir araç olarak sunulur; Xerify'i kurmak Deckent'i ne gerektirir ne de kurar. Kanonik kaynak ve issue takipçisi, paket meta verisinden bağlantılanır.
