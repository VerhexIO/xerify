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

### `providerMessage`

Ein typisierter `failure` kann optional ein `providerMessage` tragen. Xerifys eigenes `message` ist
pro Fehlercode ein fester Satz und das, worauf ein Aufrufer verzweigen sollte; `providerMessage`
sind die eigenen Worte des Providers zu demselben Fehler und das, was ein Mensch lesen sollte. Ohne
dieses Feld melden eine veraltete CLI, ein abgelaufener Login und ein abgelehntes Modell allesamt
`Provider process exited unsuccessfully`, was keine Ursache benennt.

Das Feld trägt Provider-Ausgabe und gilt deshalb als nicht vertrauenswürdig; bevor es in ein
Ergebnis gelangt, durchläuft es eine feste Pipeline:

- höchstens eine ausdrücklich genannte Fehlerzeile, oder die letzten vier Zeilen, die mit `|`
  verbunden werden, wenn die Ausgabe keine benennt; dabei wird jede Zeile für sich geschwärzt, bevor
  sie verbunden wird;
- OSC- und CSI-Sequenzen werden vollständig entfernt – Payload eingeschlossen –, sowohl in ihrer
  7-Bit-Form (`ESC ]`, `ESC [`) als auch in ihrer 8-Bit-Form (U+009D, U+009B), denn ein Terminal,
  das 8-Bit-Steuerzeichen akzeptiert, liest U+009B genauso wie `ESC [`. Jedes verbleibende
  Steuerzeichen außer Tab und Zeilenumbruch wird durch ein Leerzeichen ersetzt: C0, DEL und der
  C1-Bereich gleichermaßen, Carriage Return eingeschlossen. Jede andere Escape-Sequenz verliert auf
  dieselbe Weise ihren Einleiter und behält nur einen druckbaren Rest, der keine Steuerfunktion
  trägt;
- die Header `Authorization`, `Proxy-Authorization`, `Cookie` und `Set-Cookie` werden als Ganzes
  ersetzt – Name und der gesamte restliche Zeileninhalt zusammen –, da ein solcher Header mehrere
  Werte tragen kann und das Entfernen nur des ersten den Rest zurücklässt;
- `Bearer`-Tokens, JWTs, URL-Userinfo, bekannte Vendor-Key-Präfixe sowie jedes `label: value`-Paar,
  dessen Label `key`, `token`, `secret`, `password` oder `credential` enthält, werden durch
  `[REDACTED]` ersetzt;
- jede verbleibende ununterbrochene Folge von 24 oder mehr alphanumerischen Zeichen, die Buchstaben
  und Ziffern mischt, wird durch `[REDACTED]` ersetzt; das erfasst auch ein Credential, dessen
  Aussteller nicht auf der Präfixliste steht. Lesenswerte Bezeichner überstehen dies, weil sie in
  kurze Segmente zerfallen: Die längste ununterbrochene Folge in `claude-opus-4-5-20251101` ist
  acht;
- nie länger als 501 Zeichen: Eine Nachricht, die diese Grenze überschreiten würde, wird auf 500
  Zeichen gekürzt und erhält einen einzelnen abschließenden `…`;
- vollständig ausgelassen statt leer gesendet, wenn der Provider nichts Brauchbares mitgeteilt hat.

Was übrig bleibt, ist ein begrenztes Zitat, kein geparstes Feld: Es hat außer `string` kein Schema,
sein Wortlaut stammt vom Provider und ändert sich, wenn sich der Provider ändert, und es kann
Dateisystempfade enthalten, die der Provider selbst ausgegeben hat. Nicht darauf verzweigen.

Schwärzung ist Defense in Depth für vom Provider verfassten Text, kein Beweis. Es werden genau die
oben genannten Regeln angewendet; keine endliche Regelmenge lässt sich als lückenlos für jedes
Credential nachweisen, das sich ein Provider ausdenken könnte, und die letzte Regel existiert, weil
sich eine Präfixliste nachweislich als unzureichend erwiesen hat. `providerMessage` als die am
wenigsten vertrauenswürdige Zeichenkette im Ergebnis behandeln und es nicht dorthin weiterleiten, wo
ein Geheimnis inakzeptabel wäre.

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
- Das einzige Feld, das vom Provider verfassten Text in einen typisierten Fehler bringt, ist `providerMessage`; es wird geschwärzt und begrenzt, wie unter [Verifikationsergebnisse](#providermessage) beschrieben. Ein Pfad, den der Provider selbst ausgegeben hat, kann darin erscheinen; Credentials werden durch die dort aufgeführten Regeln geschwärzt, die Defense in Depth sind, keine Garantie.
