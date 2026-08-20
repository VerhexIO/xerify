[English](../../../examples/game-design.md) · [Türkçe](../../tr/examples/game-design.md) · **Deutsch** · [简体中文](../../zh-CN/examples/game-design.md) · [Español](../../es/examples/game-design.md) · [Français](../../fr/examples/game-design.md)

# Produktionsplan für ein Spiel: die Rechnung geht bei den Randbedingungen nicht auf

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Ein Zweierteam, zehn Wochen, eine fixe Feature-Liste und keine Erlaubnis, irgendetwas zu
streichen. Die Behauptung lautet, dass das funktioniert. Die Kapazitätsrechnung sagt etwas
anderes.

Dieses Beispiel dokumentiert außerdem einen **echten Reproduktionsfehler** – siehe "Ein Hinweis
zur Reproduzierbarkeit" unten.

- Deklarierte Quelle: `openai:gpt-5.6-sol`
- Verifizierer: `cursor:cursor-grok-4.6-high-fast` über den `cursor`-Adapter
- Belege: [game-design.md](../../../examples/evidence/game-design.md)
- Beobachtet am 2026-08-20: `refuted`, Exit `10` (zweiter Versuch; siehe unten)

## Behauptung

> Der komplette Launch-Umfang lässt sich vom Zweierteam innerhalb von zehn Wochen liefern, ohne
> Überstunden, externe Kräfte, Feature-Kürzungen oder eine Verlängerung des Zeitplans.

## Reproduktion

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## Beobachtetes normalisiertes Ergebnis

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## Warum dieses Urteil

Das ist die sauberste Art der Widerlegung: Die Behauptung und ihre eigenen Randbedingungen
widersprechen sich intern, und der Widerspruch ist arithmetisch, keine Ermessensfrage. 800
verfügbare Stunden können 1.120 benötigte Stunden nicht auffangen, wenn dasselbe Dokument jeden
Ausweg verschließt.

Der Verifizierer lehnte auch die naheliegendste Rettung ab – "vielleicht sind sie einfach
schneller als geschätzt" –, weil die Belege das Team im riskantesten Teil des Umfangs als
unerfahren ausweisen. Optimismus ist kein Beleg.

## Was es ändern würde

- **Richtung `confirmed`:** eine Neuschätzung unter 800 Stunden _einschließlich_ der
  20-%-Reserve, oder der Wegfall einer der vier Randbedingungen. Ein drittes Teammitglied, eine
  Verlängerung auf vierzehn Wochen oder das Streichen eines Features ergeben jeweils eine andere,
  überprüfbare Behauptung.
- **Richtung `unclear`:** eine als Spanne angegebene Schätzung ohne genannte Konfidenz, bei der
  die untere Grenze innerhalb der Kapazität liegt.

## Entscheidung

Blockieren. Vor der Terminzusage neu planen. Die Widerlegung benennt vier konkrete
Stellschrauben, von denen jede einzelne eine bestehensfähige Behauptung ergeben würde.

## Ein Hinweis zur Reproduzierbarkeit

Der obige Befehl wurde zweimal unverändert ausgeführt. Der erste Versuch lieferte Exit `6`
(`INVALID_PROVIDER_RESPONSE`) – das Modell gab nicht das geforderte JSON aus. Der zweite Versuch
lieferte das hier gezeigte Urteil mit Exit `10`. Beide Runs sind in der lokalen Run-Historie mit
identischen Hashes für Statement und Belege festgehalten.

Der `cursor`-Adapter hat keine providerseitige Schema-Durchsetzung; seine Spalte zur
strukturierten Verifikation in der [Adaptermatrix](../provider-adapters.md) lautet "Prompt-Vertrag;
Validierung durch den Core". Exit `6` von `cursor`- oder `command`-Adaptern als wiederholbar
behandeln, die Anzahl der Versuche begrenzen und nie ein Urteil wiederholen, das einem schlicht
nicht gefallen hat. Siehe
[Fehlerarten](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes).
