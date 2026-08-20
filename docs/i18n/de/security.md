[English](../../../SECURITY.md) · [Türkçe](../tr/security.md) · **Deutsch** · [简体中文](../zh-CN/security.md) · [Español](../es/security.md) · [Français](../fr/security.md)

# Sicherheitsrichtlinie

> Maßgeblich ist die englische Dokumentation. Weichen Übersetzung und getestetes Verhalten voneinander ab, gilt die englische Fassung.

## Meldung

Für eine vermutete Schwachstelle oder ein versehentlich offengelegtes Credential kein öffentliches
Issue eröffnen. Stattdessen [GitHubs private
Sicherheitslücken-Meldung](https://github.com/VerhexIO/xerify/security/advisories/new) verwenden.
Betroffene Version, Auswirkung, Reproduktion und einen möglichen Fix-Vorschlag angeben; aktive
Credentials und sensible Produktionsdaten dabei weglassen.

Vor dem ersten signierten Release wird keine Version öffentlich unterstützt. Nach dem Launch erhält
die jeweils neueste Minor-Release-Linie Sicherheitsfixes; die Support-Tabelle wird an dieser Stelle
aktualisiert.

## Sicherheitsmodell

Xerify behandelt sowohl mitgelieferte Belege als auch Provider-Ausgaben als nicht vertrauenswürdige
Daten. Verifikationsprompts stufen Behauptung/Kontext explizit als Beleg ein, nicht als Anweisung,
und verlangen eine gezielt gegnerische Widerlegung. Das senkt das Risiko einer
Anweisungsverwechslung, macht ein LLM aber nicht prompt-injection-sicher. Xerify führt
Modellausgaben niemals aus und wertet nie einen konfigurierten Shell-String aus. Prozess-Adapter
starten ein Executable mit Argument-Array und `shell: false`, reichen eine Allowlist-Umgebung
weiter, senden Prompt/Kontext über stdin, begrenzen stdout/stderr und beenden bei Timeout oder
Abbruch den gesamten Prozessbaum.

Die wirksame Anweisungsreihenfolge lautet: zuerst der Verifikationsvertrag von Xerify, dann die
gewählte Operation, dann der vom Besitzer freigegebene Belegumfang und erst danach die nicht
vertrauenswürdige Behauptung bzw. der Kontext. Text innerhalb von Code, Diffs, Logs, Kommentaren,
Dokumenten oder früherer Modellausgabe kann die Aufgabe, die Urteilsregeln oder das Antwortschema
nicht legitim verändern. Das Modell kann diese Grenze dennoch missachten, weshalb die
Schema-Validierung im Core und fail-closed-Ergebnisse zwingend bleiben.

Offizielle CLI-Adapter laufen nicht aus dem Repository des Nutzers. Codex nutzt eine flüchtige
Read-only-Sandbox, in der Nutzerkonfiguration/-regeln ignoriert werden. Claude nutzt ein frisches
temporäres Verzeichnis mit Modus `0700`, Safe Mode, keine Tools, keine Slash-Befehle und keine
Session-Persistenz. Cursor nutzt einen frischen Workspace mit Modus `0700`, den read-only Ask-Modus
und seine Sandbox. Cursor Agent bietet derzeit keinen Schalter, der alle kontoweit konfigurierten
MCP-Server kategorisch deaktiviert; das ist eine verbleibende Grenze, keine verdeckte Garantie.
Direkte API-Adapter haben keinen Zugriff auf lokales Dateisystem oder Tools. Ein generischer
Command-Adapter ist explizit vom Besitzer konfigurierter Code, läuft standardmäßig aus einem
frischen temporären Verzeichnis und erbt trotzdem die Sicherheit dieses Executables und seiner
zulässigen Umgebung.

Geheimnisse für direkte APIs sollten aus benannten Umgebungsvariablen gelesen werden. Für einfache
Einzelplatz-Setups akzeptieren direkte HTTP-Adapter zusätzlich ein explizites literales `apiKey`
als Fallback; sind beide vorhanden, gewinnt die Umgebungsvariable. Auch Provider-Endpoint-URLs sind
sensibel, weil sich Credentials in Userinfo, Pfaden, Query-Werten oder Fragmenten verstecken
können. Die Konfiguration ist standardmäßig git-ignoriert; eine Konfiguration mit literalem Key
oder explizitem Endpoint wird unter POSIX abgelehnt, sofern nicht Modus `0600` gesetzt ist; und die
Konfigurationsansicht ersetzt sowohl literale Keys als auch vollständige Endpoint-Werte durch
`[REDACTED]`. Windows-Nutzer müssen eine besitzerexklusive ACL setzen. Benannte
Key-Umgebungsvariablen sind URL-getragenen Credentials vorzuziehen. Ein kompatibler Endpoint mit
Userinfo, Query-Parametern oder einem Fragment – und jeder Remote-Endpoint ohne explizite
Key-Deklaration – meldet die Authentifizierung als `unknown`, statt zu behaupten, es sei keine
nötig. Auf offizielle CLI-Credential-Speicher wird ausschließlich über die offizielle CLI
zugegriffen. Das optionale Audit-JSONL enthält weder Prompts, Kontext, Antworten, Findings, rohe
Provider-Payloads, Autorisierungsdaten noch Credential-Pfade. Neue Logdateien erhalten unter POSIX
den Modus `0600` und `O_NOFOLLOW`; jede Plattform lehnt geöffnete Nicht-Regular-Ziele ab. Windows
bietet keine gleichwertige atomare No-Follow-Garantie, daher Audit-Logs in einem vom Besitzer
kontrollierten Verzeichnis ablegen.

Projektzustand liegt unter `.xerify/`; ein abgesicherter Direktinstallations-Lifecycle oder
`xerify init` legt `.xerify/xverify-config.json`, private Log-/Run-/Archivverzeichnisse sowie
Ignore-Schutz in der Root-`.gitignore`, `.npmignore` und `.dockerignore` an. Diese
Schutzmaßnahmen sind Defense in Depth, keine Zugriffskontrolle: Wer Dateien manuell in Git, npm
oder einen Container-Kontext zwingt, kann sie trotzdem offenlegen.

Die Run-Historie ist bewusst detaillierter als das geheimnisfreie Audit-Log. Mit dem Standard
`captureInput: "full"` werden Behauptungen, Fragen und mitgelieferter Kontext lokal in
`.xerify/runs` gespeichert; normalisierte Ergebnisse können vom Provider verfasste Findings
enthalten. Rohe Transportantworten, Auth-Daten und Environment-Snapshots werden nie geschrieben.
Für sensible Projekte die Capture-Modi `metadata` oder `none` verwenden, den Dateisystemzugriff
einschränken und eine Aufbewahrungs-/Löschrichtlinie anwenden. `runs show` verlangt
`--include-evidence`, bevor Beleg-Inhalte ausgegeben werden. Jeder Run trägt außerdem einen
begrenzten Discovery-`head`: Bei vollständigem Capture enthält er eine kurze Vorschau von
Behauptung bzw. Frage, bei Metadata-Capture nur einen Digest, bei `none`-Capture keinerlei
eingabebasierten Inhalt. Archivierte Runs sind über `.xerify/archive/index.jsonl` auffindbar;
dieser Index enthält den begrenzten `head` und operative Metadaten, niemals Kontext, Antworten,
Findings, Beleg-Inhalte oder rohe Provider-Ausgabe. Sein Record-Digest hilft, einen Snapshot zu
finden und zu vergleichen, macht den Index aber nicht manipulationssicher gegenüber Prozessen, die
unter demselben Nutzer laufen. Vor dem Öffnen passender vollständiger Datensätze `xerify runs
search` oder den Index bevorzugen.

Der Lifecycle überschreibt nichts, ruft weder Netzwerk noch Provider auf und überspringt globale,
verschachtelt-transitive, ungespeicherte sowie `npx`-Installationen. Die Hoisting-Mehrdeutigkeit
von npm bei der ersten direkten bzw. transitiven Installation bleibt dokumentiert; Bibliotheken,
die Xerify einbetten, können `XERIFY_SKIP_AUTO_INIT=1` setzen. Projektzustand nicht per Force-Add
einchecken und die generierten Ignore-Regeln nicht abschwächen.

Streamable HTTP nutzt standardmäßig Loopback, validiert Host und Origin und verlangt für
Nicht-Loopback-Bindungen eine explizite Bestätigung plus Bearer-Authentifizierung. Für TLS,
Secret-Rotation, Netzwerk-Policy, Rate Limiting, Mehrbenutzer-Autorisierung und die sichere
Log-Erfassung bleiben die Betreiber verantwortlich.

## Grenzen

Ein Urteil `confirmed` bedeutet, dass der Verifizierer unter den mitgelieferten Belegen kein
materielles Gegenbeispiel gefunden und die gemeldeten Einschränkungen berücksichtigt hat; das ist
keine Sicherheitsgarantie, keine formale Verifikation und keine Freigabe, eine Änderung
auszuführen. Ein providerübergreifendes Review kann trotzdem dieselbe Modell-Abstammung,
Trainingsdaten, blinde Flecken oder kompromittierten Kontext teilen. Belegverweise sind vom Modell
gemeldete Hinweise, keine geprüften Zitate. Sensible Eingaben eng begrenzt halten und alle Findings
unabhängig prüfen.

Die Provider-Trennung beruht auf dem aufrufenden, abrechnenden und kontrollierenden Dienst. Ein
über Cursor erreichtes Modell ist `cursor`, selbst wenn seine Katalog-ID GPT, Claude oder Gemini im
Namen trägt. Ein direkter Aufruf beim Anbieter und Cursor können die Provider-Prüfung also
gleichzeitig erfüllen und dabei dennoch eine verwandte oder identische zugrunde liegende
Modell-Abstammung nutzen. Die Vielfalt der Kanäle als Defense in Depth verstehen, nie als Beweis
für Modellunabhängigkeit.

Keine rein promptbasierte Technik kann Injection vollständig verhindern. Vor einem Live-Aufruf den
exakten, begrenzten stdin-Umfang prüfen; Credentials, Environment-Dumps, Kundendaten, unbeteiligten
Quellcode und Auth-Speicher davon ausschließen. Generierte Diffs bzw. Testausgaben einem ganzen
Repository vorziehen. Provider-CLI, Extensions, Plugins, MCP-Konfiguration und Kontorichtlinien
vertrauenswürdig und aktuell halten. `unclear`, Kürzung, ungültige strukturierte Ausgabe, Timeout
oder Adapter-Fehler als Nicht-Erfolg behandeln und vor jeder Handlung aufgrund eines Urteils
unabhängige Tests verlangen.
