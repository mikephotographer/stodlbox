# STODLBOX – Umsetzungsplan Version 1

> Plan für Claude Code. Ziel: eine private, kostenlose Web-App (PWA) für den Trainingsstadel von Mike, in dem er mit Freunden CrossFit- und HYROX-Workouts macht.
> Sprache der Oberfläche: **Deutsch (österreichisch, locker, du-Form)**. Zeitzone: **Europe/Vienna**.

---

## 0. Arbeitsweise für Claude Code

- Arbeite die Phasen in Abschnitt 10 der Reihe nach ab und committe nach jeder Phase.
- **Kein Build-Schritt.** Reines HTML, CSS und JavaScript (ES-Module), damit GitHub Pages das Repo direkt ausliefern kann. Keine Frameworks, kein npm für die App selbst.
- `supabase-js` v2 per CDN als ES-Modul einbinden, mit fixer Version, z. B. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm`.
- Alles, was Mike selbst in einer Weboberfläche klicken muss (Supabase-Projekt anlegen, GitHub Pages aktivieren usw.), **nicht raten**. Schreib es als Schritt-für-Schritt-Anleitung in `SETUP.md` und frag Mike nach den Werten (Supabase-URL, Anon-Key, Admin-Mail, Gruppen-Code).
- Keine Geheimnisse ins Repo. Der Supabase **Anon-Key** ist öffentlich und darf in `config.js`. Der **Service-Role-Key** kommt niemals ins Repo.
- Mobile first. Die Hauptnutzung ist am Handy, Breite 360–430 px. Desktop darf einfach zentriert mit max. 480 px Breite laufen.

---

## 1. Zusammenfassung

| Bereich | Inhalt |
|---|---|
| Für Freunde | Termine sehen, zu- oder absagen, Warteliste, Workout-Voting, Terminfindung, Equipment-Tipps, Kalender-Export, Archiv, Link zu Fotos |
| Für Mike (Admin) | Login per Magic Link, Termine und Serien anlegen, Workout fix oder als Voting, Terminfindung, Vorlagen, Equipment-Regeln, Namensliste, Teilen auf WhatsApp |
| Technik | GitHub Pages (Frontend) + Supabase Free (Postgres, Auth). Kosten: 0 € |
| Bewusst nicht in V1 | Foto- und Video-Upload, Push-Benachrichtigungen, Chat, Ergebnisse und Leaderboard (V2, aber im Datenmodell vorgesehen) |

---

## 2. Entscheidungen (von Claude vorgeschlagen, Mike kann sie ändern)

1. **Zugang über Gruppen-Code:** Die Seite ist öffentlich erreichbar, aber ohne gültigen Gruppen-Code sieht man keine Daten und kann nichts schreiben. Der Einladungslink enthält den Code (`…/#/?c=STODL-XXXX`). Wer über WhatsApp den Link bekommt, ist also sofort drin. Der Code wird im Gerät gespeichert (`localStorage`). Mike kann ihn im Admin-Bereich ändern, dann müssen alle den neuen Link verwenden.
2. **Feste Namensliste:** Beim ersten Besuch wählt man „Wer bist du?“ aus der Liste. Die Auswahl wird im Gerät gespeichert, rechts oben gibt es „Nicht du? Wechseln“. Neue Leute können sich selbst mit einem neuen Namen hinzufügen. Mike kann Namen umbenennen, zusammenführen oder deaktivieren.
3. **Zusage ändern:** Jeder kann seine Zusage jederzeit ändern oder zurückziehen. Es gibt keine Passwörter, das reicht unter Freunden.
4. **Archiv:** Vergangene Trainings bleiben sichtbar, mit Workout, Teilnehmern und Fotolink, unter „Archiv“.

---

## 3. Feature-Spezifikation

### 3.1 Freunde-Ansicht (kein Login, nur Gruppen-Code + Name)

**Startseite „Board“** (`#/`)
- Kopfzeile: Warnstreifen, Logo „STODL**BOX**“ (BOX in Akzentfarbe), rechts der eigene Name (antippen → wechseln).
- **Nächster Termin groß** (Hero, siehe Design B):
  - Riesige Tageszahl in Akzentfarbe, daneben `SAMSTAG · NOV · 09:00` (Mono) und der Titel (Anton).
  - **Platzbalken**: so viele Segmente wie `capacity`, belegte Plätze in Akzentfarbe, dazu der Text `6/8 PLÄTZE BELEGT · 2 FREI`. Ohne Limit nur `6 DABEI`.
  - **WOD-Box** mit Kopfzeile `// WOD` und dem Workout-Text in Mono, Zeilenumbrüche bleiben erhalten.
  - **Equipment-Banner** (gelb, Warndreieck-Icon): „Einpacken: Grips (Toes-to-Bar) und Laufschuhe (Run)“, siehe 3.4.
  - **Zusage**: Großer Button `BIN DABEI`, darunter die Text-Buttons `vielleicht` und `kann nicht`. Der aktuelle Status des Nutzers ist sichtbar markiert. Wenn voll, heißt der Button `AUF WARTELISTE` (siehe 3.2).
  - **Teilnehmerliste** in Mono: `✓ Mike · Lukas · …`, `? Kathi` (vielleicht), `⏳ Flo` (Warteliste). Absagen zugeklappt: „2 können nicht“.
  - Buttons: **In Kalender** (3.6), **Teilen** (3.7), **Fotos** (nur wenn `media_url` gesetzt ist).
