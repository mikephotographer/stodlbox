-- =====================================================================
-- 013: Geheime Termine („Nur für mich“).
-- Ein Termin mit private = true sieht nur der eingeloggte Admin: Er fehlt
-- für alle anderen auf dem Board, im Archiv, in der Workout-Suche, bei
-- Fotos, Ergebnissen, Bestwerten und im Kalender-Abo. Direkt aufgerufen
-- gibt es „nicht gefunden“. Zum Allein-Trainieren und Dokumentieren.
-- Setzt 001–012 voraus. Mehrfach ausführbar.
-- =====================================================================

alter table events add column if not exists private boolean not null default false;

-- Darf der Aufrufer diesen Termin sehen?
create or replace function event_visible(p_private boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce(p_private, false) or is_admin();
$$;

create or replace function assert_event_visible(p_event_id uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from events where id = p_event_id and event_visible(private)) then
    raise exception 'NOT_FOUND';
  end if;
end $$;

-- Termin-JSON mit private
create or replace function event_json(p_event_id uuid, p_member_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'series_id', e.series_id, 'starts_at', e.starts_at, 'duration_min', e.duration_min,
    'title', e.title, 'workout', e.workout, 'workout_mode', e.workout_mode,
    'vote_deadline', e.vote_deadline, 'vote_closed', e.vote_closed, 'capacity', e.capacity,
    'media_url', e.media_url, 'note', e.note, 'status', e.status,
    'started', e.starts_at <= now(), 'private', e.private,
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

-- Board
create or replace function get_board(p_code text, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_start timestamptz := day_start();
begin
  perform assert_code(p_code);
  return jsonb_build_object(
    'now', now(),
    'member_ok', p_member_id is not null and exists (select 1 from members where id = p_member_id and active),
    'events', coalesce((
      select jsonb_agg(event_json(x.id, p_member_id) order by x.starts_at)
      from (select id, starts_at from events where starts_at >= v_start and event_visible(private) order by starts_at limit 30) x), '[]'::jsonb),
    'polls', coalesce((
      select jsonb_agg(poll_json(p.id, p_member_id) order by p.created_at)
      from date_polls p where not p.closed), '[]'::jsonb),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object('keywords', keywords, 'tip', tip, 'case_sensitive', case_sensitive) order by sort, tip)
      from equipment_rules where active), '[]'::jsonb),
    'promotions', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', e.id, 'title', e.title, 'starts_at', e.starts_at) order by e.starts_at)
      from rsvps r join events e on e.id = r.event_id
      where r.member_id = p_member_id and not r.promotion_seen and r.status = 'yes' and e.starts_at >= v_start and event_visible(e.private)), '[]'::jsonb)
  );
end $$;

-- Termin
create or replace function get_event(p_code text, p_event_id uuid, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform assert_code(p_code);
  if not exists (select 1 from events where id = p_event_id and event_visible(private)) then raise exception 'NOT_FOUND'; end if;
  v := event_json(p_event_id, p_member_id);
  if v is null then raise exception 'NOT_FOUND'; end if;
  return v || jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object('keywords', keywords, 'tip', tip, 'case_sensitive', case_sensitive) order by sort, tip)
      from equipment_rules where active), '[]'::jsonb));
end $$;

-- Archiv
create or replace function get_archive(p_code text, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_start timestamptz := day_start();
  v_off int := greatest(coalesce(p_offset, 0), 0);
begin
  perform assert_code(p_code);
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(event_json(x.id, null) order by x.starts_at desc)
      from (select id, starts_at from events where starts_at < v_start and event_visible(private)
            order by starts_at desc offset v_off limit 20) x), '[]'::jsonb),
    'has_more', (select count(*) from events where starts_at < v_start and event_visible(private)) > v_off + 20
  );
end $$;

