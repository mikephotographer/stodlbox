-- STODLBOX · Testskript
-- Läuft komplett in einer Transaktion und wird am Ende zurückgerollt – verändert also nichts.
-- Im Supabase SQL Editor ausführen. Bei Erfolg kommt am Ende „ALLE TESTS OK“ als Notice.
-- Jeder fehlgeschlagene Test bricht mit einer Fehlermeldung ab.

begin;

-- Testumgebung: eigener Code + Admin, nur innerhalb dieser Transaktion
insert into app_settings (admin_email, group_code_hash)
values ('admin@test.local', extensions.crypt('TEST-CODE', extensions.gen_salt('bf')))
on conflict (id) do update set admin_email = excluded.admin_email, group_code_hash = excluded.group_code_hash;

create temp table t_ids (k text primary key, id uuid) on commit drop;
grant all on t_ids to public;

-- Hilfen: als Freund (anon) bzw. als Admin auftreten
create or replace function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;
create or replace function pg_temp.as_admin() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@test.local","sub":"00000000-0000-0000-0000-000000000001"}', true);
$$;
create or replace function pg_temp.as_stranger() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"authenticated","email":"fremd@test.local","sub":"00000000-0000-0000-0000-000000000002"}', true);
$$;
create or replace function pg_temp.as_system() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);   -- wie pg_cron: kein Login
$$;
create or replace function pg_temp.id(p_k text) returns uuid language sql as $$ select id from t_ids where k = p_k $$;

-- ---------------------------------------------------------------
-- 1) Gruppen-Code
-- ---------------------------------------------------------------
do $$
begin
  perform pg_temp.as_anon();
  assert check_code('TEST-CODE'), 'Code sollte gültig sein';
  assert check_code('  test-code '), 'Code sollte unabhängig von Groß-/Kleinschreibung und Leerzeichen gelten';
  assert not check_code('FALSCH'), 'Falscher Code darf nicht gelten';
  assert not check_code(''), 'Leerer Code darf nicht gelten';
  begin
    perform get_board('FALSCH', null);
    raise exception 'get_board mit falschem Code hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%BAD_CODE%', 'Erwartet BAD_CODE, bekommen: ' || sqlerrm;
  end;
  -- Fremder Login ist kein Admin
  perform pg_temp.as_stranger();
  assert not is_admin(), 'Fremde Mail darf kein Admin sein';
  begin
    perform admin_set_group_code('HACK');
    raise exception 'Fremder hätte den Code nicht ändern dürfen';
  exception when others then
    assert sqlerrm like '%NOT_ADMIN%', 'Erwartet NOT_ADMIN, bekommen: ' || sqlerrm;
  end;
  perform pg_temp.as_admin();
  assert is_admin(), 'Admin-Mail sollte Admin sein';
  raise notice 'OK 1: Gruppen-Code und Admin-Prüfung';
end $$;

-- ---------------------------------------------------------------
-- 2) Namen
-- ---------------------------------------------------------------
do $$
declare v uuid;
begin
  perform pg_temp.as_anon();
  insert into t_ids values ('A', add_member('TEST-CODE', 'Test Anna'));
  insert into t_ids values ('B', add_member('TEST-CODE', 'Test Bernd'));
  insert into t_ids values ('C', add_member('TEST-CODE', 'Test Chris'));
  insert into t_ids values ('D', add_member('TEST-CODE', '  Test   Doris '));
  assert (select name from members where id = pg_temp.id('D')) = 'Test Doris', 'Name sollte getrimmt sein';
  begin
    v := add_member('TEST-CODE', 'test anna');
    raise exception 'Doppelter Name hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%NAME_TAKEN%', 'Erwartet NAME_TAKEN, bekommen: ' || sqlerrm;
  end;
  begin
    v := add_member('TEST-CODE', 'X');
    raise exception 'Zu kurzer Name hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%NAME_INVALID%', 'Erwartet NAME_INVALID, bekommen: ' || sqlerrm;
  end;
  raise notice 'OK 2: Namen anlegen';
end $$;

