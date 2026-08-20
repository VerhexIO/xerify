[English](../../../examples/dogfooding.md) · [Türkçe](../../tr/examples/dogfooding.md) · **Deutsch** · [简体中文](../../zh-CN/examples/dogfooding.md) · [Español](../../es/examples/dogfooding.md) · [Français](../../fr/examples/dogfooding.md)

# Dogfooding: was es braucht, bis eine Behauptung `confirmed` wird

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Diese Seite ist ein Protokoll, kein Tutorial. Fünf Befunde über Xerify selbst wurden mit
`xerify verify` gegen zwei unabhängige Kanäle geprüft — `codex` (`openai`) und `cursor`. Dafür
waren **26 Runden** nötig. Nur ein Befund bestand im ersten Versuch, und eine Runde kam mit
`refuted` zurück, weil die Behauptung falsch war.

Alles Folgende ist tatsächlich so passiert, einschließlich der Stellen, an denen sich der Autor
der Behauptungen selbst als derjenige herausstellte, der irrte. Wer Xerify zur Prüfung der eigenen
Arbeit einsetzen will, bekommt hier die reale Form dieser Erfahrung.

## Das Protokoll

|   # | Behauptung                | Kanal  | Urteil          | Exit | Warum                                                                |
| --: | ------------------------- | ------ | --------------- | ---: | -------------------------------------------------------------------- |
|   1 | Source Maps               | codex  | `unclear`       |   11 | Behauptung deckte 86 Dateien ab, Beleg zeigte 1                      |
|   2 | Source Maps               | cursor | `unclear`       |    6 | Schema-Abweichung, kein Urteil erzeugt                               |
|   3 | Source Maps               | codex  | `unclear`       |   11 | Zahlen waren eine Zusammenfassung, nicht prüfbar                     |
|   4 | Source Maps               | codex  | `unclear`       |   11 | `sourceRoot` nie berücksichtigt; nur 9 von 86 Zeilen gezeigt         |
|   5 | Source Maps               | cursor | `unclear`       |   11 | dieselben zwei Einwände, unabhängig erreicht                         |
|   6 | Source Maps               | codex  | **`refuted`**   |   10 | die Behauptung war falsch: Maps setzen `sourceRoot` _sehr wohl_      |
|   7 | Source Maps               | cursor | **`refuted`**   |   10 | dieselbe Widerlegung, unabhängig erreicht                            |
|   8 | Source Maps               | codex  | `unclear`       |   11 | Artefakt nicht kryptografisch an die Registry gebunden               |
|   9 | Source Maps               | cursor | `unclear`       |    6 | Schema-Abweichung                                                    |
|  10 | Source Maps               | codex  | **`confirmed`** |    0 | —                                                                    |
|  11 | Source Maps               | cursor | **`confirmed`** |    0 | —                                                                    |
|  12 | Adapter-Rangfolge         | codex  | `unclear`       |   11 | Runs nicht an einen Commit gebunden; Befehle fehlten                 |
|  13 | Adapter-Rangfolge         | cursor | `unclear`       |    6 | Schema-Abweichung                                                    |
|  14 | Adapter-Rangfolge         | codex  | **`confirmed`** |    0 | —                                                                    |
|  15 | Adapter-Rangfolge         | cursor | **`confirmed`** |    0 | —                                                                    |
|  16 | npm-Provenance            | codex  | **`confirmed`** |    0 | —                                                                    |
|  17 | npm-Provenance            | cursor | **`confirmed`** |    0 | —                                                                    |
|  18 | Falle des relativen Pfads | codex  | `unclear`       |   11 | der A/B-Vergleich änderte zwei Variablen, nicht eine                 |
|  19 | Falle des relativen Pfads | codex  | **`confirmed`** |    0 | —                                                                    |
|  20 | Falle des relativen Pfads | cursor | **`confirmed`** |    0 | —                                                                    |
|  21 | `.claude/`-Ignore-Lücke   | codex  | `unclear`       |   11 | nicht gezeigt, dass alle 152 Fehler Parsing-Fehler waren             |
|  22 | `.claude/`-Ignore-Lücke   | codex  | `unclear`       |   11 | Reproduktion zusammengefasst, nur eine Roh-Meldung                   |
|  23 | `.claude/`-Ignore-Lücke   | codex  | `unclear`       |   11 | Reproduktion nicht an den genannten Commit gebunden                  |
|  24 | `.claude/`-Ignore-Lücke   | codex  | `unclear`       |   11 | die beiden Hälften der Behauptung lagen an unterschiedlichen Commits |
|  25 | `.claude/`-Ignore-Lücke   | codex  | `unclear`       |   11 | Git-Historie aus der Sandbox nicht authentifizierbar                 |
|  26 | `.claude/`-Ignore-Lücke   | cursor | **`confirmed`** |    0 | —                                                                    |

