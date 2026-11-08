-- =====================================================================
-- 005: Workout-Datenbank. Vorlagen bekommen Tags (Gruppen wie Girls,
-- Hero, Hyrox, Partner …) und eine Notiz (Skalierung, Herkunft).
-- Mehrfach ausführbar.
-- =====================================================================

alter table workout_templates add column if not exists tags text[] not null default '{}';
alter table workout_templates add column if not exists notes text;
alter table workout_templates add column if not exists updated_at timestamptz not null default now();
create index if not exists workout_templates_tags_idx on workout_templates using gin (tags);

-- Suche fürs Termin-Formular: jetzt auch nach Tag (p_tag) und mit Tags im Ergebnis
drop function if exists search_workouts(text, text);
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
         and e.workout is not null and btrim(e.workout) <> '' and e.starts_at < now()
         and (e.title ilike q or e.workout ilike q)
       order by e.starts_at desc limit 30)
    ) s), '[]'::jsonb);
end $$;
revoke all on function search_workouts(text, text, text) from public;
grant execute on function search_workouts(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Startpaket: bekannte Benchmark-Workouts. Nur einfügen, wenn es den
-- Titel noch nicht gibt. Gewichte Männer/Frauen.
-- ---------------------------------------------------------------------
insert into workout_templates (title, workout, tags, notes)
select v.title, v.workout, v.tags, v.notes
from (values
  ('Angie', E'For Time:\n100 Pull-Ups\n100 Push-Ups\n100 Sit-Ups\n100 Air Squats', array['Girls','Benchmark','For Time','Bodyweight'], 'Reihenfolge fix, erst alle Pull-Ups, dann weiter.'),
  ('Annie', E'For Time, 50-40-30-20-10:\nDouble-Unders\nSit-Ups', array['Girls','Benchmark','For Time'], null),
  ('Barbara', E'5 Runden For Time:\n20 Pull-Ups\n30 Push-Ups\n40 Sit-Ups\n50 Air Squats\n3 Min. Pause nach jeder Runde', array['Girls','Benchmark','For Time','Bodyweight'], null),
  ('Chelsea', E'EMOM 30 Min.:\n5 Pull-Ups\n10 Push-Ups\n15 Air Squats', array['Girls','Benchmark','EMOM','Bodyweight'], 'Schafft man eine Minute nicht, ist Schluss. Score = Runden.'),
  ('Cindy', E'AMRAP 20 Min.:\n5 Pull-Ups\n10 Push-Ups\n15 Air Squats', array['Girls','Benchmark','AMRAP','Bodyweight'], null),
  ('Diane', E'For Time, 21-15-9:\nDeadlift (102/70 kg)\nHandstand Push-Ups', array['Girls','Benchmark','For Time'], null),
  ('Elizabeth', E'For Time, 21-15-9:\nSquat Clean (61/43 kg)\nRing Dips', array['Girls','Benchmark','For Time'], null),
  ('Fran', E'For Time, 21-15-9:\nThruster (43/30 kg)\nPull-Ups', array['Girls','Benchmark','For Time'], null),
  ('Grace', E'For Time:\n30 Clean & Jerk (61/43 kg)', array['Girls','Benchmark','For Time','Kraft'], null),
  ('Helen', E'3 Runden For Time:\n400 m Run\n21 Kettlebell Swings (24/16 kg)\n12 Pull-Ups', array['Girls','Benchmark','For Time'], null),
  ('Isabel', E'For Time:\n30 Snatch (61/43 kg)', array['Girls','Benchmark','For Time','Kraft'], null),
  ('Jackie', E'For Time:\n1000 m Row\n50 Thruster (20/15 kg)\n30 Pull-Ups', array['Girls','Benchmark','For Time'], null),
  ('Karen', E'For Time:\n150 Wall Balls (9/6 kg)', array['Girls','Benchmark','For Time'], null),
  ('Kelly', E'5 Runden For Time:\n400 m Run\n30 Box Jumps (60/50 cm)\n30 Wall Balls (9/6 kg)', array['Girls','Benchmark','For Time'], null),
  ('Nancy', E'5 Runden For Time:\n400 m Run\n15 Overhead Squats (43/30 kg)', array['Girls','Benchmark','For Time'], null),
  ('Murph', E'For Time:\n1,6 km Run\n100 Pull-Ups\n200 Push-Ups\n300 Air Squats\n1,6 km Run\nmit Weste (9/6 kg)', array['Hero','Benchmark','For Time'], 'Pull-Ups, Push-Ups und Squats dürfen aufgeteilt werden, z. B. 20 Runden 5-10-15.'),
  ('DT', E'5 Runden For Time:\n12 Deadlifts\n9 Hang Power Cleans\n6 Push Jerks\n(70/47 kg)', array['Hero','Benchmark','For Time','Kraft'], null),
  ('JT', E'For Time, 21-15-9:\nHandstand Push-Ups\nRing Dips\nPush-Ups', array['Hero','Benchmark','For Time','Bodyweight'], null),
  ('Michael', E'3 Runden For Time:\n800 m Run\n50 Back Extensions\n50 Sit-Ups', array['Hero','Benchmark','For Time'], null),
  ('Nate', E'AMRAP 20 Min.:\n2 Muscle-Ups\n4 Handstand Push-Ups\n8 Kettlebell Swings (32/24 kg)', array['Hero','Benchmark','AMRAP'], null),
  ('HYROX-Simulation', E'For Time:\n8 × 1 km Run, nach jedem Lauf eine Station:\n1000 m SkiErg\n50 m Sled Push\n50 m Sled Pull\n80 m Burpee Broad Jumps\n1000 m Row\n200 m Farmers Carry (2 × 24/16 kg)\n100 m Sandbag Lunges (20/10 kg)\n100 Wall Balls (6/4 kg)', array['Hyrox','For Time'], 'Fehlt Gerät: SkiErg/Row durch 1000 m Bike ersetzen, Sled durch Prowler oder schwere Bear Crawls.'),
  ('HYROX-Sim Light', E'4 Runden:\n1 km Run\n20 Wall Balls\n15 Toes-to-Bar\n50 m Sled Push', array['Hyrox'], null),
  ('Partner-Chipper', E'Zu zweit For Time, Arbeit beliebig aufteilen:\n100 Wall Balls\n80 Kettlebell Swings\n60 Burpees\n40 Box Jumps\n20 Pull-Ups\nEine Person arbeitet, die andere hält Plank.', array['Partner','For Time'], null),
  ('Ich-du-Runden', E'Zu zweit AMRAP 20 Min., abwechselnd ganze Runden:\n10 Thruster (40/30 kg)\n10 Burpees over Bar', array['Partner','AMRAP'], null)
) as v(title, workout, tags, notes)
where not exists (select 1 from workout_templates t where lower(t.title) = lower(v.title));