-- ---------------------------------------------------------------
-- 3) Zusagen + Warteliste
-- ---------------------------------------------------------------
do $$
declare r jsonb; e uuid;
begin
  perform pg_temp.as_admin();
  e := admin_save_event(jsonb_build_object('title', 'Test-WOD', 'starts_at', now() + interval '3 days', 'capacity', 2, 'workout', '21-15-9'));
  insert into t_ids values ('E1', e);

  perform pg_temp.as_anon();
  r := set_rsvp('TEST-CODE', e, pg_temp.id('A'), 'yes');
  assert r->>'status' = 'yes', 'A sollte dabei sein';
  r := set_rsvp('TEST-CODE', e, pg_temp.id('B'), 'yes');
  assert r->>'status' = 'yes', 'B sollte dabei sein';
  r := set_rsvp('TEST-CODE', e, pg_temp.id('C'), 'yes');
  assert r->>'status' = 'waitlist' and (r->>'waitlist_pos')::int = 1, 'C sollte Platz 1 der Warteliste sein: ' || r::text;
  update rsvps set status_since = status_since - interval '1 minute' where event_id = e and member_id = pg_temp.id('C');
  r := set_rsvp('TEST-CODE', e, pg_temp.id('D'), 'yes');
  assert r->>'status' = 'waitlist' and (r->>'waitlist_pos')::int = 2, 'D sollte Platz 2 der Warteliste sein: ' || r::text;

  -- Nochmal "yes" auf der Warteliste behält den Platz
  r := set_rsvp('TEST-CODE', e, pg_temp.id('C'), 'yes');
  assert r->>'status' = 'waitlist' and (r->>'waitlist_pos')::int = 1, 'C sollte Platz 1 behalten';

  -- B sagt ab → C rückt nach
  r := set_rsvp('TEST-CODE', e, pg_temp.id('B'), 'no');
  assert r->>'status' = 'no', 'B sollte abgesagt sein';
  assert (select status from rsvps where event_id = e and member_id = pg_temp.id('C')) = 'yes', 'C hätte nachrücken müssen';
  assert (select not promotion_seen and promoted_at is not null from rsvps where event_id = e and member_id = pg_temp.id('C')),
    'C sollte das Nachrück-Banner sehen';
  assert jsonb_array_length(get_board('TEST-CODE', pg_temp.id('C'))->'promotions') = 1, 'Board sollte die Promotion für C liefern';
  perform ack_promotion('TEST-CODE', e, pg_temp.id('C'));
  assert jsonb_array_length(get_board('TEST-CODE', pg_temp.id('C'))->'promotions') = 0, 'Promotion sollte quittiert sein';
  assert (select status from rsvps where event_id = e and member_id = pg_temp.id('D')) = 'waitlist', 'D bleibt auf der Warteliste';
  assert (event_json(e, pg_temp.id('D'))->>'my_waitlist_pos')::int = 1, 'D ist jetzt Platz 1';

  -- Admin erhöht das Limit → D rückt nach
  perform pg_temp.as_admin();
  perform admin_set_capacity(e, 3);
  assert (select status from rsvps where event_id = e and member_id = pg_temp.id('D')) = 'yes', 'D hätte nach Limit-Erhöhung nachrücken müssen';
  assert (select count(*) from rsvps where event_id = e and status = 'yes') = 3, 'Genau 3 Zusagen erwartet';

  -- Abgesagter Termin: keine Zusagen mehr
  perform admin_set_event_status(e, 'cancelled');
  perform pg_temp.as_anon();
  begin
    r := set_rsvp('TEST-CODE', e, pg_temp.id('B'), 'yes');
    raise exception 'Zusage auf abgesagten Termin hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%CANCELLED%', 'Erwartet CANCELLED, bekommen: ' || sqlerrm;
  end;

  -- Begonnener Termin: gesperrt
  perform pg_temp.as_admin();
  e := admin_save_event(jsonb_build_object('title', 'Vorbei', 'starts_at', now() - interval '1 hour'));
  perform pg_temp.as_anon();
  begin
    r := set_rsvp('TEST-CODE', e, pg_temp.id('A'), 'yes');
    raise exception 'Zusage nach Beginn hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%LOCKED%', 'Erwartet LOCKED, bekommen: ' || sqlerrm;
  end;
  raise notice 'OK 3: Zusagen und Warteliste';
end $$;

-- ---------------------------------------------------------------
-- 4) Workout-Voting
-- ---------------------------------------------------------------
do $$
declare e uuid; e2 uuid; x uuid; y uuid; w uuid; r jsonb;
begin
  perform pg_temp.as_admin();
  e := admin_save_event(jsonb_build_object(
    'title', 'Voting-Test', 'starts_at', now() + interval '5 days', 'workout_mode', 'vote',
    'vote_deadline', now() + interval '1 day',
    'options', jsonb_build_array(
      jsonb_build_object('label', 'Chipper', 'workout', '100 Wall Balls'),
      jsonb_build_object('label', 'Sprint', 'workout', '10x 200 m Run'))));
  select id into x from workout_options where event_id = e and label = 'Chipper';
  select id into y from workout_options where event_id = e and label = 'Sprint';

  perform pg_temp.as_anon();
  perform vote_workout('TEST-CODE', e, pg_temp.id('A'), x);
  perform vote_workout('TEST-CODE', e, pg_temp.id('B'), y);
  perform vote_workout('TEST-CODE', e, pg_temp.id('B'), x);   -- umentschieden
  perform vote_workout('TEST-CODE', e, pg_temp.id('C'), y);
  r := event_json(e, pg_temp.id('B'));
  assert (r->>'my_vote')::uuid = x, 'B sollte für Chipper gestimmt haben';
  assert (select count(*) from workout_votes where event_id = e) = 3, 'Eine Stimme pro Person';

  -- Fremde Option wird abgelehnt
  begin
    perform vote_workout('TEST-CODE', e, pg_temp.id('D'), gen_random_uuid());
    raise exception 'Fremde Option hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%INVALID%', 'Erwartet INVALID, bekommen: ' || sqlerrm;
  end;

  -- Deadline vorbei → Cron schließt ab
  update events set vote_deadline = now() - interval '1 minute' where id = e;
  perform pg_temp.as_system();
  perform auto_close_votes();
  perform pg_temp.as_anon();
  assert (select vote_closed and workout_mode = 'fixed' and workout = '100 Wall Balls' from events where id = e),
    'Voting hätte mit Chipper abgeschlossen werden müssen';

  -- Gleichstand bleibt offen
  perform pg_temp.as_admin();
  e2 := admin_save_event(jsonb_build_object(
    'title', 'Gleichstand', 'starts_at', now() + interval '5 days', 'workout_mode', 'vote',
    'vote_deadline', now() + interval '1 day',
    'options', jsonb_build_array(
      jsonb_build_object('label', 'X', 'workout', 'Workout X'),
      jsonb_build_object('label', 'Y', 'workout', 'Workout Y'))));
  select id into x from workout_options where event_id = e2 and label = 'X';
  select id into y from workout_options where event_id = e2 and label = 'Y';
  perform pg_temp.as_anon();
  perform vote_workout('TEST-CODE', e2, pg_temp.id('A'), x);
  perform vote_workout('TEST-CODE', e2, pg_temp.id('B'), y);
  update events set vote_deadline = now() - interval '1 minute' where id = e2;
  perform pg_temp.as_system();
  perform auto_close_votes();
  perform pg_temp.as_anon();
  assert (select not vote_closed from events where id = e2), 'Bei Gleichstand muss das Voting offen bleiben';
  begin
    perform vote_workout('TEST-CODE', e2, pg_temp.id('C'), x);
    raise exception 'Stimme nach Deadline hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%VOTE_CLOSED%', 'Erwartet VOTE_CLOSED, bekommen: ' || sqlerrm;
  end;
  perform pg_temp.as_admin();
  begin
    w := admin_close_vote(e2, null);
    raise exception 'admin_close_vote ohne Sieger hätte TIE liefern müssen';
  exception when others then
    assert sqlerrm like '%TIE%', 'Erwartet TIE, bekommen: ' || sqlerrm;
  end;
  w := admin_close_vote(e2, y);
  assert w = y and (select workout from events where id = e2) = 'Workout Y', 'Admin-Sieger Y erwartet';
  raise notice 'OK 4: Workout-Voting';
