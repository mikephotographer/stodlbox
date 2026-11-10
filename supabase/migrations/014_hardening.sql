-- =====================================================================
-- 014: Absicherung gegen Bots und volle Speicher.
--
-- 1) Bremse für falsche Gruppen-Codes: Pro Absender (IP) höchstens 20
--    falsche Versuche in 10 Minuten, danach „TOO_MANY“ bis zum Ende des
--    Zeitfensters. Gezählt wird mit Sequenzen, weil die beim Abbruch einer
--    Anfrage (falscher Code = Fehler = Rollback) nicht zurückgesetzt werden.
--    Die IPs werden auf 32 Fächer verteilt (keine IP wird gespeichert).
-- 2) Upload-Grenze: pro Person und Training höchstens 80 Dateien, und
--    keine Uploads mehr, wenn der Foto-Speicher 900 MB erreicht hat.
-- 3) Feste search_path für kleine Hilfsfunktionen (Supabase-Warnungen).
--
-- Setzt 001–013 voraus. Mehrfach ausführbar.
-- =====================================================================

-- ---------------------------------------------------------------- 1) Code-Bremse

-- 32 Zähler, Wert = Zeitfenster * 100000 + Fehlversuche
do $$
declare i int;
begin
  for i in 0..31 loop
    execute format('create sequence if not exists code_guard_%s minvalue 0 start 0', i);
    execute format('revoke all on sequence code_guard_%s from public, anon, authenticated', i);
  end loop;
end $$;

-- Fach des Absenders (aus der IP, die Supabase mitschickt)
create or replace function code_guard_slot() returns int
language plpgsql stable security definer set search_path = public as $$
declare h json; ip text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then h := null;
  end;
  ip := coalesce(h->>'cf-connecting-ip', nullif(btrim(split_part(h->>'x-forwarded-for', ',', 1)), ''), h->>'x-real-ip', 'none');
  return abs(hashtext(ip)) % 32;
end $$;

-- Fehlversuche des Absenders im aktuellen 10-Minuten-Fenster
create or replace function code_guard_count(p_slot int) returns int
language plpgsql stable security definer set search_path = public as $$
declare v bigint; w bigint := floor(extract(epoch from now()) / 600);
begin
  execute format('select last_value from code_guard_%s', p_slot) into v;
  if v / 100000 <> w then return 0; end if;
  return (v % 100000)::int;
end $$;

-- Gruppen-Code prüfen, mit Bremse. Zählt falsche Versuche, auch wenn die
-- Anfrage danach mit Fehler endet.
create or replace function code_ok_guarded(p_code text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare s int := code_guard_slot(); w bigint := floor(extract(epoch from now()) / 600); v bigint; ok boolean;
begin
  -- Nur-Lese-Anfragen (GET) könnten nicht mitzählen → dort wird gar nicht geprüft.
  -- Die App ruft alles per POST auf; dafür sind die Funktionen unten auf volatile gestellt.
  if current_setting('transaction_read_only') = 'on' then
    raise exception 'USE_POST' using errcode = '28000';
  end if;
  if code_guard_count(s) >= 20 then
    raise exception 'TOO_MANY' using errcode = '28000';
  end if;
  ok := code_ok(p_code);
  if not ok then
    execute format('select last_value from code_guard_%s', s) into v;
    if v / 100000 <> w then
      execute format('select setval(%L, %s)', 'code_guard_' || s, w * 100000 + 1);
    else
      execute format('select nextval(%L)', 'code_guard_' || s);
    end if;
  end if;
  return ok;
end $$;

-- Alle Freunde-Funktionen prüfen den Code hierüber
create or replace function assert_code(p_code text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if is_admin() then return; end if;
  if not code_ok_guarded(p_code) then
    raise exception 'BAD_CODE' using errcode = '28000';
  end if;
end $$;

create or replace function check_code(p_code text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  return code_ok_guarded(p_code);
end $$;

-- Funktionen, die den Code prüfen, laufen als „volatile“: PostgREST startet
-- sie dann in einer Schreib-Transaktion, sodass die Bremse mitzählen kann.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.provolatile <> 'v'
      and p.prosrc like '%assert_code(%' and p.proname <> 'assert_code'
  loop
    execute format('alter function %s volatile', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- 2) Upload-Grenze

-- Foto-Speicher in Bytes
create or replace function photo_storage_bytes() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o where o.bucket_id = 'photos';
$$;

-- Erlaubte Pfade wie in 010, zusätzlich: höchstens 80 Dateien pro Person und
-- Training, und nur solange der Speicher unter 900 MB liegt.
create or replace function photo_path_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare t photo_tickets;
begin
  if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}(_t\.jpg|_m\.jpg|\.jpg|\.mp4|\.mov)$' then return false; end if;
  select * into t from photo_tickets
   where event_id::text = split_part(p_name, '/', 1) and token::text = split_part(p_name, '/', 2) and expires_at > now();
  if t.token is null then return false; end if;
  if (select count(*) from storage.objects o
       join photo_tickets x on x.token::text = split_part(o.name, '/', 2)
      where o.bucket_id = 'photos' and o.name like t.event_id::text || '/%' and x.member_id = t.member_id) >= 80 then
    return false;
  end if;
  return photo_storage_bytes() < 900 * 1024 * 1024;
end $$;

-- Ticket gibt es nur, solange Platz ist (sonst verständliche Meldung statt Upload-Fehler)
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
  if photo_storage_bytes() >= 900 * 1024 * 1024 then raise exception 'STORAGE_FULL'; end if;
  select count(*) filter (where kind = 'photo'), count(*) filter (where kind = 'video') into np, nv
    from event_photos where event_id = p_event_id and member_id = p_member_id;
  if np >= 20 and nv >= 3 then raise exception 'PHOTOS_LIMIT'; end if;
  delete from photo_tickets where expires_at < now() - interval '1 day';
  insert into photo_tickets (event_id, member_id) values (p_event_id, p_member_id) returning token into tok;
  return jsonb_build_object('ticket', tok, 'prefix', p_event_id::text || '/' || tok::text || '/',
                            'left', greatest(0, 20 - np), 'left_videos', greatest(0, 3 - nv));
end $$;

-- ---------------------------------------------------------------- 3) search_path

alter function clean_name(text) set search_path = public;
alter function photo_until(timestamptz) set search_path = public;
alter function workout_key(text) set search_path = public;
alter function ics_text(text) set search_path = public;
alter function ics_fold(text) set search_path = public;
alter function ics_time(timestamptz) set search_path = public;

-- ---------------------------------------------------------------- Rechte

revoke all on function code_guard_slot() from public, anon, authenticated;
revoke all on function code_guard_count(int) from public, anon, authenticated;
revoke all on function code_ok_guarded(text) from public, anon, authenticated;
revoke all on function photo_storage_bytes() from public, anon, authenticated;
revoke all on function assert_code(text) from public, anon, authenticated;
revoke all on function check_code(text) from public;
grant execute on function check_code(text) to anon, authenticated;

-- Kontrolle: zeigt den belegten Foto-Speicher in Bytes (sollte > 0 sein, wenn Fotos da sind)
select photo_storage_bytes() as foto_speicher_bytes, (select count(*) from storage.objects where bucket_id = 'photos') as dateien;