-- Zusage
create or replace function set_rsvp(p_code text, p_event_id uuid, p_member_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  perform assert_event_visible(p_event_id);
  return do_set_rsvp(p_event_id, p_member_id, p_status, false);
end $$;

-- Abstimmung
create or replace function vote_workout(p_code text, p_event_id uuid, p_member_id uuid, p_option_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e events;
begin
  perform assert_code(p_code);
  perform assert_event_visible(p_event_id);
  perform assert_member(p_member_id);
  select * into e from events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if e.workout_mode <> 'vote' or e.vote_closed or e.status <> 'planned'
     or e.starts_at <= now() or (e.vote_deadline is not null and e.vote_deadline <= now()) then
    raise exception 'VOTE_CLOSED';
  end if;
  if not exists (select 1 from workout_options where id = p_option_id and event_id = p_event_id) then
    raise exception 'INVALID: option';
  end if;
  insert into workout_votes (event_id, member_id, option_id) values (p_event_id, p_member_id, p_option_id)
  on conflict (event_id, member_id) do update set option_id = excluded.option_id, voted_at = now();
  return event_json(p_event_id, p_member_id);
end $$;

-- Workout-Suche
create or replace function search_workouts(p_code text, p_query text default '', p_tag text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || coalesce(btrim(p_query), '') || '%';
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(x order by x->>'kind' desc, x->>'date' desc nulls last, x->>'title')
    from (
      (select jsonb_build_object('kind', 'template', 'id', t.id, 'title', t.title, 'workout', t.workout,
                                 'tags', to_jsonb(t.tags), 'date', null) as x
       from workout_templates t
       where (t.title ilike q or t.workout ilike q or exists (select 1 from unnest(t.tags) g where g ilike q))
         and (p_tag is null or p_tag = '' or exists (select 1 from unnest(t.tags) g where lower(g) = lower(p_tag)))
       order by t.title limit 60)
      union all
      (select jsonb_build_object('kind', 'event', 'id', e.id, 'title', e.title, 'workout', e.workout,
                                 'tags', '[]'::jsonb, 'date', e.starts_at)
       from events e
       where (p_tag is null or p_tag = '')
         and e.workout is not null and btrim(e.workout) <> '' and e.starts_at < now() and event_visible(e.private)
         and (e.title ilike q or e.workout ilike q)
       order by e.starts_at desc limit 30)
    ) s), '[]'::jsonb);
end $$;

-- Fotos
create or replace function photo_access(p_event_id uuid, p_member_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when e.id is null then 'none'
    when e.status = 'cancelled' then 'none'
    when not event_visible(e.private) then 'none'
    when e.starts_at > now() then 'early'
    when now() >= photo_until(e.starts_at) then 'expired'
    when exists (select 1 from rsvps r where r.event_id = e.id and r.member_id = p_member_id and r.status = 'yes') then 'yes'
    else 'not_participant'
  end
  from (select 1) x left join events e on e.id = p_event_id;
$$;

-- Foto-Hinweis auf dem Board
create or replace function recent_photo_events(p_code text, p_member_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at,
             'until', photo_until(e.starts_at),
             'count', (select count(*) from event_photos p where p.event_id = e.id),
             'mine', (select count(*) from event_photos p where p.event_id = e.id and p.member_id = p_member_id))
             order by e.starts_at desc)
    from events e
    join rsvps r on r.event_id = e.id and r.member_id = p_member_id and r.status = 'yes'
    where e.status <> 'cancelled' and event_visible(e.private) and e.starts_at <= now() and now() < photo_until(e.starts_at)), '[]'::jsonb);
end $$;

-- Ergebnisse
create or replace function get_results(p_code text, p_event_id uuid, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e events; k text;
begin
  perform assert_code(p_code);
  select * into e from events where id = p_event_id;
  if not found or not event_visible(e.private) then raise exception 'NOT_FOUND'; end if;
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
        and r.event_id <> p_event_id and workout_key(x.workout) = k and event_visible(x.private)), '[]'::jsonb));
end $$;

-- Bestwerte
create or replace function workout_results(p_code text, p_workout text, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k text := workout_key(p_workout);
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(result_json(r, p_member_id) || jsonb_build_object('title', x.title, 'starts_at', x.starts_at)
                     order by x.starts_at desc)
    from results r join events x on x.id = r.event_id
    where k is not null and workout_key(x.workout) = k and x.status = 'planned' and event_visible(x.private)), '[]'::jsonb);
end $$;

-- Ergebnis speichern
create or replace function save_result(p_code text, p_event_id uuid, p_member_id uuid, p_kind text, p_value numeric,
                                       p_text text, p_scale text, p_note text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare e events; v_text text := btrim(coalesce(p_text, '')); v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_value numeric := p_value;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  select * into e from events where id = p_event_id;
  if not found or not event_visible(e.private) then raise exception 'NOT_FOUND'; end if;
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

-- Kalender-Abo: geheime Termine nie
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
            where x.starts_at >= now() - interval '90 days' and not x.private) e
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

