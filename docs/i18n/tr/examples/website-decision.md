[English](../../../examples/website-decision.md) · **Türkçe** · [Deutsch](../../de/examples/website-decision.md) · [简体中文](../../zh-CN/examples/website-decision.md) · [Español](../../es/examples/website-decision.md) · [Français](../../fr/examples/website-decision.md)

# Web sitesi kararı: matris diğer seçeneği işaret ediyor

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Bir mimari karar, bir kazanan olduğunu iddia ediyor. Onaylanmış puanlama matrisi ise tam tersini söylüyor, hem de iki kez — bir kez toplamlarda, bir kez de bir eşik koşulunda (gate).

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `claude` adaptörü üzerinden `anthropic:claude-fable-5`
- Kanıt: [website-decision.md](../../../examples/evidence/website-decision.md)
- 2026-08-20 tarihinde gözlemlendi: `refuted`, exit `10`

## İddia

> Onaylanmış ağırlıklı karar matrisine göre, özel bir veritabanına sahip özel SSR uygulaması seçilen
> web sitesi mimarisidir.

## Yeniden üretim

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Recomputing the approved weighted matrix confirms the stated totals: the managed static build + headless CMS scores 4.8 while the custom SSR app + database scores 3.3, so the matrix selects the static option by 1.5 points. The SSR option also scores 2 on operational burden, below the gate threshold of 3, with no documented exception.",
  "materialFindings": [
    "[high] Weighted totals directly contradict the claim: 4.8 versus 3.3 under the approved scoring rule.",
    "[medium] The SSR option is independently blocked by the operational-burden gate: it scores 2 against a threshold of 3, and the evidence states no documented exception exists.",
    "[info] The only criterion where SSR wins is editorial workflow (5 vs 4, weight 20), insufficient to offset security exposure, operational burden, and cost predictability."
  ]
}
```

## Bu kararın nedeni

Doğrulayıcı, matris toplamlarını körü körüne kabul etmedi — bunları kriter başına puanlardan ve ağırlıklardan **yeniden hesapladı** ve iddiayla çelişmeden önce aritmetiği doğruladı. Bu ayrım önemli: yalnızca çelişen bir rakamı aktaran bir çürütme, hesaplamayı yeniden üreten bir çürütmeden daha zayıftır.

Ardından ikinci, bağımsız bir gerekçe daha buldu. Toplamlar birbirine yakın olsaydı bile, SSR seçeneği operasyonel yük eşiğini kendi başına geçemiyor. Aynı sonuç için birbiriyle ilişkisiz iki gerekçe, bu çürütmeyi tek bir puanlama hatasına karşı sağlam kılıyor.

## Kararı ne değiştirirdi

- **`confirmed`'e doğru:** SSR'nin editoryal iş akışı avantajının eksiklerine ağır bastığı yeni bir ağırlık kümesi, _ve_ operasyonel yük eşiğine belgelenmiş bir istisna. İkisi de gerekli — yalnızca toplamları geçmek, eşik koşulunu hâlâ ayakta bırakır.
- **`unclear`'a doğru:** matrisin yerini başka bir şeyin aldığına ya da ağırlıkların onay durumunun tartışmalı olduğuna dair kanıt.

## Karar

Engelleyin. İddia, onaylanmış karar kaydıyla çelişiyor. Ya statik seçeneği seçin, ya da matrisi onu onaylayan süreç her neyse o süreçle değiştirin — ama kaydın desteklemediği bir kararı asla hayata geçirmeyin.
