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

### `providerMessage`

Türü belirlenmiş bir `failure`, isteğe bağlı bir `providerMessage` taşıyabilir. Xerify'in kendi `message` alanı her hata kodu için sabit bir cümledir ve çağıran tarafın karar vermesi gereken kısım budur; `providerMessage` ise aynı hatayla ilgili sağlayıcının kendi sözleridir ve bir insanın okuması gereken kısımdır. Bu alan olmadan eskimiş bir CLI, süresi dolmuş bir giriş ve reddedilen bir model — hepsi aynı `Provider process exited unsuccessfully` mesajını bildirir; bu da hiçbir neden belirtmez.

Bu alan sağlayıcı çıktısı taşıdığından güvenilmeyen kabul edilir ve sonuca ulaşmadan önce sabit bir işlem hattından geçer:

- çıktının açıkça belirttiği en fazla bir hata satırı, ya da çıktı hiçbirini belirtmiyorsa `|` ile
  birleştirilmiş son dört satır; her satır birleştirilmeden önce kendi başına sansürlenir;
- OSC ve CSI dizileri, yükü (payload) dahil olmak üzere tamamen kaldırılır — hem 7-bit (`ESC ]`,
  `ESC [`) hem de 8-bit (U+009D, U+009B) biçimlerinde; çünkü 8-bit kontrolleri kabul eden bir
  terminal, U+009B'yi tam olarak `ESC [` gibi okur. Sekme ve yeni satır dışında kalan her kontrol
  karakteri boşlukla değiştirilir: C0, DEL ve C1 aralığı aynı şekilde, satır başı (carriage return)
  dahil. Başka her kaçış dizisi de aynı şekilde başlatıcısını (introducer) kaybeder ve hiçbir kontrol
  işlevi taşımayan, yalnızca yazdırılabilir kuyruğunu korur;
- `Authorization`, `Proxy-Authorization`, `Cookie` ve `Set-Cookie` başlıkları bütünüyle değiştirilir
  — adı ve satırın geri kalan tamamı birlikte; çünkü böyle bir başlık birden fazla değer taşıyabilir
  ve yalnızca ilkini kaldırmak geri kalanını olduğu gibi bırakır;
- `Bearer` tokenları, JWT'ler, URL userinfo'su, bilinen sağlayıcıya özgü anahtar önekleri ve
  etiketinde `key`, `token`, `secret`, `password` veya `credential` geçen her `etiket: değer` çifti
  `[REDACTED]` ile değiştirilir;
- geriye kalan, harf ve rakamları karıştıran 24 veya daha uzun kesintisiz alfasayısal her dizi
  `[REDACTED]` ile değiştirilir; bu da öneki listede olmayan bir sağlayıcının kimlik bilgisini de
  kapsar. Okunmaya değer tanımlayıcılar bundan etkilenmeden kurtulur, çünkü kısa parçalara bölünmüş
  durumdadırlar: `claude-opus-4-5-20251101` içindeki en uzun kesintisiz dizi sekiz karakterdir;
- asla 501 karakterden uzun olamaz: bu sınırı aşacak bir mesaj 500 karaktere kısaltılır ve sonuna tek
  bir `…` eklenir;
- sağlayıcı kullanılabilir hiçbir şey söylemediğinde boş gönderilmek yerine tümüyle atlanır.

Geriye kalan şey ayrıştırılmış bir alan değil, sınırlandırılmış bir alıntıdır: `string` dışında hiçbir şeması yoktur, ifadesi sağlayıcıya aittir ve sağlayıcı değiştikçe değişir; sağlayıcının yazdırmayı seçtiği dosya sistemi yollarını da içerebilir. Bu alana göre karar vermeyin.

Sansürleme, sağlayıcı tarafından yazılmış metin üzerinde derinlemesine savunmadır (defence in
depth), bir kanıt değildir. Yukarıdaki kurallar fiilen uygulanan kurallardır; hiçbir sonlu kural
kümesinin bir sağlayıcının icat edebileceği her kimlik bilgisini kapsadığı gösterilemez; son kural
da bir önek listesinin bunu kanıtlanabilir biçimde başaramamasından dolayı vardır.
`providerMessage`'ı sonuçtaki en az güvenilen dize olarak ele alın ve onu bir sırrın kabul
edilemez olacağı hiçbir yere iletmeyin.

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
- Gizli değerler, ham yetkilendirme başlıkları, token parçaları, kimlik bilgisi yolları, prompt/bağlam, yanıt metni ve findings; Xerify tarafından türü belirlenmiş hatalara veya denetim kayıtlarına asla yerleştirilmez.
- Türü belirlenmiş bir hataya sağlayıcı tarafından yazılmış metni taşıyan tek alan `providerMessage`'dır; bu alanın nasıl `[REDACTED]` uygulanarak sınırlandırıldığı [Doğrulama sonuçları](#providermessage) başlığı altında anlatılır. Sağlayıcının kendisinin yazdırdığı bir dosya yolu orada görünebilir; bir kimlik bilgisi görünemez.
