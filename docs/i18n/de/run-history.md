[English](../../run-history.md) · [Türkçe](../tr/run-history.md) · **Deutsch** · [简体中文](../zh-CN/run-history.md) · [Español](../es/run-history.md) · [Français](../fr/run-history.md)

# Lokale Run-Historie

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Jeder `ask`/`verify`-Aufruf über CLI, Library oder MCP kann einen deterministischen, projektlokalen
Datensatz anlegen. So bleiben Provider-Aufrufe nachvollziehbar und überprüfbar, ohne dass die rohe
Transportausgabe selbst zum Artefakt wird.

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

Sequenznummern steigen über aktive und archivierte Datensätze hinweg innerhalb eines festen
History-Namespace kontinuierlich an. Eine private Datei `runs/HEAD.json` hält die zuletzt vergebene
Sequenznummer, das Verzeichnis, die stabile Run-ID und den Aktualisierungszeitpunkt fest. Ein
kurzlebiges `.HEAD.lock` existiert nur während einer gleichzeitigen Vergabe und wächst nicht mit der
Anzahl der Runs. Das Anzeigeverzeichnis nutzt die konfigurierte Nullauffüllung (standardmäßig sechs
Stellen), während die stabile ID `xrun_000001` lautet; Befehle akzeptieren sowohl diese ID als auch
`1`. Das Löschen von Run `000001` führt deshalb nicht dazu, dass die nächste Operation erneut
`000001` wird. Ältere `.sequences/`-Layouts werden validiert, in `HEAD.json` überführt und bei der
nächsten Vergabe entfernt.

## Dateien eines Datensatzes

| Pfad                        | Bedeutung                                                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | Stabile Run-ID, Sequenznummer, durchsuchbarer `head`, Operation/Oberfläche, Lifecycle-Status, Zeitstempel, Ziel-Adapter/-Provider/-Modell sowie abschließender Exit/Urteil oder typisierter Fehler |
| `request.json`              | Normalisierte Metadaten der `ask`/`verify`-Anfrage, Herkunft von Quelle/Ziel, Limits, Context-Label, Capture-Policy, Byte-Zahlen und Digests                                                       |
| `events.jsonl`              | Append-only-Lifecycle-Events: `started`, danach `completed` oder `failed`; Archivierungs-/Wiederherstellungs-Events werden ergänzt, ohne die Historie umzuschreiben                                |
| `result.json`               | Geparstes, normalisiertes Xerify-Ergebnis oder eine reine Metadaten-Zusammenfassung gemäß `captureOutput`; entfällt bei `none`                                                                     |
| `error.json`                | Geheimnisfreier typisierter Fehler, wenn kein abschließendes normalisiertes Ergebnis gespeichert werden kann                                                                                       |
| `evidence/manifest.json`    | Beleg-IDs, Labels/Locators, Byte-Zahlen, SHA-256-Digests und optionale gespeicherte Dateinamen                                                                                                     |
| `evidence/001-<sha256>.txt` | Begrenzter Eingabekontext, nur wenn `captureInput` auf `full` steht; die Nummerierung folgt der Belegreihenfolge, nicht einem zweiten Run-Zähler                                                   |

Belegeinträge tragen einen Locator, eine Byte-Zahl und einen `sha256:`-Digest. Dateien werden, wo
unterstützt, mit privaten POSIX-Modi angelegt und atomar geschrieben. Ein Absturz kann einen
wahrheitsgemäßen `running`-Datensatz zurücklassen; Xerify erfindet kein abschließendes Ergebnis. Das
Run-Verzeichnis ist die Inspektionseinheit für Menschen und Agenten; die JSON-Schemas bleiben
bewusst kleiner als die Orchestrierungs-Task-Datensätze von Deckent, weil Xerify eine einzelne
Provider-Anfrage aufzeichnet, keinen Worker-Plan und keinen Projektmutations-Lifecycle.

## Durchsuchbarer Archivindex

