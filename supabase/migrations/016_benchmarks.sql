-- =====================================================================
-- 016: Benchmark-Workouts aus der WODconnect-Liste ergänzen.
-- Nur die, die noch fehlen (Annie, Fran, Cindy … sind schon als Girls da).
-- Gruppe CrossFit + Merkmal Benchmark, Art und Geräte wie js/classify.js.
-- Mehrfach ausführbar (legt nichts doppelt an).
-- =====================================================================

insert into workout_templates (title, workout, notes, tags)
select 'Heavy Fran', '15-12-9 reps for time of:
Thrusters
Weighted pull-ups
♂ 60-kg thrusters, 20-kg weight
♀ 42,5-kg thrusters, 15-kg weight', 'Schwere Variante von „Fran“. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'For Time', 'Langhantel', 'Klimmzugstange', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Heavy Fran'));

insert into workout_templates (title, workout, notes, tags)
select 'Fight Gone Bad', '3 rounds for max reps of:
1 minute wall-ball shots
1 minute sumo deadlift high pulls
1 minute box jumps
1 minute push presses
1 minute calorie row
1 minute rest
♂ 9-kg ball, 35-kg barbell, 50-cm box
♀ 6-kg ball, 25-kg barbell, 50-cm box', 'Jede Station 1 Minute, ohne Pause wechseln. Score: alle Wiederholungen aus 3 Runden (Rudern: Kalorien). Richtwerte: Einsteiger 150–250, Fortgeschritten 250–350, Stark 350–450, Elite 500+. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'Intervalle', 'Max. Wdh.', 'Langhantel', 'Box', 'Wall Ball', 'Rudergerät', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Fight Gone Bad'));

insert into workout_templates (title, workout, notes, tags)
select 'Baseline', 'For time:
500-meter row
40 squats
30 sit-ups
20 push-ups
10 pull-ups', 'Klassischer Einstiegstest. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'For Time', 'Chipper', 'Klimmzugstange', 'Rudergerät', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Baseline'));

insert into workout_templates (title, workout, notes, tags)
select 'CrossFit Total', 'Find your 1-rep max of:
Back squat
Shoulder press
Deadlift', 'Score: Summe der drei Bestwerte in kg. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'Kraft', 'Langhantel', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('CrossFit Total'));

insert into workout_templates (title, workout, notes, tags)
select 'CrossFit Total II', 'In 45 minutes, find your 1-rep max of:
Clean
Bench press
Overhead squat', 'Score: Summe der drei Bestwerte in kg. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'Kraft', 'Langhantel', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('CrossFit Total II'));

insert into workout_templates (title, workout, notes, tags)
select 'Fat Helen', '3 rounds for time of:
400-meter run
21 kettlebell swings
12 chest-to-bar pull-ups
♂ 32-kg kettlebell
♀ 24-kg kettlebell', 'Schwere Variante von „Helen“. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'For Time', 'Kettlebell', 'Klimmzugstange', 'Laufen', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Fat Helen'));

insert into workout_templates (title, workout, notes, tags)
select 'The Gauntlet', '30-minute AMRAP:
"Jackie":
1,000-meter row
50 thrusters
30 pull-ups
Then "Karabell", 10 rounds of:
3 snatches
15 wall-ball shots
Then, in the remaining time, as many rounds as possible of "Cindy":
5 pull-ups
10 push-ups
15 squats
♂ 20-kg thrusters, 61-kg snatches, 9-kg ball to 10 feet
♀ 16-kg thrusters, 41-kg snatches, 6-kg ball to 8 feet', 'Score: Runden „Cindy“ in der restlichen Zeit. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Wall Ball', 'Rudergerät', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('The Gauntlet'));

insert into workout_templates (title, workout, notes, tags)
select 'Cindy XXX', 'Complete as many reps as possible in 20 minutes of:
10 pull-ups
20 push-ups
30 squats
15 pull-ups
30 push-ups
45 squats
20 pull-ups
40 push-ups
60 squats
25 pull-ups
50 push-ups
75 squats
30 pull-ups
60 push-ups
90 squats', 'Steigernde Variante von „Cindy“. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'AMRAP', 'Klimmzugstange', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Cindy XXX'));

insert into workout_templates (title, workout, notes, tags)
select 'The Ghost', '6 rounds for reps:
1 minute calorie row
1 minute burpees
1 minute double-unders
1 minute rest', 'Im Stil von „Fight Gone Bad“. Score: alle Wiederholungen. Skaliert: Double-Under-Versuche zählen; Einsteiger: 5 Runden mit Single-Unders. Richtwert: 80–100 Kalorien, 60–90 Burpees, 300+ Double-Unders. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'Intervalle', 'Max. Wdh.', 'Springseil', 'Rudergerät', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('The Ghost'));

insert into workout_templates (title, workout, notes, tags)
select 'Christine', '3 rounds for time of:
500-meter row
12 bodyweight deadlifts
21 box jumps
♂ 60-cm box
♀ 50-cm box', 'Time Cap 15 Min. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'For Time', 'Langhantel', 'Box', 'Rudergerät', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Christine'));

insert into workout_templates (title, workout, notes, tags)
select 'Heavy DT', '5 rounds for time of:
12 deadlifts
9 hang power cleans
6 push jerks
♂ 93 kg
♀ 66 kg', 'Schwere Variante von „DT“. Quelle: WODconnect-Benchmarkliste.', array['CrossFit', 'For Time', 'Langhantel', 'Benchmark']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Heavy DT'));

-- Kontrolle
select count(*) as vorlagen, count(*) filter (where 'Benchmark' = any(tags)) as benchmarks from workout_templates;
