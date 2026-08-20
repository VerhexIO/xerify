[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · **Deutsch** · [简体中文](../../zh-CN/examples/README.md) · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Ausgearbeitete Verifikationsbeispiele

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Diese Seiten zeigen die vollständige Form von Xerify: eine begrenzte Behauptung, die Belege, die die
Maschine verlassen dürfen, ein exaktes Zielmodell, ein normalisiertes Ergebnis und die
Exit-Entscheidung, die ein Aufrufer daraus ableiten sollte.

Es handelt sich um **beobachtete Runs**, nicht um vorgefertigte Urteile. Jedes Ergebnis auf diesen
Seiten entstand durch Ausführen des gezeigten Befehls am angegebenen Datum. Eine Wiederholung ist
eine neue Verifikation, keine Garantie für ein identisches Ergebnis – ein dokumentierter Fall, in
dem derselbe Befehl zwei unterschiedliche Ergebnisse lieferte, steht unter [Fehlerarten](failure-modes.md).

## Einstieg ohne Provider-Konto

Die [Anleitung ohne Provider-Konto](no-account-walkthrough.md) reproduziert **jedes Urteil und
jeden typisierten Fehler**, ganz ohne Provider-Kontingent, mithilfe eines deterministischen
Mock-Providers, der im Paket enthalten ist. Das ist der schnellste Weg, den Exit-Code-Vertrag zu
verstehen, bevor ein echter Aufruf etwas kostet.

## Der Fehlerkatalog

[Fehlerarten](failure-modes.md) dokumentiert jedes Ergebnis ungleich `confirmed`: was es auslöst,
die exakte Ausgabe, warum es passiert und was zu ändern wäre, um ein brauchbares Ergebnis zu
erhalten. Behandelt werden eine nicht installierte Provider-CLI, eine Provider-CLI ohne **Login**,
die Ablehnung wegen desselben Providers, Cursors `auto`-Modell, Prosa statt JSON, gekürzte und
schemawidrige Antworten, Provider-Exits ungleich null, Timeouts, Ausgabekürzung und beobachtete
Schwankungen zwischen Runs.

Vor der Integration lesen. Der häufigste Integrationsfehler ist, Exit `11` als eine einzige Sache zu
behandeln, obwohl er zwei verschiedene Fälle abdeckt: ein echtes Urteil `unclear` oder einen
operativen Fehler, der denselben Urteilsstring trägt.

## Wie sich Verifikation tatsächlich anfühlt

[Dogfooding](dogfooding.md) ist ein Protokoll von 26 Runden, in denen fünf Befunde über
Xerify mit `xerify verify` gegen die Kanäle `codex` und `cursor` geprüft wurden. Neun kamen
mit `confirmed` zurück, zwei mit `refuted`, weil eine Behauptung falsch war, und zwölf mit
`unclear`, weil die Belege nicht stützten, was die Behauptung aussagte. Die Seite benennt alle
vier Ablehnungskategorien, zitiert die Einwände wörtlich und zeigt die Envelope-Form, die am
Ende bestand.

Vor der ersten eigenen Behauptung lesen. Das ist der Unterschied zwischen zwei Runden und elf.

## Live-Beispiele

Alle fünf fachlichen Szenarien sind synthetisch. Sie enthalten keine echten Teilnehmer-, Kunden-,
Analyse- oder Projektdaten. Die beiden Dogfooding-Szenarien nutzen öffentliche Belege aus dem
Xerify-Paket und -Quellcode. Die Behauptungen verwenden eine per CLI deklarierte Herkunft; Xerify
gibt nicht vor, dass diese Deklaration eine Remote-Attestierung wäre.

| Beispiel                                                                                                 | Ziel-Aufruf-Provider / Modell        | Beobachtet  | Exit |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------- | ---: |
| [Forschungspapier](research-paper.md) – das behauptete Ergebnis wurde nie gemessen                       | Anthropic / `claude-fable-5`         | `unclear`   |   11 |
| [Produktionsplan für ein Spiel](game-design.md) – die Kapazitätsrechnung geht nicht auf                  | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Website-Entscheidung](website-decision.md) – die Matrix wählt die andere Option                         | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Datenanalyse](data-analysis.md) – ein Aggregat, das sich bei Stratifizierung umkehrt                    | Cursor / `cursor-grok-4.6-high-fast` | `refuted`   |   10 |
| [Prüfung ausgehender Daten](outbound-data-policy.md) – Pseudonymisierung ist keine Autorisierung         | Anthropic / `claude-fable-5`         | `refuted`   |   10 |
| [Dogfooding: Cursor-Adapter](dogfood-cursor-adapter.md) – Xerify prüft den eigenen Quellcode             | OpenAI / `gpt-5.6-sol`               | `confirmed` |    0 |
| [Dogfooding: Grenze des npm-Pakets](dogfood-package-boundary.md) – was das veröffentlichte Paket enthält | Anthropic / `claude-fable-5`         | `confirmed` |    0 |