**Summe: 9× `confirmed`, 2× `refuted`, 15× `unclear`.** Von den 15 `unclear`-Ergebnissen waren 3
Transportfehler (Exit `6`) und 12 echte Urteile im Sinne von "die Belege stützen das nicht".

Vier Befunde erreichten `confirmed` auf beiden Kanälen. Einer erreichte `confirmed` auf einem
Kanal und stieß auf dem anderen an eine harte Grenze — siehe [was dieser Kanal nicht verifizieren
kann](#was-dieser-kanal-nicht-verifizieren-kann).

## Warum 12 Runden mit "die Belege stützen das nicht" zurückkamen

Jeder dieser zwölf Einwände fiel in eine von vier Kategorien. Sie lohnen sich zu lernen, denn es
sind genau die vier, auf die man selbst stoßen wird.

### 1. Die Behauptung reicht weiter als die Belege

Runde 1. Die Behauptung sagte, alle 86 Map-Dateien seien unbrauchbar. Die Belege zeigten eine.

> Die mitgelieferten Belege stützen, dass eine veröffentlichte `.js.map`-Datei auf eine fehlende
> `package/src`-Datei verweist, ohne eingebettete `sourcesContent`, belegen die Behauptung aber
> nicht für alle 86 Map-Dateien [...] Die Belege unterscheiden außerdem 43 `.js.map`-Dateien und 43
> `.d.ts.map`-Dateien, während die in der Behauptung genannten Eigenschaften nur `.js.map`-Dateien
> betreffen.

Die Lösung ist nicht, die Behauptung abzuschwächen. Sie besteht darin, alle 86 zu prüfen und das
Ergebnis in den Envelope zu legen. Ein Verifizierer, der "ich habe eins geprüft, der Rest wird
schon passen" akzeptiert, bringt einem gar nichts.

Runde 1 enthielt außerdem eine zweite Überdehnung, die erst mehrere Runden später auffiel: Die
Behauptung sagte, die Maps seien für _jeden Konsumenten_ unbrauchbar. Ein Entwickler mit dem neben
`node_modules` geklonten Repository konnte diese Pfade sehr wohl auflösen. Die Belege konnten
"jeden Konsumenten" nie stützen, und die Behauptung musste auf das eingeengt werden, was das
Artefakt selbst zeigt: Die Quellen lassen sich _innerhalb des Pakets_ nicht auflösen.

### 2. Die Belege sind die eigene Zusammenfassung, nicht das Artefakt

Runden 3, 4, 22 und 23. Eine selbst erstellte Tabelle ist die eigene Schlussfolgerung im Kostüm
von Daten.

> Die mitgelieferten Belege sind in sich mit der Behauptung konsistent, aber sie sind eine
> abgeleitete, nicht vertrauenswürdige Zusammenfassung statt roher Artefaktdaten; ohne direkte
> JSON-Auszüge der Maps und eine vollständige Tarball-Dateiliste lassen sich materielle
> Gegenbeispiele nicht ausschließen.

Was funktionierte: die rohe Antwort der Registry-API, die vollständige `tar -tzf`-Auflistung und
das JSON jeder einzelnen Map-Datei, mit nur dem base64-`mappings`-Blob ausgelassen. Beim
ESLint-Fall die `--format json`-Ausgabe für alle 152 Meldungen statt des Terminal-Ausschnitts.

Enthalten die eigenen Belege den Satz "der Scan fand N von M", steckt man noch immer in dieser
Kategorie.

### 3. Das Artefakt ist nicht an das gebunden, was behauptet wird

Runde 8. Die Behauptung handelte vom "Tarball, den npm ausliefert". Die Belege handelten von einer
Datei in `/tmp`.

> Der analysierte Tarball wird nur über einen SHA-256-Digest identifiziert, während die
> Registry-Metadaten SHA-1- und SHA-512-Integritätswerte liefern. Es wird keine passende SHA-1-
> oder SHA-512-Berechnung mitgeliefert, daher ist die Artefaktidentität nicht belegt.

Die Lösung war, die von der Registry tatsächlich veröffentlichten Digests zu berechnen und ihre
Übereinstimmung zu zeigen:

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

Dieselbe Kategorie gilt für Behauptungen über den Quellcode: den Commit benennen,
`git rev-parse HEAD` zeigen und `git status --porcelain` zeigen, damit die Leserschaft weiß, dass
der Baum sauber war.

### 4. Mehr als eine Sache änderte sich, oder die Hälften liegen an unterschiedlichen Orten

Runde 18. Ein A/B-Vergleich, der eine Variable isolieren sollte, tat das nicht.

> Die Aussage, die Konfigurationen unterschieden sich nur durch den relativen gegenüber dem
> absoluten Skriptpfad, ist buchstäblich falsch: Auch ihre Provider-Map-Keys und Provider-Namen
> unterscheiden sich.

Das stimmte. Die beiden Konfigurationen verwendeten `rel-test` und `abs-test` als
Provider-Identitäten. Die Lösung war, beiden Konfigurationen dieselbe Identität zu geben und die
`diff`-Ausgabe beizulegen, damit sich die Ein-Variablen-Behauptung prüfen ließ, statt sie nur zu
behaupten.

Runde 24 ist dieselbe Kategorie im anderen Gewand. Die Behauptung stellte etwas "beim Commit
`1d65f17`" fest, aber die Reproduktion entfernte eine Zeile aus der Konfiguration bei `HEAD` — wo
ein späterer Commit sie hinzugefügt hatte. Die beiden Hälften eines einzigen Satzes lagen an zwei
unterschiedlichen Commits.

> [...] sie belegen nicht hinreichend, dass die Reproduktion vom genannten HEAD aus mit
> ausschließlich der gezeigten Änderung durchgeführt wurde [...] Die Belege enthalten außerdem
> einen internen Widerspruch zu den betroffenen Dateipfaden.

Die Lösung war, aufzuhören, so zu tun, als sei es eine einzige Tatsache, und stattdessen zwei zu
benennen, jede an ihren eigenen Commit gebunden.

## Die beiden Runden, die den Autor widerlegten

Die Runden 6 und 7 sind das Nützlichste auf dieser Seite.

Die Behauptung enthielt die Teilaussage _"keine der 86 Maps setzt `sourceRoot`"_. Der Scan, der
diese Zahl lieferte, war in Python geschrieben und prüfte das Feld so:

```python
sr = d.get('sourceRoot')
if sr:                 # "" ist in Python falsy
    haveroot += 1
```

Jede der 86 Maps setzt `sourceRoot` — auf den leeren String. Der Scan zählte null. Beide Kanäle
bemerkten das unabhängig voneinander in derselben Runde:

> **codex:** Die Behauptung ist in der geschriebenen Form materiell falsch: Jedes mitgelieferte
> Map-JSON setzt `"sourceRoot"` explizit auf den leeren String, im Widerspruch zur Aussage, dass
> keine Map `sourceRoot` setzt. Die Belege stützen ansonsten die engere Auslegung [...]

> **cursor:** In den mitgelieferten Belegen liegt ein materieller Widerspruch vor: Die Map-Dateien
> enthalten explizit ein `"sourceRoot"`-Feld (gesetzt auf einen leeren String), sodass die
> Teilbehauptung "keine der 86 Maps setzt `sourceRoot`" in der geschriebenen Form falsch ist.

Ein leerer `sourceRoot` stellt nichts voran, die inhaltliche Schlussfolgerung überlebte also. Die
_geschriebene Behauptung_ nicht. Sie wurde korrigiert zu "alle 86 Maps setzen `sourceRoot` auf den
leeren String, sodass kein Präfix entsteht" und zwei Runden später bestätigt.

Bemerkenswert, was dafür gegeben sein musste, dass das auffiel: Das rohe Map-JSON steckte im
Envelope. Wären die Belege noch die Zusammenfassungstabelle aus Runde 3 gewesen — die, die
`maps with a sourceRoot set: 0 of 86` behauptete —, hätten beide Verifizierer nichts gehabt, dem
sie widersprechen konnten, und eine falsche Aussage wäre als verifiziert gemeldet worden.

**Das Artefakt schicken, nicht die eigene Lesart davon. Das ist der ganze Mechanismus.**

## Das Rezept, das funktionierte

Bei Befund vier reichten zwei Runden. Das änderte sich:

1. **Die Behauptung exakt auf das eingrenzen, was die Belege zeigen.** Kein "jede", "immer" oder
   "alle", außer alle wurden tatsächlich geprüft. Keine kausale Brücke, außer die Variable wurde
   isoliert.
2. **Rohe Ausgabe in den Envelope legen.** Befehlstranskripte, API-Antworten, vollständige
   Dateilisten, JSON mit nur irrelevanten Blobs ausgelassen. Eigene Tabellen gehören in die
   Behauptung, nicht in die Belege.
3. **Das Artefakt binden.** Digests, die mit dem übereinstimmen, was die Registry veröffentlicht,
   oder ein Commit-Hash plus ein sauberer `git status`.
4. **Eine Variable pro Vergleich,** mit beigelegtem `diff`, damit die Leserschaft das selbst
   prüfen kann.
5. **Zusammengesetzte Behauptungen aufteilen.** Beziehen sich zwei Hälften auf unterschiedliche
   Zustände, sind es zwei Behauptungen.
6. **Die exakten Befehle beilegen.** Keine Beschreibung dessen, was ausgeführt wurde.

Ein `confirmed`, das schon im ersten Versuch kommt, bedeutet meist, dass die Behauptung zu schwach
war, um sie überhaupt aufzustellen. Iteration einplanen.

## Ein Envelope, der bestand

Das ist die Form des Beleg-Bündels hinter den Runden 10 und 11:

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

Und die Behauptung, die es trug:

> Im von der npm-Registry ausgelieferten Tarball `xverify-cli@0.1.0` kann keine `.map`-Datei ihre
> deklarierte Quelle innerhalb des Pakets selbst auflösen: Alle 86 Maps setzen `sourceRoot` auf den
> leeren String, sodass kein Präfix entsteht, keine bettet `sourcesContent` ein, jede deklarierte
> Quelle löst zu einem Pfad unter `src/` auf, und der Tarball enthält null `src/`-Einträge.

Bemerkenswert ist die Form: Die Behauptung nennt vier prüfbare Fakten und eine Schlussfolgerung,
die sich mechanisch daraus ergibt. Nichts darin verlangt vom Verifizierer, der Einschätzung des
Autors zu vertrauen.

## Was dieser Kanal nicht verifizieren kann

Runde 25 ist die Wand, und das ist eine Design-Entscheidung, kein Defekt.

> [...] der historische Repository-Zustand ließ sich nicht unabhängig verifizieren, da der
> verfügbare Workspace kein Git-Repository ist und keine referenzierten Dateien oder
> Commit-Objekte enthält.

Ein Verifizierer erhält begrenzte Belege über stdin. Er kann kein `git log` ausführen, kein
Repository öffnen und keine Befehle erneut ausführen. Eine Behauptung, deren Wahrheit in etwas
liegt, das der Verifizierer nicht erreichen kann — Git-Historie, eine private Registry, der
Zustand der eigenen CI —, lässt sich durch ein Transkript daher _stützen_, aber nie
_authentifizieren_. Codex sagte, das Transkript sei in sich mit der Behauptung konsistent, und
lieferte trotzdem `unclear` — das ist die richtige Antwort.

Cursor lieferte bei denselben Belegen `confirmed`. Diese Uneinigkeit ist für sich genommen
aufschlussreich: Zwei Kanäle zogen unterschiedliche Grenzen, wie viel ein eingefügtes Transkript
wert ist. Keiner der beiden funktioniert dabei falsch.

Damit planen. Behauptungen über **Artefakte, die sich in den Envelope legen lassen**, lassen sich
gut verifizieren. Behauptungen über **Historie, Infrastruktur oder Prozesse** nicht — hier
stattdessen zu einem signierten Datensatz oder einem CI-Log greifen, das die Leserschaft
unabhängig prüfen kann.

## Kanal-Zuverlässigkeit, gemessen

Über diese 26 Runden hinweg:

| Kanal              | Runden | Urteil erzeugt | Schema-Fehler mit Exit `6` |
| ------------------ | -----: | -------------: | -------------------------: |
| `codex` (`openai`) |     16 |             16 |                          0 |
| `cursor`           |     10 |              7 |                          3 |

Der `cursor`-Adapter hat keine providerseitige Schema-Durchsetzung — seine Zeile in der
[Adaptermatrix](../provider-adapters.md) lautet "Prompt-Vertrag; Validierung durch den Core" —,
daher erzeugt ein Modell, das die Ausgabeanweisung ignoriert, Exit `6` und kein Urteil. Exit `6`
von `cursor`- oder `command`-Adaptern als wiederholbar behandeln und die Anzahl der Versuche
begrenzen.

Ein `refuted` nie so lange wiederholen, bis es `confirmed` wird. Das ist Urteils-Shopping und
macht aus einer Zweitmeinung eine teure Methode, sich selbst zuzustimmen.

## Was es kostete

26 abrechnungspflichtige Runden für 5 Befunde. Die Verteilung ist schief und lohnt sich
einzuplanen:

- Befund 1, die Regeln von Grund auf lernen: **11 Runden**
- Befund 5, an eine Kanalgrenze gestoßen: **6 Runden**
- Befund 2: 4 Runden · Befund 4: 3 Runden · Befund 3, mit angewendetem Rezept: **2 Runden**

Der erste verifizierte Befund wird der teure sein. Iteration einplanen und [den
Mock-Provider](no-account-walkthrough.md) nutzen, um Envelope und Exit-Code-Handling zu klären,
bevor Kontingent für die Einschätzung eines Modells ausgegeben wird.

## Weiterführend

- [Fehlerarten](failure-modes.md) – jeder typisierte Fehler und was ihn auslöst
- [Anleitung ohne Provider-Konto](no-account-walkthrough.md) – jedes Ergebnis ganz ohne Kontingent
- [Ausgearbeitete Verifikationsbeispiele](README.md) – die fachlichen Szenarien
- [Provider-Adapter](../provider-adapters.md) – welche Adapter das Ausgabeschema durchsetzen
