[English](../../provider-adapters.md) · [Türkçe](../tr/provider-adapters.md) · **Deutsch** · [简体中文](../zh-CN/provider-adapters.md) · [Español](../es/provider-adapters.md) · [Français](../fr/provider-adapters.md)

# Provider-Adapter

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify identifiziert einen Provider anhand des aufrufenden, abrechnenden und kontrollierenden
Dienstes. Cursor Agent ist unabhängig vom exakten Modell-ID-Namen des zugrunde liegenden Modells
stets `cursor`. Direktes Codex/OpenAI ist `openai`, direktes Claude/Anthropic ist `anthropic`.

Diese Grenze misst die Vielfalt der Zugangskanäle, nicht die Unabhängigkeit von Modellanbieter oder
Modell-Abstammung. OpenAI direkt und GPT über Cursor gelten als unterschiedliche Provider, können
aber dieselben blinden Flecken des zugrunde liegenden Anbieters teilen.

Jeder eingebaute Adapter liefert dasselbe begrenzte `InvokeResult`. Nutzungswerte stammen
ausschließlich aus der Provider-Antwort. Fehlende Token- oder Kostenfelder bleiben `null`; Xerify
schätzt sie nicht.

Offizielle Adapter legen die Identität des Aufruf-Providers im Code fest. Bei `command`- und
`openai-compatible`-Adaptern ist diese Identität eine vom Besitzer kontrollierte Konfiguration und
keine Remote-Attestierung; die providerübergreifende Durchsetzung ist bei diesen Adaptern nur so
verlässlich wie diese Konfiguration.

## Adaptermatrix