end $$;

-- ---------------------------------------------------------------
-- 5) Terminfindung
-- ---------------------------------------------------------------
do $$
declare p uuid; o1 uuid; o2 uuid; r jsonb; e uuid;
begin
  perform pg_temp.as_admin();
  p := admin_save_poll(jsonb_build_object('title', 'KW-Test', 'options', jsonb_build_array(
    jsonb_build_object('starts_at', now() + interval '10 days'),
    jsonb_build_object('starts_at', now() + interval '11 days'))));
  select id into o1 from date_poll_options where poll_id = p order by starts_at limit 1;
  select id into o2 from date_poll_options where poll_id = p order by starts_at desc limit 1;

  perform pg_temp.as_anon();
  perform answer_date_poll('TEST-CODE', p, pg_temp.id('A'), array[o1, o2]);
  perform answer_date_poll('TEST-CODE', p, pg_temp.id('B'), array[o1]);
  r := answer_date_poll('TEST-CODE', p, pg_temp.id('A'), array[o2]);  -- ersetzt
  assert jsonb_array_length(r->'my') = 1, 'Antworten von A sollten ersetzt werden';
  assert jsonb_array_length(r->'people') = 2, 'Zwei Personen in der Matrix';

  perform pg_temp.as_admin();
  e := admin_poll_to_event(o1, jsonb_build_object('title', 'Aus Umfrage', 'starts_at', now() + interval '10 days'), true);
  assert (select closed and event_id = e from date_polls where id = p), 'Umfrage sollte geschlossen und verknüpft sein';
  assert (select status from rsvps where event_id = e and member_id = pg_temp.id('B')) = 'maybe', 'B sollte vorab "vielleicht" haben';
  assert not exists (select 1 from rsvps where event_id = e and member_id = pg_temp.id('A')), 'A hat o1 nicht gewählt';

  perform pg_temp.as_anon();
  begin
    perform answer_date_poll('TEST-CODE', p, pg_temp.id('C'), array[o1]);
    raise exception 'Antwort auf geschlossene Umfrage hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%POLL_CLOSED%', 'Erwartet POLL_CLOSED, bekommen: ' || sqlerrm;
  end;
  raise notice 'OK 5: Terminfindung';
end $$;

-- ---------------------------------------------------------------
-- 6) Serie über die Sommerzeit-Umstellung (28.3.2027)
-- ---------------------------------------------------------------
do $$
declare s uuid; n int; n2 int; bad int;
begin
  insert into series (title, weekday, start_time, duration_min, starts_on)
  values ('Test-Serie So', 7, '09:00', 90, date '2027-03-01') returning id into s;
  n := generate_series_events_from(date '2027-03-10', 6);   -- 14.3. bis 21.4.2027
  assert n >= 5, 'Mindestens 5 Sonntage erwartet, bekommen: ' || n;
  select count(*) into bad from events
    where series_id = s and to_char(starts_at at time zone 'Europe/Vienna', 'HH24:MI') <> '09:00';
  assert bad = 0, 'Alle Serientermine müssen um 09:00 Wiener Zeit sein';
  assert exists (select 1 from events where series_id = s and starts_at = timestamptz '2027-03-21 08:00+00'), 'Winterzeit: 09:00 = 08:00 UTC';
  assert exists (select 1 from events where series_id = s and starts_at = timestamptz '2027-03-28 07:00+00'), 'Sommerzeit: 09:00 = 07:00 UTC';
  n2 := generate_series_events_from(date '2027-03-10', 6);
  assert n2 = 0, 'Zweiter Lauf darf nichts doppelt anlegen';
  -- Verschobener Termin wird nicht neu angelegt
  update events set starts_at = starts_at + interval '1 hour' where series_id = s and starts_at = timestamptz '2027-03-21 08:00+00';
  n2 := generate_series_events_from(date '2027-03-10', 6);
  assert n2 = 0, 'Verschobener Serientermin darf nicht doppelt entstehen';
  raise notice 'OK 6: Serie inkl. Sommerzeit';
end $$;

-- ---------------------------------------------------------------
-- 7) Namen zusammenführen
-- ---------------------------------------------------------------
do $$
declare e uuid;
begin
  e := pg_temp.id('E1');
  perform pg_temp.as_admin();
  -- D und A haben beide Zusagen auf E1; D hat zusätzlich Stimmen
  perform admin_merge_members(pg_temp.id('D'), pg_temp.id('A'));
  assert (select not active from members where id = pg_temp.id('D')), 'D sollte deaktiviert sein';
  assert not exists (select 1 from rsvps where member_id = pg_temp.id('D')), 'D darf keine Zusagen mehr haben';
  assert not exists (select 1 from workout_votes where member_id = pg_temp.id('D')), 'D darf keine Stimmen mehr haben';
  assert (select count(*) from rsvps where event_id = e and member_id = pg_temp.id('A')) = 1, 'A behält genau einen Eintrag';
  raise notice 'OK 7: Namen zusammenführen';
end $$;

