# Deutsches Xerify-Benutzerhandbuch

[English](../../README.md) · [Türkçe](../tr/README.md) · **Deutsch** ·
[简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

Dieses Handbuch fasst Installation, CLI, Konfiguration, Provider, JSON-Vertrag, Verlauf, MCP,
Kompatibilität und Sicherheitsgrenzen zusammen. Kommandos, JSON-Felder, Provider-/Modell-IDs,
Exit-Codes und Konfigurationsschlüssel bleiben unverändert. Die normative Quelle ist der
[englische Dokumentationsindex](../../README.md).

## 1. Produktmodell

```text
Artefakt des Autors → Xerify-Kern → anderer Aufrufanbieter → typisiertes Ergebnis
```

- `ask` fordert eine offene Zweitmeinung an; ein Quellprovider ist optional.
- `verify` versucht, eine konkrete Behauptung mit bekannter Provenienz zu widerlegen; ein anderer
  Aufrufprovider ist Pflicht.
- `confirmed` bedeutet nur, dass in den gelieferten Belegen kein wesentlicher Gegenbeleg gefunden
  wurde.
- `refuted` bedeutet einen materiellen Widerspruch.
- `unclear` bedeutet, dass Belege oder Provider-Ausgabe für eine sichere Entscheidung nicht reichen.

Xerify ersetzt keine Tests, Typprüfung, Linter, Laufzeitprüfungen oder menschliche Freigabe.

## 2. Installation

```sh
# Global
npm install --global xverify-cli@latest
xerify --version
xerify init

# Im Projekt festgelegt
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version

# Einmalig ohne gespeicherte Abhängigkeit
npx --yes --package=xverify-cli@latest xerify --json health
```

Erforderlich ist Node.js 20+, primär getestet wird Node.js 24. Globale, transitive, `--no-save`- und
`npx`-Installationen initialisieren das aktuelle Projekt nicht. Verwenden Sie `xerify init`.
`XERIFY_SKIP_AUTO_INIT=1` deaktiviert die geschützte Initialisierung einer direkten lokalen
Abhängigkeit. Das Entfernen des Pakets löscht `.xerify/` nicht automatisch.

## 3. Bereitschaft ohne Modellaufruf

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Diese Befehle verursachen keine Inferenz. `--network` prüft nur begrenzt die Endpoint-Erreichbarkeit.
`health` meldet `ready`, `degraded` oder `setup-required`, Initialisierung, Adapteridentität,
Authentifizierungsbereitschaft und Verlaufspolitik, aber keine Tokenwerte.

## 4. CLI

| Option                     | Zweck                                        |
| -------------------------- | -------------------------------------------- |
| `--json`                   | genau ein stabiles JSON-Envelope auf stdout  |
| `--timeout <milliseconds>` | begrenzten Provider-Timeout überschreiben    |
| `--log <path>`             | Pfad für secret-sichere JSONL-Auditmetadaten |
| `--version`                | installierte Version ausgeben                |

| Kommando                                                                 | Zweck                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `xerify ask --to provider:model --question <text>`                       | offene Zweitmeinung                                |
| `xerify verify --from provider:model --to provider:model --claim <text>` | falsifikationsorientierte Prüfung                  |
| `xerify request --to provider:model --input <file>`                      | begrenztes Adapter-Debugging ohne Verify-Garantien |
| `xerify init`                                                            | privaten Projektzustand idempotent anlegen         |
| `xerify health` / `doctor`                                               | Bereitschaft und Diagnose                          |
| `xerify providers list` / `probe`                                        | Fähigkeiten und Transport/Auth prüfen              |
| `xerify config show` / `validate`                                        | redigierte Konfiguration zeigen/prüfen             |
| `xerify runs ...`                                                        | lokale Laufhistorie verwalten                      |
| `xerify mcp stdio` / `mcp http`                                          | MCP-Server starten                                 |

`request` erzwingt keine Provenienz, Providertrennung, Verdict-Validierung oder Verify-Exit-Semantik.

## 5. Provideridentität und Adapter

Provider bedeutet Aufruf-/Abrechnungs-/Kontrolldienst:

| Adapter             | Identität    | Authentifizierung                                             |
| ------------------- | ------------ | ------------------------------------------------------------- |
| `codex`             | `openai`     | CLI-Login oder `CODEX_API_KEY`                                |
| `claude`            | `anthropic`  | CLI-Login, `ANTHROPIC_API_KEY` oder `CLAUDE_CODE_OAUTH_TOKEN` |
| `cursor`            | `cursor`     | `agent login` oder `CURSOR_API_KEY`                           |
| `openai-api`        | `openai`     | benannte Environment-Variable, optionales Literal             |
| `anthropic-api`     | `anthropic`  | benannte Environment-Variable, optionales Literal             |
| `openai-compatible` | konfiguriert | Environment/Literal oder lokaler Endpoint                     |
| `command`           | konfiguriert | nur `authEnvironment`-Allowlist                               |

Cursor-Modell-IDs sind undurchsichtige Katalog-IDs. Wählen Sie eine exakte ID aus `agent models`.
`cursor:auto` wird vor dem Aufruf abgelehnt. Ein Gemini-Modell über Cursor bleibt Provider
`cursor`; ein zukünftiger direkter Google-Adapter hätte `google`.

Providertrennung beweist keine unabhängige Modelllinie. Direktes OpenAI und GPT über Cursor können
dieselben upstream Blindstellen teilen.

## 6. Konfiguration und Secrets

Projektdatei: `.xerify/xverify-config.json`.

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
      "apiKeyEnvironment": "OPENAI_API_KEY"
    }
  },
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

