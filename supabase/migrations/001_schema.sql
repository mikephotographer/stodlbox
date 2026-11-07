-- STODLBOX · 001 · Schema + RLS
-- Im Supabase SQL Editor ausführen (einmalig, in dieser Reihenfolge: 001, 002, 003, 004).

create extension if not exists pgcrypto with schema extensions;

create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  admin_email text not null,
  group_code_hash text not null,          -- crypt(code, gen_salt('bf'))
  default_duration_min int not null default 90 check (default_duration_min between 15 and 600),
  default_capacity int check (default_capacity is null or default_capacity > 0)
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 30),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists members_name_ci on members (lower(name)) where active;

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  weekday int not null check (weekday between 1 and 7),   -- ISO: 1 = Mo
  start_time time not null,
  duration_min int not null default 90,
  capacity int check (capacity is null or capacity > 0),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references series(id) on delete set null,
  -- Ursprünglicher Serien-Slot. Bleibt gleich, auch wenn Mike die Uhrzeit des Termins verschiebt,
  -- damit die Serie den Termin nicht nochmal anlegt.
  series_slot timestamptz,
  starts_at timestamptz not null,
  duration_min int not null default 90 check (duration_min between 15 and 600),
  title text not null check (char_length(title) between 1 and 80),
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
create index if not exists events_starts_at on events (starts_at);
create unique index if not exists events_series_slot on events (series_id, series_slot) where series_id is not null;

create table if not exists workout_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  workout text not null,
  sort int not null default 0
);
create index if not exists workout_options_event on workout_options (event_id);

create table if not exists workout_votes (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  option_id uuid not null references workout_options(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table if not exists rsvps (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null check (status in ('yes','maybe','no','waitlist')),
  status_since timestamptz not null default now(),   -- FIFO für Warteliste
  promoted_at timestamptz,                            -- nachgerückt
  promotion_seen boolean not null default true,
  primary key (event_id, member_id)
);
create index if not exists rsvps_member on rsvps (member_id);

create table if not exists date_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  deadline timestamptz,
  closed boolean not null default false,
  event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists date_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references date_polls(id) on delete cascade,
  starts_at timestamptz not null
);
create index if not exists date_poll_options_poll on date_poll_options (poll_id);

create table if not exists date_poll_answers (
  option_id uuid not null references date_poll_options(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (option_id, member_id)
);

create table if not exists equipment_rules (
  id uuid primary key default gen_random_uuid(),
  keywords text[] not null,
  tip text not null,
  case_sensitive boolean not null default false,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  workout text not null,
  created_at timestamptz not null default now()
);

-- V2 vorbereitet (noch kein UI in V1):
create table if not exists results (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  score_text text not null,          -- "12:34", "5+12", "85 kg"
  score_value numeric,               -- sortierbar
  scale text check (scale in ('rx','scaled','beginner')),
  note text,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

-- =====================================================================
-- Sicherheit: RLS überall an. Für anon gibt es KEINE Policies –
-- Freunde greifen nur über die RPC-Funktionen aus 002 zu.
-- =====================================================================

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select lower(admin_email) = lower(auth.jwt()->>'email') from app_settings where id = 1),
    false)
  and coalesce(auth.jwt()->>'email', '') <> '';
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','members','series','events','workout_options','workout_votes','rsvps',
    'date_polls','date_poll_options','date_poll_answers','equipment_rules','workout_templates','results'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
    -- anon bekommt gar keine direkten Tabellenrechte
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;

-- Der Hash des Gruppen-Codes geht nie an den Client, auch nicht an den Admin.
-- (Spaltenrechte greifen nur, wenn das Tabellenrecht vorher entzogen ist.)
revoke all on app_settings from authenticated;
grant select (id, admin_email, default_duration_min, default_capacity) on app_settings to authenticated;
grant update (default_duration_min, default_capacity) on app_settings to authenticated;