Fünf von sieben bestanden nicht. Genau dieses Verhältnis ist der Punkt: Ein Verifizierer, der
meistens zustimmt, liefert keinen zusätzlichen Erkenntnisgewinn.

## Ein Beispiel lesen

Jede Seite trennt sechs Dinge:

1. **Behauptung** – die zu widerlegende Aussage, keine Bitte um Zustimmung.
2. **Reproduktion** – der exakte Befehl, unverändert lauffähig.
3. **Belege** – das einzige begrenzte Material, das an den Ziel-Provider geht.
4. **Beobachtetes normalisiertes Ergebnis** – ausgewählte Felder nach dem strikten Parser von
   Xerify, nie die rohe Provider-Ausgabe.
5. **Warum dieses Urteil** – was der Verifizierer tatsächlich angegriffen hat und was eine
   schwächere Prüfung übersehen hätte.
6. **Was es ändern würde** – die konkreten Belege, die das Ergebnis in beide Richtungen kippen
   könnten.

Die Reproduktionsbefehle verbrauchen Kontingent. Zuerst die Beleg-Datei prüfen und die Modell-IDs
durch die exakten IDs ersetzen, die für das eigene Konto verfügbar sind.

## Maschinenlesbarer Katalog

[index.jsonl](../../../examples/index.jsonl) enthält pro Verifikationsbeispiel einen kompakten normalisierten
Datensatz, ein JSON-Objekt pro Zeile. Ein Agent kann darin suchen, bevor er eine Markdown-Seite
öffnet.

Bewusst ausgespart bleiben roher Provider-Transport, Ergebnis-IDs, Dauern, Konto- und
Sitzungsdaten sowie Kosten-/Nutzungsfelder.

```sh
# Jedes Beispiel, das nicht bestanden hat
grep -v '"exitCode":0' docs/examples/index.jsonl

# Alles zu ausgehenden Daten
grep -i 'outbound' docs/examples/index.jsonl
```

## Beleg-Dateien

[evidence/](../../../examples/evidence/) enthält das exakte begrenzte Material, das jede Verifikation erhalten hat.
Diese Dateien sind **hash-verankerte Verifikationsartefakte**: Die lokale Run-Historie speichert
zum Aufrufzeitpunkt einen SHA-256 der Belege, sodass eine nachträgliche Änderung der Datei die
Übereinstimmung zwischen Datensatz und Dokument zerstören würde.

Deshalb bleiben Beleg-Dateien **ausschließlich Englisch und werden nicht übersetzt**. Die
Prosa-Seiten in diesem Verzeichnis sind lokalisiert, die Belege, auf die sie verweisen, nicht.

## Was diese Beispiele nicht behaupten

- Kein Beweis. Ein Urteil `confirmed` bedeutet, dass in den mitgelieferten Belegen kein
  Gegenbeispiel gefunden wurde.
- Nicht Wort für Wort reproduzierbar. Modell-Releases ändern sich; zwei der hier gezeigten Runs
  benötigten einen zweiten Versuch.
- Keine Empfehlung für ein bestimmtes Modell. Ein Provider-Name ist nie eine Qualitätsgarantie –
  siehe die beiden aufeinanderfolgenden Ergebnisse mit Exit `6` im Cursor-Adapter-Dogfooding.

## Weiterführend

- [Dokumentationsübersicht](../README.md)
- [JSON- und Exit-Code-Vertrag](../json-contract.md)
- [Provider-Adapter](../provider-adapters.md)
- [Sicherheitsrichtlinie](../security.md)
