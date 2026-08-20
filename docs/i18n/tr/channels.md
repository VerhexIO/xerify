[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Sağlayıcı ve erişim kanalları

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify'de birbirinden bağımsız iki boyut vardır: isteği alan yüzey ve bir doğrulayıcıya ulaşan adaptör. CLI, kitaplık, STDIO MCP ve Streamable HTTP MCP hepsi aynı çekirdeği çağırır; MCP'yi seçmek sağlayıcı kimliğini, faturalandırmayı, şemayı veya exit/karar anlamını değiştirmez.

## Adaptör kanalları

| Kanal                     | Kimlik doğrulama sahibi                                       | Nerede çalışır                        | En iyi kullanım                                      | Temel sınırlama                                         |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Codex CLI aboneliği       | resmi `codex` girişi veya `CODEX_API_KEY`                     | kullanıcının makinesi                 | abonelik kimlik bilgisini kopyalamadan OpenAI hedefi | kurulu/kimliği doğrulanmış bir CLI gerektirir           |
| Claude CLI aboneliği      | resmi `claude` girişi, OAuth token'ı veya API anahtarı        | kullanıcının makinesi                 | `claude -p` üzerinden Anthropic hedefi               | kurulu/kimliği doğrulanmış bir CLI gerektirir           |
| Cursor aboneliği          | resmi `agent login` veya `CURSOR_API_KEY`                     | kullanıcının makinesi                 | Cursor'un sunduğu herhangi bir tam model kimliği     | sağlayıcı `cursor`'dur; asıl model soyu çakışabilir     |
| Doğrudan OpenAI API'si    | adlandırılmış ortam değişkeni; isteğe bağlı sabit yedek       | güvenilen herhangi bir çalışma zamanı | otomasyon/sunucu dağıtımı                            | API faturalandırması ve gizli bilgi saklama sorumluluğu |
| Doğrudan Anthropic API'si | adlandırılmış ortam değişkeni; isteğe bağlı sabit yedek       | güvenilen herhangi bir çalışma zamanı | otomasyon/sunucu dağıtımı                            | API faturalandırması ve gizli bilgi saklama sorumluluğu |
| OpenAI uyumlu HTTP        | isteğe bağlı adlandırılmış ortam değişkeni veya sabit anahtar | yerel veya uzak endpoint              | yerel modeller ve uyumlu ağ geçitleri                | sağlayıcı etiketi sahibinin denetimindedir              |
| Genel command             | açık ortam değişkeni izin listesi                             | kullanıcının makinesi                 | başka bir yerel doğrulayıcı çalıştırılabilir dosyası | çalıştırılabilir dosya, sahibinin güvendiği koddur      |

Abonelik yürütmesi, kullanıcıya ait makinede kalır. Xerify hiçbir zaman bir CLI'ın token/çerez deposunu okumaz; resmi çalıştırılabilir dosya kendi girişini kendisi yönetir. Uzak bir Xerify hizmeti, bir kullanıcının yerel aboneliğini sihirli biçimde yeniden kullanamaz: STDIO sunucusunu yerel olarak kurun, ya da açık bir sunucu tarafı anahtar politikasıyla doğrudan bir API adaptörü kullanın.

## CLI örnekleri

OpenAI çıktısından Claude aboneliğine:

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

Anthropic çıktısından Codex aboneliğine:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

Anthropic çıktısından Cursor üzerinden tam bir modele:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

Doğrudan API çağrıları aynı komutu ve sonucu kullanır. Yalnızca `--adapter` değişir, örneğin `--adapter openaiApi` ya da `--adapter anthropicApi`. Model kimlikleri her zaman açık kalır.

Bu sürümde bir Gemini CLI abonelik adaptörü yok. Cursor üzerinden seçilen Gemini adlı bir model yine `cursor:EXACT_MODEL_ID` olarak kalır; ileride eklenecek doğrudan bir Google API/CLI adaptörü `google` kullanırdı.

## MCP yüzeyleri

Yerel STDIO, önerilen sıfır barındırma maliyetli MCP kanalıdır ve yerel CLI aboneliklerini doğal biçimde koruyan tek uzak-araç yüzeyidir:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@latest", "xerify", "mcp", "stdio"]
    }
  }
}
```

Sabitlenmiş ve tedarik zinciri açısından incelenebilir bir kurulum için, `npx -y ...@latest` yerine sabit bir sürüm kurun ve onun çözümlenmiş ikili dosyasını kullanın. `xerify_capabilities` ücretsizdir; `xerify_ask` ve `xerify_verify` ise sağlayıcı kotası tüketebilir.

Loopback Streamable HTTP de kullanıcının makinesinde çalıştırmak için ücretsizdir. İnternete açık HTTP; TLS, kimlik doğrulama, yetkilendirme, hız sınırlama, gizli bilgi saklama sorumluluğu ve yalnızca-API sağlayıcı politikası gerektirir; yerel abonelik kimlik bilgileri için bir aktarım noktasına dönüşmemelidir.

## Ücretsiz MCP dağıtımı ve gelecekteki barındırma

Seçilen sıfır barındırma maliyetli dağıtım yolu, npm artı resmi MCP Registry'sidir. Registry, keşif/başlatma meta verisini saklar ve genel `xverify-cli` npm paketine işaret eder; Xerify'in kodunu barındırmaz. Depodaki `server.json`, paket sürümünü, STDIO taşımasını ve `mcp stdio` başlatma argümanlarını sabitler. Paketin eşleşen `mcpName` alanı npm/Registry ilişkisini kanıtlar. Registry henüz önizleme aşamasında olduğundan, sabitlenmiş bir `npx -y --package=xverify-cli@<version> xerify mcp stdio` host girdisi belirleyici yedek olmayı sürdürür. Resmi [Registry hızlı başlangıç kılavuzuna](https://modelcontextprotocol.io/registry/quickstart) ve [paket türü kurallarına](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx) bakın.

Bu dağıtım kanalı yerel yürütmedir: barındırma hesabı yok, genel giriş noktası yok, merkezi kimlik bilgisi deposu yok. Verhex ileride genel bir API destekli MCP'ye ihtiyaç duyarsa, resmi Agents SDK'sı Streamable HTTP MCP'yi desteklediği ve Workers Free planı sınırlı bir ücretsiz katman sunduğu için Cloudflare Workers seçilen değerlendirme hedefi olmayı sürdürüyor. Cloudflare'in resmi [uzak MCP kılavuzuna](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/) ve [Workers fiyatlandırmasına](https://developers.cloudflare.com/workers/platform/pricing/) bakın. Bu bir dağıtım yol haritası maddesidir, mevcut Node dinleyicisinin değiştirilmeden yüklenebileceği iddiası değildir.

Bir Worker, kullanıcının yerel Codex/Claude/Cursor CLI'ını başlatamaz. Bu yüzden uzak sürüm yalnızca doğrudan API adaptörlerini kabul eder, OAuth/kapsamlı yetkilendirme gerektirir, platform sınırlarında fail-closed davranır ve sağlayıcı ücretlerini barındırma maliyetinden ayrı tutar. Kimlik doğrulaması gerektirmeyen, herkese açık bir Xerify doğrulayıcısı asla yayımlanmayacak.
