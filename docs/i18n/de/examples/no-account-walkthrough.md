[English](../../../examples/no-account-walkthrough.md) · [Türkçe](../../tr/examples/no-account-walkthrough.md) · **Deutsch** · [简体中文](../../zh-CN/examples/no-account-walkthrough.md) · [Español](../../es/examples/no-account-walkthrough.md) · [Français](../../fr/examples/no-account-walkthrough.md)

# Anleitung ohne Provider-Konto: jedes Ergebnis, kein Kontingent

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Um zu verstehen, wie Xerify sich verhält, braucht es kein Provider-Konto, keinen API-Key und
keinen Login. Diese Seite geht **jedes Urteil und jeden typisierten Fehler** durch, mithilfe eines
deterministischen Mock-Providers, der im Paket enthalten ist.

Nichts davon kontaktiert einen Netzwerkdienst. Nichts davon wird berechnet. Jede Ausgabe unten
wurde durch das exakte Ausführen dieser Befehle beobachtet.

## Warum ein Mock-Provider

Der `command`-Adapter von Xerify führt ein beliebiges Executable aus, sendet den Prompt über stdin
und liest die Antwort von stdout. Ob diese Antwort von einem Sprachmodell stammt, spielt dabei
keine Rolle. Ein festes Skript ist deshalb ein völlig gültiger Provider – einer, dessen Antworten
man selbst kontrolliert, wodurch jedes Ergebnis reproduzierbar wird.

Der Mock liegt unter `tools/mock-provider.mjs`. Er nimmt ein Argument entgegen, den
Szenarionamen, ignoriert den Prompt und gibt eine feste Antwort aus.

> **Verfügbarkeit:** Der Mock ist ab dem Release nach `0.1.0` im Paket enthalten. In `0.1.0` fehlt
> er im npm-Tarball – stattdessen einen Source-Checkout des Repositorys verwenden oder die Datei
> aus dem Repository in das eigene Projekt kopieren und `args` auf diese Kopie zeigen lassen. Alles
> andere auf dieser Seite funktioniert unverändert.

## Setup

Zuerst den installierten Pfad ermitteln. Der Mock muss über einen **absoluten Pfad** referenziert
werden – ein `command`-Adapter läuft in einem frischen temporären Verzeichnis, relative Pfade
lösen sich dort nie auf.

```sh
# Aus einem Source-Checkout
MOCK="$PWD/tools/mock-provider.mjs"

# Aus einer globalen npm-Installation
MOCK="$(npm root -g)/xverify-cli/tools/mock-provider.mjs"

# Aus einer projektlokalen Installation
MOCK="$PWD/node_modules/xverify-cli/tools/mock-provider.mjs"

echo "$MOCK"
```

Eine Wegwerf-Konfiguration schreiben, die pro Szenario einen Adapter registriert. In einem
Scratch-Verzeichnis bleibt die eigene reale Konfiguration dabei unangetastet.

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH` weist Xerify auf diese Datei, ohne das Home-Verzeichnis oder das
`.xerify/` des eigenen Projekts anzurühren. `history.enabled: false` verhindert, dass die
Anleitung Run-Datensätze schreibt.

Zwei Shell-Variablen halten die Befehle kurz:

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

Vor dem Weitermachen die Verkabelung prüfen:

```sh
xerify --json providers list
```

Zu sehen sind die zehn oben genannten Mock-Adapter **plus** die eingebauten Adapter `codex`
(`openai`) und `claude` (`anthropic`) sowie jeder Adapter, den die eigene Projektkonfiguration
definiert. Die Konfiguration wird mit den Standardwerten zusammengeführt, nie durch sie ersetzt,
daher hängt die genaue Anzahl vom eigenen Setup ab.

Jeder Mock hat absichtlich eine eigene `provider`-Identität. Eine Verifikation gegen denselben
Provider wird abgelehnt, eine einzige gemeinsame Identität würde also jeden Befehl unten
blockieren. Diese Identität pro Adapter verhindert außerdem, dass die Mocks mit den eingebauten
Adaptern kollidieren – teilen sich zwei Adapter eine Identität, gewinnt der zuerst registrierte,
und die eingebauten Adapter registrieren sich zuerst. Siehe
[Fehlerarten](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3).

## Die drei Urteile

### `confirmed` – Exit `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Exit `0`. `failure: null` beachten – das ist ein echtes Urteil, kein operativer Ausweichwert.

### `refuted` – Exit `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

Exit `10`. In einem echten Run steckt die eigentliche Substanz im `findings`-Array; Urteile mit
vier oder fünf konkreten Findings zeigen die [ausgearbeiteten Beispiele](README.md).

### `unclear` – Exit `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

Exit `11` mit `failure: null`. Der Verifizierer sagt damit _"die Belege klären das nicht"_ – ein
inhaltliches Ergebnis, keine Störung. Zum Vergleich die unten stehenden, exit-`11`-benachbarten
Fehler, die alle eine nicht-null `failure` tragen.

## Die typisierten Fehler

Jeder Befehl unten ist ein Einzeiler. Die vollständige Erklärung jedes Ergebnisses und wie es sich
in einem echten Deployment beheben lässt, steht unter [Fehlerarten](failure-modes.md).

```sh
# 1. Executable fehlt vollständig -> Exit 3, ok:false, PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. Derselbe Aufruf-Provider auf beiden Seiten -> Exit 2, kein Provider kontaktiert
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. Provider antwortet in Prosa -> Exit 6, INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. Provider liefert gekürztes JSON -> Exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. Gültiges JSON, ungültiger Urteilswert -> Exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. Provider-Prozess beendet sich mit Exit-Code ungleich null -> Exit 5, PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. Provider langsamer als --timeout -> Exit 4, TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. Antwort überschreitet das Ausgabelimit -> Exit 6, truncation.output true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

Erwartete Exit-Codes, in dieser Reihenfolge: `3`, `2`, `6`, `6`, `6`, `5`, `4`, `6`.

Einen genaueren Blick verdient Szenario 3. Der Mock antwortet mit `Yes, that looks right to me. I
would ship it.` – unmissverständliche Zustimmung in klarem Englisch. Xerify liefert trotzdem
`unclear` mit Exit `6`, weil Zustimmung in Prosa kein Urteil im Sinne des Vertrags ist. Genau
diese Weigerung ist das eigentliche Produkt.

## Die gesamte Oberfläche auf einmal prüfen

Eine einzelne Schleife prüft jeden Exit-Code. Das ist ein sinnvoller Smoke-Test für eine
Integration:

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## Aufräumen

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

Es wurde nichts in das eigene Projekt geschrieben. Wurde die History aktiviert, indem
`"history": { "enabled": false }` entfernt wurde, zusätzlich `.xerify/runs/` entfernen.

## Wie es weitergeht

- [Fehlerarten](failure-modes.md) – warum jeder Fehler auftritt und wie er sich in Produktion beheben lässt
- [Ausgearbeitete Verifikationsbeispiele](README.md) – dieselben Formen gegen echte Provider, mit echtem Widerspruch
- [Projektkonfiguration](../configuration.md) – Rangfolge, Rechte und das vollständige Konfigurationsschema
- [CLI-Referenz](../cli-reference.md) – jeder Befehl und jedes Flag
