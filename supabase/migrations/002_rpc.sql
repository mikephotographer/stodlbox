-- STODLBOX · 002 · RPC-Funktionen
-- Freunde (anon) greifen ausschließlich über diese Funktionen zu. Jede prüft zuerst den Gruppen-Code.
-- Der Admin (eingeloggt, is_admin()) darf alle Freunde-Funktionen auch ohne Code aufrufen.

-- =====================================================================
-- Helfer (intern, nicht von außen aufrufbar)
-- =====================================================================

create or replace function day_start() returns timestamptz
language sql stable set search_path = public as $$
  select ((now() at time zone 'Europe/Vienna')::date)::timestamp at time zone 'Europe/Vienna';
$$;

create or replace function code_ok(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select extensions.crypt(upper(btrim(p_code)), group_code_hash) = group_code_hash
    from app_settings where id = 1
  ), false) and coalesce(btrim(p_code), '') <> '';
$$;

create or replace function assert_code(p_code text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if is_admin() then return; end if;
  if not code_ok(p_code) then
    raise exception 'BAD_CODE' using errcode = '28000';
  end if;
end $$;

create or replace function require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
end $$;

-- Admin ODER Systemaufruf (pg_cron, SQL Editor) – aber nicht anon/fremde Logins.
create or replace function require_admin_or_system() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end $$;

create or replace function assert_member(p_member_id uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_member_id is null or not exists (select 1 from members where id = p_member_id and active) then
    raise exception 'BAD_MEMBER';
  end if;
end $$;

create or replace function clean_name(p_name text) returns text
language sql immutable as $$
  select btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
$$;

-- Ein Termin als JSON, inkl. Zusagen, Voting-Optionen und eigener Werte
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
      where w.member_id = p_member_id)
  )
  from events e where e.id = p_event_id;
$$;

create or replace function poll_json(p_poll_id uuid, p_member_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'deadline', p.deadline, 'closed', p.closed, 'event_id', p.event_id,
    'open', not p.closed and (p.deadline is null or p.deadline > now()),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'starts_at', o.starts_at,
             'members', coalesce((select jsonb_agg(a.member_id) from date_poll_answers a where a.option_id = o.id), '[]'::jsonb))
             order by o.starts_at)
      from date_poll_options o where o.poll_id = p.id), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) order by lower(m.name))
      from members m
      where exists (select 1 from date_poll_answers a join date_poll_options o on o.id = a.option_id
                    where o.poll_id = p.id and a.member_id = m.id)), '[]'::jsonb),
    'my', coalesce((
      select jsonb_agg(a.option_id) from date_poll_answers a join date_poll_options o on o.id = a.option_id
      where o.poll_id = p.id and a.member_id = p_member_id), '[]'::jsonb)
  )
  from date_polls p where p.id = p_poll_id;
$$;