Priorität: CLI-Flag → Xerify-Environment-Override → Projektdatei → Benutzerdatei → Adapterstandard.
Benutzerpfade: Linux `$XDG_CONFIG_HOME/xerify/xverify-config.json`, macOS
`~/Library/Application Support/Xerify/xverify-config.json`, Windows
`%APPDATA%\Xerify\xverify-config.json`. `XERIFY_USER_CONFIG_PATH` dient hermetischer Automation.

Bevorzugen Sie `apiKeyEnvironment`; ein literales `apiKey` ist nur ein bewusster lokaler Fallback.
`config show/validate` redigiert Key und vollständigen Endpoint. Unter POSIX muss eine Datei mit
Literal oder explizitem Endpoint Modus `0600` haben. Konfiguration, Logs, Runs und Provider-Ausgaben
gehören nicht in Git oder in Verifikationsbelege.

## 7. Injection- und Datengrenze

```text
Xerify-Systemvertrag
  > Verifikationsaufgabe
  > vom Benutzer genehmigter Umfang
  > gelieferte nicht vertrauenswürdige Belege
```

Anweisungen in Code, Diff, Logs, Markdown, Kommentaren oder Agent-Ausgaben sind Belege, keine
Autorität. Der Verifier soll falsifizieren und eingebettete Rollen-, Verdict- und Schemaänderungen
ignorieren. Das senkt das Risiko, macht ein LLM aber nicht injection-sicher. Prüfen Sie Umfang und
Zielprovider vor dem Versand. Keine Secrets, Environment-Dumps, Kundendaten oder unautorisierten
Quellen senden.

Xerify führt Provider-Ausgaben nie als Shell, Code, MCP-Anweisung oder Konfiguration aus. Prozesse
nutzen `shell: false`, stdin, Byte-/Zeitgrenzen und eine erlaubte Umgebung.

## 8. JSON- und Exit-Vertrag

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

| Exit | Bedeutung                                             |
| ---: | ----------------------------------------------------- |
|  `0` | Ask beantwortet oder Verify confirmed                 |
|  `2` | Input/Config, gleicher Provider oder Provenienzfehler |
|  `3` | Programm, Endpoint oder Auth nicht verfügbar          |
|  `4` | Timeout oder Abbruch                                  |
|  `5` | Provider-, Prozess- oder API-Transportfehler          |
|  `6` | ungültige, unvollständige oder schemafremde Antwort   |
| `10` | refuted                                               |
| `11` | unclear ohne tieferen Fehler                          |

