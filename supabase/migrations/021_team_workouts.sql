-- =====================================================================
-- 021: Team-of-3-Workouts (Tangletown CrossFit), 29 Stück.
-- Gruppe CrossFit, Merkmal Team; Art und Geräte wie js/classify.js.
-- Gewichte in kg (♂/♀; bei drei Angaben: Rx · Mittel · Skaliert).
-- Mehrfach ausführbar (legt nichts doppelt an).
-- =====================================================================

insert into workout_templates (title, workout, notes, tags)
select 'Troopers', 'Team of 3
30:00 AMRAP
30 wall balls (9/6 kg)
30 bench press (60/42,5 kg · 52,5/35 · 42,5/30)
30 box jump overs (60/50 cm)
30 DB snatch (22,5/15 kg · 15/10)', 'Quelle: Tangletown CrossFit (Team of 3), 04.11.2023.', array['CrossFit', 'AMRAP', 'Langhantel', 'Kurzhanteln', 'Box', 'Wall Ball', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Troopers'));

insert into workout_templates (title, workout, notes, tags)
select 'Trifecta', 'Team of 3, for time:
15 rope climbs
400 m run together
75 thrusters (42,5/30 kg)
800 m run together
75 thrusters (42,5/30 kg)
400 m run together
15 rope climbs', 'Quelle: Tangletown CrossFit (Team of 3), 03.06.2023.', array['CrossFit', 'For Time', 'Langhantel', 'Kletterseil', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Trifecta'));

insert into workout_templates (title, workout, notes, tags)
select 'Shirts and Skins', 'Team of 3, waterfall style
AMRAP 25:00
15/12 cal row
5 squat snatch (60/42,5 kg · 52,5/35 · 42,5/30)
1 rope climb or 2 up/downs', 'Waterfall: Die Nächste startet, sobald die Vordere fertig gerudert hat; überholen gilt nicht. Quelle: Tangletown CrossFit (Team of 3), 13.05.2023.', array['CrossFit', 'AMRAP', 'Langhantel', 'Kletterseil', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Shirts and Skins'));

insert into workout_templates (title, workout, notes, tags)
select 'Taking it for the Team', 'Team of 3, for time
One works, two rest
2000 m row
50 wall balls
40 power cleans (60/42,5 kg)
30 HSPU

1500 m row
40 wall balls
30 power cleans (70/47,5 kg)
20 HSPU

1000 m row
30 wall balls
20 power cleans (85/57,5 kg)
10 HSPU', 'Quelle: Tangletown CrossFit (Team of 3), 08.04.2023.', array['CrossFit', 'For Time', 'Chipper', 'Langhantel', 'Wall Ball', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Taking it for the Team'));

insert into workout_templates (title, workout, notes, tags)
select 'Holiday Recovery', 'Team of 3
One person rows for max distance, two work on the AMRAP:
20:00 AMRAP
10 sandbag cleans (clean to the shoulder, release one hand)
14 burpee box jump overs (60/50 cm)
20 single-arm devil''s press (22,5/15 kg · 15/10)', 'Zwei Scores fürs Team: Ruder-Meter und Runden + Wiederholungen. Quelle: Tangletown CrossFit (Team of 3), 26.12.2022.', array['CrossFit', 'AMRAP', 'Kurzhanteln', 'Box', 'Sandbag', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Holiday Recovery'));

insert into workout_templates (title, workout, notes, tags)
select 'Jolly Old Saint Nick', 'Team of 3
30:00 cap
60 clean & jerks (70/47,5 kg · 60/42,5 · 52,5/35)
300 m row each person
10 rope climbs or 20 up/downs
300 m row each person
100 bar-facing burpees
300 m row each person
10 rope climbs
300 m row each person
60 clean & jerks (70/47,5 kg · 60/42,5 · 52,5/35)', 'Quelle: Tangletown CrossFit (Team of 3), 24.12.2022.', array['CrossFit', 'For Time', 'Chipper', 'Langhantel', 'Kletterseil', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Jolly Old Saint Nick'));

insert into workout_templates (title, workout, notes, tags)
select 'Jolly Roger', 'Team of 3
3 rounds for time:
30 power snatch (52,5/37,5 kg · 42,5/30 · 34/25)
2000 m row
10 rope climbs or 20 up/downs', 'Quelle: Tangletown CrossFit (Team of 3), 26.11.2022.', array['CrossFit', 'For Time', 'Langhantel', 'Kletterseil', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Jolly Roger'));

insert into workout_templates (title, workout, notes, tags)
select 'High Mark', 'Team of 3
3 rounds, 30:00 time cap
60 wall balls (9/6 kg)
45 TTB or hanging knee raises
15 box get overs (120/100 cm)
9 tire flips

45 wall balls
30 TTB
15 box get overs
9 tire flips

