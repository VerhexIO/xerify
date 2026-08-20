[English](../../architecture.md) · [Türkçe](../tr/architecture.md) · **Deutsch** · [简体中文](../zh-CN/architecture.md) · [Español](../es/architecture.md) · [Français](../fr/architecture.md)

# Architektur

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Dieser Leitfaden, die akzeptierten Entscheidungsdatensätze unter `docs/decisions/`, die
öffentlichen Schemas und ihre getesteten Verträge bilden zusammen die lebende Produkt- und
Architekturautorität von Xerify. Ein Verhalten ist nicht schon deshalb öffentlich, weil es in einer
internen Notiz auftaucht; die Dokumentation muss dem tatsächlich implementierten und getesteten Pfad
entsprechen.

Xerify ist ein einziges ESM-Paket mit vier öffentlichen Oberflächen – CLI, Library, STDIO-MCP und
Streamable-HTTP-MCP – über einem gemeinsamen Core-Ausführungspfad.

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## Modulgrenzen

- `src/core` verantwortet öffentliche Requests/Results, Prompts, die Durchsetzung unterschiedlicher Provider, das Parsen von Urteilen, Fehlertypen, Limits und die Audit-Projektion.
- `src/providers` implementiert einen neutralen Adapter-Vertrag sowie die eingebauten CLI-/API-/Command-Adapter. Es importiert kein CLI-Rendering.
- `src/process` und `src/platform` verantworten die Auflösung von Executables, die Environment-Allowlist, begrenzte Streams, Timeout/Abbruch und das Beenden des gesamten Prozessbaums.
- `src/config` parst striktes JSON aus `.xerify/xverify-config.json`, protokolliert für jedes
  aufgelöste Feld dessen Quelle, schwärzt optionale literale API-Keys und initialisiert privaten
  Projektzustand bzw. Log-Metadaten, ohne bestehende Dateien zu überschreiben.
- `src/history` schreibt aktive Runs direkt, vergibt monotone Identitäten über eine einzige
  atomare `HEAD.json` und pflegt einen capture-policy-sicheren, append-only Archivindex für die
  Suche durch Menschen und Agenten.
- `src/cli` bildet Befehle auf den Core ab und rendert entweder menschenlesbare Ausgabe oder einen stabilen JSON-Envelope.
- `src/mcp` registriert dieselben Zod-Schemas und Core-Funktionen beim MCP SDK v2. Die HTTP-Authentifizierung bleibt an der Transportgrenze.

Das Paket-Root exportiert Core, Config, Adapter und MCP-Factories für die programmatische Nutzung. Test-Fixtures werden vom Produktionscode nie importiert.

## Ablauf einer Anfrage

1. Die strikte Eingabevalidierung über CLI, Library oder MCP legt Provider-/Modell-Identität sowie Byte-/Zeitlimits fest. Öffentliche Aufrufer können sich nicht selbst `observed` attestieren; die Ziel-Identität muss `declared` sein.
2. Die Verifikation lehnt unbekannte Herkunft und identische Aufruf-Provider-Identitäten bereits vor der Adapterauflösung ab.
3. Die Registry wählt, sofern angegeben, eine explizite Adapter-ID, andernfalls einen konfigurierten Adapter für die Ziel-Provider-Identität.
4. Der Adapter ruft ein Executable mit `shell: false` oder einen begrenzten HTTP-Request auf. Prompt und Kontext gelangen dabei nie in Shell-Argumente.
5. Die Provider-Ausgabe wird byteweise begrenzt und normalisiert. Aus den kanonischen Zod-Felddefinitionen wird ein providerkompatibles strukturiertes Schema abgeleitet; die Core-Validierung setzt anschließend alle Grenzwerte vollständig durch.
6. Der Core liefert ein `AskResult` oder ein vollständiges `VerifyResult`; Fehler nach der Provider-Zulassung werden zu einem ehrlichen `unclear`-Ergebnis mit typisierter `failure` und ursachenspezifischem Exit.
7. Das optionale JSONL-Audit-Logging projiziert ausschließlich Metadaten. Prompt, Kontext, Antwort, Findings, Rohantwort, Header und Geheimwerte bleiben außen vor.

