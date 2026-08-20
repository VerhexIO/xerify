[English](../../compatibility.md) · [Türkçe](../tr/compatibility.md) · **Deutsch** · [简体中文](../zh-CN/compatibility.md) · [Español](../es/compatibility.md) · [Français](../fr/compatibility.md)

# Kompatibilitäts- und Support-Grenzen

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

Xerify unterstützt über die öffentliche CI-Matrix Node.js 20 und 24 unter Ubuntu, macOS und
Windows. Node.js 24 ist die primäre Release-Schiene. WSL nutzt den Linux-Laufzeitpfad,
host-spezifische Provider-Authentifizierung und Prozessverhalten sollten aber auf der tatsächlichen
Maschine mit `xerify health` geprüft werden. Der vollständige Check, der Clean-Install-Smoke-Test und das Release-Audit bestehen ebenfalls
unter WSL2 mit Node.js 24 – verifiziert auf einem Maintainer-Rechner, nicht durch die
öffentliche CI-Matrix.

## Unterstützte Oberflächen

| Oberfläche            | Vertrag                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| CLI                   | Menschenlesbare Ausgabe plus stabile `--json`-Envelopes und dokumentierte Exit-Codes         |
| JavaScript/TypeScript | ESM-Paket-Exports mit gebündelten Typdeklarationen                                           |
| MCP STDIO             | Lokaler Server, moderne und Legacy-Protokollaushandlung                                      |
| MCP Streamable HTTP   | Standardmäßig Loopback; für eine Nicht-Loopback-Bindung explizites, authentifiziertes Opt-in |

Die öffentliche JSON-/Schema-Version ist `1`. In kompatiblen Releases können additive optionale
Felder hinzukommen; das Entfernen oder Umdeuten eines bestehenden öffentlichen Feldes erfordert
einen Breaking Release.

## Provider-Kanäle

Die eingebauten Adapter decken Codex CLI, Claude CLI, Cursor Agent, OpenAI API, Anthropic API,
OpenAI-kompatibles HTTP sowie einen explizit konfigurierten Command ab. Die Verfügbarkeit hängt vom
gewählten Kanal, dem installierten Executable, dem Konto, der exakten Modell-ID, der
Authentifizierung, der Region und der Provider-Policy ab. Xerify verspricht nicht, dass ein für ein
Konto sichtbares Modell auch für ein anderes existiert.

Diese nicht abrechnungspflichtigen Prüfungen in der konsumierenden Umgebung ausführen:

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Provider-Probes stellen die lokale Transportbereitschaft fest, nicht die Qualität oder Wahrheit
eines Modells. Ein erfolgreicher Live-Aufruf belegt nur den exakten Adapter-/Provider-/Modell-Pfad,
der für diese Anfrage genutzt wurde. Provider-Prosa ist nicht byte-deterministisch; Xerify
garantiert deshalb Schema, Grenzwerte, fail-closed-Ergebnisse und typisierte Fehler – nicht
identischen Wortlaut.

## Grenzen der Ergebnisaussage

`confirmed` bedeutet, dass innerhalb der mitgelieferten Belege kein materielles Gegenbeispiel
gefunden wurde. Das ist keine formale Verifikation, keine Sicherheitszertifizierung und keine
automatische Freigabe, eine Änderung zu mergen oder auszuführen. `refuted` blockiert die
Behauptung; `unclear`, Timeout, Kürzung, ungültige Ausgabe und Provider-Fehler zählen als
Nicht-Erfolg und verlangen einen erneuten Versuch, stärkere Belege oder eine menschliche Prüfung.

Normale Paket- und CI-Checks benötigen weder Provider-Credentials noch rufen sie ein Modell auf.
Live-Provider-Tests sind immer explizit und können Subscription-Kontingent verbrauchen oder
API-Kosten verursachen.

Adapterspezifische Einschränkungen stehen unter [Provider-Adapter](provider-adapters.md). Grenzen
bei Daten und Prompts stehen in der [SECURITY.md](security.md).
