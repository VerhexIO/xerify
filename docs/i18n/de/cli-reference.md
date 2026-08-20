[English](../../cli-reference.md) · [Türkçe](../tr/cli-reference.md) · **Deutsch** · [简体中文](../zh-CN/cli-reference.md) · [Español](../es/cli-reference.md) · [Français](../fr/cli-reference.md)

# CLI-Referenz

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Alle Befehle nutzen dieselbe validierte Konfiguration und denselben Kern wie die Library und der
MCP-Server. Globale Optionen können vor oder nach einem Subbefehl stehen:

| Option                     | Bedeutung                                                       |
| -------------------------- | --------------------------------------------------------------- |
| `--json`                   | Schreibt einen stabilen JSON-Envelope nach stdout               |
| `--timeout <milliseconds>` | Überschreibt den begrenzten Timeout des Provider-Lifecycles     |
| `--log <path>`             | Überschreibt den Pfad der geheimnisfreien JSONL-Audit-Metadaten |
| `--version`                | Gibt die installierte Xerify-Version aus                        |

## Verifikations- und Adapterbefehle

| Befehl                                                                       | Zweck                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `xerify ask [question]`                                                      | Offene Zweitmeinung; stdin liefert begrenzten Kontext                            |
| `xerify ask --question <text> --to <provider:model>`                         | Eindeutige Form, wenn der Kontext über stdin kommt                               |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | Falsifikationsorientierte Verifikation mit unterschiedlichen Aufruf-Providern    |
| `xerify request --to <provider:model> --input <file>`                        | Roh-Debug-Anfrage an den begrenzten Adapter; bietet keine Verifikationsgarantien |

Der `ask`- und der `verify`-Befehl akzeptieren zusätzlich `--adapter <id>` und
`--context-label <label>`. `ask` akzeptiert optional `--from`; `verify` verlangt eine bekannte oder
deklarierte Herkunft der Quelle. Jedes Live-Ziel muss eine exakte Modell-ID enthalten. Eine
Verifikation gegen denselben Provider und Cursor `auto` scheitern bereits vor dem Providerzugriff.

## Setup, Konfiguration und Health

| Befehl                                     | Zweck                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `xerify init`                              | Initialisiert idempotent den privaten, projektlokalen `.xerify/`-Zustand        |
| `xerify health [--network]`                | Aggregierte Bereitschaft von Projekt und Adaptern                               |
| `xerify doctor [--network]`                | Detaillierte Diagnose zu Laufzeit, Konfiguration, MCP und Adaptern              |
| `xerify providers list`                    | Listet konfigurierte Capabilities ohne Inferenz-Aufruf                          |
| `xerify providers probe --provider <id>`   | Prüft bei einem Adapter die Bereitschaft von Executable und Auth                |
| `xerify providers probe --all [--network]` | Prüft alle Adapter; Netzwerkchecks bleiben ohne Inferenz                        |
| `xerify config show`                       | Zeigt die aufgelöste Konfiguration samt Quellen, Geheimnisse geschwärzt         |
| `xerify config validate`                   | Validiert Projekt-/Benutzerkonfiguration und gibt die geschwärzte Auflösung aus |

`health`, `doctor`, die Config-Befehle, die Run-Befehle, die Capability-Discovery und die
standardmäßige Provider-Probe rufen kein Modell auf. `--network` ergänzt ausschließlich eine
begrenzte Prüfung der Endpoint-Erreichbarkeit.

## Run-Historie

| Befehl                                            | Zweck                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `xerify runs list [--archived] [--limit <count>]` | Listet aktive Datensätze oder indizierte Archiv-Zusammenfassungen |
| `xerify runs search <query> [--limit <count>]`    | Durchsucht archivierte Head-/Provider-/Modell-/Urteils-Metadaten  |
| `xerify runs show <run> [--archived]`             | Zeigt einen normalisierten Datensatz                              |
| `xerify runs show <run> --include-evidence`       | Bezieht erfasste Beleg-Inhalte explizit mit ein                   |
| `xerify runs archive <run>`                       | Verschiebt einen aktiven Datensatz ins Archiv                     |
| `xerify runs restore <run>`                       | Stellt einen archivierten Datensatz wieder her                    |
| `xerify runs delete <run> --yes [--archived]`     | Löscht einen Datensatz endgültig                                  |

`<run>` akzeptiert die dezimale Sequenznummer (`1`) oder die stabile ID (`xrun_000001`).
Archivieren, Wiederherstellen und Löschen sind lokale Dateisystemoperationen und rufen nie einen
Provider auf. Ein noch laufender Datensatz lässt sich weder archivieren noch löschen.

Die Archivauflistung nutzt `.xerify/archive/index.jsonl` als kompakten Katalog. Jede
Prozess-Zusammenfassung enthält einen capture-policy-sicheren `head`, sodass Menschen und Agenten
wahrscheinliche Treffer erkennen können, bevor ein vollständiger Datensatz geöffnet wird.
`runs search` erledigt diese Suche, ohne jeden archivierten Run einzeln zu öffnen.

## MCP-Server

| Befehl                                                                       | Zweck                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `xerify mcp stdio`                                                           | Stellt lokales MCP über STDIO bereit           |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | Stellt Streamable-HTTP-MCP auf Loopback bereit |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | Explizit authentifizierte, öffentliche Bindung |

STDIO reserviert stdout für Protokoll-Frames. Nicht-Loopback-HTTP verlangt sowohl `--allow-public`
als auch ein Bearer-Token, das über eine benannte Umgebungsvariable übergeben wird.
