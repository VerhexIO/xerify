[English](../../../examples/website-decision.md) · [Türkçe](../../tr/examples/website-decision.md) · **Deutsch** · [简体中文](../../zh-CN/examples/website-decision.md) · [Español](../../es/examples/website-decision.md) · [Français](../../fr/examples/website-decision.md)

# Website-Entscheidung: die Matrix wählt die andere Option

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Eine Architekturentscheidung behauptet einen Gewinner. Die genehmigte Bewertungsmatrix sagt etwas
anderes – und das gleich zweimal: einmal bei den Gesamtpunkten, einmal an einer Sperrschwelle.

- Deklarierte Quelle: `openai:gpt-5.6-sol`
- Verifizierer: `anthropic:claude-fable-5` über den `claude`-Adapter
- Belege: [website-decision.md](../../../examples/evidence/website-decision.md)
- Beobachtet am 2026-08-20: `refuted`, Exit `10`

## Behauptung

> Gemäß der genehmigten gewichteten Entscheidungsmatrix ist die maßgeschneiderte SSR-Anwendung mit
> dedizierter Datenbank die gewählte Website-Architektur.

## Reproduktion

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

Der Verifizierer nahm die Gesamtpunkte der Matrix nicht einfach für bare Münze – er **rechnete sie
aus den Einzelkriterien und Gewichtungen neu nach** und bestätigte die Arithmetik, bevor er der
Behauptung widersprach. Dieser Unterschied zählt: Eine Widerlegung, die nur eine abweichende Zahl
zitiert, ist schwächer als eine, die die Berechnung reproduziert.

Anschließend fand er einen zweiten, unabhängigen Grund. Selbst wenn die Gesamtpunkte knapp
beieinandergelegen hätten, scheitert die SSR-Option schon für sich genommen an der Sperrschwelle
für operativen Aufwand. Zwei voneinander unabhängige Gründe für dieselbe Schlussfolgerung machen
diese Widerlegung robust gegenüber einem einzelnen Bewertungsfehler.

## Was es ändern würde

- **Richtung `confirmed`:** ein überarbeiteter Gewichtungssatz, unter dem der Vorteil von SSR
  beim Redaktions-Workflow die Defizite aufwiegt, _und_ eine dokumentierte Ausnahme von der
  Sperrschwelle für operativen Aufwand. Beides ist nötig – allein die Gesamtpunkte zu klären
  lässt die Sperrschwelle unangetastet.
- **Richtung `unclear`:** Belege dafür, dass die Matrix überholt ist oder der Genehmigungsstatus
  der Gewichtungen umstritten ist.

## Entscheidung

Blockieren. Die Behauptung widerspricht dem genehmigten Entscheidungsdokument. Entweder die
statische Option wählen oder die Matrix über denselben Prozess ändern, der sie ursprünglich
genehmigt hat – aber keine Entscheidung ausliefern, die das Dokument nicht stützt.