`xerify runs archive <run>` verschiebt den vollständigen Datensatz nach `archive/<number>/` und
hängt ein kompaktes JSON-Objekt an `archive/index.jsonl` an. Wiederherstellen und Löschen fügen
ebenfalls neue Lifecycle-Objekte an, statt die Historie umzuschreiben. Jede Zeile enthält:

- Event, Ort und Zeitpunkt sowie ob der Eintrag vom Befehl oder von einer Absturz-Rekonstruktion
  stammt;
- die vollständige, kompakte `process`-Zusammenfassung, einschließlich des für Menschen und Agenten
  lesbaren `head`, Provider/Modell, Urteil, Exit, Status und Zeitstempel;
- `recordSha256`, das den exakten Stand von Prozess, Anfrage, normalisiertem Ergebnis bzw.
  typisiertem Fehler und Beleg-Manifest zu diesem Lifecycle-Zeitpunkt abdeckt.

Die jeweils letzte Zeile zu einer `runId` ist ihr aktueller indizierter Stand. `xerify runs list
--archived` liest ausschließlich diesen Index plus die Verzeichnisnamen und öffnet nicht jede
archivierte Prozessdatei einzeln. Fehlende Legacy- oder unterbrochene Lifecycle-Einträge werden nur
aus dem betroffenen Verzeichnis rekonstruiert und als `source: "reconciled"` markiert. Menschen
können die JSONL direkt grep(p)en, während KI-Tools zunächst diesen Index lesen sollten, bevor sie
ein passendes Run-Verzeichnis öffnen.

Der `head` wird lokal abgeleitet, ohne dass dafür ein weiterer Modellaufruf nötig ist. Bei
`captureInput: "full"` ist er eine auf Whitespace normalisierte, begrenzte Vorschau der Behauptung
bzw. Frage. Bei `metadata` enthält er nur Operation plus Statement-Digest. Bei `none` enthält er
keinerlei Statement-Inhalt. So kann der Index die konfigurierte Persistenz-Policy nicht umgehen.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archivieren und Wiederherstellen sind lokale Umbenennungen plus Append-only-Indexeinträge. Löschen
ist endgültig, verlangt `--yes` und meldet `recoverable: false`. Noch laufende Datensätze können
weder archiviert noch gelöscht werden, damit Lifecycle-Befehle keinen laufenden abschließenden
Schreibvorgang ungültig machen können. Keiner dieser Befehle ruft einen Provider auf.

`runs search <query>` gleicht die jeweils aktuellste archivierte Zusammenfassung über Run-ID,
`head`, Operation, Provider/Modell, Adapter, Status, Urteil, Exit/Fehler und Zeitstempel ab. Der
Befehl liest den kompakten Index und liefert passende Prozess-Zusammenfassungen zurück; Belege
bleiben über `runs show` optional. Der hermetische History-Contract prüft Listing und gezielte Suche
über 1.000 indizierte Archiv-Zusammenfassungen, deren Run-Datensätze dabei bewusst ungeöffnet
bleiben.

`captureInput: "full"` speichert Statement und Kontext; `metadata` speichert nur Byte-Zahlen und
Hashes; `none` speichert keins von beidem. `captureOutput: "normalized"` speichert das geparste
Xerify-Ergebnis, `metadata` speichert die geheimnisfreie Zusammenfassung, und `none` lässt die
Ergebnisdatei ganz weg. Rohe Provider-Transportausgabe, Credentials, Auth-Speicher und
Environment-Dumps sind niemals Bestandteil der History.

Die generierten Root-Ignore-Regeln halten `.xerify/` aus Git, npm-Paketen und dem
Docker-Build-Kontext heraus. Sie ersetzen weder Dateisystemrechte noch eine Datenklassifizierung.
Die Capture-Policy vor dem Versenden oder Persistieren sensibler Belege prüfen. Eine Änderung der
konfigurierten History-Wurzeln startet einen neuen Sequenz-Namespace. Xerify beansprucht keine
Integrität gegenüber einem Prozess desselben Nutzers, der gleichzeitig den privaten History-Baum
löscht, umbenennt oder verändert.
