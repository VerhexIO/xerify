[English](../../../examples/research-paper.md) · [Türkçe](../../tr/examples/research-paper.md) · **Deutsch** · [简体中文](../../zh-CN/examples/research-paper.md) · [Español](../../es/examples/research-paper.md) · [Français](../../fr/examples/research-paper.md)

# Forschungspapier: das behauptete Ergebnis wurde nie gemessen

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Eine fiktive Studie berichtet einen kurzfristigen Unterschied bei einem Quiz. Die Behauptung
bezieht sich auf die Merkfähigkeit nach sechs Monaten. Das ist nicht dasselbe, und genau diese
Lücke macht das gesamte Beispiel aus.

- Deklarierte Quelle: `openai:gpt-5.6-sol`
- Verifizierer: `anthropic:claude-fable-5` über den `claude`-Adapter
- Belege: [research-paper.md](../../../examples/evidence/research-paper.md)
- Beobachtet am 2026-08-20: `unclear`, Exit `11`, `failure: null`

## Behauptung

> Studierende, die den Tutoring-Assistenten nutzen, behalten nach sechs Monaten mindestens 15 %
> mehr Lehrstoff als Studierende, die den bisherigen Lernleitfaden nutzen.

## Reproduktion

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

`unclear` ist die richtige Antwort – und zugleich die, mit der eine naive Integration am
schwersten umgehen kann.

Die Belege schweigen nicht – sie enthalten ein reales, statistisch auffälliges Ergebnis (78 %
gegenüber 66 %, eine relative Differenz von rund 18,2 %, deutlich über den behaupteten 15 %). Ein
System, das darauf trainiert ist, stützende Zahlen zu finden, hätte hier `confirmed` gemeldet. Der
Verifizierer bemerkte stattdessen, dass diese Zahl eine **andere Frage** beantwortet, als die
Behauptung stellt: unmittelbare Quiz-Leistung ist nicht dasselbe wie Merkfähigkeit nach sechs
Monaten.

Ebenso wenig schlug er in die andere Richtung aus. Auch der Behauptung über sechs Monate
widerspricht nichts in den Belegen; die Daten existieren schlicht nicht. `refuted` wäre genauso
falsch gewesen wie `confirmed`.

`failure` steht dabei auf `null`. Das ist ein inhaltliches Urteil über die Belege, kein
Transportproblem. Die Fälle mit Exit `11` und nicht-null `failure`, die etwas völlig anderes
bedeuten, stehen unter [Fehlerarten](failure-modes.md).

## Was es ändern würde

- **Richtung `confirmed`:** eine Sechs-Monats-Messung mit berichteter Effektstärke und
  Konfidenzintervall, dazu entweder randomisierte Zuteilung oder eine glaubwürdige Korrektur für
  Selbstselektion und die Abbruchlücke von 8 % gegenüber 31 %.
- **Richtung `refuted`:** eine Sechs-Monats-Messung, die eine Differenz unter 15 % zeigt.
- **Weiterhin `unclear`:** noch mehr Zwei-Wochen-Daten. Mehr Präzision beim falschen Endpunkt
  bewegt eine Behauptung über einen anderen Endpunkt nicht.

## Entscheidung

Das unmittelbare Ergebnis nicht als langfristigen Beleg behandeln. Entweder das
Sechs-Monats-Ergebnis erheben oder die Behauptung an eine menschliche Prüfung weiterleiten. Das
ist das beabsichtigte Verhalten `UNKNOWN → review`, niemals `UNKNOWN → pass`.
