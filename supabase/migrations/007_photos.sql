-- =====================================================================
-- 007: Fotos vom Training. Wer „dabei“ war, kann ab Trainingsbeginn
-- Fotos hochladen, ansehen und sichern. 7 Tage nach dem Training wird
-- alles gelöscht (täglicher GitHub-Auftrag, siehe .github/workflows/photo-cleanup.yml).
--
-- Ablauf beim Hochladen:
--   1. photo_ticket()  prüft Code, Person, Teilnahme → Ticket (15 Min. gültig)
--   2. Upload in den Bucket „photos“ unter <event_id>/<ticket>/<datei>.jpg
--      (die Storage-Regel lässt nur Pfade mit gültigem Ticket zu)
--   3. add_photo()     trägt das Foto ein (max. 20 pro Person und Training)
-- Mehrfach ausführbar.
-- =====================================================================

-- Speicher-Bucket: öffentlich lesbar über lange Zufalls-Adressen, nur JPEG, max. 3 MB pro Datei
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

create table if not exists photo_tickets (
  token uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create table if not exists event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  path text not null unique,          -- großes Bild
  thumb_path text not null,           -- Vorschau
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists event_photos_event on event_photos (event_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['photo_tickets', 'event_photos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;

-- Wie lange Fotos bleiben
create or replace function photo_until(p_starts_at timestamptz) returns timestamptz
language sql immutable as $$ select p_starts_at + interval '7 days' $$;

-- Darf diese Person bei diesem Training Fotos sehen/hochladen?
create or replace function photo_access(p_event_id uuid, p_member_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when e.id is null then 'none'
    when e.status = 'cancelled' then 'none'
    when e.starts_at > now() then 'early'
    when now() >= photo_until(e.starts_at) then 'expired'
    when exists (select 1 from rsvps r where r.event_id = e.id and r.member_id = p_member_id and r.status = 'yes') then 'yes'
    else 'not_participant'
  end
  from (select 1) x left join events e on e.id = p_event_id;
$$;

-- Storage-Regel: Pfad <event_id>/<ticket>/… mit gültigem Ticket
create or replace function photo_path_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from photo_tickets t
    where t.event_id::text = split_part(p_name, '/', 1)
      and t.token::text = split_part(p_name, '/', 2)
      and t.expires_at > now()
  ) and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}(_t)?\.jpg$';
$$;

drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos' and public.photo_path_ok(name));

drop policy if exists photos_admin_delete on storage.objects;
create policy photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());

-- ---------------------------------------------------------------------
-- RPCs für die App
-- ---------------------------------------------------------------------

create or replace function photo_ticket(p_code text, p_event_id uuid, p_member_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a text; n int; tok uuid;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  a := photo_access(p_event_id, p_member_id);
  if a = 'early' then raise exception 'PHOTOS_EARLY'; end if;
  if a = 'expired' then raise exception 'PHOTOS_EXPIRED'; end if;
  if a <> 'yes' then raise exception 'PHOTOS_NOT_PARTICIPANT'; end if;
  select count(*) into n from event_photos where event_id = p_event_id and member_id = p_member_id;
  if n >= 20 then raise exception 'PHOTOS_LIMIT'; end if;
  delete from photo_tickets where expires_at < now() - interval '1 day';
  insert into photo_tickets (event_id, member_id) values (p_event_id, p_member_id) returning token into tok;
  return jsonb_build_object('ticket', tok, 'prefix', p_event_id::text || '/' || tok::text || '/', 'left', 20 - n);
end $$;

create or replace function add_photo(p_code text, p_member_id uuid, p_path text, p_thumb_path text, p_width int, p_height int) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare t photo_tickets; n int; pid uuid;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  select * into t from photo_tickets
   where token::text = split_part(p_path, '/', 2) and event_id::text = split_part(p_path, '/', 1)
     and member_id = p_member_id and expires_at > now() - interval '15 minutes';
  -- Ticket darf beim Eintragen bis zu 15 Min. abgelaufen sein (langsamer Upload vieler Fotos)
  if t.token is null
     or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
     or p_thumb_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}_t\.jpg$'
     or split_part(p_thumb_path, '/', 2) <> t.token::text or split_part(p_thumb_path, '/', 1) <> t.event_id::text then
    raise exception 'BAD_TICKET';
  end if;
  select count(*) into n from event_photos where event_id = t.event_id and member_id = p_member_id;
  if n >= 20 then raise exception 'PHOTOS_LIMIT'; end if;
  insert into event_photos (event_id, member_id, path, thumb_path, width, height)
  values (t.event_id, p_member_id, p_path, p_thumb_path, p_width, p_height)
  on conflict (path) do nothing
  returning id into pid;
  return pid;
end $$;

-- Fotos eines Trainings. Nicht-Teilnehmer sehen nur die Anzahl.
create or replace function get_event_photos(p_code text, p_event_id uuid, p_member_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a text; e events;
begin
  perform assert_code(p_code);
  select * into e from events where id = p_event_id;
  a := case when is_admin() and e.id is not null and now() < photo_until(e.starts_at) and e.starts_at <= now() then 'yes'
            else photo_access(p_event_id, p_member_id) end;
  return jsonb_build_object(
    'access', a,
    'until', case when e.id is not null then photo_until(e.starts_at) end,
    'count', (select count(*) from event_photos where event_id = p_event_id),
    'photos', case when a = 'yes' or is_admin() then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'path', p.path, 'thumb_path', p.thumb_path, 'width', p.width, 'height', p.height,
        'created_at', p.created_at, 'name', m.name, 'mine', p.member_id = p_member_id)
        order by p.created_at)
      from event_photos p left join members m on m.id = p.member_id
      where p.event_id = p_event_id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- Eigenes Foto löschen (die Datei räumt der tägliche Auftrag weg)
create or replace function delete_photo(p_code text, p_member_id uuid, p_photo_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  if is_admin() then
    delete from event_photos where id = p_photo_id;
    return;
  end if;
  perform assert_member(p_member_id);
  delete from event_photos where id = p_photo_id and member_id = p_member_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Trainings der letzten 7 Tage, bei denen ich dabei war (für den Hinweis auf dem Board)
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
    where e.status <> 'cancelled' and e.starts_at <= now() and now() < photo_until(e.starts_at)), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Aufräumen (nur mit service_role-Schlüssel, vom täglichen GitHub-Auftrag)
-- Löscht die Einträge alter Trainings und gibt alle Dateien zurück, die weg können:
-- Fotos von Trainings, die älter als 7 Tage sind, gelöschte Fotos und
-- angefangene Uploads, die nie eingetragen wurden.
-- ---------------------------------------------------------------------
create or replace function purge_photos() returns text[]
language plpgsql volatile security definer set search_path = public, storage as $$
declare names text[];
begin
  delete from event_photos p using events e where e.id = p.event_id and now() >= photo_until(e.starts_at);
  delete from photo_tickets where expires_at < now() - interval '1 day';
  select coalesce(array_agg(o.name), '{}') into names
  from storage.objects o
  where o.bucket_id = 'photos'
    and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from event_photos p where p.path = o.name or p.thumb_path = o.name);
  return names;
end $$;

revoke all on function photo_until(timestamptz) from public;
revoke all on function photo_access(uuid, uuid) from public, anon, authenticated;
revoke all on function purge_photos() from public, anon, authenticated;
grant execute on function purge_photos() to service_role;
grant execute on function photo_path_ok(text) to anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'photo_ticket(text, uuid, uuid)', 'add_photo(text, uuid, text, text, int, int)',
    'get_event_photos(text, uuid, uuid)', 'delete_photo(text, uuid, uuid)', 'recent_photo_events(text, uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