Fehler nach Beginn des Provider-Lebenszyklus liefern ein vollständiges `VerifyResult` mit
`verdict: "unclear"` und typisiertem `failure`. stdout muss auch bei einem Nichtnull-Exit geparst
werden. Abgeschnittene Belege können nie `confirmed` ergeben.

## 9. Laufhistorie

```text
.xerify/
├── runs/HEAD.json
├── runs/000001/
│   ├── process.json
│   ├── request.json
│   ├── events.jsonl
│   ├── result.json oder error.json
│   └── evidence/manifest.json
└── archive/index.jsonl
```

`HEAD.json` vergibt monotone IDs. `captureInput` ist `full|metadata|none`, `captureOutput` ist
`normalized|metadata|none`. Beleginhalt erscheint nur mit `--include-evidence`.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archivieren, Wiederherstellen und Löschen rufen kein Modell auf. Löschen ist dauerhaft. Die
append-only Datei `index.jsonl` erlaubt Suche ohne jedes vollständige Run-Verzeichnis zu öffnen.

## 10. MCP

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Tools: `xerify_ask`, `xerify_verify`, `xerify_capabilities`. Die ersten beiden können Kosten oder
Kontingent verursachen; Capabilities nicht. HTTP:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

Außerhalb von Loopback sind `--allow-public`, ein Bearer-Token aus einer benannten Environment-
Variable sowie eine geeignete TLS-/Proxy-Grenze erforderlich. Lokale CLI-Abonnementdaten werden
nicht zu einem Remote-Service übertragen.

## 11. Kompatibilität

- CI: Ubuntu, macOS und Windows mit Node.js 20/24; WSL nutzt den Linux-Pfad.
- ESM-Bibliothek mit TypeScript-Deklarationen, CLI, STDIO-MCP und Streamable HTTP.
- Öffentliches `schemaVersion: 1`; neue optionale Felder sind additiv, Entfernen/Umdeuten ist breaking.
- Normale Tests brauchen keine Provider-Zugangsdaten und führen keine Inferenz aus.
- LLM-Text ist nicht byte-deterministisch. Xerify garantiert Schemas, Grenzen, typisierte Fehler und
  fail-closed Ergebnisse, nicht identische Formulierungen.

## 12. Beispiele

Der kanonische [Beispielkatalog](../../examples/README.md) enthält Forschung, Spieleplanung,
Website-Entscheidung, Datenanalyse, Outbound-Daten und zwei Xerify-Dogfood-Fälle. Der
[JSONL-Index](../../examples/index.jsonl) ist die kompakte Suche für AI-Werkzeuge. Historische
Belege und beobachtete Ergebnisse werden nicht übersetzt.

| Szenario                                     | Beobachtet  | Exit |
| -------------------------------------------- | ----------- | ---: |
| Sechsmonatige Retention einer Studie         | `unclear`   |   11 |
| Kapazität eines Zwei-Personen-Spiels         | `refuted`   |   10 |
| Website-Architekturentscheidung              | `refuted`   |   10 |
| Aggregierte A/B-Conversion                   | `refuted`   |   10 |
| Outbound-Richtlinie für eingeschränkte Daten | `refuted`   |   10 |
| Cursor-Adapter-Invarianten                   | `confirmed` |    0 |
| npm-Paketgrenze                              | `confirmed` |    0 |

## Kanonische Referenzen

[Installation](../../installation.md) · [Konfiguration](../../configuration.md) ·
[CLI](../../cli-reference.md) · [Adapter](../../provider-adapters.md) ·
[Kanäle](../../channels.md) · [JSON/Exit](../../json-contract.md) ·
[Verlauf](../../run-history.md) · [MCP](../../mcp.md) ·
[Kompatibilität](../../compatibility.md) · [Architektur](../../architecture.md) ·
[Security](../../../SECURITY.md)

Bei Widersprüchen gilt der getestete kanonische englische Vertrag.