-- Warteliste nachrücken lassen. Aufrufer hält die Zeilensperre auf dem Event.
create or replace function promote_waitlist(p_event_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  e events;
  v_yes int;
  v_next uuid;
begin
  select * into e from events where id = p_event_id;
  if not found or e.status <> 'planned' or e.starts_at <= now() then return; end if;
  loop
    select count(*) into v_yes from rsvps where event_id = p_event_id and status = 'yes';
    exit when e.capacity is not null and v_yes >= e.capacity;
    v_next := null;
    select member_id into v_next from rsvps
      where event_id = p_event_id and status = 'waitlist'
      order by status_since, member_id limit 1;
    exit when v_next is null;
    update rsvps set status = 'yes', status_since = now(), promoted_at = now(), promotion_seen = false
      where event_id = p_event_id and member_id = v_next;
  end loop;
end $$;

-- Kern von set_rsvp / admin_set_rsvp. Transaktional über SELECT … FOR UPDATE auf dem Event.
create or replace function do_set_rsvp(p_event_id uuid, p_member_id uuid, p_status text, p_admin boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e events;
  v_old text;
  v_new text;
  v_yes int;
  v_pos int;
begin
  if p_status is null or p_status not in ('yes', 'maybe', 'no') then
    raise exception 'INVALID: status';
  end if;

  select * into e from events where id = p_event_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not p_admin then
    if e.status <> 'planned' then raise exception 'CANCELLED'; end if;
    if e.starts_at <= now() then raise exception 'LOCKED'; end if;
  end if;

  if not exists (select 1 from members where id = p_member_id and (active or p_admin)) then
    raise exception 'BAD_MEMBER';
  end if;

  select status into v_old from rsvps where event_id = p_event_id and member_id = p_member_id;
  v_new := p_status;

  if p_status = 'yes' then
    if v_old = 'waitlist' then
      v_new := 'waitlist';                       -- Platz in der Warteliste behalten
    elsif coalesce(v_old, '') <> 'yes' and e.capacity is not null then
      select count(*) into v_yes from rsvps where event_id = p_event_id and status = 'yes';
      if v_yes >= e.capacity then v_new := 'waitlist'; end if;
    end if;
  end if;

  insert into rsvps (event_id, member_id, status, status_since, promoted_at, promotion_seen)
  values (p_event_id, p_member_id, v_new, now(), null, true)
  on conflict (event_id, member_id) do update set
    status         = excluded.status,
    status_since   = case when rsvps.status = excluded.status then rsvps.status_since else now() end,
    promoted_at    = case when rsvps.status = excluded.status then rsvps.promoted_at else null end,
    promotion_seen = case when rsvps.status = excluded.status then rsvps.promotion_seen else true end;

  perform promote_waitlist(p_event_id);

  select status into v_new from rsvps where event_id = p_event_id and member_id = p_member_id;
  if v_new = 'waitlist' then
    select w.pos into v_pos from (
      select member_id, row_number() over (order by status_since, member_id) as pos
      from rsvps where event_id = p_event_id and status = 'waitlist') w
    where w.member_id = p_member_id;
  end if;

  return jsonb_build_object('status', v_new, 'waitlist_pos', v_pos);
end $$;

-- Voting abschließen. Ohne Option: Mehrheit, bei Gleichstand Fehler TIE.
create or replace function close_vote_core(p_event_id uuid, p_option_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  e events;
  v_win uuid;
  v_top int;
  v_count int;
begin
  select * into e from events where id = p_event_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if e.workout_mode <> 'vote' or e.vote_closed then raise exception 'VOTE_CLOSED'; end if;

  if p_option_id is not null then
    select id into v_win from workout_options where id = p_option_id and event_id = p_event_id;
    if v_win is null then raise exception 'INVALID: option'; end if;
  else
    with c as (
      select o.id, count(v.member_id) as n
      from workout_options o left join workout_votes v on v.option_id = o.id
      where o.event_id = p_event_id group by o.id
    )
    select max(n), count(*) filter (where n = (select max(n) from c)) into v_top, v_count from c;
    if v_top is null then raise exception 'INVALID: options'; end if;
    if v_count > 1 then raise exception 'TIE'; end if;
    select o.id into v_win from workout_options o left join workout_votes v on v.option_id = o.id
      where o.event_id = p_event_id group by o.id having count(v.member_id) = v_top limit 1;
  end if;

  update events set
    workout = (select workout from workout_options where id = v_win),
    workout_mode = 'fixed',
    vote_closed = true
  where id = p_event_id;
  return v_win;
end $$;

-- =====================================================================
-- Freunde-Funktionen (anon + authenticated)
-- =====================================================================

create or replace function check_code(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select code_ok(p_code);
$$;

create or replace function list_members(p_code text)
returns table (id uuid, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  return query select m.id, m.name from members m where m.active order by lower(m.name);
end $$;

create or replace function add_member(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_name text := clean_name(p_name);
  v_id uuid;
begin
  perform assert_code(p_code);
  if char_length(v_name) not between 2 and 30 then raise exception 'NAME_INVALID'; end if;
  if exists (select 1 from members where lower(name) = lower(v_name) and active) then
    raise exception 'NAME_TAKEN';
  end if;
  insert into members (name) values (v_name) returning id into v_id;
  return v_id;
end $$;

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
      from (select id, starts_at from events where starts_at >= v_start order by starts_at limit 30) x), '[]'::jsonb),
    'polls', coalesce((
      select jsonb_agg(poll_json(p.id, p_member_id) order by p.created_at)
      from date_polls p where not p.closed), '[]'::jsonb),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object('keywords', keywords, 'tip', tip, 'case_sensitive', case_sensitive) order by sort, tip)
      from equipment_rules where active), '[]'::jsonb),
    'promotions', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', e.id, 'title', e.title, 'starts_at', e.starts_at) order by e.starts_at)
      from rsvps r join events e on e.id = r.event_id
      where r.member_id = p_member_id and not r.promotion_seen and r.status = 'yes' and e.starts_at >= v_start), '[]'::jsonb)
  );
