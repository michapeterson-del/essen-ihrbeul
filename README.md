# Umfrage „Zum Irrbühl“ – Was möchtest du essen?

Kleine, statische Umfrage-Webseite (HTML/CSS/JS, kein Build-Schritt).
Jede Person wählt **genau ein Gericht**, optional mit Namen, und sieht danach eine Danke-Seite.

- Sprachen **Deutsch / Русский** (Button oben rechts, Wahl wird gemerkt)
- Suchleiste (Name, Nummer oder Zutat – auch in der jeweils anderen Sprache)
- Gerichte nach Kategorien, mit Nummer, Name, Preis, Beschreibung, `*` = mit Vorderschinken
- Mobile-first, heller/dunkler Modus (folgt dem System, per Button oben umschaltbar)
- Ergebnisseite `results.html`: Stimmen und Namen pro Gericht

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Umfrage |
| `results.html` | Ergebnisse |
| `menu.json` | **Speisekarte**: Nummer, Name, Preis, `ham: true` für `*`, Beschreibung `de`/`ru` |
| `i18n.json` | **Texte der Oberfläche** und Kategorien (Titel, Hinweise, Pizza-Beläge) in DE/RU |
| `server.js`, `Dockerfile` | Kleiner Server zum Speichern der Stimmen (für Coolify / Docker) |
| `config.js` | Nur für Supabase nötig (bei eigenem Server leer lassen) |
| `supabase-setup.sql` | Tabelle + Rechte für Supabase |
| `css/`, `js/` | Design und Logik |

Ein Gericht ändern/hinzufügen: einfach `menu.json` bearbeiten. Neue Kategorie: in `menu.json`
eine `id` anlegen und in `i18n.json` unter `categories` für `de` und `ru` einen Titel ergänzen.

## Lokal ansehen

Die Seite lädt JSON-Dateien, deshalb nicht per Doppelklick öffnen, sondern starten mit:

```bash
node server.js            # mit Speicherung, http://localhost:3000
# oder ohne Speicherung (Demo-Modus):
python3 -m http.server 8000
```

## Hosten mit Coolify (empfohlen)

Das Repo enthält einen kleinen Server (`server.js`, ohne Abhängigkeiten) und ein `Dockerfile`.
Der Server liefert die Seite aus und speichert die Stimmen in `/data/votes.json`.

1. In Coolify: **+ New → Application → Public/Private Repository (GitHub)** → dieses Repo und den Branch wählen.
2. **Build Pack: Dockerfile**, **Ports Exposes: `3000`**, Domain eintragen.
3. Unter **Storages → + Add → Volume Mount**: Destination Path `/data`
   (wichtig, sonst sind die Stimmen nach jedem Deploy weg).
4. Unter **Environment Variables** (optional, aber empfohlen):
   - `RESULTS_PASSWORD` – Passwort für die Ergebnisseite (ohne = Ergebnisse öffentlich)
   - `ADMIN_PASSWORD` – erlaubt das Zurücksetzen aller Stimmen (siehe unten)
5. **Deploy**.

Danach: Umfrage unter `https://deine-domain/`, Ergebnisse unter `https://deine-domain/results`.

Der Server prüft, dass die Gerichtsnummer existiert, kürzt Namen auf 60 Zeichen und setzt
zusätzlich zum localStorage-Merker ein Cookie, damit derselbe Browser nicht zweimal abstimmen kann.

**Alle Stimmen löschen** (z. B. für eine neue Runde):

```bash
curl -X DELETE -H "Authorization: Bearer DEIN_ADMIN_PASSWORT" https://deine-domain/api/votes
```

**Stimmen sichern:** Die Datei `votes.json` liegt im Volume; in Coolify kannst du sie unter
Storages einsehen oder per `curl -H "Authorization: Bearer RESULTS_PASSWORD" https://deine-domain/api/votes` abrufen.

Lokal mit Server testen:

```bash
RESULTS_PASSWORD=test node server.js   # http://localhost:3000
# oder mit Docker:
docker build -t irrbuehl-umfrage . && docker run -p 3000:3000 -v irrbuehl-data:/data irrbuehl-umfrage
```

## Alternative: nur statisch (GitHub Pages / Vercel + Supabase)

Ohne eigenen Server läuft die Seite im **Demo-Modus**: Stimmen landen nur im eigenen Browser.
Für echte Umfragen mit rein statischem Hosting:

1. Kostenloses Projekt auf <https://supabase.com> anlegen.
2. Im Dashboard **SQL Editor** öffnen, Inhalt von `supabase-setup.sql` einfügen und ausführen.
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key kopieren.
4. Beides in `config.js` eintragen, committen, pushen.

Der anon-Key ist für den Browser gedacht und darf öffentlich sein. Die Policies erlauben nur
*Einfügen* und *Lesen* – Stimmen können nicht geändert oder gelöscht werden.
Hinweis: Weil die Ergebnisseite öffentlich lesen darf, kann jeder mit dem Link die Namen sehen.
Wer das nicht möchte, entfernt die Policy „anon can read votes“ und schaut die Ergebnisse im
Supabase-Dashboard (Table Editor → `votes`) an.

## „Nur einmal abstimmen“

Nach dem Absenden wird im Browser ein Merker (`localStorage` → `irrbuehl_voted`) gesetzt;
danach erscheint nur noch die Danke-Seite. Das ist für eine Umfrage unter Bekannten gedacht –
wer den Browserspeicher löscht oder ein anderes Gerät nutzt, könnte erneut abstimmen.

Zum Testen zurücksetzen (Browser-Konsole): `localStorage.removeItem("irrbuehl_voted")`

## Statisches Hosting

**GitHub Pages:** Repo pushen → *Settings → Pages* → Source „Deploy from a branch“,
Branch `main`, Ordner `/ (root)` → Speichern. Nach kurzer Zeit unter
`https://<benutzer>.github.io/<repo>/` erreichbar.

**Vercel:** Auf <https://vercel.com> „Add New → Project“, das GitHub-Repo importieren,
Framework „Other“, kein Build-Befehl, Output-Verzeichnis leer lassen → Deploy.
