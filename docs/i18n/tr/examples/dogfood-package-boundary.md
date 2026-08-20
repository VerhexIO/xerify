[English](../../../examples/dogfood-package-boundary.md) · **Türkçe** · [Deutsch](../../de/examples/dogfood-package-boundary.md) · [简体中文](../../zh-CN/examples/dogfood-package-boundary.md) · [Español](../../es/examples/dogfood-package-boundary.md) · [Français](../../fr/examples/dogfood-package-boundary.md)

# Dogfood: yayımlanan npm paketinde gerçekte ne var

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, bir insan özeti yerine üretilmiş bir makbuz kullanarak kendi dağıtım sınırı hakkındaki bir iddiayı doğruluyor.

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `claude` adaptörü üzerinden `anthropic:claude-fable-5`
- Kanıt: [dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- 2026-08-20 tarihinde gözlemlendi: `confirmed`, exit `0`

## İddia

> xverify-cli@0.1.1 için verilen npm dry-run makbuzu, listelenen her gerekli çalışma zamanı ve araç
> yolunu mevcut olarak bildirir, listelenen içsel, belgelendirme veya yerel-durum yasak
> kurallarından hiçbirine uyan bir paket yolu bildirmez ve sıfır source map dosyası bildirir.

## Yeniden üretim

Önce makbuzu yeniden üretin — belgeler her değiştiğinde `entryCount` ve `unpackedSize` de değişir:

```sh
npm pack --dry-run --json --ignore-scripts
```

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.1 reports every listed required runtime and tool path as present, reports no package path matching its listed internal, documentation or local-state forbidden rules, and reports zero source map files." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.1 reports exactly what the bounded claim states: all six paths in requiredPathsPresent are true; forbiddenMatches is an empty array against the 16 listed internal/documentation/local-state rules; and sourceMapCount is 0. An independent cross-check of the 16 topLevelEntries against the forbiddenPathRules yields no match, so the receipt is internally consistent.",
  "materialFindings": [
    "[info] All six requiredPathsPresent entries are reported true, covering the runtime entry, schema, skill, postinstall script, mock-provider tool, and README.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the 16 forbiddenPathRules yields no match.",
    "[info] sourceMapCount is 0, matching the claim of zero source map files.",
    "[low] The receipt enumerates only the 16 top-level entries of 109 total, so forbiddenMatches is accepted as the receipt's own computed report rather than independently recomputed."
  ]
}
```

## Bu kararın nedeni

İddianın ne kadar dikkatli sınırlandırıldığına bakın: konu, registry'nin sunduğu şey değil, **makbuzun bildirdiği şey**. Onu baştan doğrulanabilir kılan da tam olarak bu sınırlandırma. "Yayımlanan pakette hiçbir kaynak dosyası yok" gibi bir iddia, bu kanıttan doğrulanamazdı, çünkü kanıt yerel bir dry run'dır.

`low` findings, doğrulayıcının bu sınırı diğer taraftan denetlemesidir. `forbiddenMatches: []` alanının bağımsız olarak yeniden hesaplanamayacağını gözlemledi, çünkü makbuz 16 üst düzey girdi listeliyor ama toplamda 109 dosya var. Yani makbuzun kendi iddiasına güveniyor — ve bir özet alanını sessizce mutlak doğru olarak kabul etmek yerine bunu açıkça söyledi.

Aday isim `xerify`, kapsamsız bir isim olarak npm tarafından reddedildi; yayımlanan dağıtım `xverify-cli`, kurulu çalıştırılabilir dosya ise `xerify`'dir. Doğrulayıcı, bu tutarsızlığın çelişkili değil açıklanmış olduğunu kontrol etti.

## Kararı ne değiştirirdi

- **`refuted`'e doğru:** `requiredPathsPresent` içindeki herhangi bir girdinin `false` bildirmesi, ya da boş olmayan bir `forbiddenMatches`. `package.json` içindeki `files` dizisine `src/`'i geri eklemek bunu yeniden üretir.
- **`unclear`'a doğru:** özet alanları kaldırılmış bir makbuz; bu, doğrulayıcıyı iddianın özgül savları için hiçbir dayanak bırakmadan bırakır.

## Karar

Bir yayımlama eşiği adayı olarak ilerleyin. Bunu, `forbiddenMatches`'i tam dosya listesinden yeniden hesaplayan bir kontrolle eşleştirin; çünkü doğrulayıcı bunu bu kanıttan yapamayacağını doğru biçimde işaretledi.
