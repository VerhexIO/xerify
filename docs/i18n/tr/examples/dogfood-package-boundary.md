[English](../../../examples/dogfood-package-boundary.md) · **Türkçe** · [Deutsch](../../de/examples/dogfood-package-boundary.md) · [简体中文](../../zh-CN/examples/dogfood-package-boundary.md) · [Español](../../es/examples/dogfood-package-boundary.md) · [Français](../../fr/examples/dogfood-package-boundary.md)

# Dogfood: yayımlanan npm paketinde gerçekte ne var

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, bir insan özeti yerine üretilmiş bir makbuz kullanarak kendi dağıtım sınırı hakkındaki bir iddiayı doğruluyor.

- Beyan edilen yazar: `openai:gpt-5.6-sol`
- Doğrulayıcı: `claude` adaptörü üzerinden `anthropic:claude-fable-5`
- Kanıt: [dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- 2026-08-20 tarihinde gözlemlendi: `confirmed`, exit `0`

## İddia

> xverify-cli@0.1.0 için verilen npm dry-run makbuzu, listelenen her gerekli çalışma zamanı, örnek
> ve yerelleştirme yolunu mevcut olarak bildirir ve listelenen içsel veya yerel-durum yasak
> kurallarından hiçbirine uyan bir paket yolu bildirmez.

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
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime, example, and localization path as present, and reports no package path matching its listed internal or local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Gözlemlenen normalleştirilmiş sonuç

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.0 lists eight required paths under requiredPathsPresent and reports every one as true. Its forbiddenMatches array is empty against the fourteen listed forbidden rules, and none of the sixteen topLevelEntries matches any forbidden rule such as src/, tests/, .github/, .xerify/, AGENTS.md, or CONTRIBUTING.md.",
  "materialFindings": [
    "[info] All eight required paths are reported present, covering runtime, example, and localization categories.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the fourteen rules yields no match.",
    "[low] The receipt shows entryCount 229 but enumerates only 16 top-level entries, so forbiddenMatches cannot be independently recomputed from a full file manifest; it can only be read as the receipt's own report.",
    "[info] The name discrepancy between the pre-publication candidate name xerify and the published name xverify-cli is explained in the evidence prose and does not contradict the claim."
  ]
}
```

## Bu kararın nedeni

İddianın ne kadar dikkatli sınırlandırıldığına bakın: konu, registry'nin sunduğu şey değil, **makbuzun bildirdiği şey**. Onu baştan doğrulanabilir kılan da tam olarak bu sınırlandırma. "Yayımlanan pakette hiçbir kaynak dosyası yok" gibi bir iddia, bu kanıttan doğrulanamazdı, çünkü kanıt yerel bir dry run'dır.

`low` findings, doğrulayıcının bu sınırı diğer taraftan denetlemesidir. `forbiddenMatches: []` alanının bağımsız olarak yeniden hesaplanamayacağını gözlemledi, çünkü makbuz 16 üst düzey girdi listeliyor ama toplamda 229 dosya var. Yani makbuzun kendi iddiasına güveniyor — ve bir özet alanını sessizce mutlak doğru olarak kabul etmek yerine bunu açıkça söyledi.

Aday isim `xerify`, kapsamsız bir isim olarak npm tarafından reddedildi; yayımlanan dağıtım `xverify-cli`, kurulu çalıştırılabilir dosya ise `xerify`'dir. Doğrulayıcı, bu tutarsızlığın çelişkili değil açıklanmış olduğunu kontrol etti.

## Kararı ne değiştirirdi

- **`refuted`'e doğru:** `requiredPathsPresent` içindeki herhangi bir girdinin `false` bildirmesi, ya da boş olmayan bir `forbiddenMatches`. `package.json` içindeki `files` dizisine `src/`'i geri eklemek bunu yeniden üretir.
- **`unclear`'a doğru:** özet alanları kaldırılmış bir makbuz; bu, doğrulayıcıyı iddianın özgül savları için hiçbir dayanak bırakmadan bırakır.

## Karar

Bir yayımlama eşiği adayı olarak ilerleyin. Bunu, `forbiddenMatches`'i tam dosya listesinden yeniden hesaplayan bir kontrolle eşleştirin; çünkü doğrulayıcı bunu bu kanıttan yapamayacağını doğru biçimde işaretledi.