-- ---------------------------------------------------------------
-- 8) Anon hat keinen direkten Tabellenzugriff
-- ---------------------------------------------------------------
do $$
begin
  assert not has_table_privilege('anon', 'events', 'select'), 'anon darf events nicht direkt lesen';
  assert not has_table_privilege('anon', 'app_settings', 'select'), 'anon darf app_settings nicht lesen';
  assert not has_column_privilege('authenticated', 'app_settings', 'group_code_hash', 'select'), 'Hash darf nicht lesbar sein';
  assert not has_function_privilege('anon', 'admin_save_event(jsonb)', 'execute'), 'anon darf keine Admin-Funktion ausführen';
  assert not has_function_privilege('anon', 'promote_waitlist(uuid)', 'execute'), 'anon darf keine internen Helfer ausführen';
  assert has_function_privilege('anon', 'get_board(text,uuid)', 'execute'), 'anon muss get_board ausführen dürfen';
  raise notice 'OK 8: Rechte';
end $$;

-- ---------------------------------------------------------------
-- 9) Workout-Datenbank: Tags und Filter (setzt Migration 005 voraus)
-- ---------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform pg_temp.as_system();
  insert into workout_templates (title, workout, tags) values
    ('Test Hero WOD', 'For Time: 100 Burpees', array['Hero','Test-Tag']),
    ('Test Partner WOD', 'AMRAP 10: 10 Wall Balls', array['Partner']);
  perform pg_temp.as_anon();
  r := search_workouts('TEST-CODE', '', 'test-tag');
  assert jsonb_array_length(r) = 1 and r->0->>'title' = 'Test Hero WOD', 'Tag-Filter sollte genau ein Workout liefern: ' || r::text;
  assert r->0->'tags' ? 'Hero', 'Tags sollten im Ergebnis stehen';
  r := search_workouts('TEST-CODE', 'Test-Tag', null);
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'title' = 'Test Hero WOD'), 'Suche sollte auch Tags treffen';
  begin
    perform search_workouts('FALSCH', '', null);
    raise exception 'search_workouts mit falschem Code hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%BAD_CODE%', 'Erwartet BAD_CODE, bekommen: ' || sqlerrm;
  end;
  raise notice 'OK 9: Workout-Datenbank';
end $$;

-- ---------------------------------------------------------------
-- 10) Workout-Datenbank für Teilnehmer (setzt Migration 006 voraus)
-- ---------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform pg_temp.as_system();
  insert into workout_templates (title, workout, tags, notes) values
    ('Test Freunde WOD', 'EMOM 10: 5 Burpees', array['Test-Freunde'], 'Notiz für alle');
  perform pg_temp.as_anon();
  r := list_workouts('TEST-CODE');
  assert exists (select 1 from jsonb_array_elements(r) x
                 where x->>'title' = 'Test Freunde WOD' and x->>'notes' = 'Notiz für alle' and x->'tags' ? 'Test-Freunde'),
    'list_workouts sollte das Workout mit Tags und Notiz liefern';
  begin
    perform list_workouts('FALSCH');
    raise exception 'list_workouts mit falschem Code hätte scheitern müssen';
  exception when others then
    assert sqlerrm like '%BAD_CODE%', 'Erwartet BAD_CODE, bekommen: ' || sqlerrm;
  end;
  raise notice 'OK 10: Workouts für Teilnehmer';
end $$;

