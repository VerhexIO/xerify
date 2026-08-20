[English](../../../examples/dogfood-package-boundary.md) · [Türkçe](../../tr/examples/dogfood-package-boundary.md) · **Deutsch** · [简体中文](../../zh-CN/examples/dogfood-package-boundary.md) · [Español](../../es/examples/dogfood-package-boundary.md) · [Français](../../fr/examples/dogfood-package-boundary.md)

# Dogfooding: was das veröffentlichte npm-Paket tatsächlich enthält

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify verifiziert eine Behauptung über die eigene Distributionsgrenze, anhand eines generierten
Belegs statt einer menschlichen Zusammenfassung.

- Deklarierte Quelle: `openai:gpt-5.6-sol`
- Verifizierer: `anthropic:claude-fable-5` über den `claude`-Adapter
- Belege: [dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- Beobachtet am 2026-08-20: `confirmed`, Exit `0`

## Behauptung

> Der mitgelieferte npm-Dry-Run-Beleg für xverify-cli@0.1.1 meldet jeden gelisteten erforderlichen
> Runtime- und Tool-Pfad als vorhanden, meldet keinen Paketpfad, der einer der gelisteten
> internen, Dokumentations- oder lokalen Zustands-Verbotsregeln entspricht, und meldet null
> Source-Map-Dateien.

## Reproduktion

Zuerst den Beleg neu erzeugen – `entryCount` und `unpackedSize` ändern sich bei jeder
Dokumentationsänderung:

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

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

Bemerkenswert ist, wie eng die Behauptung gefasst ist: Es geht um **was der Beleg meldet**, nicht
darum, was die Registry tatsächlich ausliefert. Genau diese Eingrenzung macht sie überhaupt
verifizierbar. Eine Behauptung wie "das veröffentlichte Paket enthält keine Quelldateien" wäre aus
diesen Belegen nicht verifizierbar, weil die Belege ein lokaler Dry-Run sind.

Das `low`-Finding ist der Verifizierer, der genau diese Grenze von der anderen Seite bewacht. Er
stellte fest, dass sich `forbiddenMatches: []` nicht unabhängig nachrechnen lässt, weil der Beleg
16 Einträge auf oberster Ebene listet, aber 109 Dateien insgesamt. Er vertraut also der eigenen
Aussage des Belegs – und hat das ausdrücklich gesagt, statt ein Zusammenfassungsfeld stillschweigend
als gesicherte Wahrheit zu behandeln.

Der ursprünglich angestrebte Name `xerify` wurde von npm als unscoped Name abgelehnt; die
veröffentlichte Distribution heißt `xverify-cli`, der installierte Befehl `xerify`. Der
Verifizierer prüfte, dass diese Abweichung erklärt und nicht widersprüchlich ist.

## Was es ändern würde

- **Richtung `refuted`:** irgendein Eintrag in `requiredPathsPresent` mit dem Wert `false`, oder
  ein nicht-leeres `forbiddenMatches`. Wird `src/` wieder in das `files`-Array von `package.json`
  aufgenommen, lässt sich das reproduzieren.
- **Richtung `unclear`:** ein Beleg ohne die Zusammenfassungsfelder, der dem Verifizierer keine
  Grundlage für die konkreten Aussagen der Behauptung lässt.

## Entscheidung

Als Kandidat für ein Publish-Gate weiterverwenden. Ergänzend eine Prüfung einsetzen, die
`forbiddenMatches` aus der vollständigen Dateiliste neu berechnet, da der Verifizierer zu Recht
darauf hinwies, dass er das aus diesen Belegen nicht konnte.