30 wall balls
15 TTB
15 box get overs
9 tire flips', 'Quelle: Tangletown CrossFit (Team of 3), 17.09.2022.', array['CrossFit', 'For Time', 'Klimmzugstange', 'Box', 'Wall Ball', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('High Mark'));

insert into workout_templates (title, workout, notes, tags)
select 'The Capitol', 'Team of 3, for time
One works, two rest (except sled push)
24/18 cal bike
24/21/18/15/12 deadlifts (92,5/62,5 kg · 70/47,5 · 60/42,5)
21/18/15/12/9 power cleans
50 m sled push (122/102 kg)', 'Wiederholungen frei aufteilen, immer eine arbeitet, zwei pausieren. Schlitten: zwei schieben, eine pausiert. Quelle: Tangletown CrossFit (Team of 3), 16.08.2022.', array['CrossFit', 'For Time', 'Langhantel', 'Bike', 'Schlitten', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('The Capitol'));

insert into workout_templates (title, workout, notes, tags)
select 'Three Amigos', 'Team of 3
30:00 time cap
3 rounds:
400 m run together
50 bar-facing burpees
6 rope climbs
then
21 clean & jerks (52,5/37,5 kg · 42,5/30 · 20/15)
21 clean & jerks (60/42,5 kg · 52,5/35 · 34/25)
21 clean & jerks (70/47,5 kg · 60/42,5 · 42,5/30)
21 clean & jerks (85/57,5 kg · 70/47,5 · 47,5/34)
21 clean & jerks (92,5/62,5 kg · 75/52,5 · 52,5/37,5)', 'Quelle: Tangletown CrossFit (Team of 3), 23.07.2022.', array['CrossFit', 'For Time', 'Langhantel', 'Kletterseil', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Three Amigos'));

insert into workout_templates (title, workout, notes, tags)
select 'Team DT', 'Team of 3
30:00 time cap
5 rounds of DT
1 mile run (1,6 km)
5 rounds of DT
1 mile run (1,6 km)
5 rounds of DT

DT = 12 deadlifts + 9 hang power cleans + 6 push jerks (70/47,5 kg)', 'Frei aufteilen, solange eine arbeitet und zwei pausieren, auch beim Laufen. Quelle: Tangletown CrossFit (Team of 3), 14.05.2022.', array['CrossFit', 'For Time', 'Langhantel', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Team DT'));

insert into workout_templates (title, workout, notes, tags)
select 'American Kids', 'Team of 3
34:00 AMRAP
150/120 cal row
240 deadlifts (70/47,5 kg)
150/120 cal row
180 power cleans (60/42,5 kg)
150/120 cal row
120 shoulder to overhead (52,5/37,5 kg)', 'Eine arbeitet, zwei pausieren. Quelle: Tangletown CrossFit (Team of 3), 05.02.2022.', array['CrossFit', 'AMRAP', 'Langhantel', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('American Kids'));

insert into workout_templates (title, workout, notes, tags)
select 'Ride the Wave', 'Team of 3, for time:
45 cal row
60 thrusters (42,5/30 kg)
60 cal row
50 power snatch (52,5/37,5 kg)
75 cal row
40 front squats (70/47,5 kg)
90 cal row
30 clean & jerks (85/57,5 kg)', 'Beim Rudern hält immer eine im Team Plank, eine pausiert, eine arbeitet. Quelle: Tangletown CrossFit (Team of 3), 15.01.2022.', array['CrossFit', 'For Time', 'Chipper', 'Langhantel', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Ride the Wave'));

insert into workout_templates (title, workout, notes, tags)
select 'New Year''s Day Throwdown', 'Team of 3
Part 1: 15:00 EMOM, switch every minute (5 rounds each):
5 thrusters (42,5/30 kg · 34/25 · 20/15)
5 TTB or hanging knee raises
Max cal bike

Part 2: 12:00 time cap
Each person builds to a heavy complex:
1 snatch + 1 hang snatch + 1 overhead squat', 'Snatch als Squat oder Power. Team-Score Teil 2: Summe der drei Maximalgewichte. Quelle: Tangletown CrossFit (Team of 3), 01.01.2022.', array['CrossFit', 'EMOM', 'Kraft', 'Langhantel', 'Klimmzugstange', 'Bike', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('New Year''s Day Throwdown'));

insert into workout_templates (title, workout, notes, tags)
select 'Workaholic', 'Team of 3
Part 1, for time
3 rounds:
900 m row
15 pull-ups

Part 2, for time
21 burpee box jump overs (60/50 cm)
21 clean & jerks (60/42,5 kg)
21 burpee box jump overs
21 clean & jerks (70/52,5 kg)
21 burpee box jump overs
21 clean & jerks (85/60 kg)', 'Quelle: Tangletown CrossFit (Team of 3), 02.10.2021.', array['CrossFit', 'For Time', 'Langhantel', 'Klimmzugstange', 'Box', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Workaholic'));