- Darunter die **weiteren Termine** als kompakte Liste. Antippen öffnet die Detailseite.
- **Offene Abstimmungen** als eigene Blöcke: Workout-Votings (3.3) und Terminfindungen (3.5).
- Unten im Footer: Link zum Archiv.

**Termin-Detailseite** (`#/t/:id`): Dieselbe Darstellung wie der Hero, für jeden Termin.

**Archiv** (`#/archiv`): Vergangene Termine absteigend sortiert, jeweils mit Datum, Titel, Workout (aufklappbar), Teilnehmern und Fotolink. Je 20 Einträge, dann „Mehr laden“.

**Abgesagter Termin**: Bleibt sichtbar, ist durchgestrichen und trägt das Label `ABGESAGT`. Zusagen sind dann nicht mehr möglich.

### 3.2 Zusagen und Warteliste

- Status pro Person und Termin: `yes`, `maybe`, `no`, `waitlist`.
- Wählt jemand `yes` und `capacity` ist erreicht, wird der Status automatisch zu `waitlist`, mit Hinweis „Voll – du bist auf Platz 2 der Warteliste“.
- Wechselt jemand von `yes` weg (oder Mike erhöht `capacity`), **rückt automatisch der Erste auf der Warteliste nach** (FIFO nach Zeitpunkt). Das muss serverseitig in einer Transaktion passieren (RPC `set_rsvp`, siehe 5.3), damit es keine Doppelbelegung gibt.
- Wer nachgerückt ist, sieht beim nächsten Öffnen ein Banner: „Du bist nachgerückt – du bist dabei!“ (Flag `promoted_at` in `rsvps`, wird beim ersten Anzeigen quittiert).
- Zusagen sind bis zum Terminbeginn möglich, danach ist der Termin gesperrt.

### 3.3 Workout-Voting

- Ein Termin hat `workout_mode = 'fixed'` (normales Workout-Feld) oder `'vote'` (2–3 Optionen).
- Bei `'vote'` gibt es pro Option einen Kurztitel (z. B. „Chipper 100er“) und einen Workout-Text.
- Darstellung wie in Design B: 3 Kacheln nebeneinander mit großer Stimmenzahl (Anton). Die eigene Wahl ist in Akzentfarbe gefüllt. Antippen zeigt den vollen Workout-Text der Option. Über den Kacheln steht `BIS FR 20:00`.
- Eine Stimme pro Person und Termin, umentscheiden ist bis zum Ende erlaubt.
- Voting-Ende: entweder `vote_deadline` erreicht oder Mike schließt manuell. Danach:
  - Das Sieger-Workout wird ins Feld `workout` des Termins kopiert, `workout_mode` wird `'fixed'`, `vote_closed = true`.
  - Bei Gleichstand entscheidet Mike. Das Admin-UI zeigt „Gleichstand – wähle Sieger“.
  - Nach Ablauf der Deadline wird automatisch abgeschlossen: ein Job per pg_cron alle 15 Minuten, siehe 5.4. Bei Gleichstand bleibt es offen, bis Mike wählt.
- Die Equipment-Tipps (3.4) werden vor Abschluss pro Option angezeigt, danach für das Sieger-Workout.

### 3.4 Equipment-Tipps (automatisch)

- Die Tabelle `equipment_rules` enthält pro Regel `keywords text[]` und `tip text`, z. B. `{pull-up, pullup, pull up, toes-to-bar, t2b, ttb, muscle-up}` → `Grips`.
- Matching im Frontend (`js/equipment.js`):
  - Workout-Text und Keywords normalisieren: Kleinschreibung, Bindestriche und Leerzeichen vereinheitlichen, Umlaute belassen.
  - Treffer nur an Wortgrenzen, damit „run“ nicht in „Runden“ trifft. Regex mit `\b` bzw. Unicode-fähigen Grenzen.
  - Ergebnis: eindeutige Tipps mit dem jeweils auslösenden Begriff, z. B. „Grips (Toes-to-Bar)“.
- Startdaten (Seed), die Mike im Admin-Bereich bearbeiten kann:

| Keywords | Tipp |
|---|---|
| pull-up, pullup, chin-up, toes-to-bar, t2b, ttb, muscle-up, bar muscle-up, ring muscle-up | Grips |
| double under, double-under, du, dus, single under | eigenes Springseil |
| run, lauf, laufen, sled, schlitten, hyrox, 1 km, 400 m, 200 m | Laufschuhe |
| burpee, burpees, handstand, hspu, handstand walk | Handtuch & Wechselshirt |
| rope climb, seilklettern | lange Socken / Kniestrümpfe |
| clean, snatch, squat clean, front squat, back squat, deadlift | Gewichthebergürtel / Hebeschuhe (optional) |
| row, rower, rudern, ski, skierg | Handtuch |
| wall ball, wall balls | Handgelenk-Bandagen (optional) |

> Achtung bei „du“: Nur als eigenständiges Wort in einer Workout-Zeile matchen, z. B. `50 DU`. Fließtext wie „wenn du willst“ darf keinen Treffer liefern. Lösung: Pro Regel ein optionales Flag `case_sensitive` und das Keyword als `DU` speichern.

### 3.5 Terminfindung (wie Doodle)

- Mike legt eine Umfrage mit Titel (z. B. „Training KW 47“), 2–6 Zeitoptionen und optionaler Deadline an.
- Darstellung wie in Design B als **Matrix**: Zeilen sind die Personen, Spalten die Optionen. Die eigene Zeile steht oben und lässt sich antippen, um Optionen an- oder abzuhaken. Die Option mit den meisten Stimmen hat einen Spaltenkopf in Akzentfarbe.
- Unter der Matrix steht pro Spalte die Anzahl, z. B. `6 können`.
- Admin: „Option X als Termin übernehmen“ öffnet das Termin-Formular vorausgefüllt (Datum/Zeit). Nach dem Speichern wird die Umfrage geschlossen und mit dem Termin verknüpft. Alle, die für die gewählte Option gestimmt haben, bekommen optional automatisch `maybe` für den neuen Termin (Checkbox, Standard: aus).

### 3.6 Kalender-Export

- Button „In Kalender“ beim Termin, mit zwei Optionen in einem kleinen Menü:
  - **Apple / Outlook (.ics)**: Datei clientseitig erzeugen (`text/calendar`, `TZID=Europe/Vienna`, `UID = event-id@stodlbox`, Titel `Stodlbox: <Titel>`, Beschreibung = Workout-Text + Link zum Termin) und als Blob herunterladen.
  - **Google Kalender**: Link `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…/…&details=…`.
- Dauer: `duration_min` vom Termin, Standard 90.

### 3.7 Teilen auf WhatsApp

- Button „Teilen“ beim Termin, bei Votings und bei Terminfindungen.
- Auf dem Handy die Web Share API (`navigator.share`), sonst als Fallback `https://wa.me/?text=<urlencoded>`.
- Textvorlagen:
  - Termin: `🏋️ STODLBOX – Sa 14.11., 09:00\nHYROX-Sim Light\nWer ist dabei? 👉 <link>`
  - Voting: `🗳️ Welches WOD am So 22.11.? Abstimmen bis Fr 20:00 👉 <link>`
  - Terminfindung: `📅 Wann passt's nächste Woche? 👉 <link>`
- Der Link enthält den Gruppen-Code (`?c=`) und die Route, z. B. `…/#/t/<id>?c=STODL-XXXX`.
- **Vorschaukarte in WhatsApp**: In `index.html` statische Open-Graph-Tags setzen (`og:title` „STODLBOX“, `og:description` „Training im Stadl – Termine & Zusagen“, `og:image` = `assets/og.png` 1200×630 im Design B). Eine Vorschau pro Termin ist mit statischem Hosting nicht möglich, das ist okay.

### 3.8 Admin-Bereich (`#/admin`)

**Login:** Supabase Auth mit Magic Link (E-Mail OTP). Nur die in `app_settings.admin_email` hinterlegte Adresse ist Admin (Prüfung per RLS, siehe 5.2). Nach dem Login landet Mike im Admin-Board. Die Session bleibt gespeichert, damit er sich am Handy nicht ständig neu anmelden muss.

**Admin-Board** (Design B, „/ADMIN“):
- Gelber `+`-Button rechts oben öffnet ein Menü: **Termin**, **Serie**, **Terminfindung**.
- Liste „// GEPLANT“: große Tageszahl in Akzentfarbe, Titel, Mono-Zeile mit Status (`SA 09:00 · 6/8 DABEI · 1 WARTELISTE` bzw. `VOTING · 7 STIMMEN`).
- Antippen öffnet die Bearbeitung.

