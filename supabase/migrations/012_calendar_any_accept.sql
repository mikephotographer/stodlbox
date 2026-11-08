-- =====================================================================
-- 012: Kalender-Abo für alle Kalender-Apps.
-- Supabase gab den Kalender nur als text/calendar aus, wenn die Anfrage
-- das ausdrücklich verlangt (Accept-Kopfzeile). Kalender-Apps schicken
-- das meist nicht. Jetzt antwortet calendar() auf jede Anfrage und setzt
-- den Typ selbst. Setzt 011 voraus. Mehrfach ausführbar.
-- =====================================================================

-- Der eigentliche Kalender-Text (wie in 011)
create or replace function calendar_ics(t uuid, m uuid default null) returns text
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

-- „Beliebiger Typ“ für PostgREST: antwortet auf jede Accept-Kopfzeile
do $$ begin
  create domain "*/*" as text;
exception when duplicate_object then null; end $$;

drop function if exists calendar(uuid, uuid);
create function calendar(t uuid, m uuid default null) returns "*/*"
language plpgsql stable security definer set search_path = public as $$
begin
  perform set_config('response.headers',
    '[{"Content-Type": "text/calendar; charset=utf-8"}, {"Content-Disposition": "inline; filename=stodlbox.ics"}, {"Cache-Control": "max-age=300"}]', true);
  return calendar_ics(t, m);
end $$;

revoke all on function calendar_ics(uuid, uuid) from public, anon, authenticated;
revoke all on function calendar(uuid, uuid) from public;
grant execute on function calendar(uuid, uuid) to anon, authenticated;