-- ---------------------------------------------------------------
-- 11) Fotos (setzt Migration 007 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; fut uuid; old uuid; a uuid; b uuid; r jsonb; tk jsonb; p text; pid uuid; names text[];
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Foto Anna') returning id into a;
  insert into members (name) values ('Foto Bernd') returning id into b;
  insert into events (title, starts_at) values ('Foto-Training', now() - interval '2 hours') returning id into ev;
  insert into events (title, starts_at) values ('Zukunft', now() + interval '1 day') returning id into fut;
  insert into events (title, starts_at) values ('Alt', now() - interval '8 days') returning id into old;
  insert into rsvps (event_id, member_id, status) values (ev, a, 'yes'), (ev, b, 'no'), (fut, a, 'yes'), (old, a, 'yes');

  perform pg_temp.as_anon();
  tk := photo_ticket('TEST-CODE', ev, a);
  p := tk->>'prefix';
  assert p like ev::text || '/%/', 'Prefix sollte mit der Termin-ID beginnen: ' || p;
  assert photo_path_ok(p || gen_random_uuid() || '.jpg'), 'Pfad mit gültigem Ticket sollte erlaubt sein';
  assert not photo_path_ok(fut::text || '/' || (tk->>'ticket') || '/' || gen_random_uuid() || '.jpg'), 'Fremder Termin im Pfad darf nicht gehen';
  assert not photo_path_ok(p || '../x.jpg'), 'Komische Pfade dürfen nicht gehen';

  pid := add_photo('TEST-CODE', a, p || '11111111-1111-1111-1111-111111111111.jpg', p || '11111111-1111-1111-1111-111111111111_t.jpg', 2000, 1500);
  assert pid is not null, 'Foto sollte eingetragen sein';

  r := get_event_photos('TEST-CODE', ev, a);
  assert r->>'access' = 'yes' and jsonb_array_length(r->'photos') = 1 and (r->'photos'->0->>'mine')::boolean, 'Teilnehmer sieht sein Foto: ' || r::text;
  r := get_event_photos('TEST-CODE', ev, b);
  assert r->>'access' = 'not_participant' and jsonb_array_length(r->'photos') = 0 and (r->>'count')::int = 1, 'Nicht-Teilnehmer sieht nur die Anzahl: ' || r::text;

  begin
    perform photo_ticket('TEST-CODE', ev, b);
    raise exception 'Nicht-Teilnehmer hätte kein Ticket bekommen dürfen';
  exception when others then assert sqlerrm like '%PHOTOS_NOT_PARTICIPANT%', sqlerrm; end;
  begin
    perform photo_ticket('TEST-CODE', fut, a);
    raise exception 'Vor dem Training hätte es kein Ticket geben dürfen';
  exception when others then assert sqlerrm like '%PHOTOS_EARLY%', sqlerrm; end;
  begin
    perform photo_ticket('TEST-CODE', old, a);
    raise exception 'Nach 7 Tagen hätte es kein Ticket geben dürfen';
  exception when others then assert sqlerrm like '%PHOTOS_EXPIRED%', sqlerrm; end;
  begin
    perform add_photo('TEST-CODE', b, p || '22222222-2222-2222-2222-222222222222.jpg', p || '22222222-2222-2222-2222-222222222222_t.jpg', 1, 1);
    raise exception 'Fremdes Ticket hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_TICKET%', sqlerrm; end;

  r := recent_photo_events('TEST-CODE', a);
  assert exists (select 1 from jsonb_array_elements(r) x where (x->>'id')::uuid = ev and (x->>'count')::int = 1), 'Board-Hinweis sollte das Training zeigen: ' || r::text;
  assert not exists (select 1 from jsonb_array_elements(r) x where (x->>'id')::uuid in (fut, old)), 'Zukunft und Alt gehören nicht in den Hinweis';

  begin
    perform delete_photo('TEST-CODE', b, pid);
    raise exception 'Fremdes Foto löschen hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%NOT_FOUND%', sqlerrm; end;

  -- Aufräumen: altes Foto + Datei, gelöschtes Foto, verwaiste Datei
  perform pg_temp.as_system();
  insert into event_photos (event_id, member_id, path, thumb_path) values (old, a, old || '/x/alt.jpg', old || '/x/alt_t.jpg');
  insert into storage.objects (bucket_id, name, created_at) values
    ('photos', p || '11111111-1111-1111-1111-111111111111.jpg', now() - interval '2 hours'),
    ('photos', p || '11111111-1111-1111-1111-111111111111_t.jpg', now() - interval '2 hours'),
    ('photos', old || '/x/alt.jpg', now() - interval '8 days'),
    ('photos', p || 'verwaist.jpg', now() - interval '2 hours'),
    ('photos', p || 'frisch.jpg', now());
  names := purge_photos();
  assert old || '/x/alt.jpg' = any(names), 'Alte Datei sollte weg: ' || names::text;
  assert p || 'verwaist.jpg' = any(names), 'Verwaiste Datei sollte weg';
  assert not (p || 'frisch.jpg' = any(names)), 'Gerade hochgeladene Datei darf noch nicht weg';
  assert not (p || '11111111-1111-1111-1111-111111111111.jpg' = any(names)), 'Aktuelles Foto darf nicht weg';
  assert not exists (select 1 from event_photos where event_id = old), 'Eintrag des alten Trainings sollte weg sein';

  perform pg_temp.as_anon();
  perform delete_photo('TEST-CODE', a, pid);
  perform pg_temp.as_system();
  names := purge_photos();
  assert p || '11111111-1111-1111-1111-111111111111.jpg' = any(names), 'Gelöschtes Foto sollte beim Aufräumen weg';
  raise notice 'OK 11: Fotos';
end $$;

-- ---------------------------------------------------------------
-- 12) Admin automatisch dabei (setzt Migration 008 voraus)
-- ---------------------------------------------------------------
do $$
declare me uuid; ev uuid; ser uuid; sev uuid;
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Admin Selbst') returning id into me;
  update app_settings set admin_member_id = me, auto_join_series = false where id = 1;
  perform pg_temp.as_admin();
  ev := admin_save_event(jsonb_build_object('title', 'Auto-Join', 'starts_at', now() + interval '3 days'));
  assert exists (select 1 from rsvps where event_id = ev and member_id = me and status = 'yes'), 'Admin sollte bei neuem Termin dabei sein';
  -- Bearbeiten ändert nichts an einer Absage
  perform admin_set_rsvp(ev, me, 'no');
  perform admin_save_event(jsonb_build_object('id', ev, 'title', 'Auto-Join 2', 'starts_at', now() + interval '3 days'));
  assert (select status from rsvps where event_id = ev and member_id = me) = 'no', 'Bearbeiten darf die Absage nicht überschreiben';
  -- Serien-Termin: nur mit auto_join_series
  perform pg_temp.as_system();
  insert into series (title, weekday, start_time, starts_on) values ('Auto-Serie', 3, '18:00', current_date) returning id into ser;
  insert into events (title, starts_at, series_id, series_slot) values ('Serie 1', now() + interval '4 days', ser, now() + interval '4 days') returning id into sev;
  assert not exists (select 1 from rsvps where event_id = sev and member_id = me), 'Serie ohne Häkchen: nicht automatisch dabei';
  update app_settings set auto_join_series = true where id = 1;
  insert into events (title, starts_at, series_id, series_slot) values ('Serie 2', now() + interval '11 days', ser, now() + interval '11 days') returning id into sev;
  assert exists (select 1 from rsvps where event_id = sev and member_id = me and status = 'yes'), 'Serie mit Häkchen: automatisch dabei';
  update app_settings set admin_member_id = null, auto_join_series = false where id = 1;
  raise notice 'OK 12: Admin automatisch dabei';
end $$;