**Termin anlegen / bearbeiten:**
- Felder: Datum, Uhrzeit, Dauer (Standard 90), Titel, Max. Teilnehmer (leer = unbegrenzt), Modus (Umschalter `FIXES WOD` / `VOTING (2–3)`), Workout-Text bzw. 2–3 Optionen, Voting-Ende, Notiz (optional), Foto-/Video-Link (optional).
- **Live-Vorschau der Equipment-Tipps** unter dem Workout-Feld, pro Option, z. B. `MITNEHMEN: Grips (Pull-Ups) · Handtuch (Burpees)`.
- Button **„Aus Vorlage / früherem Termin“**: Bottom-Sheet mit Suche über Vorlagen und vergangene Workouts. Auswahl befüllt Titel und Workout.
- Checkbox **„Als Vorlage speichern“**.
- Aktionen: Speichern, Termin absagen (mit Bestätigung), Teilen.
- Teilnehmer verwalten: Mike kann für jemanden den Status setzen, z. B. wenn ihm das jemand per WhatsApp schreibt.
- Voting: „Jetzt abschließen“ bzw. bei Gleichstand „Sieger wählen“.

**Serie (wiederkehrender Termin):**
- Felder: Titel-Vorlage, Wochentag, Uhrzeit, Dauer, Max. Teilnehmer, Startdatum, optional Enddatum.
- Das System legt automatisch Termine für die **nächsten 6 Wochen** an (pg_cron täglich, siehe 5.4, und sofort beim Anlegen). Ein Workout ist dabei leer und wird als „WOD folgt“ angezeigt.
- Einzelne Termine einer Serie lassen sich normal bearbeiten oder absagen, ohne die Serie zu ändern.
- Serie pausieren oder beenden: Es werden keine neuen Termine mehr erzeugt. Bestehende Termine ohne Zusagen kann Mike in einem Schritt löschen.

**Vorlagen** (`#/admin/vorlagen`): Liste aller Vorlagen mit Titel und Workout. Bearbeiten, löschen, neu anlegen.

**Equipment-Regeln** (`#/admin/equipment`): Liste mit Keywords und Tipp, bearbeiten, neue Regel, aktiv/inaktiv.

**Namensliste** (`#/admin/leute`): Umbenennen, deaktivieren (die Person taucht nicht mehr in der Auswahl auf, die Historie bleibt), **zusammenführen** (z. B. „Flo“ in „Florian“: alle Zusagen und Stimmen übertragen, Duplikate auflösen).

**Einstellungen** (`#/admin/einstellungen`): Gruppen-Code ändern (neuer Einladungslink wird angezeigt und kann kopiert oder geteilt werden), Standard-Dauer, Standard-Limit.

### 3.9 Erstbesuch und Navigation (Freunde)

1. Link mit `?c=` öffnen: Der Code wird geprüft (`check_code`) und gespeichert, danach wird `?c=` aus der URL entfernt.
2. Ohne gültigen Code erscheint ein Screen „Code eingeben“ mit Hinweis „Frag Mike nach dem Link.“
3. „Wer bist du?“: Kacheln mit allen aktiven Namen, darunter „Neu hier? Namen anlegen“.
4. Danach erscheint das Board, und ein einmaliger Hinweis „Tipp: Zum Home-Bildschirm hinzufügen“ mit Anleitung für iOS und Android (wegklickbar, wird gemerkt).

Navigation: Für Freunde reicht eine Seite mit Board, Archiv-Link im Footer und Detailseiten. Kein Tab-Menü. Im Admin-Bereich gibt es eine untere Leiste: **Termine · Umfragen · Vorlagen · Equipment · Mehr** (Leute, Einstellungen, Logout).

---

## 4. Design (Richtung B „Stahl & Warnstreifen“)

### Tokens (`css/tokens.css`)
```css
:root{
  --bg:#0e0f10;        /* Hintergrund */
  --surface:#17191b;   /* Karten, Eingabefelder */
  --line:#2c2f33;      /* Rahmen, Trennlinien */
  --line-soft:#1d2023;
  --text:#eceef0;
  --muted:#9aa1a8;     /* Labels, Meta – Kontrast auf --bg ≥ 4.5:1 */
  --accent:#f5c400;    /* Warngelb */
  --on-accent:#0e0f10;
  --danger:#ff5a4f;
  --font-display:'Anton',sans-serif;          /* Titel, große Zahlen, Buttons */
  --font-mono:'JetBrains Mono',monospace;     /* Labels, Meta, WOD-Text */
  --font-body:'Archivo',sans-serif;           /* Fließtext, Namen, Inputs */
}
```
Schriften über Google Fonts: `Anton`, `JetBrains Mono:400;600;700`, `Archivo:400;500;600;700`.

