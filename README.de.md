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

<p align="center"><strong>Frage einen anderen Provider. Erhalte eine klare Zweitmeinung.</strong></p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/readme/xerify-verification-flow.gif" alt="Xerify-Ablauf: Eine bestehende Behauptung von Provider A durchläuft begrenzte Evidenz und das Andere-Provider-Gate, Provider B versucht die Falsifikation, und Xerify liefert confirmed, refuted oder unclear" width="960">
</p>

Xerify ist ein Shell-orientiertes Open-Source-Werkzeug für begrenzte, providerübergreifende Fragen
und Prüfungen. Es kann bereits authentifizierte offizielle Provider-CLIs, direkte APIs oder ein
explizit konfiguriertes Programm verwenden. CLI, JavaScript/TypeScript-Bibliothek, lokales STDIO-MCP
und Streamable-HTTP-MCP nutzen denselben Kern und dieselben Schemas.

Xerify wird von **Verhex** entwickelt, mit Beiträgen der Community, und unter der MIT-Lizenz
veröffentlicht. Es ist die providerübergreifende Verifikationsschicht von **Deckent**, dem
agentischen Betriebssystem von Verhex, hier als eigenständiges Werkzeug bereitgestellt — Xerify
läuft für sich allein und hat keine Abhängigkeit von Deckent. Das Ergebnis ist eine Zweitmeinung,
kein formaler Beweis, kein Sicherheitszertifikat und keine Wahrheitsgarantie. Provider-Ausgaben
sind nicht vertrauenswürdige Daten und werden niemals ausgeführt.

> **Release-Status:** `0.2.0` ist ein früher öffentlicher Release, auf npm als `xverify-cli`
> verteilt. Die öffentliche CI ist unter Ubuntu, macOS und Windows mit Node 20/24 grün,
> einschließlich externem Install- und MCP-Inspector-Smoke-Test; derselbe Check, der
> Clean-Install-Smoke-Test und das Release-Audit bestehen auch unter WSL2 mit Node 24. Der
> Vertrag zur Aufruf-Provider-Identität ist live in beide Richtungen mit Cursor/OpenAI belegt.
> Der veröffentlichte `0.1.0`-Tarball erreichte die Registry außerhalb des Release-Workflows und
> trägt deshalb keine npm-Provenance-Attestierung; `0.1.1` und spätere Versionen werden vom
> Workflow veröffentlicht, der eine solche anfordert. Öffentliche Schemas, JSON-Envelopes und Exit-Codes sind stabil; die
> Provider-Oberfläche ist noch klein, und die API kann wachsen.

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
npm install --save-dev --save-exact xverify-cli@0.2.0
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

Versuche, eine konkrete Behauptung über einen anderen Aufruf-Provider zu widerlegen:

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

| Ergebnis    | Exit | Bedeutung                                                           |
| ----------- | ---: | ------------------------------------------------------------------- |
| `confirmed` |    0 | Kandidat zum Fortfahren; kein wesentliches Gegenbeispiel im Kontext |
| `refuted`   |   10 | Behauptung blockieren                                               |
| `unclear`   |   11 | bessere Belege, Wiederholung oder menschliche Prüfung               |

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

## Adapter-Pfade und Modell-IDs

Ein Command-Adapter läuft in einem privaten, leeren Verzeichnis, nicht im eigenen Projekt, daher
muss **jeder Pfad in `executable` und `args` absolut sein**. Ein relativer Pfad wie
`./tools/verifier.mjs` wird gegen dieses private Verzeichnis aufgelöst, und der Prozess scheitert
schon beim Start. Der Fehler zitiert jetzt den Interpreter, der das Verzeichnis nennt, in dem er
tatsächlich gesucht hat:

```json
{
  "code": "PROVIDER_FAILURE",
  "providerMessage": "Error: Cannot find module '/tmp/xerify-command-rBJrxX/tools/verifier.mjs'"
}
```

Exakte IDs stammen vom Provider, nicht von Xerify; nur Cursor bietet einen Auflistungsbefehl:

| Adapter                                            | Woher die exakte Modell-ID stammt                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cursor`                                           | `agent models`                                                                                                                 |
| `codex`                                            | das eigene Codex-Konto und die verwendete CLI-Version; `codex --help` zeigt `--model`, und die CLI nennt das abgelehnte Modell |
| `claude`                                           | das eigene Anthropic-Konto und die verwendete CLI-Version; `claude --help` zeigt `--model`                                     |
| `openai-api`, `anthropic-api`, `openai-compatible` | die eigene Modellliste des Providers für den jeweiligen Key                                                                    |

Lehnt ein Provider ein Modell ab, wird dessen eigener Satz unter `providerMessage` zurückgemeldet –
meist der schnellste Weg, um herauszufinden, was er akzeptiert.

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
      "args": ["-y", "--package=xverify-cli@0.2.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Bei einer projektlokalen Installation liegt `xerify` nicht auf dem `PATH`. Der Host wird dann direkt
auf den Einstiegspunkt verwiesen – das umgeht zugleich die `npx`-Indirektion, wodurch der Server
schneller startet:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "node",
      "args": ["./node_modules/xverify-cli/dist/cli/entry.js", "mcp", "stdio"]
    }
  }
}
```

Die Tools heißen `xerify_ask`, `xerify_verify` und `xerify_capabilities`. HTTP bindet standardmäßig
an `127.0.0.1`; der Endpoint ist `http://127.0.0.1:8787/mcp`, und der Root-Pfad liefert `404`. Der
Befehl gibt beim Start die vollständige URL aus – sie sollte von dort abgelesen werden, statt sie
von Hand zusammenzusetzen. Ein Bind außerhalb von Loopback erfordert `--allow-public` und ein
Bearer-Token aus einer benannten Umgebungsvariable.

## Wer Xerify entwickelt

Xerify wird von **[Verhex](https://github.com/VerhexIO)** entworfen, gebaut und gepflegt.

Es stammt aus **Deckent**, dem agentischen Betriebssystem von Verhex, wo das Einholen einer
Zweitmeinung von einem weiteren Provider zu den Fähigkeiten gehört, auf die der Orchestrator
angewiesen ist. Xerify ist genau diese Fähigkeit in eigenständiger Open-Source-Form: Es
installiert sich für sich allein, braucht kein Deckent und trägt keine Abhängigkeit davon.

In diesem Repository steht ausschließlich Xerify unter der [MIT-Lizenz](LICENSE). Deckent ist
ein eigenständiges Verhex-Produkt und wird hier nicht lizenziert.

## Dokumentation

- [Vollständiges deutsches Benutzerhandbuch](docs/i18n/de/README.md)
- [Dokumentationsindex in sechs Sprachen](docs/README.md)
- [Beobachtete Verifikationsbeispiele](docs/examples/README.md)
- [Sicherheitsrichtlinie](SECURITY.md)
- [MIT-Lizenz](LICENSE)

Bei einem Widerspruch zwischen Übersetzung und Vertrag gelten die getesteten englischen Schemas und
Dokumente.
