[English](../../../examples/game-design.md) · **Türkçe** · [Deutsch](../../de/examples/game-design.md) · [简体中文](../../zh-CN/examples/game-design.md) · [Español](../../es/examples/game-design.md) · [Français](../../fr/examples/game-design.md)

# Oyun prodüksiyon planı: aritmetik kısıtlara uymuyor

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

İki kişilik bir ekip, on hafta, sabit bir özellik listesi ve hiçbir şeyi kesme izni yok. İddia, bunun işe yarayacağı yönünde. Kapasite aritmetiği ise tam tersini söylüyor.

Bu örnek ayrıca **gerçek bir yeniden üretim başarısızlığını** da belgeliyor — aşağıdaki "Yeniden üretilebilirlik üzerine bir not" bölümüne bakın.

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `cursor` adaptörü üzerinden `cursor:cursor-grok-4.6-high-fast`
- Kanıt: [game-design.md](../../../examples/evidence/game-design.md)
- 2026-08-20 tarihinde gözlemlendi: `refuted`, exit `10` (ikinci deneme; aşağıya bakın)

## İddia

> Tam lansman kapsamı, iki kişilik ekip tarafından on hafta içinde; fazla mesai, taşeron, özellik
> kesintisi veya takvim uzatması olmadan teslim edilebilir.

## Yeniden üretim

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## Bu kararın nedeni

Bu, en temiz çürütme türü: iddia, kendi kısıtlarıyla içsel olarak tutarsız, ve bu çelişki bir yargı meselesi değil, aritmetik bir mesele. Aynı belge her çıkış kapısını kapattığında, 800 mevcut saat, 1.120 gereken saati karşılayamaz.

Doğrulayıcı ayrıca en cazip kurtarma yolunu da reddetti — "belki de tahmin edilenden daha hızlı olurlar" — çünkü kanıt, ekibin en riskli kapsamda deneyimsiz olduğunu söylüyor. İyimserlik kanıt değildir.

## Kararı ne değiştirirdi

- **`confirmed`'e doğru:** %20'lik rezerv _dahil_ 800 saatin altında yeni bir tahmin, ya da dört kısıttan birinin kaldırılması. Üçüncü bir mühendis eklemek, on dört haftaya uzatmak ya da bir özelliği kesmek, her biri farklı, doğrulanabilir bir iddia üretir.
- **`unclear`'a doğru:** belirtilmiş bir güven düzeyi olmadan bir aralık olarak verilen ve alt sınırı kapasiteye sığan bir tahmin.

## Karar

Engelleyin. Bir tarihe bağlanmadan önce yeniden planlayın. Çürütme, dört somut kolu adlandırıyor; bunlardan herhangi biri geçebilecek bir iddia üretir.

## Yeniden üretilebilirlik üzerine bir not

Yukarıdaki komut, değiştirilmeden iki kez çalıştırıldı. İlk deneme exit `6` (`INVALID_PROVIDER_RESPONSE`) döndürdü — model gereken JSON'ı üretmedi. İkinci deneme ise burada gösterilen exit `10` kararını döndürdü. Her iki çalıştırma da, aynı kayıtlı ifade ve kanıt hash'leriyle birlikte yerel çalıştırma geçmişine kaydedildi.

`cursor` adaptöründe sağlayıcı tarafında bir şema zorlaması yoktur; [yerleşik adaptör matrisindeki](../provider-adapters.md) yapılandırılmış doğrulama sütunu "prompt sözleşmesi; çekirdek doğrulama" yazar. `cursor` veya `command` adaptörlerinden gelen exit `6`'yı yeniden denenebilir sayın, deneme sayınızı sınırlayın ve sadece hoşunuza gitmeyen bir kararı asla yeniden denemeyin. Bkz. [başarısızlık modları](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes).