### Prägende Elemente
- **Warnstreifen** oben (12 px): `repeating-linear-gradient(-45deg, var(--accent) 0 12px, var(--bg) 12px 24px)`.
- **Logo**: „STODL“ in `--text`, „BOX“ in `--accent`, Anton, ca. 34 px.
- **Labels** in Mono, versal, 12 px, `letter-spacing:1px`, `--muted`, gern mit Präfix `//` (z. B. `// WOD`, `// GEPLANT`).
- **Große Tageszahl** im Hero: Anton, ca. 112 px, `--accent`, `line-height:.85`.
- **Platzbalken**: Grid mit n Segmenten, 10 px hoch, 4 px Abstand.
- **Equipment-Banner**: Hintergrund `--accent`, Text `--on-accent`, Warndreieck-Icon (Inline-SVG mit Strich).
- **Ecken**: Keine Rundungen (Radius 0). Rau und kantig.
- **Buttons**: Primär gefüllt in `--accent` mit Anton-Schrift in Versalien. Sekundär als Text-Link in Mono, unterstrichen. Touch-Ziele mindestens 44 px.
- **Icons**: Inline-SVG mit Strich, keine Emojis im UI. In WhatsApp-Texten sind Emojis okay.
- **Abschnitte** trennt ein 6 px breiter Balken in `--surface`.
- Leerzustand: `// KEIN TERMIN GEPLANT` plus kurzer Text.

### Referenz-Screens
Die Entwürfe „B · Freunde-Ansicht“ und „B · Admin am Handy“ hat Mike auf dem Claude-Canvas. Sie zeigen Hero, Platzbalken, WOD-Box, Equipment-Banner, Voting-Kacheln, Terminfindungs-Matrix und die Admin-Liste mit Voting-Formular. Falls Mike Screenshots in `docs/design/` legt, nimm sie als Vorlage.

### Barrierefreiheit
Echte `<button>`, `<a>`, `<label>` und `<input>`. `aria-label` für Icon-Buttons. Kontrast mindestens 4.5:1. Fokus-Rahmen sichtbar (2 px `--accent`). Respektiere `prefers-reduced-motion`.

---

## 5. Backend: Supabase

### 5.1 Schema (`supabase/migrations/001_schema.sql`)

```sql
create extension if not exists pgcrypto;

create table app_settings (
  id int primary key default 1 check (id = 1),
  admin_email text not null,
  group_code_hash text not null,          -- crypt(code, gen_salt('bf'))
  default_duration_min int not null default 90,
  default_capacity int
);

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index members_name_ci on members (lower(name)) where active;

create table series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  weekday int not null check (weekday between 1 and 7),   -- ISO: 1 = Mo
  start_time time not null,
  duration_min int not null default 90,
  capacity int,
  starts_on date not null,
  ends_on date,
  active boolean not null default true
);

create table events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references series(id) on delete set null,
  starts_at timestamptz not null,
  duration_min int not null default 90,
  title text not null,
  workout text,                               -- fixes bzw. Sieger-Workout
  workout_mode text not null default 'fixed' check (workout_mode in ('fixed','vote')),
  vote_deadline timestamptz,
  vote_closed boolean not null default false,
  capacity int check (capacity is null or capacity > 0),
  media_url text,
  note text,
  status text not null default 'planned' check (status in ('planned','cancelled')),
  created_at timestamptz not null default now()
);
create index on events (starts_at);
create unique index events_series_slot on events (series_id, starts_at) where series_id is not null;

create table workout_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  workout text not null,
  sort int not null default 0
);

create table workout_votes (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  option_id uuid not null references workout_options(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table rsvps (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null check (status in ('yes','maybe','no','waitlist')),
  status_since timestamptz not null default now(),   -- FIFO für Warteliste
  promoted_at timestamptz,                            -- nachgerückt
  promotion_seen boolean not null default true,
  primary key (event_id, member_id)
);

create table date_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline timestamptz,
  closed boolean not null default false,
  event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now()
);

create table date_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references date_polls(id) on delete cascade,
  starts_at timestamptz not null
);

create table date_poll_answers (
  option_id uuid not null references date_poll_options(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (option_id, member_id)
);

create table equipment_rules (
  id uuid primary key default gen_random_uuid(),
  keywords text[] not null,
  tip text not null,
  case_sensitive boolean not null default false,
  active boolean not null default true,
  sort int not null default 0
);

create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  workout text not null,
  created_at timestamptz not null default now()
);

-- V2 vorbereitet (noch kein UI in V1):
create table results (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  score_text text not null,          -- "12:34", "5+12", "85 kg"
  score_value numeric,               -- sortierbar
  scale text check (scale in ('rx','scaled','beginner')),
  note text,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
```

### 5.2 Sicherheit (RLS)

- **RLS auf allen Tabellen aktivieren.** Für die Rolle `anon` gibt es **keine** Tabellen-Policies. Freunde greifen ausschließlich über RPC-Funktionen (5.3) zu, die den Gruppen-Code prüfen.
- Admin-Policies (für `authenticated`) auf allen Tabellen:
  ```sql
  create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from app_settings where lower(admin_email) = lower(auth.jwt()->>'email'));
  $$;
  -- je Tabelle:
  create policy admin_all on <tabelle> for all to authenticated using (is_admin()) with check (is_admin());
  ```