insert into workout_templates (title, workout, notes, tags)
select 'Jelly Roll', 'Team of 3, waterfall style
3 rounds each (9 rounds total):
200 m row
9 shoulder to overhead (60/42,5 kg · 52,5/35 · 42,5/30)', 'Sobald die Erste fertig gerudert hat, startet die Zweite. Tempo halten, überholen gilt nicht. Quelle: Tangletown CrossFit (Team of 3), 03.03.2021.', array['CrossFit', 'For Time', 'Langhantel', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Jelly Roll'));

insert into workout_templates (title, workout, notes, tags)
select 'Power House', 'Team of 3, for time
50-40-30-20-10:
Deadlifts
Hang power cleans
Jerks
Every minute on the minute, all team members do 3 burpees
Rx 60/42,5 kg · Skaliert 42,5/30 kg', 'Immer nur eine arbeitet an der Hantel. Quelle: Tangletown CrossFit (Team of 3), 19.09.2020.', array['CrossFit', 'For Time', 'Langhantel', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Power House'));

insert into workout_templates (title, workout, notes, tags)
select 'Saint Nick Run', 'Team of 3
30:00 cap
60 clean & jerks (70/47,5 kg · 60/42,5 · 52,5/35)
400 m run as a team
10 rope climbs or 20 up/downs
400 m run as a team
100 bar-facing burpees
400 m run as a team
10 rope climbs
400 m run as a team
60 clean & jerks', 'Ohne Namen im Original (30.09.2019). Wie „Jolly Old Saint Nick“, aber mit Laufen statt Rudern. Quelle: Tangletown CrossFit (Team of 3), 30.09.2019.', array['CrossFit', 'For Time', 'Chipper', 'Langhantel', 'Kletterseil', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Saint Nick Run'));

insert into workout_templates (title, workout, notes, tags)
select 'Row & Partner Deadlift', 'Team of 3
15:00 AMRAP
One rows for calories, the other two complete:
15 partner deadlifts (155/130 kg)
10 shuttle runs (7,5 m, touch the line)', 'Ohne Namen im Original (07.09.2019). Quelle: Tangletown CrossFit (Team of 3), 07.09.2019.', array['CrossFit', 'AMRAP', 'Langhantel', 'Rudergerät', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Row & Partner Deadlift'));

insert into workout_templates (title, workout, notes, tags)
select 'Rope & Row', 'Team of 3
AMRAP 18:00
15 rope climbs
15 DB burpee box step overs (60/50/40 cm, 22,5/15/10 kg)
1500 m row', 'Ohne Namen im Original (29.07.2019). Wiederholungen aufteilen, eine arbeitet, zwei pausieren. Quelle: Tangletown CrossFit (Team of 3), 29.07.2019.', array['CrossFit', 'AMRAP', 'Kurzhanteln', 'Kletterseil', 'Box', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Rope & Row'));

insert into workout_templates (title, workout, notes, tags)
select 'Triple Fifty', 'Team of 3
3 rounds for time:
50 TTB
50 box jump overs (60/50 cm)
50 power cleans
After each round all three run 400 m together

Round 1: 52,5/37,5 kg · 42,5/30 · 34/25
Round 2: 60/42,5 kg · 52,5/35 · 42,5/30
Round 3: 70/47,5 kg · 60/42,5 · 52,5/35', 'Ohne Namen im Original (01.07.2019). Quelle: Tangletown CrossFit (Team of 3), 01.07.2019.', array['CrossFit', 'For Time', 'Langhantel', 'Klimmzugstange', 'Box', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Triple Fifty'));

insert into workout_templates (title, workout, notes, tags)
select 'Limitless', 'Team of 3
AMRAP 7:00
70 cal row
Max clean & jerks (60/42,5 kg · 52,5/35 · 42,5/30)
Rest 3:00
AMRAP 6:00
60 cal row
Max power snatch (52,5/35 kg · 42,5/30 · 34/25)
Rest 3:00
AMRAP 5:00
50 cal row
Max thrusters (42,5/30 kg · 34/25 · 20/15)', 'Eine arbeitet, zwei pausieren. Rudern und Wiederholungen frei aufteilen. Quelle: Tangletown CrossFit (Team of 3), 14.01.2019.', array['CrossFit', 'AMRAP', 'Intervalle', 'Langhantel', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Limitless'));

insert into workout_templates (title, workout, notes, tags)
select 'Sasquatch', 'Team of 3
30:00 time cap
250 clean & jerks
At 0:00, 5:00, 10:00, 15:00 and 20:00 complete:
45/30 cal row
30 TTB

