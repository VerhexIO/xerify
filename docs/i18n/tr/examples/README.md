[English](../../../examples/README.md) · **Türkçe** · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Çalışan doğrulama örnekleri

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Bu sayfalar, Xerify'in tam şeklini gösterir: sınırlı bir iddia, makineden çıkabilecek kanıt, tam olarak tek bir hedef model, normalleştirilmiş bir sonuç ve çağıranın vermesi gereken exit kararı.

Bunlar **gözlemlenmiş çalıştırmalardır**, önceden hazırlanmış kararlar değil. Bu sayfalardaki her sonuç, gösterilen komutun gösterilen tarihte çalıştırılmasıyla üretilmiştir. Bir tekrar, yeniden oynatma garantisi değil yeni bir doğrulamadır — aynı komutun iki farklı sonuç ürettiği belgelenmiş bir durum için [başarısızlık modları](failure-modes.md) sayfasına bakın.

## Bir sağlayıcı hesabınız yoksa buradan başlayın

[Hesapsız izlenecek yol](no-account-walkthrough.md), paketle birlikte gelen belirleyici bir sahte sağlayıcı kullanarak **her kararı ve her türü belirlenmiş hatayı** sıfır sağlayıcı kotasıyla yeniden üretir. Gerçek bir çağrı harcamadan önce exit-code sözleşmesini anlamanın en hızlı yoludur.

## Başarısızlık kataloğu

[Başarısızlık modları](failure-modes.md), `confirmed` dışındaki her sonucu belgeler: onu neyin ürettiğini, tam çıktıyı, nedenini ve kullanılabilir bir sonuç almak için neyi değiştirmeniz gerektiğini. Sağlayıcı CLI'ının kurulu olmamasını, sağlayıcı CLI'ının **oturum açmamış olmasını**, aynı-sağlayıcı reddini, Cursor'un `auto` modelini, JSON yerine düz metni, kırpılmış ve şema dışı yanıtları, sıfırdan farklı sağlayıcı çıkışlarını, zaman aşımlarını, çıktı kırpılmasını ve gözlemlenen çalıştırmadan çalıştırmaya değişen kararsızlığı kapsar.

Entegre etmeden önce okuyun. En sık karşılaşılan entegrasyon hatası, exit `11`'i tek bir şeymiş gibi ele almaktır; oysa aslında ikidir — ya gerçek bir `unclear` kararı, ya da üzerinde aynı karar dizisini taşıyan operasyonel bir başarısızlık.

## Canlı örnekler

Beş alan senaryosunun tümü sentetiktir. Hiçbirinde gerçek bir katılımcı, müşteri, analitik veya proje verisi bulunmaz. İki dogfood senaryosu ise genel Xerify paketini ve kaynak kanıtını kullanır. İddialar, CLI tarafından beyan edilen kökeni kullanır; Xerify bu beyanı uzaktan doğrulama gibi göstermez.

| Örnek                                                                                       | Hedef çağrı sağlayıcısı / model      | Gözlemlenen | Exit |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | ----------- | ---: |
| [Araştırma makalesi](research-paper.md) — iddia edilen sonuç hiç ölçülmemiş                 | Anthropic / `claude-fable-5`         | `unclear`   |   11 |
| [Oyun prodüksiyon planı](game-design.md) — kapasite hesabı tutmuyor                         | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Web sitesi kararı](website-decision.md) — matris diğer seçeneği işaret ediyor              | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Veri analizi](data-analysis.md) — katmanlara ayrıldığında tersine dönen bir toplam         | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Giden veri incelemesi](outbound-data-policy.md) — takma adlandırma yetkilendirme değildir  | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Dogfood: Cursor adaptörü](dogfood-cursor-adapter.md) — Xerify kendi kaynağını denetliyor   | OpenAI / `gpt-5.6-sol`               | `confirmed` |    0 |
| [Dogfood: npm paket sınırı](dogfood-package-boundary.md) — yayımlanan paketin içinde ne var | Anthropic / `claude-fable-5`         | `confirmed` |    0 |

Yedi örnekten beşi geçmedi. Asıl mesele bu orandır: çoğunlukla hemfikir olan bir doğrulayıcı, ortaya bilgi katmıyor demektir.

## Bir örneği okumak

Her sayfa altı şeyi birbirinden ayırır:

1. **İddia** — çürütülecek önerme, onaylanması istenen bir talep değil.
2. **Yeniden üretim** — yazıldığı gibi çalıştırılabilir tam komut.
3. **Kanıt** — hedef sağlayıcıya gönderilen tek sınırlı materyal.
4. **Gözlemlenen normalleştirilmiş sonuç** — Xerify'in katı ayrıştırıcısından geçen seçili alanlar, hiçbir zaman ham sağlayıcı çıktısı değil.
5. **Bu kararın nedeni** — doğrulayıcının gerçekte neye saldırdığı ve daha zayıf bir kontrolün neyi kaçıracağı.
6. **Kararı ne değiştirirdi** — kararı her iki yönde de oynatacak somut kanıt.

Yeniden üretim komutları kota tüketir. Önce kanıt dosyasını gözden geçirin ve model kimliklerini kendi hesabınızda kullanılabilir tam kimliklerle değiştirin.

## Makine tarafından okunabilir katalog

[index.jsonl](../../../examples/index.jsonl), her doğrulama örneği için sıkıştırılmış, normalleştirilmiş tek bir kayıt tutar; satır başına bir JSON nesnesi. Bir ajan, herhangi bir Markdown sayfasını açmadan önce burada arama yapabilir.

Ham sağlayıcı iletişimini, sonuç kimliklerini, süreleri, hesap ve oturum verisini ve maliyet/usage alanlarını bilerek dışarıda bırakır.

```sh
# Geçmemiş her örnek
grep -v '"exitCode":0' docs/examples/index.jsonl

# Giden veriyle ilgili her şey
grep -i 'outbound' docs/examples/index.jsonl
```

## Kanıt dosyaları

[evidence/](../../../examples/evidence/), her doğrulamanın aldığı tam sınırlı materyali tutar. Bu dosyalar **hash ile sabitlenmiş doğrulama artefaktlarıdır**: yerel çalıştırma geçmişi, çağrı anında kanıtın bir SHA-256'sını kaydeder; bu yüzden bir dosyayı düzenlemek, kayıt ile belge arasındaki karşılık gelme ilişkisini bozar.

Bu nedenle kanıt dosyaları **yalnızca İngilizcedir ve çevrilmez**. Bu dizindeki düz metin sayfaları yerelleştirilir; ama işaret ettikleri kanıt yerelleştirilmez.

## Bu örneklerin iddia etmediği şeyler

- Kanıt değildir. `confirmed` bir karar, verilen kanıt içinde karşı örnek bulunamadığı anlamına gelir.
- Birebir yeniden üretilebilir değildir. Model sürümleri değişir; buradaki çalıştırmalardan ikisi ikinci bir deneme gerektirdi.
- Hiçbir modelin onayı değildir. Bir sağlayıcı adı hiçbir zaman kalite garantisi değildir — Cursor adaptörü dogfood'undaki art arda iki exit `6` sonucuna bakın.

## İlgili sayfalar

- [Belgelendirme dizini](../README.md)
- [JSON ve çıkış kodu sözleşmesi](../json-contract.md)
- [Sağlayıcı adaptörleri](../provider-adapters.md)
- [Güvenlik politikası](../security.md)