- `app_settings.group_code_hash` darf nie an den Client gehen.
- In Supabase Auth die Selbstregistrierung neuer Nutzer so einschränken, dass zwar ein Magic Link an jede Adresse geht, aber nur die Admin-Mail etwas darf. RLS deckt das ab. Zusätzlich in `SETUP.md` erklären, wie man „Allow new users to sign up“ deaktiviert, nachdem Mike sich einmal eingeloggt hat.

### 5.3 RPC-Funktionen für Freunde (`002_rpc.sql`)

Alle Funktionen `security definer`, `set search_path = public`, mit `p_code text` als erstem Parameter. Am Anfang steht immer `perform assert_code(p_code);`. Das wirft eine Exception, wenn `crypt(p_code, group_code_hash) <> group_code_hash`. `grant execute … to anon, authenticated`.

| Funktion | Zweck |
|---|---|
| `check_code(p_code) → boolean` | Code-Prüfung beim Erstbesuch |
| `list_members(p_code) → setof (id, name)` | Aktive Namen |
| `add_member(p_code, p_name) → uuid` | Neuer Name (getrimmt, 2–30 Zeichen, eindeutig ohne Groß-/Kleinschreibung) |
| `get_board(p_code, p_member_id) → jsonb` | Alles für die Startseite in einem Aufruf: kommende Termine (inkl. heute, nicht abgesagt oder abgesagt mit Label) mit RSVPs (Namen + Status, Warteliste sortiert), Voting-Optionen + Stimmen + eigene Stimme, offene Terminfindungen mit Optionen + Antworten, aktive Equipment-Regeln, `promotion`-Hinweise für `p_member_id` |
| `get_event(p_code, p_event_id, p_member_id) → jsonb` | Detailseite (auch vergangene Termine) |
| `get_archive(p_code, p_offset int) → jsonb` | Vergangene Termine, je 20 |
| `set_rsvp(p_code, p_event_id, p_member_id, p_status) → jsonb` | **Transaktional mit `select … for update` auf dem Event.** Prüft: Termin `planned` und noch nicht begonnen. `yes` bei vollem Termin → `waitlist`. Wenn ein `yes` frei wird → ältestes `waitlist` → `yes`, `promoted_at = now()`, `promotion_seen = false`. Gibt den neuen Status und die Wartelistenposition zurück. |
| `ack_promotion(p_code, p_event_id, p_member_id)` | Banner „nachgerückt“ quittieren |
| `vote_workout(p_code, p_event_id, p_member_id, p_option_id)` | Upsert. Nur wenn `workout_mode = 'vote'`, nicht geschlossen und vor Deadline. |
| `answer_date_poll(p_code, p_poll_id, p_member_id, p_option_ids uuid[])` | Ersetzt alle Antworten der Person für diese Umfrage. Nur wenn offen. |

Admin-Funktionen (nur `authenticated` + `is_admin()`):

| Funktion | Zweck |
|---|---|
| `admin_close_vote(p_event_id, p_option_id default null)` | Sieger übernehmen. Ohne Option: Mehrheit, bei Gleichstand Fehler `TIE`. |
| `admin_set_capacity(p_event_id, p_capacity)` | Ändern + Warteliste nachrücken lassen |
| `admin_set_rsvp(p_event_id, p_member_id, p_status)` | Wie `set_rsvp`, ohne Code |
| `admin_merge_members(p_from, p_into)` | RSVPs, Stimmen, Antworten, Ergebnisse übertragen (bei Konflikt behält `p_into` seinen Eintrag), `p_from` deaktivieren |
| `admin_set_group_code(p_new_code)` | Hash neu setzen |
| `generate_series_events(p_weeks int default 6)` | Für jede aktive Serie fehlende Termine im Zeitraum anlegen (Zeitzone Europe/Vienna beachten, Sommerzeit!). Idempotent über den Unique-Index. |
| `admin_poll_to_event(p_option_id, p_event jsonb, p_prefill_maybe boolean)` | Termin aus einer Terminfindungs-Option erzeugen, Umfrage schließen und verknüpfen |

### 5.4 Automatische Jobs (`003_cron.sql`)

Supabase Free unterstützt `pg_cron`.
- Alle 15 Minuten: Votings mit abgelaufener Deadline und eindeutigem Sieger schließen.
- Täglich 03:00 UTC: `generate_series_events(6)`.

### 5.5 Seed (`004_seed.sql`)

- Equipment-Regeln aus Abschnitt 3.4.
- `app_settings` **nicht** im Seed mit echten Werten. In `SETUP.md` gibt es dafür ein SQL-Snippet, in das Mike seine Mail und seinen Code einträgt:
  ```sql
  insert into app_settings (admin_email, group_code_hash)
  values ('MIKE@EXAMPLE.COM', crypt('STODL-XXXX', gen_salt('bf')));
  ```

### 5.6 Hinweis zum Gratis-Tarif