Weight goes up every 50 reps:
Rx: 52,5/35 – 60/42,5 – 70/47,5 – 85/57,5 – 92,5/62,5 kg
Mittel: 42,5/30 – 52,5/35 – 60/42,5 – 70/47,5 – 80/52,5 kg
Skaliert: 34/25 – 42,5/30 – 52,5/35 – 57,5/37,5 – 60/42,5 kg', 'Quelle: Tangletown CrossFit (Team of 3), 05.01.2019.', array['CrossFit', 'For Time', 'Langhantel', 'Klimmzugstange', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Sasquatch'));

insert into workout_templates (title, workout, notes, tags)
select 'Deadlift Wave', 'Team of 3
15:00 AMRAP
One works, one rests, one accumulates double unders
4 deadlifts (102,5/85 kg · 85/70 · 70/47,5)
3 wall walks
7 ball slams', 'Ohne Namen im Original (22.12.2018). Score: Runden + Wiederholungen und die Double Unders des Teams (3 Single Unders = 1 DU). Quelle: Tangletown CrossFit (Team of 3), 22.12.2018.', array['CrossFit', 'AMRAP', 'Langhantel', 'Medizinball', 'Springseil', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Deadlift Wave'));

insert into workout_templates (title, workout, notes, tags)
select 'Sled Relay', 'Team of 3, waterfall relay
For time, 3 rounds each teammate:
15 m sled rope pull (7,5 m out and back, 3×20/2×20 kg plates)
15 air squats
4 DB burpee box step overs (60/50 cm, 22,5/15/10 kg)', 'Ohne Namen im Original (13.11.2018). Überholen gilt nicht. Quelle: Tangletown CrossFit (Team of 3), 13.11.2018.', array['CrossFit', 'For Time', 'Kurzhanteln', 'Box', 'Hantelscheibe', 'Schlitten', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Sled Relay'));

insert into workout_templates (title, workout, notes, tags)
select 'Shuttle Sandwich', 'Team of 3
Buy-in: 6:00 AMRAP (one full round before tagging off)
5 thrusters (60/42,5 kg · 42,5/30 · 30/20)
5 C2B pull-ups / pull-ups / ring rows
Then:
15 × 20 m shuttle sprints (tag off)
3 rope climbs (one each) or 2 up/downs
9 × 20 m shuttle sprints
3 rope climbs
Cash-out: 6:00 AMRAP
5 thrusters (52,5/35 kg · 34/25 · 25/15)
5 pull-ups / ring rows / jumping pull-ups', 'Ohne Namen im Original (07.07.2018). Quelle: Tangletown CrossFit (Team of 3), 07.07.2018.', array['CrossFit', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Ringe', 'Kletterseil', 'Laufen', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Shuttle Sandwich'));

insert into workout_templates (title, workout, notes, tags)
select 'Sandbag & Sled', 'Team of 3
20:00 AMRAP, one teammate works at a time (full round):
5 sandbag ground to shoulder
5 pull-ups
9 m sled push, empty (4,5 m out and back)', 'Ohne Namen im Original (23.06.2018). Quelle: Tangletown CrossFit (Team of 3), 23.06.2018.', array['CrossFit', 'AMRAP', 'Klimmzugstange', 'Sandbag', 'Schlitten', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Sandbag & Sled'));

insert into workout_templates (title, workout, notes, tags)
select 'Bring a Friend', 'Team of 3
15:00 time cap
Part 1
12 tire flips (two working)
25/15 cal bike (person A)
12 tire flips
25/15 cal bike (person B)
12 tire flips
25/15 cal bike (person C)
Then:
Part 2
600 double unders as a team (or 1200 singles)
One jumps, the other two accumulate sit-ups and burpees', 'Score: Burpees + Sit-ups, wenn die 600 DU geschafft sind oder das Time Cap erreicht ist. Quelle: Tangletown CrossFit (Team of 3), 16.06.2018.', array['CrossFit', 'For Time', 'Springseil', 'Bike', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Bring a Friend'));

insert into workout_templates (title, workout, notes, tags)
select 'Front Squat Ladder', 'Team of 3
AMRAP 25:00
600 m row (200 m each)
15 TTB
21 HSPU (box or pike HSPU)
30 double unders each (or 60 singles each)
60 front squats
Round 1: 34/25 kg · Round 2: 42,5/30 · Round 3: 52,5/37,5 · Round 4: 60/42,5', 'Ohne Namen im Original (03.02.2018). Wiederholungen aufteilen außer Rudern und DU; immer eine arbeitet, zwei pausieren. Quelle: Tangletown CrossFit (Team of 3), 03.02.2018.', array['CrossFit', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Springseil', 'Rudergerät', 'Team']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Front Squat Ladder'));

-- Kontrolle
select count(*) filter (where 'Team' = any(tags)) as team_workouts, count(*) as workouts_gesamt from workout_templates;
