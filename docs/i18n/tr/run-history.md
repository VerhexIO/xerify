[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Yerel çalıştırma geçmişi

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Her CLI, kitaplık veya MCP `ask`/`verify` çağrısı, projeye özel, belirleyici bir kayıt oluşturabilir. Bu, ham iletişim çıktısını bir artefakta dönüştürmeden sağlayıcı çağrılarını anlaşılır ve incelenebilir kılar.

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

Sıra numaraları, tek bir sabit geçmiş ad alanı içinde hem etkin hem de arşivlenmiş kayıtlar boyunca artar. Özel bir `runs/HEAD.json` dosyası, en son ayrılan sıra numarasını, dizini, kalıcı çalıştırma kimliğini ve güncelleme zamanını kaydeder. Kısa ömürlü bir `.HEAD.lock` yalnızca eşzamanlı tahsis sırasında var olur; çalıştırma sayısıyla büyümez. Görüntüleme dizini yapılandırılmış sıfır doldurmayı kullanırken (varsayılan olarak altı basamak), kalıcı kimlik `xrun_000001` biçimindedir; komutlar bu kimliği de `1`'i de kabul eder. Bu yüzden `000001` çalıştırmasını silmek, bir sonraki işlemin yeniden `000001` olmasına yol açmaz. Daha eski `.sequences/` yerleşimleri doğrulanır, `HEAD.json`'a katlanır ve bir sonraki tahsiste kaldırılır.

## Kayıt dosyaları

| Yol                         | Anlamı                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | Kalıcı çalıştırma kimliği, sıra numarası, aranabilir `head`, işlem/yüzey, yaşam döngüsü durumu, zaman damgaları, hedef adaptör/sağlayıcı/model ve nihai exit/karar veya türü belirlenmiş hata |
| `request.json`              | Normalleştirilmiş ask/verify istek meta verisi, yazar/hedef kökeni, sınırlar, bağlam etiketi, yakalama politikası, bayt sayıları ve digest'ler                                                |
| `events.jsonl`              | Yalnızca ekleme yapılan yaşam döngüsü olayları: önce `started`, ardından `completed` veya `failed`; archive/restore olayları geçmiş yeniden yazılmadan eklenir                                |
| `result.json`               | Ayrıştırılmış normalleştirilmiş Xerify sonucu, veya `captureOutput`'a göre yalnızca metadata içeren bir sonuç özeti; `none` için yok                                                          |
| `error.json`                | Nihai normalleştirilmiş bir sonuç saklanamadığında, gizli bilgi içermeyen türü belirlenmiş hata                                                                                               |
| `evidence/manifest.json`    | Kanıt kimlikleri, etiketler/bulucular, bayt sayıları, SHA-256 digest'leri ve isteğe bağlı saklanan dosya adları                                                                               |
| `evidence/001-<sha256>.txt` | Yalnızca `captureInput` değeri `full` olduğunda sınırlı girdi bağlamı; numaralandırma kanıt sırasıdır, ikinci bir çalıştırma sayacı değil                                                     |

Kanıt girdileri; bir bulucu, bayt sayısı ve `sha256:` digest'i taşır. Dosyalar, desteklendiği yerde özel POSIX izinleriyle oluşturulur ve atomik biçimde yazılır. Bir çökme, doğru bir `running` kaydı bırakabilir; Xerify nihai bir sonuç uydurmaz. Çalıştırma dizini, insan/ajan inceleme birimidir; JSON şemaları, Xerify bir işçi planı veya proje mutasyon yaşam döngüsü değil tek bir sağlayıcı isteği kaydettiğinden, Deckent'in orkestrasyon görev kayıtlarından bilerek daha küçük tutulur.

## Aranabilir arşiv indeksi

`xerify runs archive <run>`, tam kaydı `archive/<number>/` içine taşır ve `archive/index.jsonl` dosyasına sıkıştırılmış bir JSON nesnesi ekler. Restore ve delete, geçmişi yeniden yazmak yerine yeni yaşam döngüsü nesneleri ekler. Her satır şunları içerir:

- olay/konum/zaman ve bunun komuttan mı yoksa çökme sonrası uzlaştırmadan mı geldiği;
- insan/ajan tarafından okunabilir `head`, sağlayıcı/model, karar, exit, durum ve zaman damgaları dahil, tam ve küçük `process` özeti;
- o yaşam döngüsü noktasındaki tam process, request, normalleştirilmiş sonuç veya türü belirlenmiş hata ve kanıt manifestosunu kapsayan `recordSha256`.

Bir `runId` için en son satır, o kaydın güncel indekslenmiş durumudur. `xerify runs list --archived`, yalnızca bu tek indeksi ve dizin adlarını okur; her arşivlenmiş process dosyasını açmaz. Eksik eski veya yarıda kalmış yaşam döngüsü girdileri, yalnızca etkilenen dizinden uzlaştırılır ve `source: "reconciled"` olarak işaretlenir. İnsanlar JSONL'i doğrudan grep'leyebilir; yapay zeka araçları ise eşleşen bir çalıştırma dizinini açmadan önce bu indeksi okumalıdır.

`head`, başka bir model çağrısı yapılmadan yerel olarak türetilir. `captureInput: "full"` ile boşlukları normalleştirilmiş, sınırlı bir iddia/soru önizlemesidir. `metadata` ile yalnızca bir işlem artı ifade digest'idir. `none` ile hiçbir ifade içeriği taşımaz. Bu, indeksin yapılandırılmış kalıcılık politikasını atlamasını engeller.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archive ve restore, yerel yeniden adlandırmalar artı yalnızca-ekleme indeks girdileridir. Delete kalıcıdır, `--yes` gerektirir ve `recoverable: false` olarak raporlanır. Devam eden kayıtlar arşivlenemez veya silinemez; bu, yaşam döngüsü komutlarının sürmekte olan bir nihai yazmayı geçersiz kılmasını önler. Bu komutların hiçbiri bir sağlayıcıya çağrı yapmaz.

`runs search <query>`, çalıştırma kimliği, `head`, işlem, sağlayıcı/model, adaptör, durum, karar, exit/error ve zaman damgaları üzerinden en son arşivlenmiş özetle eşleştirme yapar. Sıkıştırılmış indeksi okur ve eşleşen process özetlerini döndürür; kanıt ise yalnızca `runs show` üzerinden isteğe bağlı kalır. İzole geçmiş sözleşmesi, çalıştırma kayıtları bilerek açılmamış 1.000 indekslenmiş arşiv özeti üzerinde listeleme ve hedefli aramayı sınar.

`captureInput: "full"` ifadeyi ve bağlamı saklar; `metadata` yalnızca bayt sayılarını ve hash'leri saklar; `none` hiçbirini saklamaz. `captureOutput: "normalized"` ayrıştırılmış Xerify sonucunu saklar, `metadata` gizli bilgi içermeyen özeti saklar ve `none` sonuç dosyasını atlar. Ham sağlayıcı iletişim çıktısı, kimlik bilgileri, kimlik doğrulama depoları ve ortam dökümleri hiçbir zaman geçmiş alanı olmaz.

Oluşturulan kök yok sayma kuralları, `.xerify/`'i Git'in, npm paketlerinin ve Docker derleme bağlamının dışında tutar. Bunlar dosya sistemi izinlerinin veya veri sınıflandırmasının yerini tutmaz. Hassas kanıtı göndermeden veya kalıcı kılmadan önce yakalama politikasını gözden geçirin. Yapılandırılmış geçmiş köklerini değiştirmek farklı bir sıra ad alanı başlatır. Xerify, kendi özel geçmiş ağacını eşzamanlı olarak silen, yeniden adlandıran veya değiştiren aynı kullanıcıya ait bir sürece karşı bütünlük iddiasında bulunmaz.
