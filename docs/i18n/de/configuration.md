[English](../../configuration.md) · [Türkçe](../tr/configuration.md) · **Deutsch** · [简体中文](../zh-CN/configuration.md) · [Español](../es/configuration.md) · [Français](../fr/configuration.md)

# Projekteinrichtung und Konfiguration

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify hält projektspezifischen Zustand aus der Repository-Wurzel heraus. Wird Xerify als direkte
lokale Abhängigkeit installiert, initialisiert es sich automatisch, ohne bestehende Dateien zu
überschreiben:

```sh
npm install --save-dev xverify-cli@latest
```

Globale Installationen, verschachtelte transitive Installationen, ungespeicherte Installationen,
`npx` sowie Installationen mit `XERIFY_SKIP_AUTO_INIT=1` schreiben nicht in das aktuelle Projekt. In
diesen Fällen explizit initialisieren:

```sh
npx --yes --package=xverify-cli@latest xerify init
```

Der Befehl ist idempotent und überschreibt nie eine bestehende Konfiguration oder `.gitignore`:

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

npm liefert vor dem ersten Dependency-Lifecycle kein eindeutiges Signal, ob eine Installation direkt
oder transitiv erfolgt. Xerify akzeptiert deshalb entweder eine bestehende Deklaration im
Root-Manifest bzw. -Lock oder die Kombination aus einem expliziten Save-Flag und dem exakten Pfad
`node_modules/xverify-cli` im Projekt-Root. Ein Package-Manager kann eine transitive
Xerify-Abhängigkeit an genau diesen Ort hochheben (Hoisting); der Initialisierer bleibt dabei
nicht-überschreibend und git-ignoriert, aber Bibliotheksautoren sollten beim Einbetten von Xerify
`XERIFY_SKIP_AUTO_INIT=1` setzen.

Der kanonische Projektdateiname ist `.xerify/xverify-config.json`. Die generierte `.gitignore` hält
sowohl die Runtime-Logs als auch die potenziell tokenhaltige Konfiguration aus Git heraus. Wer die
Konfiguration konsequent frei von Geheimnissen hält, kann sie bewusst per Force-Add einchecken, muss
sie dann aber vor jedem Commit erneut prüfen. Ein relativer `logPath` im Projekt wird ausgehend vom
ermittelten Projekt-Root aufgelöst, nicht von der Paketinstallation aus. Befehle, die in einem
Unterverzeichnis gestartet werden, suchen in den übergeordneten Verzeichnissen nach der
nächstgelegenen kanonischen Projektkonfiguration; ein relativer, projektseitig konfigurierter
Log-Pfad bleibt dabei an diesem Projekt-Root verankert.

## Grundkonfiguration

Der `xerify init`-Befehl ergänzt außerdem idempotent `.xerify/` in der Root-`.gitignore`,
`.npmignore` und `.dockerignore`. Er hängt dazu einen kleinen, markierten Eintrag an und ersetzt nie
vorhandene Ignore-Regeln.

Der `xerify init`-Befehl erzeugt eine gültige Startdatei:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {},
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

History-Pfade werden ausgehend vom ermittelten Projekt-Root aufgelöst. `captureInput` akzeptiert
`full`, `metadata` oder `none`; `captureOutput` akzeptiert `normalized`, `metadata` oder `none`. Die
transparenten Standardwerte sind auf einen nachvollziehbaren lokalen Betrieb ausgelegt. Bevor
Kundendaten, proprietärer Quellcode oder anderes Material verarbeitet wird, das nicht persistiert
werden darf, sollten die Metadata-only-Modi aktiviert werden. Aktiver Pfad und Archivpfad müssen
disjunkt sein: Sie dürfen weder identisch sein noch ineinander verschachtelt liegen. Eine Änderung an
einem der beiden Pfade startet einen neuen Sequenz-Namespace. Die genauen Dateien und
Lifecycle-Befehle stehen unter [Lokale Run-Historie](run-history.md).

