[English](../../../examples/data-analysis.md) · [Türkçe](../../tr/examples/data-analysis.md) · **Deutsch** · [简体中文](../../zh-CN/examples/data-analysis.md) · [Español](../../es/examples/data-analysis.md) · [Français](../../fr/examples/data-analysis.md)

# Datenanalyse: ein Aggregat, das sich bei Stratifizierung umkehrt

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Die Schlagzeilenzahl sagt: Variante B gewinnt haushoch. Nach Gerät aufgeschlüsselt verliert B auf
Desktop. Das ist das Simpson-Paradoxon, und es ist das Beispiel, das am ehesten auch in den
eigenen Dashboards auftaucht.

- Deklarierte Quelle: `openai:gpt-5.6-sol`
- Verifizierer: `cursor:cursor-grok-4.6-high-fast` über den `cursor`-Adapter
- Belege: [data-analysis.md](../../../examples/evidence/data-analysis.md)
- Beobachtet am 2026-08-20: `refuted`, Exit `10`

## Behauptung

> Variante B verbessert die Conversion der Nutzer ursächlich und sollte aufgrund des
> Gesamtergebnisses für den gesamten Mobil- und Desktop-Traffic ausgerollt werden.

## Reproduktion

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

Die Behauptung bündelt drei Aussagen: dass B die Conversion verbessert, dass diese Verbesserung
_ursächlich_ ist und dass daraus ein flächendeckender Rollout folgt. Der Verifizierer griff jede
einzeln an und fand den stärksten möglichen Einwand: ein **direktes Gegenbeispiel in den
mitgelieferten Daten**. B schneidet auf Desktop schlechter ab.

Das Aggregat von 64,92 % gegenüber 20,83 % ist keine falsche Rechnung; es ist eine korrekte
Berechnung über eine konfundierte Verteilung. Die Frage "stimmt diese Zahl?" hätte bestanden. Die
Frage "stützt diese Zahl diese Entscheidung?" besteht nicht.

## Was es ändern würde

- **Richtung `confirmed`:** ein Nachweis der Randomisierung, eine Sample-Ratio-Mismatch-Prüfung,
  Konfidenzintervalle je Gerät sowie ein Effekt innerhalb jedes Geräts, der in beiden Segmenten
  positiv ist. Auch die Behauptung selbst müsste enger gefasst werden – "verbessert die
  Conversion" ist nicht dieselbe Behauptung wie "sollte überall ausgerollt werden".
- **Richtung `unclear`:** eine ausgewogene Verteilung mit breiten Konfidenzintervallen. Dann
  würden die Daten die Behauptung weder stützen noch widerlegen, statt ihr wie jetzt zu
  widersprechen.

## Entscheidung

Den flächendeckenden Rollout blockieren. Die stratifizierte Tabelle enthält ein Gegenbeispiel zur
eigenen Empfehlung der Behauptung. Ein rein mobiler Rollout ist eine andere Behauptung und braucht
eine eigene Verifikation.
