[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# JSON ve çıkış kodu sözleşmesi

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Genel `--json` bayrağı bir alt komuttan önce veya sonra verilebilir. Xerify, stdout'a sonunda bir satır sonu bulunan, sıkıştırılmış tek bir JSON nesnesi yazar; başka hiçbir terminal süslemesi eklemez.

Başarı durumu:

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Çağrı öncesi veya komut hatası:

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

`ask` ve `verify` komutlarının verileri, ilgili MCP araçlarıyla aynı şemaları kullanır. Yayımlanan Draft 2020-12 şema dosyaları `schemas/` dizininde bulunur ve çalışma zamanı Zod şemalarından üretilir.

`provider`, çağrıyı yapan/faturalandıran/kontrol eden hizmeti ifade eder. Cursor Agent, her tam model kimliği için `cursor`'dur; doğrudan Codex/OpenAI `openai`, doğrudan Claude/Anthropic ise `anthropic`'tir. Bu kimlik temeli kanal çeşitliliğini ölçer, asıl modelin bağımsızlığını değil. Sağlık kontrolü ve MCP yetenekleri bunu açıkça `identityBasis: "invocation-provider"` olarak bildirir.

Başarılı doğrulayıcı yükleri `evidence`, `assumptions`, `limitations` ve `unverifiedClaims` alanlarını da ekleyebilir. Bu alanlar geriye dönük uyumluluk için isteğe bağlıdır. Yapılandırılmış çıktı veren sağlayıcı adaptörleri bu dört alanın tamamını ister; daha eski yükler döndüren command adaptörleri ise kabul edilmeye devam eder. `evidence` girdileri, doğrulayıcının verilen bağlam içinden bildirdiği sınırlı referanslardır — bağımsız olarak doğrulanmış alıntılar değildir.

## Doğrulama sonuçları

`confirmed`, `refuted` ve gerçek bir `unclear`, tamamlanmış doğrulama sonuçlarıdır. Sağlayıcı yaşam döngüsü bir kez başladıktan sonra zaman aşımı, iptal, sağlayıcı hatası, geçersiz yapılandırılmış çıktı veya doğrulama girdi/çıktısının herhangi bir şekilde kırpılması da yine tam bir `VerifyResult` döndürür; bu durumda `verdict: "unclear"` ve türü belirlenmiş bir `failure` alanı bulunur. Kırpılmış kanıt hiçbir zaman `confirmed` sonucunu üretemez. Süreç çıkış kodu, daha alt seviyedeki nedeni korur.

Dolayısıyla çağıran taraf, çıkış kodu sıfır olmasa bile stdout'u ayrıştırmalıdır.

| Çıkış | Anlamı                                                                                |
| ----: | ------------------------------------------------------------------------------------- |
|   `0` | Komut başarılı oldu; ask yanıtlandı veya doğrulama confirmed sonucuna ulaştı          |
|   `2` | Geçersiz girdi/yapılandırma, aynı sağlayıcı veya kanıtlanamayan köken                 |
|   `3` | Sağlayıcı çalıştırılabilir dosyası, uç noktası veya kimlik doğrulaması kullanılamıyor |
|   `4` | Zaman aşımı veya iptal                                                                |
|   `5` | Sağlayıcı, süreç veya API taşıma hatası                                               |
|   `6` | Geçersiz, eksik veya şemaya uymayan sağlayıcı yanıtı                                  |
|  `10` | Doğrulama refuted sonucuna ulaştı                                                     |
|  `11` | Doğrulama, daha alt seviyeli bir hata olmaksızın unclear sonucuna ulaştı              |

Sıfır eşleşmeli bir keşif işlemi de başarılı sayılır. Eksik usage değerleri `null` olarak kalır; Xerify token sayısı veya maliyet tahmini yapmaz. Girdi/çıktı kırpılması sonuç meta verisinde açıkça belirtilir.

## Uyumluluk politikası

- Her genel zarf ve sonuç `schemaVersion: 1` değerini taşır.
- Var olan bir alanın kaldırılması veya anlamının değiştirilmesi, uyumluluğu bozan bir değişikliktir.
- Yeni bir isteğe bağlı alan eklemek, uyumluluğu bozmayan bir değişikliktir.
- Bilinmeyen girdi/yapılandırma alanları katı şemalar tarafından reddedilir.
- Genel istek şemaları, yazar kökeni için `declared` ya da `unknown` değerini kabul eder ve hedef için `declared` değerini zorunlu kılar. Çağıran tarafından gönderilen `observed` değeri reddedilir; yazar kökeni `unknown` olduğunda farklı-sağlayıcı kabul kuralı da başarısız olur.
- Gizli değerler, ham yetkilendirme başlıkları, token parçaları, kimlik bilgisi yolları, prompt/bağlam, yanıt metni ve findings; türü belirlenmiş hatalara veya denetim kayıtlarına asla girmez.
