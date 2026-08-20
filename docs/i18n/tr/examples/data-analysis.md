[English](../../../examples/data-analysis.md) · **Türkçe** · [Deutsch](../../de/examples/data-analysis.md) · [简体中文](../../zh-CN/examples/data-analysis.md) · [Español](../../es/examples/data-analysis.md) · [Français](../../fr/examples/data-analysis.md)

# Veri analizi: katmanlara ayrıldığında tersine dönen bir toplam

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Manşet rakam, B varyantının fark atarak kazandığını söylüyor. Cihaza göre ayırınca B, masaüstünde kaybediyor. Bu, Simpson paradoksu ve kendi panolarınızda karşınıza çıkma ihtimali en yüksek örnek.

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `cursor` adaptörü üzerinden `cursor:cursor-grok-4.6-high-fast`
- Kanıt: [data-analysis.md](../../../examples/evidence/data-analysis.md)
- 2026-08-20 tarihinde gözlemlendi: `refuted`, exit `10`

## İddia

> B varyantı, kullanıcılar için dönüşümü nedensel olarak iyileştiriyor ve toplam sonuca dayanarak
> tüm mobil ve masaüstü trafiğine yaygınlaştırılmalıdır.

## Yeniden üretim

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "The aggregate B win is a mix-shift artifact, not a causal improvement. Device allocation is severely imbalanced; B is worse on desktop and only trivially higher on a small mobile sample. A universal rollout from the aggregate rate is contradicted by the stratified table.",
  "materialFindings": [
    "[critical] Simpson's paradox: B's aggregate conversion (64.92% vs 20.83%) is explained by B receiving most high-converting desktop traffic, not by a within-device treatment effect.",
    "[critical] Desktop counterexample: B converts at 76.0% versus A's 80.0%, so rolling B to all desktop traffic would be expected to reduce conversion in that segment.",
    "[high] Mobile does not support a rollout decision: B is 0.5pp higher on 200 visitors versus A's 1,000, with no uncertainty interval.",
    "[high] No identification evidence for a causal claim: no randomization receipt, sample-ratio-mismatch check, interval estimate, or mix adjustment. Device share is 83.3% mobile for A versus 16.7% for B."
  ]
}
```

## Bu kararın nedeni

İddia, üç ayrı savı bir arada sunuyor — B'nin dönüşümü iyileştirdiğini, bu iyileşmenin _nedensel_ olduğunu ve buradan evrensel bir yaygınlaştırmanın çıktığını. Doğrulayıcı her birine ayrı ayrı saldırdı ve mümkün olan en güçlü itirazı buldu: **verilen verinin içinde doğrudan bir karşı örnek**. B, masaüstünde daha kötü.

%64,92'ye karşı %20,83'lük toplam, yanlış bir aritmetik değil; karışık bir dağılım üzerinden yapılmış doğru bir hesaplama. "Bu rakam doğru mu?" sorusunu doğrulamak geçerdi. "Bu rakam bu kararı destekliyor mu?" sorusunu doğrulamak ise geçmiyor.

## Kararı ne değiştirirdi

- **`confirmed`'e doğru:** bir randomizasyon kanıtı, bir örneklem-oranı-uyuşmazlığı kontrolü, cihaz başına aralık tahminleri ve her iki segmentte de pozitif olan bir cihaz-içi etki. İddianın ayrıca daraltılması gerekir — "dönüşümü iyileştiriyor" ile "her yere yaygınlaştırılmalı" aynı iddia değildir.
- **`unclear`'a doğru:** geniş aralıklarla dengeli bir dağılım. O zaman veri, şu anda yaptığı gibi iddiayla çelişmek yerine, onu ne destekler ne de onunla çelişirdi.

## Karar

Evrensel yaygınlaştırmayı engelleyin. Katmanlı tablo, iddianın kendi önerisine karşı bir karşı örnek içeriyor. Yalnızca mobil bir yaygınlaştırma farklı bir iddiadır ve kendi doğrulamasını gerektirir.
