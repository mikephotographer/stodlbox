-- =====================================================================
-- 011: Ergebnisse beim Training + Kalender-Abo.
--
-- Ergebnisse: Ab Trainingsbeginn trägt jeder sein Ergebnis ein (Zeit,
-- Runden + Wdh., Wiederholungen, Gewicht oder freier Text), dazu Rx /
-- skaliert / Einsteiger und eine kurze Notiz. Gleiches Workout (gleicher
-- Text) bei mehreren Terminen ergibt den eigenen Verlauf und Bestwerte.
--
-- Kalender-Abo: eine Adresse, die der Kalender am Handy regelmäßig
-- abruft (webcal://…/rest/v1/rpc/calendar?t=…). Geschützt mit einem
-- eigenen Kalender-Schlüssel statt dem Gruppen-Code.
--
-- Setzt 001–010 voraus. Mehrfach ausführbar.
-- =====================================================================

-- ---------------------------------------------------------------- Ergebnisse

-- Art des Ergebnisses. score_value ist sortierbar:
--   time = Sekunden (weniger ist besser), cap = Wdh. bis zum Time Cap,
--   rounds = Runden * 1000 + Wdh., reps = Wdh., load = kg, other = ohne Wert
alter table results add column if not exists score_kind text not null default 'other';
alter table results add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table results add constraint results_kind check (score_kind in ('time','cap','rounds','reps','load','other'));
exception when duplicate_object then null; end $$;

-- Gleiches Workout erkennen: Text ohne Groß/Klein und Leerraum-Unterschiede
create or replace function workout_key(p text) returns text
language sql immutable as $$
  select case when btrim(coalesce(p, '')) = '' then null
              else md5(lower(regexp_replace(btrim(p), '\s+', ' ', 'g'))) end;
$$;

create or replace function result_json(r results, p_member_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'event_id', r.event_id, 'member_id', r.member_id, 'name', (select name from members where id = r.member_id),
    'kind', r.score_kind, 'value', r.score_value, 'text', r.score_text, 'scale', r.scale, 'note', r.note,
    'mine', r.member_id = p_member_id, 'at', r.updated_at);
$$;

-- Rangliste eines Termins + eigener Verlauf beim gleichen Workout
create or replace function get_results(p_code text, p_event_id uuid, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e events; k text;
begin
  perform assert_code(p_code);
  select * into e from events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  k := workout_key(e.workout);
  return jsonb_build_object(
    'open', e.status = 'planned' and e.starts_at <= now(),
    'list', coalesce((select jsonb_agg(result_json(r, p_member_id) order by r.updated_at)
                      from results r where r.event_id = p_event_id), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(result_json(r, p_member_id) || jsonb_build_object('title', x.title, 'starts_at', x.starts_at)
                       order by x.starts_at desc)
      from results r join events x on x.id = r.event_id
      where k is not null and p_member_id is not null and r.member_id = p_member_id
        and r.event_id <> p_event_id and workout_key(x.workout) = k), '[]'::jsonb));
end $$;

-- Alle Ergebnisse zu einem Workout-Text (für die Workout-Seite: Bestwerte)
create or replace function workout_results(p_code text, p_workout text, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k text := workout_key(p_workout);
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(result_json(r, p_member_id) || jsonb_build_object('title', x.title, 'starts_at', x.starts_at)
                     order by x.starts_at desc)
    from results r join events x on x.id = r.event_id
    where k is not null and workout_key(x.workout) = k and x.status = 'planned'), '[]'::jsonb);
end $$;