Supabase pausiert Gratis-Projekte nach etwa 7 Tagen ohne Aktivität. Deshalb gibt es einen **GitHub Action Workflow** `.github/workflows/keepalive.yml`, der 2× pro Woche `check_code` mit einem Dummy-Code per REST aufruft. Die Antwort ist egal, es geht nur um Aktivität. URL und Anon-Key kommen als Repository-Secrets `SUPABASE_URL` und `SUPABASE_ANON_KEY`.

---

## 6. Frontend-Struktur

```
/
├── index.html              # App-Shell, OG-Tags, Fonts, <main id="app">
├── manifest.webmanifest    # PWA: name "STODLBOX", display standalone, theme #0e0f10
├── sw.js                   # Service Worker: App-Shell cachen (network-first für Daten)
├── config.js               # SUPABASE_URL, SUPABASE_ANON_KEY (von Mike einzutragen)
├── css/
│   ├── tokens.css
│   └── app.css
├── js/
│   ├── main.js             # Bootstrapping, Router (Hash-basiert)
│   ├── api.js              # Supabase-Client + Wrapper für alle RPCs
│   ├── state.js            # Code, Member-ID, Cache (localStorage, mit try/catch)
│   ├── equipment.js        # Matching (3.4) – mit Unit-Tests
│   ├── calendar.js         # .ics + Google-Link (3.6)
│   ├── share.js            # Web Share / WhatsApp (3.7)
│   ├── format.js           # Datum/Zeit de-AT, Europe/Vienna (Intl.DateTimeFormat)
│   ├── views/              # board, event, archive, onboarding, admin/*
│   └── components/         # hero, capacity-bar, wod-box, equipment-banner, vote-tiles, poll-matrix, …
├── assets/
│   ├── icons/              # icon-192.png, icon-512.png, maskable, apple-touch-icon
│   └── og.png              # 1200×630
├── supabase/migrations/    # 001–004
├── tests/                  # equipment.test.html o. ä. (ohne Build, im Browser lauffähig) 
├── .github/workflows/keepalive.yml
├── SETUP.md
└── README.md
```

- **Router**: Hash-basiert (`#/`, `#/t/:id`, `#/archiv`, `#/admin/...`), weil GitHub Pages keine SPA-Rewrites kann.
- **Rendering**: Kleine Template-Funktionen mit Template-Strings. Alle Nutzertexte (Namen, Workouts) **escapen**, um XSS zu vermeiden. Keine ungeprüften `innerHTML`-Zuweisungen mit Nutzerdaten.
- **Aktualität**: Board beim Öffnen und bei `visibilitychange` neu laden. Optional per Supabase Realtime, aber nicht für `anon` ohne Policies. In V1 reicht Pull-to-Refresh oder ein Refresh-Button.
- **Optimistic UI** bei Zusage und Voting. Bei Fehler zurücksetzen und eine Meldung zeigen („Hat nicht geklappt – nochmal?“).
- **Offline**: Die App-Shell lädt offline, und der zuletzt geladene Board-Stand wird aus dem Cache angezeigt, mit Hinweis `// OFFLINE`.
- **Datumsformat**: `SA 14.11. · 09:00`. Ausgeschrieben `Samstag, 14. November`. Immer in Europe/Vienna.
- **Icons/Logo**: App-Icon = „SB“ in Anton auf Warnstreifen-Hintergrund. Als SVG erzeugen und als PNG exportieren (z. B. mit einem kleinen Node-Skript, das nur einmal lokal läuft und nicht Teil der App ist).

---

## 7. Datenschutz und Robustheit

- `<meta name="robots" content="noindex, nofollow">` und `robots.txt` mit `Disallow: /`.
- Keine Tracking- oder Analytics-Skripte.
- Im Gerät liegen nur Gruppen-Code, Member-ID und der Board-Cache.
- RPC-Eingaben validieren: Längen, Status-Werte, IDs gehören zusammen (Option gehört zum Event, Poll-Optionen zur Umfrage).

---

## 8. Setup-Anleitung (`SETUP.md`, für Mike, Schritt für Schritt mit Klickpfaden)

1. **GitHub**: Neues öffentliches Repo `stodlbox` anlegen. (Öffentlich ist nötig für kostenloses GitHub Pages. Es liegen keine Geheimnisse im Code, die Daten sind durch den Gruppen-Code geschützt.)
2. **Supabase**: Gratis-Projekt anlegen (Region Frankfurt). Unter Project Settings → API die URL und den anon key kopieren.
3. SQL Editor: Migrationen 001–004 nacheinander ausführen, danach das `app_settings`-Snippet mit Mail und Gruppen-Code.
4. Database → Extensions: `pg_cron` aktivieren (falls nicht schon durch 003 erledigt).
5. Authentication → URL Configuration: Site URL und Redirect URL = `https://<github-name>.github.io/stodlbox/`.
6. Authentication → E-Mail-Vorlage für den Magic Link optional auf Deutsch anpassen.
7. `config.js` mit URL und anon key befüllen, committen und pushen.
8. GitHub → Settings → Pages → Branch `main`, Ordner `/ (root)`.
9. GitHub → Settings → Secrets → `SUPABASE_URL`, `SUPABASE_ANON_KEY` für den Keepalive-Workflow.
10. Einmal unter `…/#/admin` einloggen, danach in Supabase „Allow new users to sign up“ deaktivieren.
11. Im Admin-Bereich: Namen der Freunde anlegen, erste Serie (z. B. Samstag 09:00) anlegen, Einladungslink in die WhatsApp-Gruppe teilen.
12. Am Handy: Link öffnen → Teilen → „Zum Home-Bildschirm“.

