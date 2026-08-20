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

> Der mitgelieferte npm-Dry-Run-Beleg für xverify-cli@0.1.0 meldet jeden gelisteten erforderlichen
> Runtime-, Beispiel- und Lokalisierungspfad als vorhanden und meldet keinen Paketpfad, der einer
> der gelisteten internen oder lokalen Zustands-Verbotsregeln entspricht.

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
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime, example, and localization path as present, and reports no package path matching its listed internal or local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

Bemerkenswert ist, wie eng die Behauptung gefasst ist: Es geht um **was der Beleg meldet**, nicht
darum, was die Registry tatsächlich ausliefert. Genau diese Eingrenzung macht sie überhaupt
verifizierbar. Eine Behauptung wie "das veröffentlichte Paket enthält keine Quelldateien" wäre aus
diesen Belegen nicht verifizierbar, weil die Belege ein lokaler Dry-Run sind.

Das `low`-Finding ist der Verifizierer, der genau diese Grenze von der anderen Seite bewacht. Er
stellte fest, dass sich `forbiddenMatches: []` nicht unabhängig nachrechnen lässt, weil der Beleg
16 Einträge auf oberster Ebene listet, aber 229 Dateien insgesamt. Er vertraut also der eigenen
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