-- ---------------------------------------------------------------
-- 13) Videos (setzt Migration 009 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; a uuid; tk jsonb; p text; r jsonb; i int; vid text;
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Video Vera') returning id into a;
  insert into events (title, starts_at) values ('Video-Training', now() - interval '1 hour') returning id into ev;
  insert into rsvps (event_id, member_id, status) values (ev, a, 'yes');
  perform pg_temp.as_anon();
  tk := photo_ticket('TEST-CODE', ev, a);
  p := tk->>'prefix';
  assert (tk->>'left_videos')::int = 3, 'Anfangs 3 Videos frei: ' || tk::text;
  assert photo_path_ok(p || gen_random_uuid() || '.mov'), '.mov sollte erlaubt sein';
  assert photo_path_ok(p || gen_random_uuid() || '.mp4'), '.mp4 sollte erlaubt sein';
  assert not photo_path_ok(p || gen_random_uuid() || '.exe'), '.exe darf nicht';
  for i in 1..3 loop
    vid := gen_random_uuid()::text;
    perform add_media('TEST-CODE', a, p || vid || '.mov', p || vid || '_t.jpg', 1920, 1080, 'video', 20 + i);
  end loop;
  begin
    vid := gen_random_uuid()::text;
    perform add_media('TEST-CODE', a, p || vid || '.mp4', p || vid || '_t.jpg', 1920, 1080, 'video', 5);
    raise exception 'Viertes Video hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%VIDEO_LIMIT%', sqlerrm; end;
  begin
    vid := gen_random_uuid()::text;
    perform add_media('TEST-CODE', a, p || vid || '.jpg', p || vid || '_t.jpg', 1, 1, 'video', 5);
    raise exception 'Video mit .jpg hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_TICKET%', sqlerrm; end;
  -- Fotos gehen weiter, auch über die alte Funktion
  vid := gen_random_uuid()::text;
  perform add_photo('TEST-CODE', a, p || vid || '.jpg', p || vid || '_t.jpg', 2000, 1500);
  r := get_event_photos('TEST-CODE', ev, a);
  assert jsonb_array_length(r->'photos') = 4, 'Drei Videos + ein Foto: ' || r::text;
  assert (select count(*) from jsonb_array_elements(r->'photos') x where x->>'kind' = 'video' and (x->>'duration_s')::int > 20) = 3, 'Videos mit Dauer';
  tk := photo_ticket('TEST-CODE', ev, a);
  assert (tk->>'left_videos')::int = 0 and (tk->>'left')::int = 19, 'Restplätze stimmen: ' || tk::text;
  raise notice 'OK 13: Videos';
end $$;

-- ---------------------------------------------------------------
-- 14) Fotos im Original + Ansichts-Version (setzt Migration 010 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; a uuid; tk jsonb; p text; fid text; r jsonb; names text[];
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Original Olga') returning id into a;
  insert into events (title, starts_at) values ('Original-Training', now() - interval '1 hour') returning id into ev;
  insert into rsvps (event_id, member_id, status) values (ev, a, 'yes');
  perform pg_temp.as_anon();
  tk := photo_ticket('TEST-CODE', ev, a);
  p := tk->>'prefix';
  fid := gen_random_uuid()::text;
  assert photo_path_ok(p || fid || '_m.jpg'), '_m.jpg sollte erlaubt sein';
  perform add_media('TEST-CODE', a, p || fid || '.jpg', p || fid || '_t.jpg', 4032, 3024, 'photo', null, p || fid || '_m.jpg');
  r := get_event_photos('TEST-CODE', ev, a);
  assert r->'photos'->0->>'display_path' = p || fid || '_m.jpg', 'Ansichts-Version im Ergebnis: ' || r::text;
  begin
    perform add_media('TEST-CODE', a, p || gen_random_uuid() || '.jpg', p || gen_random_uuid() || '_t.jpg', 1, 1, 'photo', null, 'fremd/pfad_m.jpg');
    raise exception 'Fremder Ansichts-Pfad hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_TICKET%', sqlerrm; end;
  perform pg_temp.as_system();
  insert into storage.objects (bucket_id, name, created_at) values ('photos', p || fid || '_m.jpg', now() - interval '2 hours');
  names := purge_photos();
  assert not (p || fid || '_m.jpg' = any(names)), 'Ansichts-Version darf beim Aufräumen nicht weg';
  raise notice 'OK 14: Fotos im Original';
end $$;

-- ---------------------------------------------------------------
-- 15) Ergebnisse (setzt Migration 011 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; ev2 uuid; fut uuid; a uuid; b uuid; r jsonb;
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Ergebnis Erna') returning id into a;
  insert into members (name) values ('Ergebnis Emil') returning id into b;
  insert into events (title, starts_at, workout) values ('Fran alt', now() - interval '30 days', 'For Time, 21-15-9:
Thruster
Pull-Ups') returning id into ev2;
  insert into events (title, starts_at, workout) values ('Fran', now() - interval '1 hour', 'for time,  21-15-9:
thruster
pull-ups') returning id into ev;
  insert into events (title, starts_at, workout) values ('Später', now() + interval '1 day', 'x') returning id into fut;
  perform pg_temp.as_anon();
  perform save_result('TEST-CODE', ev2, a, 'time', 400, '6:40', 'scaled', null);
  r := save_result('TEST-CODE', ev, a, 'time', 355, '5:55', 'rx', 'mit 30 kg');
  assert jsonb_array_length(r->'list') = 1 and (r->>'open')::boolean, 'Eigenes Ergebnis: ' || r::text;
  assert jsonb_array_length(r->'history') = 1 and r->'history'->0->>'text' = '6:40', 'Verlauf beim gleichen Workout: ' || r::text;
  -- nochmal speichern ersetzt
  r := save_result('TEST-CODE', ev, a, 'time', 350, '5:50', 'rx', '');
  assert jsonb_array_length(r->'list') = 1 and r->'list'->0->>'text' = '5:50' and r->'list'->0->'note' = 'null'::jsonb, 'Ersetzt: ' || r::text;
  perform save_result('TEST-CODE', ev, b, 'other', 999, 'Nicht fertig', 'beginner', null);
  r := get_results('TEST-CODE', ev, b);
  assert jsonb_array_length(r->'list') = 2, 'Zwei Ergebnisse';
  assert (select x->'value' from jsonb_array_elements(r->'list') x where x->>'kind' = 'other') = 'null'::jsonb, 'other ohne Wert';
  assert (event_json(ev, a)->>'result_count')::int = 2 and event_json(ev, a)->>'my_result' = '5:50', 'event_json: ' || event_json(ev, a)::text;
  assert jsonb_array_length(workout_results('TEST-CODE', 'For Time, 21-15-9:
Thruster
Pull-Ups', a)) = 3, 'Workout-Seite findet alle drei';
  begin
    perform save_result('TEST-CODE', fut, a, 'time', 1, '0:01', 'rx', null);
    raise exception 'Ergebnis vor Beginn hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%RESULTS_EARLY%', sqlerrm; end;
  begin
    perform save_result('TEST-CODE', ev, a, 'time', null, '5:00', 'rx', null);
    raise exception 'Zeit ohne Wert hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%INVALID%', sqlerrm; end;
  begin
    perform save_result('TEST-CODE', ev, a, 'time', 300, '5:00', 'pro', null);
    raise exception 'Unbekannte Stufe hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%INVALID%', sqlerrm; end;
  begin
    perform save_result('FALSCH', ev, a, 'time', 300, '5:00', 'rx', null);
    raise exception 'Falscher Code hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_CODE%', sqlerrm; end;
  r := delete_result('TEST-CODE', ev, a);
  assert jsonb_array_length(r->'list') = 1, 'Gelöscht';
  raise notice 'OK 15: Ergebnisse';
end $$;

-- ---------------------------------------------------------------
-- 16) Kalender-Abo (setzt Migration 011 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; ev2 uuid; a uuid; tok uuid; ics text;
begin
  perform pg_temp.as_system();
  insert into members (name) values ('Kalender Karl') returning id into a;
  insert into events (title, starts_at, workout, note) values ('Kalender, Test; Eins', now() + interval '2 days', 'AMRAP 20:
5 Pull-Ups, 10 Push-Ups', 'Ein sehr langer Hinweis, der deutlich über sechzig Zeichen hinausgeht und deshalb gefaltet werden muss.') returning id into ev;
  insert into events (title, starts_at, status) values ('Abgesagt-Test', now() + interval '3 days', 'cancelled') returning id into ev2;
  insert into rsvps (event_id, member_id, status) values (ev, a, 'yes');
  perform pg_temp.as_anon();
  tok := calendar_token('TEST-CODE');
  assert tok is not null, 'Kalender-Schlüssel';
  begin
    perform calendar_token('FALSCH');
    raise exception 'Schlüssel ohne Code hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_CODE%', sqlerrm; end;
  begin
    perform calendar(gen_random_uuid());
    raise exception 'Falscher Schlüssel hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%BAD_TOKEN%', sqlerrm; end;
  ics := calendar(tok, a);
  assert ics like 'BEGIN:VCALENDAR' || E'\r\n' || 'VERSION:2.0%', 'Kopf: ' || left(ics, 80);
  assert ics like '%END:VCALENDAR' || E'\r\n', 'Ende';
  assert ics like '%UID:' || ev || '@stodlbox%', 'Termin drin';
  assert strpos(ics, 'SUMMARY:✓ Stodlbox: Kalender\, Test\; Eins') > 0, 'Haken + Escaping: ' || ics;
  assert ics like '%Abgesagt: Stodlbox: Abgesagt-Test%' and ics like '%STATUS:CANCELLED%', 'Abgesagt markiert';
  assert ics like '%' || E'\r\n ' || '%', 'Lange Zeilen gefaltet';
  assert (select count(*) from regexp_split_to_table(ics, E'\r\n') l where char_length(l) > 61) = 0, 'Keine Zeile zu lang';
  ics := calendar(tok);
  assert ics not like '%✓%', 'Ohne m kein Haken';
  raise notice 'OK 16: Kalender-Abo';
end $$;

-- ---------------------------------------------------------------
-- 17) Geheime Termine (setzt Migration 013 voraus)
-- ---------------------------------------------------------------
do $$
declare ev uuid; past uuid; a uuid; r jsonb; tok uuid;
begin
  perform pg_temp.as_admin();
  ev := admin_save_event(jsonb_build_object('title', 'Solo Geheim', 'starts_at', now() + interval '1 day', 'workout', 'Geheim-WOD', 'private', true));
  assert (select private from events where id = ev), 'private gespeichert';
  assert exists (select 1 from jsonb_array_elements(get_board(null, null)->'events') x where x->>'id' = ev::text), 'Admin sieht ihn auf dem Board';
  assert (get_event(null, ev, null)->>'private')::boolean, 'Admin sieht private im JSON';
  perform pg_temp.as_system();
  insert into members (name) values ('Neugier Nina') returning id into a;
  insert into events (title, starts_at, workout, private) values ('Solo vorbei', now() - interval '2 hours', 'Geheim-WOD', true) returning id into past;
  insert into rsvps (event_id, member_id, status) values (past, a, 'yes');
  insert into results (event_id, member_id, score_kind, score_value, score_text, scale) values (past, a, 'time', 100, '1:40', 'rx');
  perform pg_temp.as_anon();
  assert not exists (select 1 from jsonb_array_elements(get_board('TEST-CODE', a)->'events') x where x->>'id' in (ev::text, past::text)), 'Freunde sehen ihn nicht auf dem Board';
  assert not exists (select 1 from jsonb_array_elements(get_archive('TEST-CODE')->'items') x where x->>'id' = past::text), 'nicht im Archiv';
  begin perform get_event('TEST-CODE', ev, a); raise exception 'get_event hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%NOT_FOUND%', sqlerrm; end;
  begin perform set_rsvp('TEST-CODE', ev, a, 'yes'); raise exception 'Zusage hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%NOT_FOUND%', sqlerrm; end;
  begin perform get_results('TEST-CODE', past, a); raise exception 'Ergebnisse hätten nicht gehen dürfen';
  exception when others then assert sqlerrm like '%NOT_FOUND%', sqlerrm; end;
  begin perform save_result('TEST-CODE', past, a, 'time', 90, '1:30', 'rx', null); raise exception 'Speichern hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%NOT_FOUND%', sqlerrm; end;
  assert jsonb_array_length(workout_results('TEST-CODE', 'Geheim-WOD', a)) = 0, 'keine Bestwerte aus geheimen Terminen';
  assert not exists (select 1 from jsonb_array_elements(search_workouts('TEST-CODE', 'Geheim')) x where x->>'kind' = 'event'), 'nicht in der Suche';
  assert photo_access(past, a) = 'none', 'keine Fotos';
  assert jsonb_array_length(recent_photo_events('TEST-CODE', a)) = 0 or not exists (select 1 from jsonb_array_elements(recent_photo_events('TEST-CODE', a)) x where x->>'id' = past::text), 'kein Foto-Hinweis';
  tok := calendar_token('TEST-CODE');
  assert strpos(calendar_ics(tok, a), ev::text) = 0 and strpos(calendar_ics(tok, a), past::text) = 0, 'nicht im Kalender-Abo';
  -- Admin darf alles
  perform pg_temp.as_admin();
  r := get_results(null, past, a);
  assert jsonb_array_length(r->'list') = 1, 'Admin sieht Ergebnisse';
  assert jsonb_array_length(workout_results(null, 'Geheim-WOD', a)) = 1, 'Admin sieht Bestwerte';
  -- Wieder öffentlich machen
  perform admin_save_event(jsonb_build_object('id', ev, 'title', 'Solo Geheim', 'starts_at', now() + interval '1 day', 'workout', 'Geheim-WOD', 'private', false));
  perform pg_temp.as_anon();
  assert (get_event('TEST-CODE', ev, a)->>'private')::boolean = false, 'wieder sichtbar';
  raise notice 'OK 17: Geheime Termine';
end $$;

-- ---------------------------------------------------------------
-- 18) Code-Bremse und Upload-Grenze (setzt Migration 014 voraus)
-- ---------------------------------------------------------------
do $$
declare i int; locked boolean := false; ev uuid; a uuid; tk jsonb; p text;
begin
  perform pg_temp.as_anon();
  for i in 1..25 loop
    begin
      perform get_board('RATEN-' || i, null);
    exception when others then
      if sqlerrm like '%TOO_MANY%' then locked := true; exit; end if;
      assert sqlerrm like '%BAD_CODE%', sqlerrm;
    end;
  end loop;
  assert locked, 'Nach 20 Fehlversuchen sollte gesperrt sein';
  begin
    perform check_code('TEST-CODE');
    raise exception 'Gesperrt hätte auch der richtige Code nicht durchgehen dürfen';
  exception when others then assert sqlerrm like '%TOO_MANY%', sqlerrm; end;
  -- Admin ist nie gesperrt
  perform pg_temp.as_admin();
  perform get_board(null, null);
  -- Zähler zurücksetzen
  for i in 0..31 loop execute format('select setval(%L, 0)', 'code_guard_' || i); end loop;
  perform pg_temp.as_anon();
  assert check_code('TEST-CODE'), 'Nach dem Zurücksetzen geht es wieder';

  -- Upload-Grenze
  perform pg_temp.as_system();
  insert into members (name) values ('Upload Ulla') returning id into a;
  insert into events (title, starts_at) values ('Upload-Training', now() - interval '1 hour') returning id into ev;
  insert into rsvps (event_id, member_id, status) values (ev, a, 'yes');
  perform pg_temp.as_anon();
  tk := photo_ticket('TEST-CODE', ev, a);
  p := tk->>'prefix';
  assert photo_path_ok(p || gen_random_uuid() || '.jpg'), 'Erste Datei geht';
  perform pg_temp.as_system();
  insert into storage.objects (bucket_id, name, metadata)
    select 'photos', p || gen_random_uuid() || '.jpg', '{"size": 1000}'::jsonb from generate_series(1, 80);
  perform pg_temp.as_anon();
  assert not photo_path_ok(p || gen_random_uuid() || '.jpg'), 'Nach 80 Dateien ist Schluss';
  perform pg_temp.as_system();
  delete from storage.objects where name like p || '%';
  insert into storage.objects (bucket_id, name, metadata) values ('photos', 'voll/x.jpg', '{"size": 950000000}'::jsonb);
  perform pg_temp.as_anon();
  assert not photo_path_ok(p || gen_random_uuid() || '.jpg'), 'Voller Speicher: kein Upload';
  begin
    perform photo_ticket('TEST-CODE', ev, a);
    raise exception 'Ticket bei vollem Speicher hätte nicht gehen dürfen';
  exception when others then assert sqlerrm like '%STORAGE_FULL%', sqlerrm; end;
  raise notice 'OK 18: Code-Bremse und Upload-Grenze';
end $$;

-- 19: Workout-Titel
do $$
declare e uuid; o uuid; j jsonb;
begin
  perform pg_temp.as_admin();
  e := admin_save_event(jsonb_build_object('title', 'Samstags-WOD', 'starts_at', now() + interval '5 days', 'workout_title', ' Fran ', 'workout', '21-15-9 Thruster, Pull-Ups'));
  j := event_json(e, null);
  assert j->>'title' = 'Samstags-WOD' and j->>'workout_title' = 'Fran', j::text;
  perform admin_save_event(jsonb_build_object('id', e, 'title', 'Samstags-WOD', 'starts_at', now() + interval '5 days', 'workout_title', '', 'workout', 'x'));
  assert event_json(e, null)->>'workout_title' is null, 'Leerer Titel = keiner';
  -- Voting: Sieger-Titel wird übernommen
  e := admin_save_event(jsonb_build_object('title', 'Voting', 'starts_at', now() + interval '6 days', 'workout_mode', 'vote',
        'options', jsonb_build_array(jsonb_build_object('label', 'Grace', 'workout', '30 C&J'), jsonb_build_object('label', 'Isabel', 'workout', '30 Snatch'))));
  select id into o from workout_options where event_id = e and label = 'Isabel';
  perform close_vote_core(e, o);
  assert event_json(e, null)->>'workout_title' = 'Isabel', 'Sieger-Titel';
  raise notice 'OK 19: Workout-Titel';
end $$;

do $$ begin raise notice 'ALLE TESTS OK'; end $$;

rollback;
