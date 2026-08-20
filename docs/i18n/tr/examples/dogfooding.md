[English](../../../examples/README.md) · **Türkçe** · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Dogfooding: bir iddianın confirmed olması için ne gerekiyor

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Bu sayfa bir günlük, bir öğretici değil. Xerify'in kendisi hakkındaki beş bulgu, iki bağımsız kanala karşı — `codex` (`openai`) ve `cursor` — `xerify verify`'den geçirildi. **26 tur** sürdü. Yalnızca bir bulgu ilk denemede geçti, ve bir tur `refuted` döndü, çünkü iddia yanlıştı.

Aşağıdaki her şey gerçekte olanlar — iddiaların yazarının kendisinin yanıldığı ortaya çıkan kısımlar da dahil. Kendi işinizi kontrol etmek için Xerify'i kullanmayı düşünüyorsanız, deneyimin şekli işte bu.

## Kayıt

|   # | İddia                        | Kanal  | Karar           | Exit | Neden                                                                    |
| --: | ---------------------------- | ------ | --------------- | ---: | ------------------------------------------------------------------------ |
|   1 | source map'ler               | codex  | `unclear`       |   11 | iddia 86 dosyayı kapsıyordu, kanıt yalnızca 1'ini gösterdi               |
|   2 | source map'ler               | cursor | `unclear`       |    6 | şemaya uymama, karar üretilmedi                                          |
|   3 | source map'ler               | codex  | `unclear`       |   11 | sayılar bir özetti, incelenebilir değildi                                |
|   4 | source map'ler               | codex  | `unclear`       |   11 | `sourceRoot` hiç dikkate alınmamış; 86 satırdan yalnızca 9'u gösterilmiş |
|   5 | source map'ler               | cursor | `unclear`       |   11 | aynı iki itiraz, bağımsız olarak ulaşıldı                                |
|   6 | source map'ler               | codex  | **`refuted`**   |   10 | iddia yanlıştı: map'ler `sourceRoot`'u _gerçekten_ ayarlıyor             |
|   7 | source map'ler               | cursor | **`refuted`**   |   10 | aynı çürütme, bağımsız olarak ulaşıldı                                   |
|   8 | source map'ler               | codex  | `unclear`       |   11 | artefakt, registry'ye kriptografik olarak bağlanmamış                    |
|   9 | source map'ler               | cursor | `unclear`       |    6 | şemaya uymama                                                            |
|  10 | source map'ler               | codex  | **`confirmed`** |    0 | —                                                                        |
|  11 | source map'ler               | cursor | **`confirmed`** |    0 | —                                                                        |
|  12 | adaptör önceliği             | codex  | `unclear`       |   11 | çalıştırmalar bir commit'e bağlanmamış; komutlar atlanmış                |
|  13 | adaptör önceliği             | cursor | `unclear`       |    6 | şemaya uymama                                                            |
|  14 | adaptör önceliği             | codex  | **`confirmed`** |    0 | —                                                                        |
|  15 | adaptör önceliği             | cursor | **`confirmed`** |    0 | —                                                                        |
|  16 | npm provenance               | codex  | **`confirmed`** |    0 | —                                                                        |
|  17 | npm provenance               | cursor | **`confirmed`** |    0 | —                                                                        |
|  18 | göreli yol tuzağı            | codex  | `unclear`       |   11 | A/B testi bir değil, iki değişkeni değiştirdi                            |
|  19 | göreli yol tuzağı            | codex  | **`confirmed`** |    0 | —                                                                        |
|  20 | göreli yol tuzağı            | cursor | **`confirmed`** |    0 | —                                                                        |
|  21 | `.claude/` yok sayma boşluğu | codex  | `unclear`       |   11 | 152 hatanın tümünün ayrıştırma hatası olduğu gösterilmemiş               |
|  22 | `.claude/` yok sayma boşluğu | codex  | `unclear`       |   11 | yeniden üretim özetlenmiş, yalnızca tek bir ham mesaj var                |
|  23 | `.claude/` yok sayma boşluğu | codex  | `unclear`       |   11 | yeniden üretim, belirtilen commit'e bağlanmamış                          |
|  24 | `.claude/` yok sayma boşluğu | codex  | `unclear`       |   11 | iddianın iki yarısı farklı commit'lerde yaşıyordu                        |
|  25 | `.claude/` yok sayma boşluğu | codex  | `unclear`       |   11 | git geçmişi, sandbox içinden doğrulanamaz                                |
|  26 | `.claude/` yok sayma boşluğu | cursor | **`confirmed`** |    0 | —                                                                        |

**Toplam: 9 `confirmed`, 2 `refuted`, 15 `unclear`.** 15 `unclear` sonucundan 3'ü iletişim hatasıydı (exit `6`), 12'si ise gerçek "kanıtınız bunu ortaya koymuyor" yargısıydı.

