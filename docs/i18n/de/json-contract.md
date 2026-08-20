[English](../../json-contract.md) · [Türkçe](../tr/json-contract.md) · **Deutsch** · [简体中文](../zh-CN/json-contract.md) · [Español](../es/json-contract.md) · [Français](../fr/json-contract.md)

# JSON- und Exit-Code-Vertrag

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Das globale `--json` kann vor oder nach einem Subbefehl übergeben werden. Xerify schreibt dann genau ein kompaktes JSON-Objekt mit abschließendem Zeilenumbruch nach stdout, ganz ohne Terminal-Dekoration.

Erfolg:

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Fehler vor dem Aufruf oder Befehlsfehler:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

Die `data`-Felder von `ask` und `verify` nutzen dieselben Schemas wie ihre MCP-Tools. Die veröffentlichten Draft-2020-12-Artefakte liegen unter `schemas/` und werden aus den Zod-Schemas der Laufzeit generiert.

`provider` bezeichnet den aufrufenden, abrechnenden und kontrollierenden Dienst. Cursor Agent ist
bei jeder exakten Modell-ID `cursor`; direktes Codex/OpenAI ist `openai`, direktes Claude/Anthropic
ist `anthropic`. Diese Identitätsgrundlage misst die Vielfalt der Zugangskanäle, nicht die
Unabhängigkeit des zugrunde liegenden Modells. Health- und MCP-Capabilities melden dies explizit als
`identityBasis: "invocation-provider"`.

Erfolgreiche Verifizierer-Payloads können `evidence`, `assumptions`, `limitations` und `unverifiedClaims` ergänzen. Diese Felder sind aus Kompatibilitätsgründen optional. Strukturierte Provider-Adapter fordern alle vier Felder an; Command-Adapter mit älteren Payloads werden weiterhin akzeptiert. Belege sind begrenzte, vom Verifizierer gemeldete Verweise in den mitgelieferten Kontext, keine unabhängig geprüften Zitate.

## Verifikationsergebnisse

`confirmed`, `refuted` und echtes `unclear` sind abgeschlossene Verifikationsergebnisse. Sobald ein Provider-Lifecycle gestartet ist, liefern auch Timeout, Abbruch, Provider-Fehler, ungültige strukturierte Ausgabe oder jede Kürzung von Verifikations-Ein-/Ausgabe ein vollständiges `VerifyResult` mit `verdict: "unclear"` und einer typisierten `failure`. Gekürzte Belege können niemals zu `confirmed` führen. Der Prozess-Exit bewahrt dabei die zugrunde liegende Ursache.

Aufrufer müssen stdout deshalb auch dann parsen, wenn der Exit ungleich null ist.

| Exit | Bedeutung                                                                        |
| ---: | -------------------------------------------------------------------------------- |
|  `0` | Befehl erfolgreich; `ask` beantwortet oder Verifikation bestätigt                |
|  `2` | Ungültige Eingabe/Konfiguration, gleicher Provider oder nicht belegbare Herkunft |
|  `3` | Provider-Executable, -Endpoint oder -Authentifizierung nicht verfügbar           |
|  `4` | Timeout oder Abbruch                                                             |
|  `5` | Provider-, Prozess- oder API-Transportfehler                                     |
|  `6` | Ungültige, unvollständige oder schemawidrige Provider-Antwort                    |
| `10` | Verifikation widerlegt                                                           |
| `11` | Verifikation unklar, ohne zugrunde liegenden Fehler                              |

Eine Discovery ohne Treffer gilt als erfolgreich. Fehlende Nutzungswerte bleiben `null`; Xerify schätzt weder Tokenzahlen noch Kosten. Eine Kürzung von Ein- oder Ausgabe wird explizit in den Ergebnis-Metadaten ausgewiesen.

## Kompatibilitätsrichtlinie

- Jeder öffentliche Envelope und jedes Ergebnis trägt `schemaVersion: 1`.
- Das Entfernen oder Umdeuten eines bestehenden Feldes gilt als Breaking Change.
- Ein neues Feld darf optional und rein additiv hinzukommen.
- Unbekannte Eingabe- oder Konfigurationsfelder werden von den strikten Schemas abgelehnt.
- Öffentliche Request-Schemas akzeptieren für die Herkunft der Quelle `declared` oder `unknown` und verlangen für das Ziel `declared`. Ein vom Aufrufer angegebenes `observed` wird abgelehnt; bei `unknown` für die Quelle scheitert die Prüfung dann an der Regel für unterschiedliche Provider.
- Geheimwerte, rohe Autorisierungsheader, Token-Fragmente, Credential-Pfade, Prompt/Kontext, Antworttext und Findings gelangen weder in typisierte Fehler noch in Audit-Einträge.
