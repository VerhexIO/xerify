[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# MCP

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, paylaşılan çekirdeğini MCP SDK v2 üzerinden sunar. STDIO ve Streamable HTTP taşımaları; aynı sunucu fabrikasını, araçları, girdi şemalarını, çıktı şemalarını, sağlayıcı kaydını ve iptal yolunu kullanır.

## Araçlar

| Araç                  | Etki                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xerify_ask`          | Açık uçlu bir ikinci görüş için yapılandırılmış bir sağlayıcıyı çağırır. Salt okunur proje anlamı taşır, açık dünya varsayımlıdır, idempotent değildir. |
| `xerify_verify`       | Farklı bir çağrı sağlayıcısını çağırır ve katı bir karar döndürür. Salt okunur proje anlamı taşır, açık dünya varsayımlıdır, idempotent değildir.       |
| `xerify_capabilities` | Bir sağlayıcı çağrısı yapmadan yerel adaptörleri ve protokol yetenek meta verisini listeler. Salt okunur ve idempotenttir.                              |

Sağlayıcı çağrıları kota tüketebilir veya ücrete yol açabilir. MCP host'ları, `xerify_ask` veya `xerify_verify`'ı çağırmadan önce kullanıcı onayı almalıdır.

MCP çağıranları yazar kökenini beyan edebilir, ama `observed` değerini kendileri onaylayamaz. Verilen iddia/bağlam, güvenilmeyen kanıt olarak ele alınır; gömülü talimatlar doğrulama görevini değiştiremez. Bu, model düzeyindeki prompt injection'ı azaltır ama ortadan kaldıramaz.

MCP `ask` ve `verify` çağrıları, CLI ve kitaplıkla aynı, projeye özel geçmiş sarmalayıcısından geçer. Yakalama davranışı `xverify-config.json`'dan gelir; hiçbir ham MCP iletişim çerçevesi veya bearer token saklanmaz. Geçmiş yönetimi bir MCP aracı değil, yerel bir CLI yüzeyi olarak kalır (`xerify runs ...`); bu yüzden uzak bir çağıran, host kayıtlarını arşivleyemez veya silemez.

Programatik `createXerifyMcpServer` ve `createXerifyMcpFactory` çağıranları bir `RunHistoryStore` sağlamalıdır. Kalıcılık bilerek devre dışı bırakıldığında `enabled: false` ile açıkça yapılandırılmış bir depo kullanın; bu alanın atlanması sessizce geçmişsiz çalışma olarak yorumlanmaz.

## Yerel STDIO

Xerify'i derleyin veya genel olarak kurun, ardından bir host'u çalıştırılabilir dosya ve argüman dizisiyle yapılandırın:

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

Genel bir kurulum olmadan, bir MCP host'u genel npm paketini doğrudan çözümleyebilir:

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

Kalıcı host yapılandırmasında incelenmiş tam bir sürümü sabitleyin; `@latest`'i yalnızca otomatik yükseltmeler bilinçli bir politika olduğunda kullanın.

stdout'a hiçbir banner veya tanılama yazılmaz. Tanılamalar stderr'e gider; böylece JSON-RPC çerçevelemesi bozulmaz.

Sabitlenmiş duman testi, derlenmiş sunucuyu her iki protokol döneminde de Inspector `2.2.0` ile doğrular:

```sh
npm run smoke:mcp
```

Test, `protocolEra`'yı ayrı ayrı `modern` ve `legacy` olarak sabitler ve her üç araç şemasının da keşfedilebilir olmasını zorunlu kılar. Modern istemciler `server/discover` ve `2026-07-28`'i müzakere eder; eski (legacy) istemciler ise initialize dönemi yolunu kullanır.

## Resmi Registry meta verisi

Xerify'in deposu bir `server.json` içerir ve npm manifestosu buna karşılık gelen `mcpName: "io.github.verhexio/xerify"` alanını taşır. Registry girdisi, `xverify-cli`'yi npm paketi olarak tanımlar, paket/sunucu sürümünü sabitler, STDIO taşımasını beyan eder ve sabit `mcp stdio` argümanlarını sağlar. Bir sözleşme testi bu alanların birbirinden sapmasını engeller.

Resmi MCP Registry, ücretsiz bir keşif meta veri kanalıdır; bir yürütme host'u veya paket yansıması değildir. Önce npm, tam olarak Xerify'in o sürümünü içermelidir; ancak o zaman sürüm sahibi kimliğini doğrulayıp `server.json`'ı `mcp-publisher` ile yayımlayabilir. Registry şu anda önizleme yazılımıdır, bu yüzden istemciler doğrudan sabitlenmiş bir npm yapılandırmasını kararlı yedek olarak tutmalıdır. Resmi [Registry hızlı başlangıç kılavuzuna](https://modelcontextprotocol.io/registry/quickstart) ve [npm paket kurallarına](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx) bakın.

## Streamable HTTP

Loopback çalıştırma bir bearer token gerektirmez:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

MCP uç noktası `/mcp`'dir. Loopback dışı bir bağlama için, yüksek entropili bir token'ı bir ortam değişkenine koyun ve genel bağlamayı onaylayın:

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

Hem onay hem de kimlik doğrulama olmadan genel bağlama reddedilir. Bu sınır; bearer token'ları sabit zamanda karşılaştırır, Host ve Origin'i doğrular, kimlik doğrulamayı türü belirlenmiş MCP istek bağlamına eşler ve token'ı hiçbir zaman komut çıktısına veya denetim kayıtlarına dahil etmez.

Yerleşik bearer modu, kontrollü dağıtımlar için uygundur. İnternete açık çok kullanıcılı hizmet, TLS sonlandırması, yetkilendirme politikası, OAuth yaşam döngüsü, hız sınırlama ve kalıcı çok kiracılılık, Xerify'in önünde bir dağıtım sınırına aittir; yerel sunucu tarafından ima edilmez.

Kanal seçimi, abonelik/API davranışı, sıfır maliyetli yerel çalıştırma ve değerlendirilen Cloudflare Workers uzak yolu için [sağlayıcı ve erişim kanalları](channels.md) sayfasına bakın. Barındırmanın ücretsiz olması, sağlayıcı çıkarımını ücretsiz yapmaz ve yerel abonelik kimlik bilgilerinin merkezi olarak saklanmasına izin vermez.