Ein leeres `providers` behält die eingebauten Adapter `codex` und `claude` bei. Nur die tatsächlich
genutzten Transporte ergänzen, zum Beispiel:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY",
      "apiKey": "optional-literal-fallback"
    },
    "anthropicApi": {
      "kind": "anthropic-api",
      "apiKeyEnvironment": "ANTHROPIC_API_KEY",
      "maxTokens": 4096
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

`$schema` ist ausschließlich ein Hinweis für den Editor; Xerify ruft ihn weder ab noch führt es ihn
aus. Eine projektlokale Installation kann ihn für Offline-Autovervollständigung durch
`../node_modules/xverify-cli/schemas/config.schema.json` ersetzen.

Die Konfiguration ist strikt. Generische Felder wie `token`, `secret`, ein stilles `defaultModel`
sowie Credential-Felder auf Command- oder CLI-Adaptern werden abgelehnt. Direkte Adapter vom Typ
`openai-api`, `anthropic-api` und `openai-compatible` akzeptieren genau das optionale Feld `apiKey`.

Die empfohlene Reihenfolge lautet:

1. Die benannte Umgebungsvariable verwenden (`apiKeyEnvironment`).
2. Für Subscription-Adapter die offizielle, CLI-verwaltete Authentifizierung verwenden.
3. Ein literales `apiKey` nur für ein lokales Einzelplatz-Setup verwenden, in dem die Verwaltung über
   Umgebungsvariablen unpraktikabel ist.

Sind beide vorhanden, gewinnt die Umgebungsvariable. Literale API-Keys und vollständige
Provider-`endpoint`-Werte werden von `config show` und `config validate` als `[REDACTED]`
ausgegeben; eine teilweise URL-Maskierung wird bewusst vermieden, da Credentials in Userinfo,
Pfaden, beliebigen Query-Parametern oder Fragmenten stecken können. `health`, `doctor`,
Fehlermeldungen, Prompts und Audit-Einträge geben diese Werte niemals preis. Unter POSIX wird eine
Konfiguration, die `apiKey` oder einen explizit gesetzten Provider-Endpoint enthält, abgelehnt,
sofern ihre Rechte nicht ausschließlich dem Besitzer vorbehalten sind
(`chmod 600 .xerify/xverify-config.json`). Der Initialisierer legt die Datei bereits in diesem Modus
an. Der eingebaute Standard-Endpoint eines Adapters allein macht eine ansonsten geheimnisfreie Datei
noch nicht privat. Unter Windows die Datei über eine besitzerexklusive ACL schützen. Diese Datei
niemals committen, in Support-Ausgaben einfügen oder als Verifikationsnachweis versenden.

## Auflösung und Umgebungsvariablen

Die Rangfolge lautet: CLI-Flag, Xerify-Umgebungsvariable, Projektkonfiguration,
Benutzerkonfiguration, zuletzt der Adapter-Standardwert. Die Benutzerkonfiguration verwendet
denselben Dateinamen `xverify-config.json`:

| Umgebung | Pfad der Benutzerkonfiguration                                                                    |
| -------- | ------------------------------------------------------------------------------------------------- |
| Linux    | `$XDG_CONFIG_HOME/xerify/xverify-config.json`, andernfalls `~/.config/xerify/xverify-config.json` |
| macOS    | `~/Library/Application Support/Xerify/xverify-config.json`                                        |
| Windows  | `%APPDATA%\Xerify\xverify-config.json`                                                            |

`XERIFY_USER_CONFIG_PATH` wählt für hermetische Automatisierung eine dedizierte
Benutzerkonfigurationsdatei aus. Laufzeitlimits lassen sich mit `XERIFY_TIMEOUT_MS`,
`XERIFY_MAX_INPUT_BYTES` und `XERIFY_MAX_OUTPUT_BYTES` überschreiben. Ein CLI-Flag `--timeout` oder
`--log` hat die höchste Priorität.

Provider- und Auth-Variablen werden ausschließlich an den jeweils zuständigen Adapter
weitergereicht:

| Adapter         | Akzeptierte Auth-/Konfigurationsumgebung                                                  |
| --------------- | ----------------------------------------------------------------------------------------- |
| Codex CLI       | `CODEX_HOME`, `CODEX_API_KEY`; der reguläre CLI-Login bleibt unterstützt                  |
| Claude CLI      | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`; der reguläre CLI-Login bleibt unterstützt |
| Cursor Agent    | `CURSOR_API_KEY`, `CURSOR_API_ENDPOINT`; das reguläre `agent login` bleibt unterstützt    |
| OpenAI API      | zuerst die benannte Umgebungsvariable; optional ein literales `apiKey` als Fallback       |
| Anthropic API   | zuerst die benannte Umgebungsvariable; optional ein literales `apiKey` als Fallback       |
| Generic Command | ausschließlich die in `authEnvironment` gelisteten Namen                                  |

Grundlegende Plattformvariablen wie `PATH`, Home-/Config-Pfade, Variablen für Temp-Verzeichnisse und
die Locale werden weitergereicht, damit offizielle CLIs ihre eigenen sicheren Auth-Speicher finden.
Der Rest der übergeordneten Umgebung wird nicht pauschal übernommen.

Ein generischer Command-Adapter wird in einem privaten, leeren Verzeichnis gestartet statt im
Projekt, sodass er keine Projektdateien lesen kann, die ihm nicht mitgegeben wurden. Eine Folge
davon tritt leicht ein: **Jeder Pfad in `executable` und `args` muss absolut sein.** `"args":
["tools/verifier.mjs"]` wird gegen das private Verzeichnis aufgelöst, nicht gegen das Projekt, und
der Prozess schlägt fehl, bevor er überhaupt eine Eingabe liest. Der typisierte Fehler zitiert den
Interpreter, der das durchsuchte Verzeichnis benennt:

```json
{
  "code": "PROVIDER_FAILURE",
  "message": "Provider process exited unsuccessfully",
  "providerMessage": "Error: Cannot find module '/tmp/xerify-command-rBJrxX/tools/verifier.mjs'"
}
```

Es gibt bewusst keine Umgebungsvariable zur Modellauswahl. Jede Live-Anfrage trägt ein exaktes
`--to provider:model`; die Herkunftsangabe der Quelle nutzt ein exaktes `--from provider:model`.
Modell-IDs mit dem providereigenen, nicht abrechnungspflichtigen Discovery-Befehl ermitteln, etwa
`agent models` – ein Alias sollte nie geraten werden.

## Health und Provider-Discovery

Zuerst die aggregierte, nicht abrechnungspflichtige Bereitschaftsübersicht nutzen:

```sh
xerify --json health
xerify --json health --network
```

Der `health`-Befehl meldet `ready`, `degraded` oder `setup-required`, ob das aktuelle Projekt
initialisiert ist, sowie jeden konfigurierten bzw. verknüpften Adapter samt Identität des
Aufruf-Providers. Zusätzlich meldet er die aufgelösten History-Pfade und die Capture-Policy, ohne
dabei Beleg-Inhalte zu lesen. Im Standardfall wird weder ein Modell aufgerufen noch ein API-Endpunkt
geprüft. `--network` ergänzt begrenzte Erreichbarkeitsprüfungen der Endpunkte, stellt aber weiterhin
keine Inferenz-Anfrage. Für Laufzeit- und MCP-Details `doctor` verwenden, für einen einzelnen
Adapter `providers probe`.

Bei `openai-compatible` wird nur ein reiner Loopback-Endpoint ohne explizite Key-Konfiguration,
Userinfo, Query-Parameter oder Fragment als `local` / `not-required` gemeldet. Inline-Material in
der URL wird als Auth-Status `unknown` mit Konfigurations-Herkunft gemeldet, selbst bei Loopback.
Ein Remote-Endpoint ohne `apiKeyEnvironment` oder `apiKey` bleibt ebenfalls `unknown`; Xerify leitet
aus einer URL nicht ab, ob ein Gateway öffentlich ist, URL-getragene Credentials verwendet oder ein
anderes Auth-Schema anwendet. Eine benannte Key-Umgebungsvariable ist gegenüber Credential-Material
in der Endpoint-URL vorzuziehen.

## Audit-Log-Vertrag

Das JSONL-Audit protokolliert Zeitstempel, Befehl, Exit, Provider-/Modell-Herkunft, Urteil, Dauer,
die vom Provider gemeldete Nutzung, Kürzung und die typisierte Fehlerkategorie. Bewusst ausgespart
bleiben Prompts, Behauptungen, Kontext, Antworten, Findings, rohe Provider-Antworten,
Autorisierungsdaten und Credential-Pfade. Neue Dateien erhalten unter POSIX den Modus `0600`;
Symlinks und andere Nicht-Regular-Files werden abgelehnt. Die Logs sind Betriebsmetadaten – kein
Transkript und kein Beweis dafür, dass ein Urteil korrekt ist.
