# STODLBOX

Private Web-App (PWA) für unser Training im Stadl: Termine, Zusagen mit Warteliste, Workout-Voting, Terminfindung, Equipment-Tipps, Kalender-Export und Teilen auf WhatsApp.

- **Frontend:** reines HTML, CSS und JavaScript (ES-Module), kein Build-Schritt → läuft direkt auf GitHub Pages.
- **Backend:** Supabase Free (Postgres, Auth, pg_cron). Kosten: 0 €.
- **Zugang:** Gruppen-Code im Einladungslink (`…/#/?c=STODL-XXXX`), danach „Wer bist du?“. Admin per Mail-Code.

Einrichtung: siehe **[SETUP.md](SETUP.md)**. Plan und Spezifikation: [STODLBOX-V1-PLAN.md](STODLBOX-V1-PLAN.md).

## Demo-Modus

Solange `config.js` leer ist, läuft die App mit Testdaten im Browser (localStorage):

```bash
python3 -m http.server 8765
```

Dann <http://localhost:8765/#/?c=STODL-DEMO> öffnen. Admin unter `#/admin` mit beliebiger Mail und Code `123456`.
Zurücksetzen: Admin → Mehr → Einstellungen → *Demo-Daten zurücksetzen*.

## Aufbau

```
index.html              App-Shell, OG-Tags, Fonts
config.js               Supabase-URL + anon key (öffentlich)
manifest.webmanifest    PWA
sw.js                   Service Worker (App-Shell offline)
css/                    tokens.css (Design B), app.css
js/
  main.js               Start + Routen (Hash-Router in router.js)
  api.js                Supabase-RPCs; mock.js = Demo-Backend mit derselben Logik
  state.js              Gerätespeicher (Code, Name, Board-Cache)
  equipment.js          Equipment-Matching (Tests: tests/equipment.test.html)
  calendar.js           .ics + Google-Kalender
  share.js              Web Share / WhatsApp
  format.js             Datum/Zeit in Europe/Vienna
  components/           Termin-Bausteine, Terminfindungs-Matrix
  views/                Board, Termin, Archiv, Onboarding, admin/*
supabase/migrations/    001 Schema + RLS · 002 RPCs · 003 pg_cron · 004 Equipment-Regeln
supabase/tests.sql      SQL-Tests (Warteliste, Voting, Terminfindung, Serie + Sommerzeit, Rechte)
tools/                  make-assets.py (Icons, OG-Bild), sql-test/ (Tests lokal mit PGlite)
```

## Sicherheit in Kürze

- RLS auf allen Tabellen. Die Rolle `anon` hat **keinen** direkten Tabellenzugriff, nur RPC-Funktionen, die zuerst den Gruppen-Code prüfen.
- Der Gruppen-Code liegt nur als bcrypt-Hash in der Datenbank.
- Admin = eingeloggter User, dessen Mail in `app_settings.admin_email` steht. Selbstregistrierung ist aus.
- Nutzertexte werden beim Rendern escaped (`js/html.js`), Foto-Links nur mit `http(s)://`.
- `noindex` + `robots.txt`, keine Tracker.

## Tests

- **Equipment:** `tests/equipment.test.html` im Browser öffnen (über den lokalen Server).
- **Datenbank:** `supabase/tests.sql` im Supabase SQL Editor ausführen, oder lokal:
  ```bash
  cd tools/sql-test && npm install && npm test
  ```

## Bewusst nicht in V1

Foto-Upload, Push, Chat, Ergebnisse/Leaderboard (Tabelle `results` ist schon da), WOD-Timer – siehe Plan, Abschnitt 11.
