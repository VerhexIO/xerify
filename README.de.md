<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.tr.md">Türkçe</a> ·
  <strong>Deutsch</strong> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Frage einen anderen Anbieter. Erhalte eine klare Zweitmeinung.</strong></p>

Xerify ist ein Shell-orientiertes Open-Source-Werkzeug für begrenzte, anbieterübergreifende Fragen
und Prüfungen. Es kann bereits authentifizierte offizielle Provider-CLIs, direkte APIs oder ein
explizit konfiguriertes Programm verwenden. CLI, JavaScript/TypeScript-Bibliothek, lokales STDIO-MCP
und Streamable-HTTP-MCP nutzen denselben Kern und dieselben Schemas.

Xerify wird von **Verhex** entwickelt, mit Beiträgen der Community, und unter der MIT-Lizenz
veröffentlicht. Das Ergebnis ist eine Zweitmeinung, kein formaler Beweis, kein Sicherheitszertifikat
und keine Wahrheitsgarantie. Provider-Ausgaben sind nicht vertrauenswürdige Daten und werden niemals
ausgeführt.

> **Release-Status:** `0.1.0` ist ein Release Candidate. Das npm-Paket heißt `xverify-cli`; Produkt
> und installiertes Kommando heißen weiterhin `xerify`.

## Installation

Nach der ersten öffentlichen npm-Veröffentlichung:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify init
```

Als festgelegte Entwicklungsabhängigkeit:

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version
```

Ohne dauerhafte Abhängigkeit:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Node.js 20 oder neuer ist erforderlich; Node.js 24 ist der primäre Release-Zweig. Siehe das
[deutsche Benutzerhandbuch](docs/i18n/de/README.md) und die kanonische
[Installationsanleitung](docs/installation.md).

## Schnellstart

Eine offene Zweitmeinung; Eingabe über eine Pipe wird zum begrenzten Kontext:

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "Welches ist das größte Risiko dieser Änderung?"
```

Versuche, eine konkrete Behauptung über einen anderen Aufrufanbieter zu widerlegen:

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "Diese Änderung behebt das Race ohne Regression"
```

`--from` und `--to` benennen den Aufruf-, Abrechnungs- und Kontrolldienst. Ein über Cursor Agent
gewähltes Modell hat immer den Provider `cursor`, auch wenn seine ID GPT, Claude, Gemini oder Grok
nennt. Direktes Codex/OpenAI ist `openai`, direktes Claude/Anthropic ist `anthropic`. Eine Prüfung
mit demselben Provider wird vor dem Modellaufruf abgelehnt.

Diese Trennung misst Kanalvielfalt, nicht die Unabhängigkeit von Modellgewichten, Trainingsdaten
oder blinden Flecken.

## Ergebnisse

| Ergebnis    | Exit | Bedeutung                                                        |
| ----------- | ---: | ---------------------------------------------------------------- |
| `confirmed` |    0 | Kandidat zum Fortfahren; kein wesentlicher Gegenbeleg im Kontext |
| `refuted`   |   10 | Behauptung blockieren                                            |
| `unclear`   |   11 | bessere Belege, Wiederholung oder menschliche Prüfung            |

Timeouts, Provider-Fehler, ungültige Schemas und Abschneidung bleiben mit typisierten
Nichtnull-Codes fail-closed. `unclear` wird nie in Erfolg umgewandelt.

## Nicht abrechenbare Diagnose

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
xerify --json config validate
```

Diese Befehle rufen kein Modell auf. `--network` ergänzt nur begrenzte Erreichbarkeitstests. Live
`ask` und `verify` können Kontingent verbrauchen oder API-Kosten verursachen.

## Lokaler Zustand und MCP

`xerify init` erstellt ohne Überschreiben `.xerify/` und schützt es in Git-, npm- und
Docker-Ignore-Dateien. Aktive Prüfungen stehen unter `runs/`, archivierte Prüfungen unter
`archive/`; `archive/index.jsonl` ist der kompakte Suchkatalog für Menschen und AI-Werkzeuge.

Lokales STDIO-MCP:

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

Die Tools heißen `xerify_ask`, `xerify_verify` und `xerify_capabilities`. HTTP bindet standardmäßig
an `127.0.0.1`; ein Bind außerhalb von Loopback erfordert `--allow-public` und ein Bearer-Token aus
einer benannten Umgebungsvariable.

## Dokumentation

- [Vollständiges deutsches Benutzerhandbuch](docs/i18n/de/README.md)
- [Dokumentationsindex in sechs Sprachen](docs/README.md)
- [Beobachtete Verifikationsbeispiele](docs/examples/README.md)
- [Sicherheitsrichtlinie](SECURITY.md)
- [MIT-Lizenz](LICENSE)

Bei einem Widerspruch zwischen Übersetzung und Vertrag gelten die getesteten englischen Schemas und
Dokumente.