| Adaptertyp          | Provider-Identität | Transport                         | Authentifizierung                                                         | Strukturierte Verifikation                              |
| ------------------- | ------------------ | --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `codex`             | `openai`           | offizielle `codex`-CLI            | bestehender CLI-Login oder `CODEX_API_KEY`                                | `codex exec --output-schema`                            |
| `claude`            | `anthropic`        | offizielle `claude`-CLI           | bestehender CLI-Login, `ANTHROPIC_API_KEY` oder `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                               |
| `cursor`            | `cursor`           | offizielle Cursor-`agent`-CLI     | bestehender Cursor-Login oder `CURSOR_API_KEY`                            | Prompt-Vertrag; Validierung durch den Core              |
| `openai-api`        | `openai`           | Responses API                     | zuerst Umgebungsvariable; optional literaler Fallback                     | `text.format.type=json_schema`, strict                  |
| `anthropic-api`     | `anthropic`        | Messages API                      | zuerst Umgebungsvariable; optional literaler Fallback                     | `output_config.format.type=json_schema`                 |
| `openai-compatible` | konfiguriert       | chat-completions-kompatibles HTTP | optional Umgebungsvariable oder literaler Key                             | `response_format.type=json_schema`                      |
| `command`           | konfiguriert       | Executable plus Argument-Array    | konfigurierte Environment-Allowlist                                       | Prompt-Vertrag; Antwort wird dennoch vom Core validiert |

Als offizielle Referenzen dienen diesen Adaptern der [Codex-Leitfaden für den nicht interaktiven
Modus](https://learn.chatgpt.com/docs/non-interactive-mode), die [Claude Code
CLI-Referenz](https://code.claude.com/docs/en/cli-reference), der [OpenAI-Leitfaden zu
strukturierter Ausgabe](https://developers.openai.com/api/docs/guides/structured-outputs) und der
[Anthropic-Leitfaden zu strukturierter
Ausgabe](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Das
Cursor-Verhalten folgt dem offiziellen [Agent-CLI-Überblick](https://cursor.com/docs/cli/overview)
und der [CLI-Parameterreferenz](https://cursor.com/docs/cli/reference/parameters).

## Codex CLI

Executable: `codex`. Xerify sendet den Prompt über stdin und ruft `codex exec` mit einer flüchtigen
Session, einer Read-only-Sandbox, ignorierten Nutzerregeln/-konfiguration, JSONL-Events und einer
exakten Output-Schema-Datei für die Verifikation auf. Die Schema-Datei liegt in einem temporären
Verzeichnis mit Modus `0600` und wird in einem `finally`-Block wieder entfernt.

Die letzte `item.completed`-Agent-Nachricht wird zur Provider-Ausgabe. `turn.completed.usage`
liefert `input_tokens` und `output_tokens`; die Kosten bleiben `null`. Ein Error-Event, ein
fehlgeschlagener Turn, ein Exit ungleich null, ein Timeout oder ein Abbruch werden nie als
erfolgreiche Antwort gemeldet.

`xerify providers probe --provider codex` löst das Executable auf und führt `codex login status`
aus. Ein Modellaufruf findet dabei nicht statt.

## Claude CLI

Executable: `claude`. Xerify nutzt den Print-Modus mit JSON-Ausgabe, deaktivierter
Session-Persistenz, ohne Tools, mit deaktivierten Slash-Befehlen, nicht interaktiver Rechtevergabe
und Safe Mode. Jeder Aufruf läuft aus einem frischen temporären Verzeichnis mit Modus `0700` heraus,
nicht aus dem Projekt des Nutzers. Die Verifikation liefert das kanonische JSON Schema über
`--json-schema`; das Provider-Ergebnis kommt aus `structured_output`.

`usage.input_tokens`, `usage.output_tokens` und `total_cost_usd` werden übernommen, sofern
vorhanden. Ein Subtype ungleich Erfolg oder ein Exit ungleich null gelten als Provider-Fehler.
`xerify providers probe --provider claude` führt `claude auth status --json` aus, ohne ein Modell
aufzurufen.

Das strikte Generierungsschema wird aus den kanonischen Zod-Felddefinitionen abgeleitet und von
Validierungsconstraints bereinigt, die der Provider nicht unterstützt. Nach Erhalt wendet die
Zod-Validierung des Cores alle Grenzwerte erneut vollständig an.

## Cursor Agent CLI

Executable: `agent`. Cursor ist die Aufruf-Provider-Identität für jedes Modell, das über Cursor
Agent erreicht wird:

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

`agent models` ausführen und eine exakte gelistete ID als `cursor:MODEL_ID` übergeben. Xerify
behandelt die Modell-ID als opaken Cursor-Katalogbezeichner und leitet die Provider-Identität nicht
aus Präfixen wie `gpt-`, `claude-` oder `gemini-` ab. `auto` wird schon vor dem Aufruf abgelehnt,
weil dabei das tatsächlich verwendete Modell in der Herkunftsangabe nicht erhalten bliebe; explizite
Composer-, Kimi-, GLM-, GPT-, Claude-, Gemini- und Grok-IDs sind zulässig, sofern das installierte
Cursor-Konto sie bereitstellt.

In diesem Release gibt es keinen direkten Gemini-CLI-Subscription-Adapter. Von Cursor gehostetes
Gemini bleibt ein Cursor-Aufruf. Ein künftiger direkter Google-API- oder CLI-Adapter würde die
Identität `google` tragen.

Der Adapter sendet den Prompt über stdin und nutzt `agent -p --mode ask --sandbox enabled` mit
JSON-Ausgabe. Er gewährt Vertrauen ausschließlich einem neuen, leeren temporären Workspace mit
Modus `0700`, übergibt diesen Workspace explizit und entfernt ihn in `finally`. Cursor stellt kein
Flag für JSON-Schema-Ausgabe bereit; deshalb trägt der Verifikationsprompt selbst den kanonischen
Vertrag, und Xerify validiert das zurückgegebene `result` mit demselben Zod-Schema des Cores.
Ungültige Prosa oder eingebettetes JSON wird fail-closed zu `unclear`; eine Umwandlung in
`confirmed` findet nie statt.

Die aktuelle Cursor-CLI bietet kein Flag, das jeden nutzerkonfigurierten MCP-Server kategorisch
deaktiviert. Der Ask-Modus ist zwar read-only und der Workspace leer, aber das Verhalten auf
Kontoebene bleibt eine verbleibende Vertrauensgrenze. Keine Geheimnisse versenden und diesen Adapter
nicht unter einem Cursor-Konto mit nicht vertrauenswürdigen globalen Extensions- oder
MCP-Konfigurationen ausführen. `xerify providers probe --provider <cursor-adapter-id>` führt `agent
status` aus, ohne ein Modell aufzurufen, und liest oder gibt die Kontoidentität nicht aus.

Die Einhaltung der strukturierten Ausgabe ist modell- und releaseabhängig, da Cursor kein Flag zur
Schema-Durchsetzung bereitstellt. Unter Linux x64 mit Cursor Agent `2026.08.11-e8db854` bestanden
die exakten Modelle `cursor-grok-4.6-high-fast` und `gpt-5.6-sol-high` den festen
Injection-/Widerlegungs-Vertrag; `gpt-5.6-sol-high` schloss zusätzlich eine begrenzte
Core-Code-Verifikation ab. Im selben Beleg-Zeitraum lieferten `claude-sonnet-5-high` und
`claude-sonnet-5-thinking-high` Ausgaben, die am strikten Schema von Xerify scheiterten und deshalb
typisiert bei `unclear`/Exit `6` blieben. Das ist eine ehrliche, beobachtete Momentaufnahme und kein
universelles Versprechen für eine ganze Modellfamilie oder einen künftigen Cursor-Release.

## Direkte APIs

Der OpenAI-Adapter sendet einen POST an `/v1/responses` mit `store: false`. Der Anthropic-Adapter
sendet einen POST an `/v1/messages` mit `anthropic-version: 2023-06-01`. Prompts werden vor dem
Request byteweise begrenzt, Antworten werden im Stream begrenzt, und Abbruch/Timeout laufen über
`AbortSignal`.

Bricht Anthropic mit `max_tokens` ab, gilt das als ungültige bzw. unvollständige Antwort; `refusal`
ist ein nicht wiederholbarer Provider-Fehler. Bei OpenAI gelten Antworten mit einem Status ungleich
`completed`, Antworten ohne den erwarteten Output-Block, fehlerhaftes JSON und gekürzte
strukturierte Ausgabe als typisierte Fehler.

API-Keys werden zuerst über die konfigurierte Umgebungsvariable aufgelöst. Direkte API-Adapter
akzeptieren ein literales `apiKey` nur als Fallback für einfache lokale Einzelplatz-Setups. Eine
solche Konfiguration ist standardmäßig git-ignoriert, muss unter POSIX den Modus `0600` haben und
wird bei `config show`/`validate` geschwärzt; die Keys erscheinen nie in der Ausgabe von
`health`/`doctor`, in Provider-Prompts oder in Audit-Logs.

Vollständig konfigurierte Endpoint-Werte werden ebenfalls aus der Konfigurationsausgabe geschwärzt
und machen den POSIX-Konfigurationsmodus sicherheitsrelevant. Das vermeidet eine unsichere
Teilmaskierung von Credentials, die an beliebiger Stelle in einer URL stecken können. Bei
OpenAI-kompatiblen Adaptern gilt nur ein reiner Loopback-Endpoint als `local` / `not-required`;
Userinfo, Query-Parameter oder Fragmente machen die Authentifizierung zu `unknown` mit
Konfigurations-Herkunft. Auch ein Remote-Endpoint ohne explizite Key-Deklaration meldet die
Authentifizierung als `unknown`.

## Generischer Command

Der generische Adapter wertet niemals einen Shell-String aus. Die Konfiguration gibt ein Executable
und ein Argument-Array vor; expandiert werden ausschließlich die Platzhalter `{model}` und
`{operation}`. Prompt und Kontext werden über stdin gesendet. Konfigurierte generische Commands
laufen standardmäßig aus einem frischen temporären Verzeichnis mit Modus `0700`; nur das
programmatische SDK kann explizit ein eigenes `cwd` vorgeben. Die Weitergabe der Kind-Umgebung
beschränkt sich auf grundlegende Plattformvariablen plus die explizite `authEnvironment`-Liste des
Adapters.

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## Zulassungsnachweise

Hermetische Contract-Tests decken CLI-Event-Parsing, strukturierte Payloads, Usage-Mapping,
fehlende Auth, HTTP-Request-Form, Timeout/Abbruch, ungültige Ausgabe, Ausgabegrenzen, CRLF, Unicode
und Pfade mit Leerzeichen ab. Der Prozess-Integrationstest prüft zusätzlich die
POSIX-Signalweiterleitung an Kindprozesse.

| Umgebung            | Hermetischer Paketnachweis | Offizielle Binary-Probe | Abrechnungspflichtiger Live-Smoke-Test |
| ------------------- | -------------------------- | ----------------------- | -------------------------------------- |
| Linux, Node 20/24   | öffentliche CI             | host-/kontoabhängig     | nur Opt-in                             |
| macOS, Node 20/24   | öffentliche CI             | host-/kontoabhängig     | nur Opt-in                             |
| Windows, Node 20/24 | öffentliche CI             | host-/kontoabhängig     | nur Opt-in                             |
| WSL, Node 20/24     | Verifikation auf Zielhost  | host-/kontoabhängig     | nur Opt-in                             |

Normale Tests verwenden nie ein Provider-Konto. Ein Live-Smoke-Test muss explizit aktiviert und
stets als potenziell abrechnungspflichtig behandelt werden. Die anwenderseitige Einordnung dieser
Prüfungen steht unter [Kompatibilitäts- und Support-Grenzen](compatibility.md).
