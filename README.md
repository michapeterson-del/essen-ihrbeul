# Bestellung „Zum Irrbühl“ – Was möchtest du essen?

Einmalige Sammelbestellung: Jede Person bestellt **genau ein Gericht** (Name freiwillig) und sieht danach eine Danke-Seite.
Alle Bestellungen stehen unter **`/results`**, ohne Passwort.

- Deutsch / Русский (Button oben rechts)
- Suchleiste, Gerichte nach Kategorien, `*` = mit Vorderschinken
- Mobile-first, heller/dunkler Modus

## Auf Coolify starten

1. **+ New → Application →** dieses GitHub-Repo auswählen.
2. **Build Pack: Dockerfile**, **Port: `3000`**, Domain eintragen.
3. **Storages → + Add → Volume Mount**, Pfad **`/data`** (damit die Bestellungen einen Neustart überleben).
4. **Deploy**.

Fertig:
- Bestellen: `https://deine-domain/`
- Alle Bestellungen: `https://deine-domain/results`

Danach kann die App in Coolify einfach gelöscht werden.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Bestellseite |
| `results.html` | Alle Bestellungen (Anzahl und Namen pro Gericht) |
| `menu.json` | Speisekarte: Nummer, Name, Preis, `ham: true` für `*`, Beschreibung DE/RU |
| `i18n.json` | Alle Texte der Oberfläche und Kategorien in DE/RU |
| `server.js` | Kleiner Server ohne Abhängigkeiten; speichert Bestellungen in `/data/votes.json` |
| `Dockerfile` | Für Coolify |

## Lokal testen

```bash
node server.js     # http://localhost:3000 und http://localhost:3000/results
```

Pro Browser ist nur eine Bestellung möglich (Merker im Browser + Cookie).
Zum erneuten Testen das Cookie und den localStorage der Seite löschen.
