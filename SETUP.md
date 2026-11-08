# STODLBOX – Einrichtung Schritt für Schritt

Dauer: ca. 30 Minuten. Kosten: 0 €. Du brauchst einen GitHub- und einen Supabase-Account (beide gratis).

> Bis Schritt 7 erledigt ist, läuft die App im **Demo-Modus** mit Testdaten im Browser.
> Lokal anschauen: `python3 -m http.server 8765` im Projektordner, dann <http://localhost:8765/#/?c=STODL-DEMO>.
> Demo-Admin: `#/admin`, beliebige Mail, Code `123456`.

---

## 1. GitHub-Repo anlegen

1. <https://github.com/new> öffnen.
2. **Repository name:** `stodlbox` · **Public** (nötig für kostenloses GitHub Pages; im Code liegen keine Geheimnisse, die Daten schützt der Gruppen-Code).
3. **Create repository**.
4. Den Projektordner hochladen, z. B. im Terminal:
   ```bash
   git remote add origin https://github.com/<dein-github-name>/stodlbox.git
   git push -u origin main
   ```

## 2. Supabase-Projekt anlegen

1. <https://supabase.com/dashboard> → **New project**.
2. **Name:** `stodlbox` · **Region:** *Central EU (Frankfurt)* · Datenbank-Passwort generieren lassen und im Passwort-Manager speichern.
3. Warten, bis das Projekt bereit ist (1–2 Minuten).
4. **Project Settings → API Keys** (bzw. **Data API**):
   - **Project URL** kopieren, z. B. `https://abcdefgh.supabase.co`.
   - Den **anon / public** Key kopieren (Reiter *Legacy API Keys*, beginnt mit `eyJ…`).
     Der **service_role**- bzw. **secret**-Key kommt **niemals** ins Repo und wird nirgends gebraucht.

## 3. Datenbank einrichten (SQL Editor)

**SQL Editor → New query**. Jede Datei komplett hineinkopieren und **Run** drücken – in dieser Reihenfolge:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rpc.sql`
3. `supabase/migrations/003_cron.sql` (falls „extension pg_cron is not available“: zuerst Schritt 4, dann nochmal)
4. `supabase/migrations/004_seed.sql`

Danach dieses Snippet ausführen – **deine Mail und deinen Gruppen-Code eintragen**:

```sql
insert into app_settings (admin_email, group_code_hash)
values ('DEINE@MAIL.AT', extensions.crypt(upper('STODL-XXXX'), extensions.gen_salt('bf')));
```

Der Gruppen-Code ist egal, was – Hauptsache nicht leicht zu erraten (z. B. `STODL-K7QM`). Groß-/Kleinschreibung spielt keine Rolle.

**Optional, aber empfohlen:** `supabase/tests.sql` ausführen. Es läuft komplett in einer Transaktion und wird zurückgerollt, ändert also nichts. Unter *Messages* muss am Ende `ALLE TESTS OK` stehen.

## 4. pg_cron prüfen

**Database → Extensions** (bzw. **Integrations → Cron**): `pg_cron` muss aktiv sein.
Unter **Integrations → Cron → Jobs** sollten zwei Jobs stehen: `stodlbox-close-votes` (alle 15 Min.) und `stodlbox-series` (täglich 03:00 UTC).

## 5. Admin-Login vorbereiten (Authentication)

1. **Authentication → Users → Add user → Create new user**
   - Deine Admin-Mail (dieselbe wie oben), ein beliebiges langes Passwort (wird nie gebraucht), **Auto Confirm User** anhaken.
2. **Authentication → Sign In / Providers** (bzw. *Providers → Email*):
   - **Allow new users to sign up** → **aus**. Damit kann sich niemand sonst ein Konto anlegen.
   - **Email** bleibt aktiv.
3. **Authentication → URL Configuration:**
   - **Site URL:** `https://<dein-github-name>.github.io/stodlbox/`
   - **Redirect URLs:** dieselbe Adresse hinzufügen.
4. **Eigener Mailserver (SMTP) – empfohlen:** Ohne SMTP verschickt Supabase nur 2 Login-Mails pro Stunde und die Vorlage
   ist nicht änderbar. Unter **Authentication → Emails → SMTP Settings** eintragen (Stodlbox: Host `xserv2201.hybridserver.at`,
   Port 465, Postfach foto@schafranek.at), dann gilt ein Limit von 30 Mails pro Stunde. Die Login-Maske erwartet den Code aus der Mail.
   Vorlage unter **Emails → Templates → Magic link** (Inhalt: `supabase/email-magic-link.html`), Beispiel
   (praktisch, weil der Code auch in der installierten Home-Bildschirm-App funktioniert):
   - **Subject:** `Dein STODLBOX-Login`
   - **Body:**
     ```html
     <h2>STODLBOX Admin-Login</h2>
     <p>Dein Code: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
     <p>Oder direkt einloggen: <a href="{{ .ConfirmationURL }}">Login-Link</a></p>
     <p>Gilt eine Stunde. Wenn du das nicht warst, ignorier die Mail einfach.</p>
     ```

