[English](../../../examples/dogfood-cursor-adapter.md) · **Türkçe** · [Deutsch](../../de/examples/dogfood-cursor-adapter.md) · [简体中文](../../zh-CN/examples/dogfood-cursor-adapter.md) · [Español](../../es/examples/dogfood-cursor-adapter.md) · [Français](../../fr/examples/dogfood-cursor-adapter.md)

# Dogfood: Xerify'in kendi Cursor adaptörünü doğrulamak

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, kendi kaynak kodu hakkında bir iddiayı kontrol ediyor. İlginç olan kısım kararın kendisi değil — ilk iki denemenin hiçbir karar üretmemiş olması.

- Beyan edilen yazar: `anthropic:claude-opus-5`
- Doğrulayıcı: `codex` adaptörü üzerinden `openai:gpt-5.6-sol`
- Kanıt: [dogfood-cursor-adapter.md](../../../examples/evidence/dogfood-cursor-adapter.md)
- 2026-08-20 tarihinde gözlemlendi: `confirmed`, exit `0`

## İddia

> CursorAdapter, model önekinden çıkarım yapmadan sağlayıcı olarak cursor'ı bildirir ve Cursor
> sürecini başlatmadan önce auto modelini reddeder.

## Yeniden üretim

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The supplied snippets adequately support the bounded claim: provider identity is returned explicitly as \"cursor\", and the exact \"auto\" model is rejected before temporary-workspace creation or the documented process-invocation point. No material counterexample appears within the supplied evidence.",
  "materialFindings": [
    "[low] The model normalization is narrower than it may appear: values such as \"auto [suffix]\" leave trailing whitespace before comparison and may bypass the gate. This does not contradict rejection of the exact tested value \"auto\", but it could be a regression path if annotated model strings are valid inputs.",
    "[info] The process-prevention test indirectly demonstrates non-execution because the configured executable cannot resolve, while the source ordering directly places validation before workspace and process creation."
  ]
}
```

## Bu kararın nedeni

Burada `confirmed`, dar ve tam olarak ifade edilmeye değer bir şey ifade ediyor: _verilen alıntılar içinde_, sınırlı iddiaya karşı bir karşı örnek bulunamadı. Bu, adaptörün bir denetimi değildir ve bir kanıt da değildir.

Değerli olan çıktı, kimsenin istemediği `low` findings'idir. Doğrulayıcı, model normalleştirmesinin `[` üzerinden bölündüğünü ve kırpma yaptığını fark etti; bu yüzden `auto [something]` gibi bir değer, eşiğin karşılaştırdığı tam dizeye normalleşmeyebilir. Bu varsayımsal bir regresyon yolu, mevcut bir hata değil — ama bir ikinci görüşün var olma nedeni tam da bu tür bir gözlemi ortaya çıkarmaktır.

`confirmed`'i _"gönderdiğinizde karşı örnek bulunamadı"_ olarak okuyun, asla _"doğru"_ olarak değil.

## Kararı ne değiştirirdi

- **`refuted`'e doğru:** `CursorAdapter`'ın sağlayıcı kimliğini model kimliğinden türettiği, ya da `auto` reddinin süreç başlatıldıktan sonra çalıştığı bir kaynak yolu.
- **`unclear`'a doğru:** birincil kaynak alıntıları yerine yalnızca adaptörün düz metin açıklamalarını sağlamak. Hazırlık sırasında, yalnızca düz metin içeren bir dogfood denemesi tam bu nedenle `unclear` döndürdü — Xerify, makul bir mimari açıklamayı kanıta dönüştürmez.

## Doğrulayıcı seçimi üzerine bir not

Bu iddia Cursor adaptörüyle ilgili, bu yüzden onu Cursor _üzerinden_ doğrulamak özgün tasarımdı. Bu işe yaramadı. `cursor:cursor-grok-4.6-high-fast`'e karşı art arda iki deneme exit `6` (`INVALID_PROVIDER_RESPONSE`) döndürdü; model hiçbir zaman gereken JSON'ı üretmedi. İddia, şema zorlayan `codex` adaptörüne yeniden yönlendirildi ve bu, ilk denemede bir karar üretti.

Bir iddianın konusu ile onu doğrulayan kanal, birbirinden bağımsız seçimlerdir. Bir kararın makine tarafından tüketilmesi gerektiğinde, çıktı şemasını sağlayıcı tarafında sabitleyen bir adaptörü tercih edin. Bkz. [başarısızlık modları](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6).

## Karar

Bir aday olarak ilerleyin. `low` findings'ini bir kusur değil, olası bir sağlamlaştırma maddesi olarak takip edin.
