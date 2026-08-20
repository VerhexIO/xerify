[English](../../channels.md) · [Türkçe](../tr/channels.md) · **Deutsch** · [简体中文](../zh-CN/channels.md) · [Español](../es/channels.md) · [Français](../fr/channels.md)

# Provider und Zugangskanäle

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify unterscheidet zwei unabhängige Dimensionen: die Oberfläche, die eine Anfrage entgegennimmt,
und den Adapter, der einen Verifizierer erreicht. CLI, Library, STDIO-MCP und Streamable-HTTP-MCP
rufen alle denselben Core auf; die Wahl von MCP ändert weder Provider-Identität noch Abrechnung,
Schema oder Exit-/Urteils-Semantik.

## Adapter-Kanäle

| Kanal                   | Auth-Verantwortung                                      | Ausführungsort                          | Beste Nutzung                                         | Hauptlimitierung                                                                         |
| ----------------------- | ------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Codex-CLI-Subscription  | offizieller `codex`-Login oder `CODEX_API_KEY`          | Rechner des Nutzers                     | OpenAI-Ziel ohne Kopie eines Subscription-Credentials | erfordert installierte, authentifizierte CLI                                             |
| Claude-CLI-Subscription | offizieller `claude`-Login, OAuth-Token oder API-Key    | Rechner des Nutzers                     | Anthropic-Ziel über `claude -p`                       | erfordert installierte, authentifizierte CLI                                             |
| Cursor-Subscription     | offizielles `agent login` oder `CURSOR_API_KEY`         | Rechner des Nutzers                     | jede von Cursor bereitgestellte exakte Modell-ID      | Provider ist `cursor`; Abstammung des zugrunde liegenden Modells kann sich überschneiden |
| OpenAI Direct-API       | benannte Umgebungsvariable; optional literaler Fallback | jede vertrauenswürdige Laufzeitumgebung | Automatisierung/Server-Deployment                     | API-Abrechnung und Verwahrung von Geheimnissen                                           |
| Anthropic Direct-API    | benannte Umgebungsvariable; optional literaler Fallback | jede vertrauenswürdige Laufzeitumgebung | Automatisierung/Server-Deployment                     | API-Abrechnung und Verwahrung von Geheimnissen                                           |
| OpenAI-kompatibles HTTP | optional benannte Umgebungsvariable oder literaler Key  | lokaler oder entfernter Endpoint        | lokale Modelle und kompatible Gateways                | Provider-Label liegt in der Kontrolle des Besitzers                                      |
| Generischer Command     | explizite Environment-Allowlist                         | Rechner des Nutzers                     | ein weiteres lokales Verifizierer-Executable          | Executable ist Code, dem der Besitzer vertraut                                           |

Die Ausführung einer Subscription bleibt auf dem Rechner des Nutzers. Xerify liest niemals den
Token-/Cookie-Speicher einer CLI; das offizielle Executable kümmert sich selbst um seinen Login. Ein
entfernter Xerify-Dienst kann eine lokale Subscription eines Nutzers nicht einfach mitnutzen:
entweder den STDIO-Server lokal installieren oder einen Direct-API-Adapter mit einer expliziten
serverseitigen Key-Policy verwenden.

## CLI-Beispiele

OpenAI-Artefakt gegen Claude-Subscription:

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

Anthropic-Artefakt gegen Codex-Subscription:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

Anthropic-Artefakt gegen ein exaktes Modell über Cursor:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

Direkte API-Aufrufe nutzen denselben Befehl und liefern dasselbe Ergebnis. Nur `--adapter` ändert
sich, etwa zu `--adapter openaiApi` oder `--adapter anthropicApi`. Modell-IDs bleiben dabei immer
explizit.

In diesem Release gibt es keinen Gemini-CLI-Subscription-Adapter. Ein über Cursor gewähltes, nach
Gemini benanntes Modell bleibt `cursor:EXACT_MODEL_ID`; ein künftiger direkter Google-API-/CLI-Adapter
würde `google` verwenden.

## MCP-Oberflächen

Lokales STDIO ist der empfohlene MCP-Kanal ohne Hosting-Kosten und die einzige
Remote-Tool-Oberfläche, die lokale CLI-Subscriptions von sich aus erhält:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@latest", "xerify", "mcp", "stdio"]
    }
  }
}
```

Für ein fixiertes, in der Supply Chain überprüfbares Setup eine feste Version installieren und deren
aufgelöstes Binary nutzen statt `npx -y ...@latest`. `xerify_capabilities` ist nicht
abrechnungspflichtig; `xerify_ask` und `xerify_verify` können Provider-Kontingent verbrauchen.

Auch Loopback-Streamable-HTTP lässt sich auf dem Rechner des Nutzers kostenlos betreiben.
Internetseitig exponiertes HTTP braucht TLS, Authentifizierung, Autorisierung, Rate Limiting,
Verwahrung von Geheimnissen und eine reine API-Provider-Policy; es darf niemals zum Relay für
lokale Subscription-Credentials werden.

## Kostenlose MCP-Distribution und künftiges Hosting

Der gewählte Distributionsweg ohne Hosting-Kosten ist npm zusammen mit dem offiziellen MCP
Registry. Das Registry speichert Discovery-/Start-Metadaten und verweist auf das öffentliche
npm-Paket `xverify-cli`; es hostet den Code von Xerify nicht selbst. Die `server.json` im
Repository legt Paketversion, STDIO-Transport und die Start-Argumente von `mcp stdio` fest. Der
passende `mcpName` des Pakets belegt die Zuordnung zwischen npm und Registry. Da sich das Registry
noch in der Preview-Phase befindet, bleibt ein fixierter Host-Eintrag
`npx -y --package=xverify-cli@<version> xerify mcp stdio` der deterministische Fallback. Siehe den
offiziellen [Registry-Schnelleinstieg](https://modelcontextprotocol.io/registry/quickstart) und die
[Regeln zu
Pakettypen](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

Dieser Distributionskanal bedeutet lokale Ausführung: kein Hosting-Konto, kein öffentlicher Ingress
und kein zentraler Credential-Speicher. Sollte Verhex später ein öffentliches, API-gestütztes MCP
benötigen, bleibt Cloudflare Workers das ausgewählte Evaluierungsziel, weil dessen offizielles
Agents SDK Streamable-HTTP-MCP unterstützt und der Workers-Free-Plan eine begrenzte kostenlose
Stufe bietet. Siehe Cloudflares offiziellen [Leitfaden zu Remote
MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/) und
die [Workers-Preisübersicht](https://developers.cloudflare.com/workers/platform/pricing/). Das ist
ein Punkt auf der Deployment-Roadmap, keine Aussage, dass sich der jetzige Node-Listener unverändert
hochladen ließe.

Ein Worker kann die lokale Codex-/Claude-/Cursor-CLI eines Nutzers nicht starten. Die Remote-Variante
würde deshalb nur Direct-API-Adapter zulassen, OAuth mit begrenztem Scope verlangen, an
Plattformlimits fail-closed reagieren und Provider-Kosten strikt vom Hosting trennen. Ein
öffentlicher Xerify-Verifizierer ohne Authentifizierung wird nicht ausgeliefert.