create or replace function save_result(p_code text, p_event_id uuid, p_member_id uuid, p_kind text, p_value numeric,
                                       p_text text, p_scale text, p_note text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare e events; v_text text := btrim(coalesce(p_text, '')); v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_value numeric := p_value;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  select * into e from events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if e.status = 'cancelled' then raise exception 'CANCELLED'; end if;
  if e.starts_at > now() then raise exception 'RESULTS_EARLY'; end if;
  if p_kind is null or p_kind not in ('time','cap','rounds','reps','load','other')
     or p_scale is null or p_scale not in ('rx','scaled','beginner')
     or char_length(v_text) not between 1 and 40
     or char_length(coalesce(v_note, '')) > 140 then
    raise exception 'INVALID';
  end if;
  if p_kind = 'other' then v_value := null;
  elsif v_value is null or v_value < 0 or v_value > 1000000 then raise exception 'INVALID';
  end if;
  insert into results (event_id, member_id, score_kind, score_value, score_text, scale, note, created_at, updated_at)
  values (p_event_id, p_member_id, p_kind, v_value, v_text, p_scale, v_note, now(), now())
  on conflict (event_id, member_id) do update
    set score_kind = excluded.score_kind, score_value = excluded.score_value, score_text = excluded.score_text,
        scale = excluded.scale, note = excluded.note, updated_at = now();
  return get_results(p_code, p_event_id, p_member_id);
end $$;

-- Eigenes Ergebnis löschen. Der Admin darf jedes löschen.
create or replace function delete_result(p_code text, p_event_id uuid, p_member_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  if not is_admin() then perform assert_member(p_member_id); end if;
  delete from results where event_id = p_event_id and member_id = p_member_id;
  return get_results(p_code, p_event_id, p_member_id);
end $$;

-- Termin-JSON: zusätzlich Anzahl Ergebnisse und mein Ergebnis (sonst wie in 002)
create or replace function event_json(p_event_id uuid, p_member_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'series_id', e.series_id, 'starts_at', e.starts_at, 'duration_min', e.duration_min,
    'title', e.title, 'workout', e.workout, 'workout_mode', e.workout_mode,
    'vote_deadline', e.vote_deadline, 'vote_closed', e.vote_closed, 'capacity', e.capacity,
    'media_url', e.media_url, 'note', e.note, 'status', e.status,
    'started', e.starts_at <= now(),
    'rsvps', coalesce((
      select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'name', m.name, 'status', r.status, 'since', r.status_since)
             order by array_position(array['yes','maybe','waitlist','no'], r.status), r.status_since, r.member_id)
      from rsvps r join members m on m.id = r.member_id where r.event_id = e.id), '[]'::jsonb),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'workout', o.workout, 'sort', o.sort,
             'votes', (select count(*) from workout_votes v where v.option_id = o.id)) order by o.sort, o.label)
      from workout_options o where o.event_id = e.id), '[]'::jsonb),
    'my_vote', (select v.option_id from workout_votes v where v.event_id = e.id and v.member_id = p_member_id),
    'my_rsvp', (select r.status from rsvps r where r.event_id = e.id and r.member_id = p_member_id),
    'my_waitlist_pos', (
      select w.pos from (
        select r.member_id, row_number() over (order by r.status_since, r.member_id) as pos
        from rsvps r where r.event_id = e.id and r.status = 'waitlist') w
      where w.member_id = p_member_id),
    'result_count', (select count(*) from results x where x.event_id = e.id),
    'my_result', (select x.score_text from results x where x.event_id = e.id and x.member_id = p_member_id)
  )
  from events e where e.id = p_event_id;
$$;

-- ---------------------------------------------------------------- Kalender-Abo

alter table app_settings add column if not exists calendar_token uuid not null default gen_random_uuid();

-- Schlüssel für das Abo holen (jeder mit Gruppen-Code)
create or replace function calendar_token(p_code text) returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  return (select calendar_token from app_settings where id = 1);
end $$;

-- PostgREST liefert eine Funktion mit diesem Rückgabetyp als text/calendar aus
do $$ begin
  create domain "text/calendar" as text;
exception when duplicate_object then null; end $$;

create or replace function ics_text(p text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''), '\', '\\'), ';', '\;'), ',', '\,'), E'\r', ''), E'\n', '\n');
$$;

