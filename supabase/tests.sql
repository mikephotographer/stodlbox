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

do $$ begin raise notice 'ALLE TESTS OK'; end $$;

rollback;