end $$;

create or replace function get_event(p_code text, p_event_id uuid, p_member_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform assert_code(p_code);
  v := event_json(p_event_id, p_member_id);
  if v is null then raise exception 'NOT_FOUND'; end if;
  return v || jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object('keywords', keywords, 'tip', tip, 'case_sensitive', case_sensitive) order by sort, tip)
      from equipment_rules where active), '[]'::jsonb));
end $$;

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
      from (select id, starts_at from events where starts_at < v_start
            order by starts_at desc offset v_off limit 20) x), '[]'::jsonb),
    'has_more', (select count(*) from events where starts_at < v_start) > v_off + 20
  );
end $$;

create or replace function set_rsvp(p_code text, p_event_id uuid, p_member_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  return do_set_rsvp(p_event_id, p_member_id, p_status, false);
end $$;

create or replace function ack_promotion(p_code text, p_event_id uuid, p_member_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  update rsvps set promotion_seen = true where event_id = p_event_id and member_id = p_member_id;
end $$;

create or replace function vote_workout(p_code text, p_event_id uuid, p_member_id uuid, p_option_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e events;
begin
  perform assert_code(p_code);
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

create or replace function answer_date_poll(p_code text, p_poll_id uuid, p_member_id uuid, p_option_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p date_polls;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  select * into p from date_polls where id = p_poll_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.closed or (p.deadline is not null and p.deadline <= now()) then raise exception 'POLL_CLOSED'; end if;
  if exists (
    select 1 from unnest(coalesce(p_option_ids, '{}')) x
    where not exists (select 1 from date_poll_options o where o.id = x and o.poll_id = p_poll_id)
  ) then
    raise exception 'INVALID: option';
  end if;

  delete from date_poll_answers a using date_poll_options o
    where o.id = a.option_id and o.poll_id = p_poll_id and a.member_id = p_member_id;
  insert into date_poll_answers (option_id, member_id)
    select distinct x, p_member_id from unnest(coalesce(p_option_ids, '{}')) x;

  return poll_json(p_poll_id, p_member_id);
end $$;

-- Vorlagen + frühere Workouts durchsuchen (für das Termin-Formular)
create or replace function search_workouts(p_code text, p_query text default '') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || coalesce(btrim(p_query), '') || '%';
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(x order by x->>'kind' desc, x->>'date' desc nulls last)
    from (
      (select jsonb_build_object('kind', 'template', 'id', t.id, 'title', t.title, 'workout', t.workout, 'date', null) as x
       from workout_templates t
       where t.title ilike q or t.workout ilike q
       order by t.title limit 30)
      union all
      (select jsonb_build_object('kind', 'event', 'id', e.id, 'title', e.title, 'workout', e.workout, 'date', e.starts_at)
       from events e
       where e.workout is not null and btrim(e.workout) <> '' and e.starts_at < now()
         and (e.title ilike q or e.workout ilike q)
       order by e.starts_at desc limit 30)
    ) s), '[]'::jsonb);
end $$;

-- =====================================================================
-- Admin-Funktionen (nur eingeloggt + is_admin())
-- =====================================================================

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
    insert into events (starts_at, duration_min, title, workout, workout_mode, vote_deadline, capacity, media_url, note)
    values (v_start, v_dur, v_title,
            case when v_mode = 'fixed' then nullif(btrim(p_event->>'workout'), '') end,
            v_mode, case when v_mode = 'vote' then nullif(p_event->>'vote_deadline', '')::timestamptz end,
            v_cap, nullif(btrim(p_event->>'media_url'), ''), nullif(btrim(p_event->>'note'), ''))
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
      note = nullif(btrim(p_event->>'note'), '')
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

create or replace function admin_set_event_status(p_event_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status not in ('planned', 'cancelled') then raise exception 'INVALID: status'; end if;
  perform 1 from events where id = p_event_id for update;
  update events set status = p_status where id = p_event_id;
  if p_status = 'planned' then perform promote_waitlist(p_event_id); end if;
end $$;

create or replace function admin_delete_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from events where id = p_event_id;
end $$;

create or replace function admin_close_vote(p_event_id uuid, p_option_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  return close_vote_core(p_event_id, p_option_id);
end $$;

create or replace function admin_set_capacity(p_event_id uuid, p_capacity int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_capacity is not null and p_capacity < 1 then raise exception 'INVALID: capacity'; end if;
  perform 1 from events where id = p_event_id for update;
  update events set capacity = p_capacity where id = p_event_id;
  perform promote_waitlist(p_event_id);
end $$;

create or replace function admin_set_rsvp(p_event_id uuid, p_member_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status = 'none' then
    perform 1 from events where id = p_event_id for update;
    delete from rsvps where event_id = p_event_id and member_id = p_member_id;
    perform promote_waitlist(p_event_id);
    return jsonb_build_object('status', null);
  end if;
  return do_set_rsvp(p_event_id, p_member_id, p_status, true);
end $$;

-- ---------- Leute ----------
create or replace function admin_add_member(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_name text := clean_name(p_name); v_id uuid;
begin
  perform require_admin();
  if char_length(v_name) not between 2 and 30 then raise exception 'NAME_INVALID'; end if;
  if exists (select 1 from members where lower(name) = lower(v_name) and active) then raise exception 'NAME_TAKEN'; end if;
  insert into members (name) values (v_name) returning id into v_id;
  return v_id;
end $$;

create or replace function admin_rename_member(p_member_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text := clean_name(p_name);
begin
  perform require_admin();
  if char_length(v_name) not between 2 and 30 then raise exception 'NAME_INVALID'; end if;
  if exists (select 1 from members where lower(name) = lower(v_name) and active and id <> p_member_id) then
    raise exception 'NAME_TAKEN';
  end if;
  update members set name = v_name where id = p_member_id;
end $$;

create or replace function admin_set_member_active(p_member_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_active and exists (
    select 1 from members a join members b on lower(a.name) = lower(b.name) and b.active and b.id <> a.id
    where a.id = p_member_id
  ) then
    raise exception 'NAME_TAKEN';
  end if;
  update members set active = p_active where id = p_member_id;
end $$;

create or replace function admin_merge_members(p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform require_admin();
  if p_from is null or p_into is null or p_from = p_into then raise exception 'INVALID: merge'; end if;
  if not exists (select 1 from members where id = p_from) or not exists (select 1 from members where id = p_into) then
    raise exception 'NOT_FOUND';
  end if;

  -- Events sperren, auf denen p_from eine Zusage hat (Warteliste konsistent halten)
  perform 1 from events where id in (select event_id from rsvps where member_id = p_from) order by id for update;

  -- Bei Konflikt behält p_into seinen Eintrag
  update rsvps r set member_id = p_into where r.member_id = p_from
    and not exists (select 1 from rsvps x where x.event_id = r.event_id and x.member_id = p_into);
  delete from rsvps where member_id = p_from;

  update workout_votes v set member_id = p_into where v.member_id = p_from
    and not exists (select 1 from workout_votes x where x.event_id = v.event_id and x.member_id = p_into);
  delete from workout_votes where member_id = p_from;

  update date_poll_answers a set member_id = p_into where a.member_id = p_from
    and not exists (select 1 from date_poll_answers x where x.option_id = a.option_id and x.member_id = p_into);
  delete from date_poll_answers where member_id = p_from;

  update results r set member_id = p_into where r.member_id = p_from
    and not exists (select 1 from results x where x.event_id = r.event_id and x.member_id = p_into);
  delete from results where member_id = p_from;

  update members set active = false where id = p_from;

  for v in select id from events where starts_at > now() and status = 'planned' loop
    perform promote_waitlist(v);
  end loop;
end $$;

-- ---------- Einstellungen ----------
create or replace function admin_set_group_code(p_new_code text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := upper(btrim(coalesce(p_new_code, '')));
begin
  perform require_admin();
  if char_length(v) not between 4 and 40 then raise exception 'INVALID: code'; end if;
  update app_settings set group_code_hash = extensions.crypt(v, extensions.gen_salt('bf')) where id = 1;
end $$;

-- ---------- Serien ----------
-- Intern: ab einem bestimmten Tag erzeugen (für Tests über die Sommerzeit-Umstellung)
create or replace function generate_series_events_from(p_today date, p_weeks int) returns int
language plpgsql security definer set search_path = public as $$
declare
  s series;
  d date;
  v_today date := p_today;
  v_until date;
  v_slot timestamptz;
  n int := 0;
  c int;
begin
  v_until := v_today + least(greatest(coalesce(p_weeks, 6), 1), 26) * 7;
  for s in select * from series where active loop
    for d in
      select g::date from generate_series(greatest(s.starts_on, v_today)::timestamp,
                                          least(coalesce(s.ends_on, v_until), v_until)::timestamp,
                                          interval '1 day') g
    loop
      continue when extract(isodow from d) <> s.weekday;
      -- Ortszeit Wien → Zeitpunkt. Sommerzeit wird von Postgres korrekt berücksichtigt.
      v_slot := (d + s.start_time) at time zone 'Europe/Vienna';
      continue when v_slot <= now();
      insert into events (series_id, series_slot, starts_at, duration_min, title, capacity)
      values (s.id, v_slot, v_slot, s.duration_min, s.title, s.capacity)
      on conflict (series_id, series_slot) where series_id is not null do nothing;
      get diagnostics c = row_count;
      n := n + c;
    end loop;
  end loop;
  return n;
end $$;

create or replace function generate_series_events(p_weeks int default 6) returns int
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin_or_system();
  return generate_series_events_from((now() at time zone 'Europe/Vienna')::date, p_weeks);
end $$;

create or replace function admin_save_series(p_series jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_series->>'id', '')::uuid;
  v_title text := btrim(coalesce(p_series->>'title', ''));
  v_wd int := nullif(p_series->>'weekday', '')::int;
  v_time time := nullif(p_series->>'start_time', '')::time;
  v_from date := nullif(p_series->>'starts_on', '')::date;
  v_to date := nullif(p_series->>'ends_on', '')::date;
  v_dur int := coalesce(nullif(p_series->>'duration_min', '')::int, (select default_duration_min from app_settings where id = 1), 90);
  v_cap int := nullif(p_series->>'capacity', '')::int;
begin
  perform require_admin();
  if v_title = '' or char_length(v_title) > 80 then raise exception 'INVALID: title'; end if;
  if v_wd is null or v_wd not between 1 and 7 or v_time is null or v_from is null then raise exception 'INVALID: series'; end if;
  if v_to is not null and v_to < v_from then raise exception 'INVALID: ends_on'; end if;
  if v_cap is not null and v_cap < 1 then raise exception 'INVALID: capacity'; end if;

  if v_id is null then
    insert into series (title, weekday, start_time, duration_min, capacity, starts_on, ends_on)
    values (v_title, v_wd, v_time, v_dur, v_cap, v_from, v_to) returning id into v_id;
  else
    update series set title = v_title, weekday = v_wd, start_time = v_time, duration_min = v_dur,
      capacity = v_cap, starts_on = v_from, ends_on = v_to where id = v_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  perform generate_series_events(6);
  return v_id;
end $$;

create or replace function admin_set_series_active(p_series_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update series set active = p_active where id = p_series_id;
  if p_active then perform generate_series_events(6); end if;
end $$;

-- Künftige Termine einer pausierten/beendeten Serie ohne Zusagen und Stimmen löschen
create or replace function admin_delete_empty_series_events(p_series_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform require_admin();
  if exists (select 1 from series where id = p_series_id and active) then
    raise exception 'INVALID: series active';
  end if;
  delete from events e
  where e.series_id = p_series_id and e.starts_at > now()
    and not exists (select 1 from rsvps r where r.event_id = e.id)
    and not exists (select 1 from workout_votes v where v.event_id = e.id);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Terminfindung ----------
create or replace function admin_save_poll(p_poll jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_poll->>'id', '')::uuid;
  v_title text := btrim(coalesce(p_poll->>'title', ''));
  v_opts jsonb := coalesce(p_poll->'options', '[]'::jsonb);
  v_keep uuid[] := '{}';
  v_oid uuid;
  o jsonb;
begin
  perform require_admin();
  if v_title = '' or char_length(v_title) > 80 then raise exception 'INVALID: title'; end if;
  if jsonb_array_length(v_opts) not between 2 and 6 then raise exception 'INVALID: options'; end if;

  if v_id is null then
    insert into date_polls (title, deadline) values (v_title, nullif(p_poll->>'deadline', '')::timestamptz)
    returning id into v_id;
  else
    update date_polls set title = v_title, deadline = nullif(p_poll->>'deadline', '')::timestamptz where id = v_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;

  for o in select * from jsonb_array_elements(v_opts) loop
    if nullif(o->>'starts_at', '') is null then raise exception 'INVALID: option'; end if;
    v_oid := nullif(o->>'id', '')::uuid;
    if v_oid is not null and exists (select 1 from date_poll_options where id = v_oid and poll_id = v_id) then
      update date_poll_options set starts_at = (o->>'starts_at')::timestamptz where id = v_oid;
    else
      insert into date_poll_options (poll_id, starts_at) values (v_id, (o->>'starts_at')::timestamptz)
      returning id into v_oid;
    end if;
    v_keep := v_keep || v_oid;
  end loop;
  delete from date_poll_options where poll_id = v_id and not (id = any (v_keep));
  return v_id;
end $$;

create or replace function admin_close_poll(p_poll_id uuid, p_closed boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update date_polls set closed = p_closed where id = p_poll_id;
end $$;

create or replace function admin_delete_poll(p_poll_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from date_polls where id = p_poll_id;
end $$;

create or replace function admin_poll_to_event(p_option_id uuid, p_event jsonb, p_prefill_maybe boolean default false)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_poll uuid;
  v_id uuid;
begin
  perform require_admin();
  select poll_id into v_poll from date_poll_options where id = p_option_id;
  if v_poll is null then raise exception 'NOT_FOUND'; end if;

  v_id := admin_save_event(p_event - 'id');
  update date_polls set closed = true, event_id = v_id where id = v_poll;

  if p_prefill_maybe then
    insert into rsvps (event_id, member_id, status)
    select v_id, a.member_id, 'maybe'
    from date_poll_answers a join members m on m.id = a.member_id and m.active
    where a.option_id = p_option_id
    on conflict do nothing;
  end if;
  return v_id;
end $$;

-- Wird von pg_cron aufgerufen (003): abgelaufene Votings mit eindeutigem Sieger schließen
create or replace function auto_close_votes() returns int
language plpgsql security definer set search_path = public as $$
declare
  v uuid;
  n int := 0;
begin
  perform require_admin_or_system();
  for v in select id from events
           where workout_mode = 'vote' and not vote_closed and status = 'planned'
             and vote_deadline is not null and vote_deadline <= now()
  loop
    begin
      perform close_vote_core(v, null);
      n := n + 1;
    exception when others then
      null; -- Gleichstand o. ä.: bleibt offen, bis Mike entscheidet
    end;
  end loop;
  return n;
end $$;

-- =====================================================================
-- Rechte
-- =====================================================================
do $$
declare f text;
begin
  -- Interne Helfer: niemand von außen
  foreach f in array array[
    'day_start()', 'code_ok(text)', 'assert_code(text)', 'require_admin()', 'require_admin_or_system()',
    'assert_member(uuid)', 'clean_name(text)', 'event_json(uuid,uuid)', 'poll_json(uuid,uuid)',
    'promote_waitlist(uuid)', 'do_set_rsvp(uuid,uuid,text,boolean)', 'close_vote_core(uuid,uuid)',
    'auto_close_votes()', 'generate_series_events_from(date,integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;

  -- Freunde: anon + authenticated
  foreach f in array array[
    'is_admin()', 'check_code(text)', 'list_members(text)', 'add_member(text,text)', 'get_board(text,uuid)',
    'get_event(text,uuid,uuid)', 'get_archive(text,integer)', 'set_rsvp(text,uuid,uuid,text)',
    'ack_promotion(text,uuid,uuid)', 'vote_workout(text,uuid,uuid,uuid)', 'answer_date_poll(text,uuid,uuid,uuid[])',
    'search_workouts(text,text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;

  -- Admin: nur authenticated (prüfen zusätzlich is_admin())
  foreach f in array array[
    'admin_save_event(jsonb)', 'admin_set_event_status(uuid,text)', 'admin_delete_event(uuid)',
    'admin_close_vote(uuid,uuid)', 'admin_set_capacity(uuid,integer)', 'admin_set_rsvp(uuid,uuid,text)',
    'admin_add_member(text)', 'admin_rename_member(uuid,text)', 'admin_set_member_active(uuid,boolean)',
    'admin_merge_members(uuid,uuid)', 'admin_set_group_code(text)', 'generate_series_events(integer)',
    'admin_save_series(jsonb)', 'admin_set_series_active(uuid,boolean)', 'admin_delete_empty_series_events(uuid)',
    'admin_save_poll(jsonb)', 'admin_close_poll(uuid,boolean)', 'admin_delete_poll(uuid)',
    'admin_poll_to_event(uuid,jsonb,boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
