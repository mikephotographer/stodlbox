-- =====================================================================
-- 010: Fotos in voller Auflösung.
-- Das Original bleibt unverändert (path). Zum Ansehen gibt es eine
-- kleinere Ansichts-Version (display_path, ca. 2000 px) und die Vorschau
-- (thumb_path). So lädt die App beim Durchblättern wenig Daten und das
-- Original nur beim „Sichern“.
-- Setzt 007 und 009 voraus. Mehrfach ausführbar.
-- =====================================================================

alter table event_photos add column if not exists display_path text;

-- Erlaubte Pfade: <event>/<ticket>/<id>.jpg|.mp4|.mov, Vorschau <id>_t.jpg, Ansicht <id>_m.jpg
create or replace function photo_path_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from photo_tickets t
    where t.event_id::text = split_part(p_name, '/', 1)
      and t.token::text = split_part(p_name, '/', 2)
      and t.expires_at > now()
  ) and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}(_t\.jpg|_m\.jpg|\.jpg|\.mp4|\.mov)$';
$$;

drop function if exists add_media(text, uuid, text, text, int, int, text, int);
create or replace function add_media(p_code text, p_member_id uuid, p_path text, p_thumb_path text,
                                     p_width int, p_height int, p_kind text, p_duration int default null,
                                     p_display_path text default null) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare t photo_tickets; n int; pid uuid;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  if p_kind not in ('photo', 'video') then raise exception 'INVALID'; end if;
  select * into t from photo_tickets
   where token::text = split_part(p_path, '/', 2) and event_id::text = split_part(p_path, '/', 1)
     and member_id = p_member_id and expires_at > now() - interval '15 minutes';
  -- Ticket darf beim Eintragen bis zu 15 Min. abgelaufen sein (langsamer Upload)
  if t.token is null
     or (p_kind = 'photo' and p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$')
     or (p_kind = 'video' and p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov)$')
     or p_thumb_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}_t\.jpg$'
     or split_part(p_thumb_path, '/', 2) <> t.token::text or split_part(p_thumb_path, '/', 1) <> t.event_id::text
     or (p_display_path is not null and (
          p_display_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}_m\.jpg$'
          or split_part(p_display_path, '/', 2) <> t.token::text or split_part(p_display_path, '/', 1) <> t.event_id::text)) then
    raise exception 'BAD_TICKET';
  end if;
  select count(*) into n from event_photos where event_id = t.event_id and member_id = p_member_id and kind = p_kind;
  if p_kind = 'photo' and n >= 20 then raise exception 'PHOTOS_LIMIT'; end if;
  if p_kind = 'video' and n >= 3 then raise exception 'VIDEO_LIMIT'; end if;
  insert into event_photos (event_id, member_id, path, thumb_path, display_path, width, height, kind, duration_s)
  values (t.event_id, p_member_id, p_path, p_thumb_path, p_display_path, p_width, p_height, p_kind, p_duration)
  on conflict (path) do nothing
  returning id into pid;
  return pid;
end $$;
revoke all on function add_media(text, uuid, text, text, int, int, text, int, text) from public;
grant execute on function add_media(text, uuid, text, text, int, int, text, int, text) to anon, authenticated;

-- add_photo (alte App-Versionen) auf die neue Signatur umstellen
create or replace function add_photo(p_code text, p_member_id uuid, p_path text, p_thumb_path text, p_width int, p_height int) returns uuid
language sql volatile security definer set search_path = public as $$
  select add_media(p_code, p_member_id, p_path, p_thumb_path, p_width, p_height, 'photo', null, null);
$$;

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
        'id', p.id, 'path', p.path, 'thumb_path', p.thumb_path, 'display_path', p.display_path,
        'width', p.width, 'height', p.height, 'kind', p.kind, 'duration_s', p.duration_s,
        'created_at', p.created_at, 'name', m.name, 'mine', p.member_id = p_member_id)
        order by p.created_at)
      from event_photos p left join members m on m.id = p.member_id
      where p.event_id = p_event_id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- Aufräumen: Ansichts-Versionen zählen als Teil des Fotos
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
    and not exists (select 1 from event_photos p
                    where p.path = o.name or p.thumb_path = o.name or p.display_path = o.name);
  return names;
end $$;
revoke all on function purge_photos() from public, anon, authenticated;
grant execute on function purge_photos() to service_role;
