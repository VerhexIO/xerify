[English](../../../examples/dogfood-cursor-adapter.md) · [Türkçe](../../tr/examples/dogfood-cursor-adapter.md) · **Deutsch** · [简体中文](../../zh-CN/examples/dogfood-cursor-adapter.md) · [Español](../../es/examples/dogfood-cursor-adapter.md) · [Français](../../fr/examples/dogfood-cursor-adapter.md)

# Dogfooding: der eigene Cursor-Adapter von Xerify wird verifiziert

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify prüft eine Behauptung über den eigenen Quellcode. Das Interessante daran ist nicht das
Urteil, sondern dass die ersten beiden Versuche gar keins lieferten.

- Deklarierte Quelle: `anthropic:claude-opus-5`
- Verifizierer: `openai:gpt-5.6-sol` über den `codex`-Adapter
- Belege: [dogfood-cursor-adapter.md](../../../examples/evidence/dogfood-cursor-adapter.md)
- Beobachtet am 2026-08-20: `confirmed`, Exit `0`

## Behauptung

> CursorAdapter meldet den Provider cursor ohne Ableitung aus dem Modell-Präfix und lehnt das
> Modell auto ab, bevor der Cursor-Prozess startet.

## Reproduktion

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Beobachtetes normalisiertes Ergebnis

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

## Warum dieses Urteil

`confirmed` bedeutet hier etwas Enges, das sich präzise formulieren lässt: _innerhalb der
mitgelieferten Ausschnitte_ wurde kein Gegenbeispiel zur begrenzten Behauptung gefunden. Das ist
kein Audit des Adapters und kein Beweis.

Der eigentliche Mehrwert ist das `low`-Finding, um das niemand gebeten hatte. Der Verifizierer
bemerkte, dass die Modellnormalisierung an `[` teilt und trimmt, sodass ein Wert wie
`auto [something]` möglicherweise nicht auf den exakten String normalisiert wird, gegen den die
Sperre vergleicht. Das ist ein hypothetischer Regressionspfad, kein bestehender Fehler – aber genau
die Art von Beobachtung, für die eine Zweitmeinung da ist.

`confirmed` als _"kein Gegenbeispiel im Gesendeten gefunden"_ lesen, nie als _"korrekt"_.

## Was es ändern würde

- **Richtung `refuted`:** ein Codepfad, in dem `CursorAdapter` seine Provider-Identität aus der
  Modell-ID ableitet, oder in dem die Ablehnung von `auto` erst nach dem Prozessstart läuft.
- **Richtung `unclear`:** nur Prosa-Beschreibungen des Adapters statt Ausschnitte aus dem
  Primärquellcode liefern. Während der Vorbereitung lieferte ein rein prosabasierter
  Dogfooding-Versuch genau aus diesem Grund `unclear` – Xerify macht aus einer plausiblen
  Architekturbeschreibung keinen Beweis.

## Ein Hinweis zur Wahl des Verifizierers

Diese Behauptung handelt vom Cursor-Adapter, deshalb war die Verifikation _durch_ Cursor selbst
der ursprüngliche Plan. Das funktionierte nicht. Zwei aufeinanderfolgende Versuche gegen
`cursor:cursor-grok-4.6-high-fast` lieferten Exit `6` (`INVALID_PROVIDER_RESPONSE`); das Modell gab
nie das geforderte JSON aus. Die Behauptung wurde daraufhin auf den schema-durchsetzenden
`codex`-Adapter umgelenkt, der beim ersten Versuch ein Urteil lieferte.

Der Gegenstand einer Behauptung und der Kanal, der sie verifiziert, sind unabhängige
Entscheidungen. Muss ein Urteil maschinell weiterverarbeitet werden, einen Adapter bevorzugen, der
das Ausgabeschema beim Provider festlegt. Siehe
[Fehlerarten](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6).

## Entscheidung

Als Kandidat weiterverwenden. Das `low`-Finding als potenzielles Härtungsthema verfolgen, nicht
als Fehler.
