# Nightly – erster Party-App-Prototyp

## Enthaltene Dateien
- `index.html`: Struktur der App
- `styles.css`: dunkles, responsives Design
- `app.js`: Beispieldaten, Stadtsuche, Filter, Merkliste und Event-Formular
- `manifest.json`: Metadaten für eine installierbare Web-App
- `sw.js`: einfacher Service Worker für Hosting über HTTPS

## Was funktioniert?
- Beispieldaten von Events anzeigen
- nach Stadt suchen und nach Kategorie, Auslastung und Preis filtern
- Events im aktuellen Browserzustand merken
- Events als lokale Vorschau hinzufügen
- Layout für Mobilgeräte

## Was ist noch nicht verbunden?
Die Events sind Demo-Daten, keine echten Veranstaltungen. Es gibt noch keine Datenbank, Anmeldung, Freundesanfragen, echten Event-Import, Live-Auslastung oder App-Store-Version. Neu hinzugefügte Events werden nicht dauerhaft gespeichert.

## Test auf Windows
1. ZIP-Datei entpacken.
2. `index.html` doppelklicken.
3. Die Seite öffnet sich im Standardbrowser.

Optional für lokalen Server: PowerShell im Ordner öffnen und `python -m http.server 8000` ausführen. Dann `http://localhost:8000` im Browser öffnen.

## Auf dem iPhone testen
Für Installation auf dem Home-Bildschirm muss die Seite normalerweise über HTTPS erreichbar sein. Anschließend in Safari öffnen, Teilen wählen und „Zum Home-Bildschirm“ antippen.

## Nächster Schritt
Eine Supabase-Datenbank einrichten, mit Zugriffsschutz (RLS), anschließend Event-Import und Nutzerkonten hinzufügen. API-Schlüssel dürfen nicht in `app.js` abgelegt werden.