-- Admin speichert private
create or replace function admin_save_event(p_event jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_event->>'id', '')::uuid;
  v_mode text := coalesce(nullif(p_event->>'workout_mode', ''), 'fixed');
  v_opts jsonb := coalesce(p_event->'options', '[]'::jsonb);
  v_title text := btrim(coalesce(p_event->>'title', ''));
  v_start timestamptz := nullif(p_event->>'starts_at', '')::timestamptz;
  v_dur int := coalesce(nullif(p_event->>'duration_min', '')::int,
                        (select default_duration_min from app_settings where id = 1), 90);
  v_cap int := nullif(p_event->>'capacity', '')::int;
  v_private boolean := coalesce((p_event->>'private')::boolean, false);
  v_was_closed boolean := false;
  v_keep uuid[] := '{}';
  v_oid uuid;
  o jsonb;
  i int := 0;
begin
  perform require_admin();
  if v_mode not in ('fixed', 'vote') then raise exception 'INVALID: mode'; end if;
  if v_title = '' or char_length(v_title) > 80 then raise exception 'INVALID: title'; end if;
  if v_start is null then raise exception 'INVALID: starts_at'; end if;
  if v_cap is not null and v_cap < 1 then raise exception 'INVALID: capacity'; end if;
  if v_mode = 'vote' and jsonb_array_length(v_opts) not between 2 and 3 then raise exception 'INVALID: options'; end if;

  if v_id is null then
    insert into events (starts_at, duration_min, title, workout, workout_mode, vote_deadline, capacity, media_url, note, private)
    values (v_start, v_dur, v_title,
            case when v_mode = 'fixed' then nullif(btrim(p_event->>'workout'), '') end,
            v_mode, case when v_mode = 'vote' then nullif(p_event->>'vote_deadline', '')::timestamptz end,
            v_cap, nullif(btrim(p_event->>'media_url'), ''), nullif(btrim(p_event->>'note'), ''), v_private)
    returning id into v_id;
  else
    select vote_closed into v_was_closed from events where id = v_id for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    update events set
      starts_at = v_start,
      duration_min = v_dur,
      title = v_title,
      workout = case when v_mode = 'fixed' then nullif(btrim(p_event->>'workout'), '') end,
      workout_mode = v_mode,
      vote_deadline = case when v_mode = 'vote' then nullif(p_event->>'vote_deadline', '')::timestamptz else vote_deadline end,
      vote_closed = case when v_mode = 'vote' then false else vote_closed end,
      capacity = v_cap,
      media_url = nullif(btrim(p_event->>'media_url'), ''),
      note = nullif(btrim(p_event->>'note'), ''),
      private = v_private
    where id = v_id;
  end if;

  if v_mode = 'vote' then
    for o in select * from jsonb_array_elements(v_opts) loop
      i := i + 1;
      if nullif(btrim(o->>'label'), '') is null or nullif(btrim(o->>'workout'), '') is null then
        raise exception 'INVALID: option';
      end if;
      v_oid := nullif(o->>'id', '')::uuid;
      if v_oid is not null and exists (select 1 from workout_options where id = v_oid and event_id = v_id) then
        update workout_options set label = btrim(o->>'label'), workout = btrim(o->>'workout'), sort = i where id = v_oid;
      else
        insert into workout_options (event_id, label, workout, sort)
        values (v_id, btrim(o->>'label'), btrim(o->>'workout'), i) returning id into v_oid;
      end if;
      v_keep := v_keep || v_oid;
    end loop;
    delete from workout_options where event_id = v_id and not (id = any (v_keep));
  elsif not v_was_closed then
    -- Voting aufgegeben → Optionen weg. Nach einem abgeschlossenen Voting bleiben sie als Historie.
    delete from workout_options where event_id = v_id;
  end if;

  perform promote_waitlist(v_id);
  return v_id;
end $$;

revoke all on function event_visible(boolean) from public, anon, authenticated;
revoke all on function assert_event_visible(uuid) from public, anon, authenticated;