> Hinweis: Supabase verschickt mit dem eingebauten Mail-Dienst nur wenige Mails pro Stunde. Für einen Admin reicht das.

## 6. `config.js` befüllen

In `config.js` die beiden Werte aus Schritt 2 eintragen:

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ…';
```

Dann committen und pushen. Ab jetzt ist der Demo-Modus aus.

## 7. Vorschaubild für WhatsApp

In `index.html` die Zeile mit `og:image` auf die absolute Adresse ändern (WhatsApp braucht eine volle URL):

```html
<meta property="og:image" content="https://<dein-github-name>.github.io/stodlbox/assets/og.png">
```

## 8. GitHub Pages einschalten

**GitHub → Repo `stodlbox` → Settings → Pages**
- **Source:** *Deploy from a branch*
- **Branch:** `main` · Ordner `/ (root)` → **Save**

Nach 1–2 Minuten ist die App unter `https://<dein-github-name>.github.io/stodlbox/` erreichbar.

## 9. Keepalive (damit Supabase nicht einschläft)

Supabase pausiert Gratis-Projekte nach ca. 7 Tagen ohne Aktivität. Der Workflow `.github/workflows/keepalive.yml` pingt 2× pro Woche.

**GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret**
- `SUPABASE_URL` = Project URL
- `SUPABASE_ANON_KEY` = anon key

Testen: **Actions → Supabase Keepalive → Run workflow**. Der Lauf muss grün werden.

## 9b. Fotos: tägliches Aufräumen

Fotos werden 7 Tage nach dem Training gelöscht. Das macht der GitHub-Auftrag `.github/workflows/photo-cleanup.yml` jede Nacht.
Er braucht den geheimen Supabase-Schlüssel (darf nie ins Repo):

1. Supabase → Project Settings → API Keys → den **Secret key** (bzw. bei den „Legacy“-Schlüsseln **service_role**) kopieren.
2. GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret:
   Name `SUPABASE_SERVICE_KEY`, Wert = der Schlüssel. (`SUPABASE_URL` gibt es schon vom Keepalive.)
3. Test: GitHub → Actions → „Fotos aufräumen“ → Run workflow. Grün = passt.

Der Speicher-Bucket `photos` wird von `supabase/migrations/007_photos.sql` selbst angelegt.

## 10. Erster Login als Admin

1. `https://<dein-github-name>.github.io/stodlbox/#/admin` öffnen.
2. Mail eingeben → **CODE SCHICKEN** → 6-stelligen Code aus der Mail eingeben.
3. **Mehr → Einstellungen:** Gruppen-Code einmal eingeben (dann steht dort der Einladungslink).

## 11. Loslegen

1. **Mehr → Leute:** Namen der Freunde anlegen (sie können sich auch selbst anlegen).
2. **Termine → + → Serie:** z. B. *Samstags-WOD*, Samstag 09:00, max. 8. Die Termine für 6 Wochen erscheinen sofort.
3. Beim nächsten Termin das Workout eintragen (oder ein Voting anlegen).
4. **Mehr → Einstellungen → In WhatsApp teilen:** Einladungslink in die Gruppe schicken.

## 12. Am Handy installieren

- **iPhone (Safari):** Link öffnen → **Teilen** → **Zum Home-Bildschirm**.
- **Android (Chrome):** Link öffnen → Menü **⋮** → **App installieren**.

---

## Gruppen-Code ändern

**Admin → Mehr → Einstellungen → Gruppen-Code ändern.** Danach funktionieren alte Links nicht mehr; den neuen Einladungslink in die Gruppe schicken. Wer die App schon offen hat, wird beim nächsten Öffnen nach dem Code gefragt.

## Wenn etwas nicht geht

| Problem | Lösung |
|---|---|
| „Code passt nicht“ trotz richtigem Link | Snippet aus Schritt 3 nochmal prüfen (`select admin_email from app_settings;` muss eine Zeile liefern). |
| Admin-Mail kommt nicht | Spam-Ordner; Supabase **Authentication → Logs**; Mail-Limit (wenige pro Stunde) abwarten. |
| „Diese Mail ist nicht als Admin angelegt“ | Schritt 5.1 – der User muss in Supabase existieren. |
| Eingeloggt, aber „keine Admin-Rechte“ | Die Mail in `app_settings.admin_email` muss genau die Login-Mail sein. |
| Votings schließen nicht automatisch | Schritt 4 – Cron-Jobs prüfen. |
| App zeigt alten Stand | Die App lädt beim Öffnen neu; notfalls oben rechts auf das Neu-laden-Symbol tippen. |