Dört bulgu her iki kanalda da `confirmed`'e ulaştı. Biri bir kanalda `confirmed`'e ulaştı, diğerinde ise kesin bir sınıra çarptı — bkz. [bu kanalın doğrulayamadığı şey](#bu-kanalın-doğrulayamadığı-şey).

## 12 tur neden "kanıtınız bunu ortaya koymuyor" ile döndü

Bu on iki itirazın her biri dört sınıftan birine giriyordu. Öğrenmeye değerler, çünkü karşılaşacağınız dört sınıf da tam olarak bunlar.

### 1. İddia, kanıttan daha ileri gidiyor

Tur 1. İddia, 86 map dosyasının tamamının kullanılamaz olduğunu söylüyordu. Kanıt ise yalnızca birini gösteriyordu.

> Verilen kanıt, yayımlanan bir `.js.map` dosyasının, gömülü `sourcesContent` olmadan eksik bir
> `package/src` dosyasına referans verdiğini destekliyor, ama bunu 86 map dosyasının tamamı için
> iddia etmiyor [...] Kanıt ayrıca 43 `.js.map` dosyası ile 43 `.d.ts.map` dosyasını birbirinden
> ayırıyor; oysa iddianın belirttiği özellikler yalnızca `.js.map` dosyalarını kapsıyor.

Çözüm, iddiayı yumuşatmak değil. Gidip 86'sının hepsini incelemek ve sonucu zarfa koymak. "Birini kontrol ettim, gerisini varsayın"ı kabul eden bir doğrulayıcı, sizin için hiçbir şey yapmıyor demektir.

Tur 1'de fark edilmesi birkaç tur daha alan ikinci bir aşırı genişleme de vardı: iddia, map'lerin _her tüketici için_ kullanılamaz olduğunu söylüyordu. `node_modules`'ünün yanına depoyu klonlamış bir geliştirici, o yolları çözümleyebilirdi. Kanıt "her tüketici"yi asla destekleyemezdi ve iddia, artefaktın kendisinin gösterdiği şeye daraltılmak zorunda kaldı: kaynaklar _paketin içinden_ çözümlenemiyor.

### 2. Kanıt, artefakt değil sizin özetiniz

Turlar 3, 4, 22 ve 23. Sizin ürettiğiniz bir tablo, veri kılığına girmiş sizin sonucunuzdur.

> Verilen kanıt, iddiayla içsel olarak tutarlı, ama ham artefakt verisi değil türetilmiş,
> güvenilmeyen bir özet; doğrudan map JSON alıntıları ve tam bir tarball dosya listesi olmadan,
> önemli karşı örnekler dışlanamaz.

İşe yarayan: ham registry API yanıtı, tam `tar -tzf` listesi ve yalnızca base64 `mappings` blob'unun çıkarıldığı, her tek map dosyasının JSON'ı. ESLint durumunda ise, terminal çıktısının son kısmı yerine 152 mesajın tamamı için `--format json` çıktısı.

Kanıtınız "tarama M'den N'ini buldu" cümlesini içeriyorsa, hâlâ bu sınıftasınız.

### 3. Artefakt, söylediğiniz şeye bağlanmamış

Tur 8. İddia "npm'in sunduğu tarball" hakkındaydı. Kanıt ise `/tmp` içindeki bir dosya hakkındaydı.

> Analiz edilen tarball yalnızca bir SHA-256 digest'i ile tanımlanıyor, registry meta verisi ise
> SHA-1 ve SHA-512 bütünlük değerleri sağlıyor. Eşleşen bir SHA-1 veya SHA-512 hesaplaması
> verilmemiş, bu yüzden artefakt kimliği kurulmamış.

Çözüm, registry'nin gerçekte yayımladığı digest'leri hesaplamak ve eşleştiklerini göstermekti:

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

Aynı sınıf kaynak kodu iddiaları için de geçerli: commit'i adlandırın, `git rev-parse HEAD` çıktısını gösterin ve okuyucunun ağacın kirli olmadığını bilmesi için `git status --porcelain` çıktısını gösterin.

### 4. Birden fazla şey değişti, ya da yarılar farklı yerlerde yaşıyor

Tur 18. Tek bir değişkeni izole etmesi gereken bir A/B testi, bunu yapmadı.

> Yapılandırmaların yalnızca göreli ile mutlak betik yolu bakımından farklılaştığı ifadesi
> kelimenin tam anlamıyla yanlış: sağlayıcı harita anahtarları ve sağlayıcı adları da farklı.

Bu doğruydu. İki yapılandırma, sağlayıcı kimliği olarak `rel-test` ve `abs-test` kullanıyordu. Çözüm, her iki yapılandırmaya aynı kimliği vermek ve `diff` çıktısını eklemekti; böylece tek-değişken iddiası öne sürülmek yerine kontrol edilebilir hale geldi.

Tur 24, aynı sınıfın farklı bir kılıktaki hali. İddia, bir şeyi "`1d65f17`" commit'inde öne sürüyordu, ama yeniden üretim, `HEAD`'deki yapılandırmadan bir satırı kaldırıyordu — oysa o satırı sonraki bir commit eklemişti. Tek bir cümlenin iki yarısı, iki farklı commit'te yaşıyordu.

> [...] bunlar, yeniden üretimin belirtilen HEAD'den yalnızca gösterilen değişiklikle
> yapıldığını yeterince kurmuyor [...] Kanıt ayrıca etkilenen dosya yolları hakkında içsel bir
> çelişki de barındırıyor.

Çözüm, bunun tek bir gerçekmiş gibi davranmayı bırakmak ve her biri kendi commit'ine bağlı iki ayrı gerçek belirtmekti.

## Yazarı çürüten iki tur

Tur 6 ve 7, bu sayfadaki en yararlı şey.

İddia, _"86 map'ten hiçbiri `sourceRoot`'u ayarlamıyor"_ alt savını içeriyordu. O sayıyı üreten tarama, Python'da yazılmıştı ve alanı şöyle test ediyordu:

```python
sr = d.get('sourceRoot')
if sr:                 # "" Python'da falsy sayılır
    haveroot += 1
```

86 map'in her biri `sourceRoot`'u ayarlıyor — boş dizeye. Tarama sıfır saydı. Her iki kanal da bunu, aynı turda, birbirinden bağımsız olarak yakaladı:

> **codex:** İddia, yazıldığı haliyle önemli ölçüde yanlış: verilen her map JSON'ı, `"sourceRoot"`'u
> açıkça boş dizeye ayarlıyor; bu da hiçbirinin `sourceRoot`'u ayarlamadığı savıyla çelişiyor. Kanıt,
> bunun dışında daha dar yorumu destekliyor [...]

> **cursor:** Verilen kanıtta önemli bir çelişki var: map dosyaları açıkça bir `"sourceRoot"` alanı
> içeriyor (boş dizeye ayarlanmış), bu yüzden "86 map'ten hiçbiri `sourceRoot`'u ayarlamıyor" alt savı,
> yazıldığı haliyle yanlış.

Boş bir `sourceRoot`, başına hiçbir şey eklemez, bu yüzden esas sonuç ayakta kaldı. _Belirtilen iddia_ ise kalmadı. "86 map'in tamamı `sourceRoot`'u boş dizeye ayarlıyor, bu yüzden önek eklemiyor" şeklinde düzeltildi ve iki tur sonra `confirmed` oldu.

Bunun yakalanabilmesi için neyin doğru olması gerektiğine dikkat edin. Ham map JSON'ı zarftaydı. Kanıt hâlâ tur 3'teki özet tablo olsaydı — `sourceRoot ayarlanmış map sayısı: 86'da 0` diyen tablo — iki doğrulayıcının da itiraz edecek hiçbir şeyi olmazdı ve yanlış bir ifade doğrulanmış olarak raporlanırdı.

**Artefaktı gönderin, onu nasıl okuduğunuzu değil. Mekanizmanın tamamı bu.**

## İşe yarayan tarif

Dördüncü bulguya gelindiğinde iki tur yetti. Değişen şey şuydu:

1. **İddiayı, kanıtın gösterdiği şeye tam olarak sınırlayın.** Hepsini incelemediyseniz "her", "her zaman" veya "tüm" yok. Değişkeni izole etmediyseniz nedensel bir köprü yok.
2. **Zarfa ham çıktı koyun.** Komut dökümleri, API yanıtları, eksiksiz dosya listeleri, yalnızca ilgisiz blob'ların çıkarıldığı JSON. Tablolarınızın yeri iddiadır, kanıt değil.
3. **Artefaktı bağlayın.** Registry'nin yayımladığıyla eşleşen digest'ler, ya da bir commit hash'i artı temiz bir `git status`.
4. **Karşılaştırma başına tek değişken,** okuyucunun kendisi kontrol edebilsin diye `diff` dahil edilmiş olarak.
5. **Bileşik iddiaları ayırın.** İki yarı farklı durumlara işaret ediyorsa, bunlar iki iddiadır.
6. **Tam komutları ekleyin.** Ne çalıştırdığınızın bir tarifini değil.

İlk denemede gelen bir `confirmed`, genellikle iddianın yapmaya değmeyecek kadar zayıf olduğu anlamına gelir. Yineleme bekleyin.

## Geçen bir zarf

Bu, tur 10 ve 11'in arkasındaki kanıt paketinin şekli:

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

Ve taşıdığı iddia:

> npm registry'sinin sunduğu `xverify-cli@0.1.0` tarball'ında, hiçbir `.map` dosyası kendi bildirdiği
> kaynağı paketin içinden çözümleyemez: 86 map'in tamamı `sourceRoot`'u boş dizeye ayarlıyor, bu
> yüzden önek eklemiyor; hiçbiri `sourcesContent` içermiyor; her bildirilen kaynak `src/` altındaki
> bir yola çözümleniyor ve tarball sıfır `src/` girdisi içeriyor.

Şekle dikkat edin: iddia, dört kontrol edilebilir gerçeği ve bunlardan mekanik olarak çıkan bir sonucu belirtiyor. İçinde, doğrulayıcının yazarın yargısına güvenmesini gerektiren hiçbir şey yok.

## Bu kanalın doğrulayamadığı şey

Tur 25 duvardır, ve bu bir kusur değil bir tasarım kararıdır.

> [...] geçmişteki depo durumu bağımsız olarak doğrulanamadı, çünkü mevcut çalışma alanı bir Git
> deposu değil ve referans verilen dosyaları veya commit nesnelerini içermiyor.

Bir doğrulayıcı, stdin üzerinden sınırlı kanıt alır. `git log` çalıştıramaz, deponuzu açamaz ve komutlarınızı yeniden çalıştıramaz. Dolayısıyla doğruluğu doğrulayıcının erişemediği bir şeyde yaşayan bir iddia — git geçmişi, özel bir registry, CI'ınızın durumu — bir dökümle _desteklenebilir_ ama asla _doğrulanamaz_. Codex, dökümün iddiayla içsel olarak tutarlı olduğunu söyledi ve yine de `unclear` döndürdü; bu da doğru cevaptır.

Cursor, aynı kanıt üzerinde `confirmed` döndürdü. Bu anlaşmazlığın kendisi bile bilgilendirici: iki kanal, yapıştırılmış bir dökümün ne kadar değerli olduğu konusunda farklı çizgiler çekti. Hiçbiri arızalı değil.

Buna göre planlayın. **Zarfa koyabileceğiniz artefaktlar** hakkındaki iddialar iyi doğrulanır. **Geçmiş, altyapı veya süreç** hakkındaki iddialar doğrulanmaz; bunun yerine okuyucunun bağımsız olarak kontrol edebileceği imzalı bir kayda veya bir CI günlüğüne başvurmalısınız.

## Ölçülmüş kanal güvenilirliği

Bu 26 tur boyunca:

| Kanal              | Tur | Karar üretti | Exit `6` şema hataları |
| ------------------ | --: | -----------: | ---------------------: |
| `codex` (`openai`) |  16 |           16 |                      0 |
| `cursor`           |  10 |            7 |                      3 |

`cursor` adaptöründe sağlayıcı tarafında bir şema zorlaması yoktur — [yerleşik matristeki](../provider-adapters.md) satırı "prompt sözleşmesi; çekirdek doğrulama" yazar — bu yüzden çıktı talimatını yok sayan bir model exit `6` üretir ve hiçbir karar çıkmaz. `cursor` veya `command` adaptörlerinden gelen exit `6`'yı yeniden denenebilir sayın ve deneme sayınızı sınırlayın.

Bir `refuted`'i `confirmed` olana kadar asla yeniden denemeyin. Bu karar alışverişidir ve bir ikinci görüşü, kendinizle hemfikir olmanın pahalı bir yoluna çevirir.

## Nelere mal oldu

5 bulgu için 26 ücretli tur. Dağılım dengesiz ve buna göre plan yapmaya değer:

- Bulgu 1, kuralları sıfırdan öğrenmek: **11 tur**
- Bulgu 5, bir kanal sınırına çarpmak: **6 tur**
- Bulgu 2: 4 tur · Bulgu 4: 3 tur · Bulgu 3, tarif uygulanmış haliyle: **2 tur**

Doğrulayacağınız ilk bulgu, pahalı olan olacak. Yineleme için bütçe ayırın ve model yargısına kota harcamadan önce zarfınızı ve exit kodu ele alışınızı doğru şekilde ayarlamak için [sahte sağlayıcıyı](no-account-walkthrough.md) kullanın.

## İlgili sayfalar

- [Başarısızlık modları](failure-modes.md) — her türü belirlenmiş hata ve onu neyin ürettiği
- [Hesapsız izlenecek yol](no-account-walkthrough.md) — sıfır kotayla her sonuç
- [Çalışan doğrulama örnekleri](README.md) — alan senaryoları
- [Sağlayıcı adaptörleri](../provider-adapters.md) — hangi adaptörlerin çıktı şemasını zorladığı