## Vertrauensgrenzen

Behauptung/Kontext und Provider-Ausgabe sind nicht vertrauenswürdig. Der Verifizierer wird
angewiesen, das mitgelieferte Material als Beleg zu behandeln, aktiv nach Widerlegung zu suchen und
eingebettete Befehle, Rollenwechsel, Urteilsvorgaben und Schemaänderungen zu ignorieren. Das ist
eine Maßnahme zur Bewahrung der Bewertungsintegrität, keine Garantie gegen Prompt-Injection. Xerify
wertet eine Provider-Ausgabe niemals als Befehl, Quelldatei, MCP-Anweisung oder Konfiguration aus.
Direkte API-Keys werden zuerst über eine benannte Umgebungsvariable und erst danach über einen
explizit konfigurierten literalen Fallback aufgelöst; Diagnosen geben keinen von beiden preis. Auf
offizielle CLI-Auth-Speicher greift Xerify ausschließlich über das offizielle Executable zu; es
parst oder kopiert sie nicht.

Die Codex- und Claude-Adapter legen die Aufruf-Provider-Identitäten `openai` und `anthropic` im
Code fest. Cursor legt unabhängig vom exakten Modell-ID-Namen des zugrunde liegenden Modells stets
`cursor` fest; `auto` wird abgelehnt, weil dabei die Modell-Herkunft nicht erhalten bliebe. Die
Labels `command` und `openai-compatible` sind vom Besitzer kontrollierte Deklarationen und keine
Remote-Attestierung; ihre providerübergreifende Garantie ist nur so verlässlich wie diese
Konfiguration.

Die Provider-Trennung misst die Vielfalt von Aufruf, Abrechnung und Kontrollebene. Sie belegt
nicht, dass zwei Kanäle unterschiedliche Modellanbieter, Gewichte, Trainingsdaten oder blinde
Flecken verwenden. OpenAI direkt und ein GPT-Modell über Cursor sind unterschiedliche
Aufruf-Provider, können aber dieselbe Modell-Abstammung teilen.

Offizielle Command-Adapter laufen aus frischen, restriktiven temporären Workspaces heraus, nicht
aus dem Repository des Nutzers. Codex ignoriert Nutzerregeln/-konfiguration und ist read-only;
Claude deaktiviert Anpassungen, Tools, Slash-Befehle und Persistenz; Cursor nutzt den read-only
Ask-Modus samt seiner Sandbox. Dass Cursor kein kategorisches Flag zum Deaktivieren aller
kontoweiten MCP-Server bietet, bleibt ein dokumentiertes Restrisiko.

STDIO-stdout ist für MCP-Frames reserviert. Streamable HTTP nutzt standardmäßig Loopback und
validiert Host und Origin. Eine öffentliche Bindung erfordert ein explizites Flag und
Bearer-Authentifizierung.

## Kompatibilität

- Mindest-Laufzeit: Node.js 20; primäre Entwicklungslaufzeit: Node.js 24.
- Öffentliche Schema-Version: `1`.
- MCP-SDK-Hauptversion: `2`; moderne Protokollrevision: `2026-07-28`; Legacy-Clients werden weiterhin bedient.
- Bestehende öffentliche Felder können nicht ohne einen Breaking Release entfernt oder umgedeutet werden. Additive optionale Felder sind zulässig.

Die Entscheidung zu den Befehlsergebnissen und ihre Begründung stehen in
[ADR 0001](../../decisions/0001-command-outcomes.md). Die Aufruf-Provider-Identität wird in
[ADR 0002](../../decisions/0002-invocation-provider-identity.md) festgelegt.
