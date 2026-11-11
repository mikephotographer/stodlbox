-- =====================================================================
-- 020: Eigener Workout-Titel beim Termin (z. B. Termin „Samstags-WOD“,
-- Workout „Fran“). Wird über dem Workout-Text angezeigt.
-- Setzt 001–019 voraus. Mehrfach ausführbar.
-- =====================================================================

alter table events add column if not exists workout_title text;

-- Abgeschlossene Votings: Titel der Sieger-Option übernehmen (bestehende Termine)
update events e set workout_title = o.label
  from workout_options o
 where o.event_id = e.id and e.vote_closed and e.workout_title is null and o.workout = e.workout;

-- Neues Voting-Ende: Sieger-Titel automatisch mitnehmen
create or replace function events_vote_title() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.vote_closed and not coalesce(old.vote_closed, false) and new.workout_title is null then
    select label into new.workout_title from workout_options
     where event_id = new.id and workout = new.workout order by sort limit 1;
  end if;
  return new;
end $$;
revoke all on function events_vote_title() from public, anon, authenticated;
drop trigger if exists events_vote_title on events;
create trigger events_vote_title before update on events for each row execute function events_vote_title();

create or replace function event_json(p_event_id uuid, p_member_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'series_id', e.series_id, 'starts_at', e.starts_at, 'duration_min', e.duration_min,
    'title', e.title, 'workout_title', e.workout_title, 'workout', e.workout, 'workout_mode', e.workout_mode,
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
  v_wtitle text := nullif(btrim(coalesce(p_event->>'workout_title', '')), '');
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
  if char_length(v_wtitle) > 80 then raise exception 'INVALID: workout_title'; end if;
  if v_mode = 'vote' and jsonb_array_length(v_opts) not between 2 and 3 then raise exception 'INVALID: options'; end if;

  if v_id is null then
    insert into events (starts_at, duration_min, title, workout_title, workout, workout_mode, vote_deadline, capacity, media_url, note, private)
    values (v_start, v_dur, v_title, case when v_mode = 'fixed' then v_wtitle end,
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
      workout_title = case when v_mode = 'fixed' then v_wtitle end,
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

-- Kontrolle
select count(*) filter (where workout_title is not null) as mit_workout_titel, count(*) as termine from events;
