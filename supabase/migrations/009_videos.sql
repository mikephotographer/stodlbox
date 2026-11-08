-- =====================================================================
-- 009: Kurze Videos beim Training (zusätzlich zu den Fotos).
-- Max. 50 MB pro Datei (Grenze im Gratis-Tarif), max. 3 Videos pro
-- Person und Training. Videos werden wie Fotos 7 Tage nach dem
-- Training gelöscht. Vorschaubild (_t.jpg) erzeugt das Handy.
-- Setzt 007 voraus. Mehrfach ausführbar.
-- =====================================================================

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg', 'video/mp4', 'video/quicktime']
 where id = 'photos';

alter table event_photos add column if not exists kind text not null default 'photo';
alter table event_photos add column if not exists duration_s int;
do $$ begin
  alter table event_photos add constraint event_photos_kind check (kind in ('photo', 'video'));
exception when duplicate_object then null; end $$;

-- Erlaubte Pfade: <event>/<ticket>/<id>.jpg|.mp4|.mov und Vorschau <id>_t.jpg
create or replace function photo_path_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from photo_tickets t
    where t.event_id::text = split_part(p_name, '/', 1)
      and t.token::text = split_part(p_name, '/', 2)
      and t.expires_at > now()
  ) and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}(_t\.jpg|\.jpg|\.mp4|\.mov)$';
$$;

create or replace function photo_ticket(p_code text, p_event_id uuid, p_member_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a text; np int; nv int; tok uuid;
begin
  perform assert_code(p_code);
  perform assert_member(p_member_id);
  a := photo_access(p_event_id, p_member_id);
  if a = 'early' then raise exception 'PHOTOS_EARLY'; end if;
  if a = 'expired' then raise exception 'PHOTOS_EXPIRED'; end if;
  if a <> 'yes' then raise exception 'PHOTOS_NOT_PARTICIPANT'; end if;
  select count(*) filter (where kind = 'photo'), count(*) filter (where kind = 'video') into np, nv
    from event_photos where event_id = p_event_id and member_id = p_member_id;
  if np >= 20 and nv >= 3 then raise exception 'PHOTOS_LIMIT'; end if;
  delete from photo_tickets where expires_at < now() - interval '1 day';
  insert into photo_tickets (event_id, member_id) values (p_event_id, p_member_id) returning token into tok;
  return jsonb_build_object('ticket', tok, 'prefix', p_event_id::text || '/' || tok::text || '/',
                            'left', greatest(0, 20 - np), 'left_videos', greatest(0, 3 - nv));
end $$;

create or replace function add_media(p_code text, p_member_id uuid, p_path text, p_thumb_path text,
                                     p_width int, p_height int, p_kind text, p_duration int default null) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare t photo_tickets; n int; pid uuid; base text;
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
     or split_part(p_thumb_path, '/', 2) <> t.token::text or split_part(p_thumb_path, '/', 1) <> t.event_id::text then
    raise exception 'BAD_TICKET';
  end if;
  select count(*) into n from event_photos where event_id = t.event_id and member_id = p_member_id and kind = p_kind;
  if p_kind = 'photo' and n >= 20 then raise exception 'PHOTOS_LIMIT'; end if;
  if p_kind = 'video' and n >= 3 then raise exception 'VIDEO_LIMIT'; end if;
  insert into event_photos (event_id, member_id, path, thumb_path, width, height, kind, duration_s)
  values (t.event_id, p_member_id, p_path, p_thumb_path, p_width, p_height, p_kind, p_duration)
  on conflict (path) do nothing
  returning id into pid;
  return pid;
end $$;

-- Alte App-Versionen rufen weiter add_photo auf
create or replace function add_photo(p_code text, p_member_id uuid, p_path text, p_thumb_path text, p_width int, p_height int) returns uuid
language sql volatile security definer set search_path = public as $$
  select add_media(p_code, p_member_id, p_path, p_thumb_path, p_width, p_height, 'photo', null);
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
        'id', p.id, 'path', p.path, 'thumb_path', p.thumb_path, 'width', p.width, 'height', p.height,
        'kind', p.kind, 'duration_s', p.duration_s,
        'created_at', p.created_at, 'name', m.name, 'mine', p.member_id = p_member_id)
        order by p.created_at)
      from event_photos p left join members m on m.id = p.member_id
      where p.event_id = p_event_id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

revoke all on function add_media(text, uuid, text, text, int, int, text, int) from public;
grant execute on function add_media(text, uuid, text, text, int, int, text, int) to anon, authenticated;