---

## 9. Abnahmekriterien V1

- [ ] Ohne Code kein Zugriff auf Daten (auch nicht per direktem REST-Call mit Anon-Key auf Tabellen).
- [ ] Einladungslink mit `?c=` führt direkt zur Namensauswahl, danach zum Board. Name und Code bleiben nach einem Neustart erhalten.
- [ ] Zusage, Vielleicht, Absage funktionieren und lassen sich ändern. Die Teilnehmerliste stimmt.
- [ ] Bei vollem Limit landet eine Zusage auf der Warteliste. Eine Absage lässt automatisch den Ersten nachrücken, der beim nächsten Öffnen das Banner sieht. Zwei gleichzeitige Zusagen auf den letzten Platz führen nicht zur Überbuchung.
- [ ] Workout-Voting: Stimme abgeben und ändern. Nach der Deadline wird automatisch abgeschlossen (bei Gleichstand wählt der Admin). Das Sieger-Workout erscheint als WOD.
- [ ] Equipment-Tipps erscheinen korrekt. „Runden“ löst keinen Laufschuh-Tipp aus, „wenn du magst“ keinen Springseil-Tipp.
- [ ] Terminfindung: Matrix funktioniert, die beste Option ist hervorgehoben, eine Option lässt sich in einen Termin umwandeln.
- [ ] Serie erzeugt Termine für 6 Wochen, auch über die Sommerzeit-Umstellung hinweg mit korrekter Uhrzeit.
- [ ] Vorlagen speichern und wiederverwenden, früheres Workout übernehmen.
- [ ] .ics öffnet am iPhone den Kalender mit der richtigen Zeit. Der Google-Link funktioniert.
- [ ] Teilen öffnet am Handy das Share-Sheet bzw. WhatsApp mit Text und Link inklusive Code.
- [ ] Admin-Login per Magic Link funktioniert am Handy. Andere Mail-Adressen haben keine Admin-Rechte.
- [ ] Namen zusammenführen überträgt alle Daten.
- [ ] Archiv zeigt vergangene Trainings.
- [ ] PWA lässt sich installieren (iOS und Android). Die App-Shell lädt offline.
- [ ] Lighthouse mobil: Accessibility ≥ 90, Best Practices ≥ 90.
- [ ] Design entspricht Richtung B (Tokens, Schriften, Warnstreifen, kantig).

---

## 10. Umsetzungsphasen

1. **Grundgerüst**: Repo-Struktur, `index.html`, Tokens, Router, Onboarding-Screens mit Dummy-Daten. Design-Check am Handy.
2. **Datenbank**: Migrationen 001–004, RLS, RPCs. Testskript `supabase/tests.sql` für Warteliste, Voting-Abschluss und Serie inkl. Sommerzeit.
3. **Freunde-Ansicht**: Board, Detail, Zusagen + Warteliste, Equipment-Tipps (mit Tests), Archiv.
4. **Abstimmungen**: Workout-Voting und Terminfindung (Freunde- und Admin-Seite).
5. **Admin**: Login, Termin- und Serien-Formular, Vorlagen, Equipment-Regeln, Leute, Einstellungen.
6. **Extras**: Kalender-Export, Teilen, OG-Bild, PWA (Manifest, Icons, Service Worker), Keepalive-Workflow.
7. **Feinschliff**: Leerzustände, Fehlermeldungen, Ladezustände, Barrierefreiheit, Abnahmekriterien durchgehen, `SETUP.md` und `README.md` fertigstellen.

---

## 11. Ausblick V2 (nicht bauen, nur nicht verbauen)

- Ergebnisse eintragen + Leaderboard pro Workout (Tabelle `results` existiert bereits)
- Persönliche Bestleistungen und Benchmark-WODs
- Anwesenheits-Statistik, Streaks, Abzeichen, „Stodlbox Wrapped“
- WOD-Timer (AMRAP / EMOM / For Time / Tabata) als eigene Route `#/timer`
- Stadel-Inventar + Heat-Einteilung
- „Wer bringt was mit“, Workout-Vorschläge von Freunden, Wetter beim Termin