-- Lange Zeilen falten (RFC 5545): nach 60 Zeichen Zeilenumbruch + Leerzeichen
create or replace function ics_fold(p text) returns text
language sql immutable as $$
  select regexp_replace(p, '(.{60})(?=.)', E'\\1\r\n ', 'g');
$$;

create or replace function ics_time(t timestamptz) returns text
language sql immutable as $$
  select to_char(t at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"');
$$;

-- Alle Trainings der letzten 90 Tage und der Zukunft. Mit m (eigene ID) steht
-- bei Trainings, bei denen man dabei ist, ein Haken vor dem Titel.
create or replace function calendar(t uuid, m uuid default null) returns "text/calendar"
language plpgsql stable security definer set search_path = public as $$
declare
  app text := 'https://mikephotographer.github.io/stodlbox/';
  out text;
begin
  if t is null or not exists (select 1 from app_settings where id = 1 and calendar_token = t) then
    raise exception 'BAD_TOKEN' using errcode = '28000';
  end if;
  select string_agg(ics_fold(l), E'\r\n' order by grp, ord) into out from (
      select 0 as grp, x.n as ord, x.l from unnest(array[
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//STODLBOX//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'X-WR-CALNAME:STODLBOX', 'X-WR-TIMEZONE:Europe/Vienna',
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']) with ordinality x(l, n)
      union all
      select 1, e.rn * 100 + v.n, v.l
      from (select x.*, row_number() over (order by x.starts_at, x.id) as rn from events x
            where x.starts_at >= now() - interval '90 days') e
      cross join lateral (select exists (select 1 from rsvps r where r.event_id = e.id and r.member_id = m and r.status = 'yes') as mine) me
      cross join lateral unnest(array[
        'BEGIN:VEVENT',
        'UID:' || e.id || '@stodlbox',
        'DTSTAMP:' || ics_time(now()),
        'DTSTART:' || ics_time(e.starts_at),
        'DTEND:' || ics_time(e.starts_at + make_interval(mins => e.duration_min)),
        'SUMMARY:' || ics_text(case when e.status = 'cancelled' then 'Abgesagt: ' when me.mine then '✓ ' else '' end || 'Stodlbox: ' || e.title),
        'DESCRIPTION:' || ics_text(concat_ws(E'\n\n',
            case when e.status = 'cancelled' then 'Dieser Termin fällt aus.' end,
            case when me.mine then 'Du bist dabei.' end,
            coalesce(e.workout, case when e.workout_mode = 'vote' then 'WOD wird abgestimmt.' end),
            e.note,
            app || '#/t/' || e.id)),
        'URL:' || app || '#/t/' || e.id,
        'STATUS:' || case when e.status = 'cancelled' then 'CANCELLED' else 'CONFIRMED' end,
        'END:VEVENT']) with ordinality v(l, n)
      union all
      select 2, 0, 'END:VCALENDAR'
  ) s;
  return out || E'\r\n';
end $$;

-- ---------------------------------------------------------------- Rechte

revoke all on function result_json(results, uuid) from public, anon, authenticated;
revoke all on function get_results(text, uuid, uuid) from public;
revoke all on function workout_results(text, text, uuid) from public;
revoke all on function save_result(text, uuid, uuid, text, numeric, text, text, text) from public;
revoke all on function delete_result(text, uuid, uuid) from public;
revoke all on function calendar_token(text) from public;
revoke all on function calendar(uuid, uuid) from public;
grant execute on function get_results(text, uuid, uuid) to anon, authenticated;
grant execute on function workout_results(text, text, uuid) to anon, authenticated;
grant execute on function save_result(text, uuid, uuid, text, numeric, text, text, text) to anon, authenticated;
grant execute on function delete_result(text, uuid, uuid) to anon, authenticated;
grant execute on function calendar_token(text) to anon, authenticated;
grant execute on function calendar(uuid, uuid) to anon, authenticated;
