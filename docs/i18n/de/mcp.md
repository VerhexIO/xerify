[English](../../mcp.md) · [Türkçe](../tr/mcp.md) · **Deutsch** · [简体中文](../zh-CN/mcp.md) · [Español](../es/mcp.md) · [Français](../fr/mcp.md)

# MCP

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify stellt seinen gemeinsamen Core über das MCP SDK v2 bereit. STDIO- und Streamable-HTTP-Transport nutzen dieselbe Server-Factory, dieselben Tools, Input- und Output-Schemas, dieselbe Provider-Registry und denselben Abbruchpfad.

## Tools

| Tool                  | Wirkung                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `xerify_ask`          | Ruft einen konfigurierten Provider für eine offene Zweitmeinung auf. Read-only-Projektsemantik, Open World, nicht idempotent.         |
| `xerify_verify`       | Ruft einen abweichenden Aufruf-Provider auf und liefert ein striktes Urteil. Read-only-Projektsemantik, Open World, nicht idempotent. |
| `xerify_capabilities` | Listet lokale Adapter und Protokoll-Capability-Metadaten, ohne einen Provider aufzurufen. Read-only und idempotent.                   |

Provider-Aufrufe können Kontingent verbrauchen oder Kosten verursachen. MCP-Hosts sollten vor dem Aufruf von `xerify_ask` oder `xerify_verify` die Zustimmung der Nutzer einholen.

MCP-Aufrufer können die Herkunft der Quelle deklarieren, aber sich nicht selbst `observed` attestieren. Übergebene Behauptungen bzw. Kontext gelten als nicht vertrauenswürdiger Beleg; eingebettete Anweisungen ändern die Verifikationsaufgabe nicht. Das entschärft Prompt-Injection auf Modellebene, kann sie aber nicht ausschließen.

MCP-Aufrufe von `ask` und `verify` laufen durch denselben projektlokalen History-Wrapper wie CLI und
Library. Das Capture-Verhalten kommt aus `xverify-config.json`; weder rohe MCP-Transport-Frames noch
Bearer-Token werden gespeichert. Die Verwaltung der History bleibt eine lokale CLI-Oberfläche
(`xerify runs ...`) und kein MCP-Tool, sodass ein entfernter Aufrufer Host-Datensätze nicht
archivieren oder löschen kann.

Programmatische Aufrufer von `createXerifyMcpServer` und `createXerifyMcpFactory` müssen einen
`RunHistoryStore` übergeben. Bei bewusst deaktivierter Persistenz einen explizit konfigurierten
Store mit `enabled: false` verwenden; ein weggelassener Store wird nicht stillschweigend als
History-loser Betrieb interpretiert.

## Lokales STDIO

Xerify bauen oder global installieren und anschließend einen Host mit Executable und
Argument-Array konfigurieren:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "xerify",
      "args": ["mcp", "stdio"]
    }
  }
}
```

Ohne globale Installation kann ein MCP-Host das öffentliche npm-Paket auch direkt auflösen:

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

In einer dauerhaften Host-Konfiguration eine exakte, geprüfte Version fixieren; `@latest` nur
verwenden, wenn automatische Updates eine bewusste Policy sind.

Weder Banner noch Diagnoseausgaben werden nach stdout geschrieben. Diagnosen gehen nach stderr,
damit das JSON-RPC-Framing intakt bleibt.

Der fixierte Smoke-Test validiert den kompilierten Server mit Inspector `2.2.0` in beiden
Protokoll-Generationen:

```sh
npm run smoke:mcp
```

Der Test fixiert `protocolEra` separat auf `modern` und `legacy` und verlangt, dass alle drei
Tool-Schemas auffindbar sind. Moderne Clients handeln `server/discover` und `2026-07-28` aus;
Legacy-Clients nutzen den Pfad aus der Initialize-Ära.

## Metadaten im offiziellen Registry

Das Repository von Xerify enthält eine `server.json`, und das npm-Manifest trägt den passenden
`mcpName: "io.github.verhexio/xerify"`. Der Registry-Eintrag identifiziert `xverify-cli` als
npm-Paket, fixiert die Paket-/Server-Version, deklariert STDIO-Transport und liefert die festen
`mcp stdio`-Argumente. Ein Contract-Test verhindert, dass diese Felder auseinanderlaufen.

Das offizielle MCP Registry ist ein kostenloser Discovery-Metadaten-Kanal, kein Ausführungshost und
kein Paket-Mirror. Zuerst muss die exakte Xerify-Version in npm liegen; erst dann darf der
Release-Owner sich authentifizieren und `server.json` mit `mcp-publisher` veröffentlichen. Das
Registry ist derzeit Preview-Software, daher sollten Clients eine direkte, fixierte
npm-Konfiguration als stabilen Fallback behalten. Siehe den offiziellen [Registry-Schnelleinstieg](https://modelcontextprotocol.io/registry/quickstart)
und die [npm-Paketregeln](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

## Streamable HTTP

Für den Loopback-Betrieb ist kein Bearer-Token nötig:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

Der MCP-Endpoint ist `/mcp`. Für eine Nicht-Loopback-Bindung ein hochentropisches Token in eine
Umgebungsvariable legen und die öffentliche Bindung explizit bestätigen:

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

Eine öffentliche Bindung ohne beides – Bestätigung und Authentifizierung – wird abgelehnt. Die
Grenze vergleicht Bearer-Token zeitkonstant, validiert Host und Origin, überführt die
Authentifizierung in typisierten MCP-Request-Kontext und gibt das Token nie in Befehlsausgaben oder
Audit-Logs aus.

Der eingebaute Bearer-Modus eignet sich für kontrollierte Deployments. Ein internetseitiger
Mehrbenutzerdienst, TLS-Terminierung, Autorisierungs-Policy, OAuth-Lifecycle, Rate Limiting und
dauerhafte Mandantenfähigkeit gehören in eine Deployment-Grenze vor Xerify; der lokale Server
impliziert sie nicht.

Details zur Kanalwahl, zum Verhalten von Subscription/API, zum kostenlosen lokalen Betrieb und zum
evaluierten Cloudflare-Workers-Remote-Pfad stehen unter [Provider und
Zugangskanäle](channels.md). Dass das Hosting kostenlos ist, macht Provider-Inferenz nicht kostenlos
und erlaubt keine zentrale Verwahrung lokaler Subscription-Credentials.
