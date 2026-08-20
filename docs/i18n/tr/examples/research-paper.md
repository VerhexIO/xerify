[English](../../../examples/research-paper.md) · **Türkçe** · [Deutsch](../../de/examples/research-paper.md) · [简体中文](../../zh-CN/examples/research-paper.md) · [Español](../../es/examples/research-paper.md) · [Français](../../fr/examples/research-paper.md)

# Araştırma makalesi: iddia edilen sonuç hiç ölçülmemiş

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Kurgusal bir çalışma, kısa vadeli bir sınav farkını raporluyor. İddia ise altı ay sonraki kalıcılıkla ilgili. Bu ikisi aynı şey değil, ve bu örneğin can alıcı noktası tam da aradaki bu fark.

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `claude` adaptörü üzerinden `anthropic:claude-fable-5`
- Kanıt: [research-paper.md](../../../examples/evidence/research-paper.md)
- 2026-08-20 tarihinde gözlemlendi: `unclear`, exit `11`, `failure: null`

## İddia

> Özel ders asistanını kullanan öğrenciler, altı ay sonra, mevcut çalışma kılavuzunu kullanan
> öğrencilere kıyasla ders materyalinin en az %15 daha fazlasını akıllarında tutuyor.

## Yeniden üretim

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "unclear",
  "exitCode": 11,
  "failure": null,
  "summary": "The claim asserts at least 15% greater retention after six months, but the supplied evidence contains no six-month measurement of any kind. The only observed outcome is a two-week quiz difference (78% vs 66%), which measures a different timeframe and construct and cannot substantiate the claim. The evidence also cannot refute the claim, since no six-month data contradicts it.",
  "materialFindings": [
    "[high] No six-month retention outcome exists in the supplied evidence, so the central quantity of the claim was never measured.",
    "[medium] The two-week quiz result is the only outcome data; extrapolating it to the claimed outcome is unjustified, with no confidence interval or adjusted analysis reported.",
    "[medium] Assignment was not randomized, so even the observed two-week difference may reflect selection effects.",
    "[medium] Differential attrition (8% vs 31%, 21 of 105 enrolled) plausibly biases the observed group difference."
  ]
}
```

## Bu kararın nedeni

`unclear`, doğru cevaptır ve saf bir entegrasyonun ele almakta en çok zorlanacağı sonuçtur.

Kanıt sessiz değil — gerçek, istatistiksel olarak göze çarpan bir sonuç içeriyor (%78'e karşı %66, yaklaşık %18,2'lik göreli bir fark, iddia edilen %15'in rahatça üzerinde). Destekleyici rakamlar bulmaya ayarlanmış bir sistem, buna `confirmed` derdi. Doğrulayıcı ise bunun yerine bu rakamın iddianın sorduğundan **farklı bir soruyu** yanıtladığını fark etti: anlık sınav performansı, altı aylık kalıcılık değildir.

Diğer yöne de savrulmadı. Kanıtta altı aylık iddiayla çelişen hiçbir şey de yok; veri basitçe mevcut değil. `refuted` da tıpkı `confirmed` kadar yanlış olurdu.

`failure` alanının `null` olduğuna dikkat edin. Bu, bir iletişim sorunu değil, kanıt hakkında verilmiş bir yargıdır. `null` olmayan bir `failure` taşıyan ve tamamen farklı bir şey ifade eden exit `11` durumları için [başarısızlık modları](failure-modes.md) sayfasına bakın.

## Kararı ne değiştirirdi

- **`confirmed`'e doğru:** raporlanmış bir etki büyüklüğü ve güven aralığı içeren altı aylık bir değerlendirme, artı ya randomize atama ya da kendi kendini seçme ve %8'e karşı %31'lik kayıp farkı için güvenilir bir düzeltme.
- **`refuted`'e doğru:** %15'in altında bir fark gösteren altı aylık bir değerlendirme.
- **Yine de `unclear`:** daha fazla iki haftalık veri eklemek. Yanlış bir uç noktadaki hassasiyeti artırmak, farklı bir uç noktayla ilgili bir iddiayı oynatmaz.

## Karar

Anlık puanı uzun vadeli kanıt olarak ele almayın. Altı aylık sonucu toplayın, ya da iddiayı insan incelemesine yönlendirin. Bu, amaçlanan `UNKNOWN → review` davranışıdır, asla `UNKNOWN → pass` değil.
