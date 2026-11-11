-- =====================================================================
-- 017: Alle CrossFit-Open-Workouts 2011–2026 (70 Stück) als Gruppe „Open“.
-- Quelle: games.crossfit.com (Rx, Männer und Frauen), Pfund in kg
-- umgerechnet, die skalierte Version steht in der Notiz.
-- Art und Geräte wie js/classify.js, von Hand nachgeprüft.
-- Mehrfach ausführbar (legt nichts doppelt an).
-- =====================================================================

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.1', 'Complete as many rounds and reps as possible in 10 minutes of:
30 Double-unders
15 Power snatches (75lbs / 35kg)
♀ 15 Power snatches (55lbs / 25kg)', 'CrossFit Open 2011, Workout 11.1.', array['Open', 'AMRAP', 'Langhantel', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.2', 'Complete as many rounds and reps as possible in 15 minutes of:
9 Deadlifts (155lbs / 70kg)
12 Push-ups
15 Box jumps (24 in (60 cm))
♀ 9 Deadlifts (100lbs / 45kg) · 15 Box jumps (20 in (50 cm))', 'CrossFit Open 2011, Workout 11.2.', array['Open', 'AMRAP', 'Langhantel', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.3', 'Complete as many rounds and reps as possible in 5 minutes of:
Squat clean (165lb / 75kg)
Jerk (165lb / 75kg)
♀ Squat clean (110lb / 50kg) · Jerk (110lb / 50kg)', 'CrossFit Open 2011, Workout 11.3.', array['Open', 'AMRAP', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.4', 'Complete as many rounds and reps as possible in 10 minutes of:
60 Bar-facing burpees
30 Overhead squats (120lbs / 55kg)
10 Muscle-ups
♀ 30 Overhead squats (90lbs / 40kg)', 'CrossFit Open 2011, Workout 11.4.', array['Open', 'AMRAP', 'Langhantel', 'Ringe']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.5', 'Complete as many rounds and reps as possible in 20 minutes of:
5 Power cleans (145lbs / 65kg)
10 Toes to bar
15 Wall balls (20lbs (9 kg) to 10 ft target)
♀ 5 Power cleans (100lbs / 45kg) · 15 Wall balls (14lbs (6 kg) to 9 ft target)', 'CrossFit Open 2011, Workout 11.5.', array['Open', 'AMRAP', 'Langhantel', 'Wall Ball']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 11.6', 'Complete as many reps as possible in 7 minutes following the rep scheme below:
100 pound (45 kg) Thruster, 3 reps
3 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 6 reps
6 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 9 reps
9 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 12 reps
12 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 15 reps
15 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 18 reps
18 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 21 reps
21 Chest to bar Pull-ups…
This is a timed workout. If you complete the round of 21, go on to 24. If you complete 24, go on to 27, etc.
♀ 65 pound (29 kg) Thruster, 3 reps · 65 pound (29 kg) Thruster, 6 reps · 65 pound (29 kg) Thruster, 9 reps · 65 pound (29 kg) Thruster, 12 reps · 65 pound (29 kg) Thruster, 15 reps · 65 pound (29 kg) Thruster, 18 reps · 65 pound (29 kg) Thruster, 21 reps', 'CrossFit Open 2011, Workout 11.6.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 11.6'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 12.1', 'Complete as many reps as possible in 7 minutes of:
Burpees
This workout begins from a standing position. The Athlete will move from flat on the ground to touching an object with both hands that is 6 inches above their max reach. Score is total reps completed.', 'CrossFit Open 2012, Workout 12.1.', array['Open', 'AMRAP', 'Ohne Geräte']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 12.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 12.2', 'Proceed through the sequence below completing as many reps as possible in 10 minutes of:
75 pound (34 kg) Snatch, 30 reps
135 pound (61 kg) Snatch, 30 reps
165 pound (75 kg) Snatch, 30 reps
210 pound (95 kg) Snatch, as many reps as possible
♀ 45 pound (20 kg) Snatch, 30 reps · 100 pound (45 kg) Snatch, 30 reps · 120 pound (54 kg) Snatch, as many reps as possible', 'CrossFit Open 2012, Workout 12.2.', array['Open', 'AMRAP', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 12.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 12.3', 'Complete as many rounds and reps as possible in 18 minutes of:
15 Box jumps, 24 in (60 cm) box
115 pound (52 kg) Push press, 12 reps
9 Toes-to-bar
♀ 15 Box jumps, 20 in (50 cm) box · 75 pound (34 kg) Push press, 12 reps', 'CrossFit Open 2012, Workout 12.3.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 12.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 12.4', 'Complete as many rounds and reps as possible in 12 minutes of:
150 Wall balls (20 lbs (9 kg) to 10 ft target)
90 Double-unders
30 Muscle-ups
♀ 150 Wall balls (14 lbs (6 kg) to 9 ft target)', 'CrossFit Open 2012, Workout 12.4.', array['Open', 'AMRAP', 'Ringe', 'Wall Ball', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 12.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 12.5', 'Complete as many reps as possible in 7 minutes following the rep scheme below:
100 pound (45 kg) Thruster, 3 reps
3 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 6 reps
6 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 9 reps
9 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 12 reps
12 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 15 reps
15 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 18 reps
18 Chest to bar Pull-ups
100 pound (45 kg) Thruster, 21 reps
21 Chest to bar Pull-ups…
This is a timed workout. If you complete the round of 21, go on to 24. If you complete 24, go on to 27, etc.
♀ 65 pound (29 kg) Thruster, 3 reps · 65 pound (29 kg) Thruster, 6 reps · 65 pound (29 kg) Thruster, 9 reps · 65 pound (29 kg) Thruster, 12 reps · 65 pound (29 kg) Thruster, 15 reps · 65 pound (29 kg) Thruster, 18 reps · 65 pound (29 kg) Thruster, 21 reps', 'CrossFit Open 2012, Workout 12.5.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 12.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 13.1', 'Proceed through the sequence below completing as many reps as possible in 17 minutes of:
40 Burpees
75 pound (34 kg) Snatch, 30 reps
30 Burpees
135 pound (61 kg) Snatch, 30 reps
20 Burpees
165 pound (75 kg) Snatch, 30 reps
10 burpees
210 pound (95 kg) Snatch, as many reps as possible
♀ 45 pound (20 kg) Snatch, 30 reps · 100 pound (45 kg) Snatch, 30 reps · 120 pound (54 kg) Snatch, as many reps as possible', 'CrossFit Open 2013, Workout 13.1.', array['Open', 'AMRAP', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 13.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 13.2', 'Complete as many rounds and reps as possible in 10 minutes of:
115 pound (52 kg) Shoulder to overhead, 5 reps
115 pound (52 kg) Deadlift, 10 reps
15 Box jumps, 24 in (60 cm) box
♀ 75 pound (34 kg) Shoulder to overhead, 5 reps · 75 pound (34 kg) Deadlift, 10 reps · 15 Box jumps, 20 in (50 cm) box', 'CrossFit Open 2013, Workout 13.2.', array['Open', 'AMRAP', 'Langhantel', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 13.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 13.3', 'Complete as many rounds and reps as possible in 12 minutes of:
150 Wall balls (20 lbs (9 kg) to 10 ft target)
90 Double-unders
30 Muscle-ups
♀ 150 Wall balls (14 lbs (6 kg) to 9 ft target)', 'CrossFit Open 2013, Workout 13.3.', array['Open', 'AMRAP', 'Ringe', 'Wall Ball', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 13.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 13.4', 'Complete as many reps as possible in 7 minutes following the rep scheme below:
135 pound (61 kg) Clean and jerk, 3 reps
3 Toes-to-bar
135 pound (61 kg) Clean and jerk, 6 reps
6 Toes-to-bar
135 pound (61 kg) Clean and jerk, 9 reps
9 Toes-to-bar
135 pound (61 kg) Clean and jerk, 12 reps
12 Toes-to-bar
135 pound (61 kg) Clean and jerk, 15 reps
15 Toes-to-bar
135 pound (61 kg) Clean and jerk, 18 reps
18 Toes-to-bar…
This is a timed workout. If you complete the round of 18, go on to 21. If you complete 21, go on to 24, etc.
♀ 95 pound (43 kg) Clean and jerk, 3 reps · 95 pound (43 kg) Clean and jerk, 6 reps · 95 pound (43 kg) Clean and jerk, 9 reps · 95 pound (43 kg) Clean and jerk, 12 reps · 95 pound (43 kg) Clean and jerk, 15 reps · 95 pound (43 kg) Clean and jerk, 18 reps', 'CrossFit Open 2013, Workout 13.4.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 13.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 13.5', 'Complete as many rounds and reps as possible in 4 minutes of:
100 pound (45 kg) Thruster, 15 reps
15 Chest to bar Pull-ups
If 90 reps (3 rounds) are completed in under 4 minutes, time extends to 8 minutes.
If 180 reps (6 rounds) are completed in under 8 minutes, time extends to 12 minutes.
If 270 reps (9 rounds) are completed in under 12 minutes, time extends to 16 minutes.
Etc.
♀ 65 pound (29 kg) Thruster, 15 reps', 'CrossFit Open 2013, Workout 13.5.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 13.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 14.1', 'Complete as many rounds and reps as possible in 10 minutes of:
30 double-unders
75-lb. (34 kg) power snatches, 15 reps
♀ 55-lb. (25 kg) power snatches, 15 reps', 'CrossFit Open 2014, Workout 14.1.', array['Open', 'AMRAP', 'Langhantel', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 14.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 14.2', 'Every 3 minutes for as long as possible complete:
From 0:00-3:00
2 rounds of:
10 overhead squats
10 chest-to-bar pull-ups
From 3:00-6:00
2 rounds of:
12 overhead squats
12 chest-to-bar pull-ups
From 6:00-9:00
2 rounds of:
14 overhead squats
14 chest-to-bar pull-ups
Etc., following same pattern until you fail to complete both rounds
95-lb. (43 kg) overhead squats
Chest-to-bar pull-ups
♀ 65-lb. (29 kg) overhead squats', 'CrossFit Open 2014, Workout 14.2.', array['Open', 'EMOM', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 14.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 14.3', 'Complete as many reps as possible in 8 minutes of:
135-lb. (61 kg) deadlifts, 10 reps
15 box jumps, 24 in (60 cm)
185-lb. (84 kg) deadlifts, 15 reps
15 box jumps, 24 in (60 cm)
225-lb. (102 kg) deadlifts, 20 reps
15 box jumps, 24 in (60 cm)
275-lb. (125 kg) deadlifts, 25 reps
15 box jumps, 24 in (60 cm)
315-lb. (143 kg) deadlifts, 30 reps
15 box jumps, 24 in (60 cm)
365-lb. (166 kg) deadlifts, 35 reps
15 box jumps, 24 in (60 cm)
♀ 95-lb. (43 kg) deadlifts, 10 reps · 15 box jumps, 20 in (50 cm) · 135-lb. (61 kg) deadlifts, 15 reps · 15 box jumps, 20 in (50 cm) · 155-lb. (70 kg) deadlifts, 20 reps · 15 box jumps, 20 in (50 cm) · 185-lb. (84 kg) deadlifts, 25 reps · 15 box jumps, 20 in (50 cm) · 205-lb. (93 kg) deadlifts, 30 reps · 15 box jumps, 20 in (50 cm) · 225-lb. (102 kg) deadlifts, 35 reps · 15 box jumps, 20 in (50 cm)', 'CrossFit Open 2014, Workout 14.3.', array['Open', 'AMRAP', 'Langhantel', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 14.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 14.4', 'Complete as many rounds and repetitions as possible in 14 minutes of:
60-calorie row
50 toes-to-bars
40 wall-ball shots, 20 lb. (9 kg) to 10-foot target
30 cleans, 135 lb. (61 kg)
20 muscle-ups
♀ 40 wall-ball shots, 14 lb. (6 kg) to 9-foot target · 30 cleans, 95 lb. (43 kg)', 'CrossFit Open 2014, Workout 14.4.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Ringe', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 14.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 14.5', '21-18-15-12-9-6-3 reps for time of:
95-lb. (43 kg) thrusters
Burpees
♀ 65-lb. (29 kg) thrusters', 'CrossFit Open 2014, Workout 14.5.', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 14.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 15.1', 'Complete as many rounds and reps as possible in 9 minutes of:
15 toes-to-bars
10 deadlifts (115/75 lb (52/34 kg))
5 snatches (115/75 lb (52/34 kg))
WORKOUT 15.1a
1-rep-max clean and jerk
6-minute time cap', 'CrossFit Open 2015, Workout 15.1.', array['Open', 'AMRAP', 'Kraft', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 15.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 15.2', 'Every 3 minutes for as long as possible complete:
From 0:00-3:00
2 rounds of:
10 overhead squats (95/65 lb (43/29 kg))
10 chest-to-bar pull-ups
From 3:00-6:00
2 rounds of:
12 overhead squats (95/65 lb (43/29 kg))
12 chest-to-bar pull-ups
From 6:00-9:00
2 rounds of:
14 overhead squats (95/65 lb (43/29 kg))
14 chest-to-bar pull-ups
Etc., following same pattern until you fail to complete both rounds', 'CrossFit Open 2015, Workout 15.2.', array['Open', 'EMOM', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 15.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 15.3', 'Complete as many rounds and reps as possible in 14 minutes of:
7 muscle-ups
50 wall-ball shots
100 double-unders
Men use 20-lb. (9 kg) ball to 10 feet, Women use 14-lb. (6 kg) ball to 9 feet', 'CrossFit Open 2015, Workout 15.3.', array['Open', 'AMRAP', 'Ringe', 'Wall Ball', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 15.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 15.4', 'Complete as many reps as possible in 8 minutes of:
3 handstand push-ups
3 cleans
6 handstand push-ups
3 cleans
9 handstand push-ups
3 cleans
12 handstand push-ups
6 cleans
15 handstand push-ups
6 cleans
18 handstand push-ups
6 cleans
21 handstand push-ups
9 cleans
Etc., adding 3 reps to the handstand push-up each round, and 3 reps to the clean every 3 rounds.
Men clean 185 lb. (84 kg)
Women clean 125 lb. (56 kg)', 'CrossFit Open 2015, Workout 15.4.', array['Open', 'AMRAP', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 15.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 15.5', '27-21-15-9 reps for time of:
Row (calories)
Thrusters
Men use 95 lb. (43 kg)
Women use 65 lb. (29 kg)', 'CrossFit Open 2015, Workout 15.5.', array['Open', 'For Time', 'Langhantel', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 15.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 16.1', 'Complete as many rounds and reps as possible in 20 minutes of:
25-ft. overhead walking lunge
8 burpees
25-ft. overhead walking lunge
8 chest-to-bar pull-ups
Men lunge 95 lb. (43 kg)
Women lunge 65 lb. (29 kg)', 'CrossFit Open 2016, Workout 16.1.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 16.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 16.2', 'Beginning on a 4-minute clock, complete as many reps as possible of:
25 toes-to-bars
50 double-unders
15 squat cleans, 135/85 lb (61/38 kg)
If completed before 4 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
13 squat cleans, 185/115 lb (84/52 kg)
If completed before 8 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
11 squat cleans, 225/145 lb (102/66 kg)
If completed before 12 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
9 squat cleans, 275/175 lb (125/79 kg)
If completed before 16 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
7 squat cleans, 315/205 lb (143/93 kg)
Stop at 20 minutes.', 'CrossFit Open 2016, Workout 16.2.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 16.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 16.3', 'Complete as many rounds and reps as possible in 7 minutes of:
10 power snatches
3 bar muscle-ups
Men use 75 lb. (34 kg)
Women use 55 lb. (25 kg)', 'CrossFit Open 2016, Workout 16.3.', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 16.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 16.4', 'Complete as many rounds and reps as possible in 13 minutes of:
55 deadlifts
55 wall-ball shots
55-calorie row
55 handstand push-ups
Men deadlift 225 lb. (102 kg) and throw 20-lb. (9 kg) ball to 10-ft. target
Women deadlift 155 lb. (70 kg) and throw 14-lb. (6 kg) ball to 9-ft. target', 'CrossFit Open 2016, Workout 16.4.', array['Open', 'AMRAP', 'Langhantel', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 16.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 16.5', '21-18-15-12-9-6-3 reps for time of:
Thrusters
Burpees
Men use 95 lb. (43 kg)
Women use 65 lb. (29 kg)', 'CrossFit Open 2016, Workout 16.5.', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 16.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 17.1', 'For time:
10 dumbbell snatches
15 burpee box jump-overs
20 dumbbell snatches
15 burpee box jump-overs
30 dumbbell snatches
15 burpee box jump-overs
40 dumbbell snatches
15 burpee box jump-overs
50 dumbbell snatches
15 burpee box jump-overs
Men use 50-lb. (22,5 kg) dumbbell and 24 in (60 cm) box
Time cap: 20 minutes
♀ Women use 35-lb. (15 kg) dumbbell and 20 in (50 cm) box', 'CrossFit Open 2017, Workout 17.1. Skaliert: Men use 35-lb. (15 kg) dumbbell and 20 in (50 cm) box, step-ups OK', array['Open', 'For Time', 'Kurzhanteln', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 17.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 17.2', 'Complete as many rounds and reps as possible in 12 minutes of:
2 rounds of:
50-ft. weighted walking lunge
16 toes-to-bars
8 power cleans
Then, 2 rounds of:
50-ft. weighted walking lunge
16 bar muscle-ups
8 power cleans
Etc., alternating between toes-to-bars and bar muscle-ups every 2 rounds.
Men use 50-lb. (22,5 kg) dumbbells
♀ Women use 35-lb. (15 kg) dumbbells', 'CrossFit Open 2017, Workout 17.2. Skaliert: 16 hanging knee-raises · 16 chin-over-bar pull-ups · Etc., alternating between hanging knee-raises and chin-over-bar pull-ups every 2 rounds. · Men use 35-lb. (15 kg) dumbbells', array['Open', 'AMRAP', 'Kurzhanteln', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 17.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 17.3', 'Prior to 8:00, complete:
3 rounds of:
6 chest-to-bar pull-ups
6 squat snatches, 95 lb. (43 kg)
Then, 3 rounds of:
7 chest-to-bar pull-ups
5 squat snatches, 135 lb. (61 kg)
*Prior to 12:00, complete 3 rounds of:
8 chest-to-bar pull-ups
4 squat snatches, 185 lb. (84 kg)
*Prior to 16:00, complete 3 rounds of:
9 chest-to-bar pull-ups
3 squat snatches, 225 lb. (102 kg)
*Prior to 20:00, complete 3 rounds of:
10 chest-to-bar pull-ups
2 squat snatches, 245 lb. (111 kg)
Prior to 24:00, complete 3 rounds of:
11 chest-to-bar pull-ups
1 squat snatch 265 lb. (120 kg)
*If all reps are completed, time cap extends by 4 minutes.
♀ 6 squat snatches, 65 lb. (29 kg) · 5 squat snatches, 95 lb. (43 kg) · 4 squat snatches, 135 lb. (61 kg) · 3 squat snatches, 155 lb. (70 kg) · 2 squat snatches, 175 lb. (79 kg) · 1 squat snatch, 185 lb. (84 kg)', 'CrossFit Open 2017, Workout 17.3. Skaliert: 6 jumping chin-over-bar pull-ups · 6 squat snatches, 45 lb. (20 kg) · 7 jumping chin-over-bar pull-ups · 5 squat snatches, 75 lb. (34 kg) · 8 jumping chin-over-bar pull-ups · 4 squat snatches, 95 lb. (43 kg) · 9 jumping chin-over-bar pull-ups · 3 squat snatches, 115 lb. (52 kg) · 10 jumping chin-over-bar pull-ups · 2 squat snatches, 135 lb. (61 kg) · 11 jumping chin-over-bar pull-ups · 1 squat snatch, 155 lb. (70 kg) · Note: Squat snatches or power snatches with overhead squats permitted.', array['Open', 'For Time', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 17.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 17.4', 'Complete as many rounds and reps as possible in 13 minutes of:
55 deadlifts, 225 lb. (102 kg)
55 wall-ball shots, 20-lb. (9 kg) ball to 10-ft. target
55-calorie row
55 handstand push-ups
♀ 55 deadlifts, 155 lb. (70 kg) · 55 wall-ball shots, 14-lb. (6 kg) ball to 9-ft. target', 'CrossFit Open 2017, Workout 17.4. Skaliert: 55 deadlifts, 135 lb. (61 kg) · 55 wall-ball shots, 20-lb. (9 kg) ball to 9-ft. target · 55 hand-release push-ups', array['Open', 'AMRAP', 'Langhantel', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 17.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 17.5', '10 rounds for time of:
9 thrusters, 95 lb. (43 kg)
35 double-unders
♀ 9 thrusters, 65 lb. (29 kg)', 'CrossFit Open 2017, Workout 17.5. Skaliert: 9 thrusters, 65 lb. (29 kg) · 35 single-unders', array['Open', 'For Time', 'Langhantel', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 17.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 18.1', 'Complete as many rounds as possible in 20 minutes of:
8 toes-to-bars
10 dumbbell hang clean and jerks
14-cal. row
Men use 50-lb. (22,5 kg) dumbbell
♀ 12-cal. row · Women use 35-lb. (15 kg) dumbbell', 'CrossFit Open 2018, Workout 18.1. Skaliert: 8 hanging knee-raises · Men use 35-lb. (15 kg) dumbbell', array['Open', 'AMRAP', 'Kurzhanteln', 'Klimmzugstange', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 18.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 18.2', '1-2-3-4-5-6-7-8-9-10 reps for time of:
Dumbbell squats
Bar-facing burpees
Men use 50-lb. (22,5 kg) dumbbells
Workout 18.2a
1-rep-max clean
Time cap: 12 minutes to complete 18.2 AND 18.2a
♀ Women use 35-lb. (15 kg) dumbbells', 'CrossFit Open 2018, Workout 18.2. Skaliert: Men use 35-lb. (15 kg) dumbbells, stepping burpees allowed', array['Open', 'For Time', 'Kraft', 'Langhantel', 'Kurzhanteln']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 18.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 18.3', '2 rounds for time of:
100 double-unders
20 overhead squats
100 double-unders
12 ring muscle-ups
100 double-unders
20 dumbbell snatches
100 double-unders
12 bar muscle-ups
Men perform 115-lb. (52 kg) OHS, 50-lb. (22,5 kg) DB snatches
Time cap: 14 minutes
♀ Women perform 80-lb. (36 kg) OHS, 35-lb. (15 kg) DB snatches', 'CrossFit Open 2018, Workout 18.3. Skaliert: 100 single-unders · 100 single-unders · 12 chin-over-bar pull-ups · 100 single-unders · 100 single-unders · 12 chin-over-bar pull-ups · Men perform 45-lb. (20 kg) OHS, 35-lb. (15 kg) DB snatches', array['Open', 'For Time', 'Langhantel', 'Kurzhanteln', 'Klimmzugstange', 'Ringe', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 18.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 18.4', 'For time:
21 deadlifts, 225 lb. (102 kg)
21 handstand push-ups
15 deadlifts, 225 lb. (102 kg)
15 handstand push-ups
9 deadlifts, 225 lb. (102 kg)
9 handstand push-ups
21 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
15 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
9 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
Time cap: 9 min.
♀ 21 deadlifts, 155 lb. (70 kg) · 15 deadlifts, 155 lb. (70 kg) · 9 deadlifts, 155 lb. (70 kg) · 21 deadlifts, 205 lb. (93 kg) · 15 deadlifts, 205 lb. (93 kg) · 9 deadlifts, 205 lb. (93 kg)', 'CrossFit Open 2018, Workout 18.4. Skaliert: 21 deadlifts, 135 lb. (61 kg) · 21 hand-release push-ups · 15 deadlifts, 135 lb. (61 kg) · 15 hand-release push-ups · 9 deadlifts, 135 lb. (61 kg) · 9 hand-release push-ups · 21 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl · 15 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl · 9 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 18.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 18.5', 'Complete as many reps as possible in 7 minutes of:
3 thrusters
3 chest-to-bar pull-ups
6 thrusters
6 chest-to-bar pull-ups
9 thrusters
9 chest-to-bar pull-ups
12 thrusters
12 chest-to-bar pull-ups
15 thrusters
15 chest-to-bar pull-ups
18 thrusters
18 chest-to-bar pull-ups
This is a timed workout. If you complete the round of 18, go on to 21. If you complete 21, go on to 24, etc.
Men use 100 lb. (45 kg)
♀ Women use 65 lb. (29 kg)', 'CrossFit Open 2018, Workout 18.5. Gleich wie 12.5, 11.6. Skaliert: 3 jumping chin-over-bar pull-ups · 6 jumping chin-over-bar pull-ups · 9 jumping chin-over-bar pull-ups · 12 jumping chin-over-bar pull-ups · 15 jumping chin-over-bar pull-ups · 18 jumping chin-over-bar pull-ups · Men use 65 lb. (29 kg)', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 18.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 19.1', 'Complete as many rounds as possible in 15 minutes of:
19 wall-ball shots
19-cal. row
Men throw 20-lb. (9 kg) ball to 10-ft. target
♀ Women throw 14-lb. (6 kg) ball to 9-ft. target', 'CrossFit Open 2019, Workout 19.1. Skaliert: Men throw 14-lb. (6 kg) ball to 10-ft. target', array['Open', 'AMRAP', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 19.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 19.2', 'Beginning on an 8-minute clock, complete as many reps as possible of:
25 toes-to-bars
50 double-unders
15 squat cleans, 135 lb. (61 kg)
25 toes-to-bars
50 double-unders
13 squat cleans, 185 lb. (84 kg)
If completed before 8 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
11 squat cleans, 225 lb. (102 kg)
If completed before 12 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
9 squat cleans, 275 lb. (125 kg)
If completed before 16 minutes, add 4 minutes to the clock and proceed to:
25 toes-to-bars
50 double-unders
7 squat cleans, 315 lb. (143 kg)
Stop at 20 minutes.
♀ 15 squat cleans, 85 lb. (38 kg) · 13 squat cleans, 115 lb. (52 kg) · 11 squat cleans, 145 lb. (66 kg) · 9 squat cleans, 175 lb. (79 kg) · 7 squat cleans, 205 lb. (93 kg)', 'CrossFit Open 2019, Workout 19.2. Skaliert: 25 hanging knee-raises · 50 single-unders · 15 squat cleans, 95 lb. (43 kg) · 25 hanging knee-raises · 50 single-unders · 13 squat cleans, 115 lb. (52 kg) · 25 hanging knee-raises · 50 single-unders · 11 squat cleans, 135 lb. (61 kg) · 25 hanging knee-raises · 50 single-unders · 9 squat cleans, 155 lb. (70 kg) · 25 hanging knee-raises · 50 single-unders · 7 squat cleans, 185 lb. (84 kg)', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 19.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 19.3', 'For time:
200-ft. dumbbell overhead lunge
50 dumbbell box step-ups
50 strict handstand push-ups
200-ft. handstand walk
50-lb. (22,5 kg) dumbbell, 24 in (60 cm) box
Time cap: 10 minutes
♀ 35-lb. (15 kg) dumbbell, 20 in (50 cm) box', 'CrossFit Open 2019, Workout 19.3. Skaliert: 200-ft. dumbbell front-rack lunge · 50 5-in. elevated strict handstand push-ups · 200-ft. bear crawl', array['Open', 'For Time', 'Chipper', 'Kurzhanteln', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 19.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 19.4', 'For total time:
3 rounds of:
10 snatches
12 bar-facing burpees
Then, rest 3 minutes before continuing with:
3 rounds of:
10 bar muscle-ups
12 bar-facing burpees
Men snatch 95 lb. (43 kg)
Time cap: 12 minutes
♀ Women snatch 65 lb. (29 kg)', 'CrossFit Open 2019, Workout 19.4. Skaliert: 10 chin-over-bar pull-ups · Men snatch 65 lb. (29 kg), may step over bar on the burpees', array['Open', 'For Time', 'Intervalle', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 19.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 19.5', '33-27-21-15-9 reps for time of:
95-lb. (43 kg) thrusters
Chest-to-bar pull-ups
Time cap: 20 minutes
♀ 65-lb. (29 kg) thrusters', 'CrossFit Open 2019, Workout 19.5. Skaliert: 65-lb. (29 kg) thrusters · Jumping pull-ups', array['Open', 'For Time', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 19.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 20.1', '10 rounds for time of:
8 ground-to-overheads, 95 lb. (43 kg)
10 bar-facing burpees
Time cap: 15 minutes
♀ 8 ground-to-overheads, 65 lb. (29 kg)', 'CrossFit Open 2020, Workout 20.1. Skaliert: 8 ground-to-overheads, 65 lb. (29 kg) · 10 bar-facing burpees* · *May step over bar on burpees', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 20.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 20.2', 'Complete as many rounds as possible in 20 minutes of:
4 dumbbell thrusters
6 toes-to-bars
24 double-unders
50-lb. (22,5 kg) dumbbells
♀ 35-lb. (15 kg) dumbbells', 'CrossFit Open 2020, Workout 20.2. Skaliert: 6 hanging knee-raises · 24 single-unders · 35-lb. (15 kg) dumbbells', array['Open', 'AMRAP', 'Kurzhanteln', 'Klimmzugstange', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 20.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 20.3', 'For time:
21 deadlifts, 225 lb. (102 kg)
21 handstand push-ups
15 deadlifts, 225 lb. (102 kg)
15 handstand push-ups
9 deadlifts, 225 lb. (102 kg)
9 handstand push-ups
21 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
15 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
9 deadlifts, 315 lb. (143 kg)
50-ft. handstand walk
Time cap: 9 min.
♀ 21 deadlifts, 155 lb. (70 kg) · 15 deadlifts, 155 lb. (70 kg) · 9 deadlifts, 155 lb. (70 kg) · 21 deadlifts, 205 lb. (93 kg) · 15 deadlifts, 205 lb. (93 kg) · 9 deadlifts, 205 lb. (93 kg)', 'CrossFit Open 2020, Workout 20.3. Skaliert: 21 deadlifts, 135 lb. (61 kg) · 21 hand-release push-ups · 15 deadlifts, 135 lb. (61 kg) · 15 hand-release push-ups · 9 deadlifts, 135 lb. (61 kg) · 9 hand-release push-ups · 21 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl · 15 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl · 9 deadlifts, 185 lb. (84 kg) · 50-ft. bear crawl', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 20.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 20.4', 'For time:
30 box jumps, 24 in (60 cm)
15 clean and jerks, 95 lb. (43 kg)
30 box jumps, 24 in (60 cm)
15 clean and jerks, 135 lb. (61 kg)
30 box jumps, 24 in (60 cm)
10 clean and jerks, 185 lb. (84 kg)
30 single-leg squats
10 clean and jerks, 225 lb. (102 kg)
30 single-leg squats
5 clean and jerks, 275 lb. (125 kg)
30 single-leg squats
5 clean and jerks, 315 lb. (143 kg)
Time cap: 20 minutes
♀ 30 box jumps, 20 in (50 cm) · 15 clean and jerks, 65 lb. (29 kg) · 30 box jumps, 20 in (50 cm) · 15 clean and jerks, 85 lb. (38 kg) · 30 box jumps, 20 in (50 cm) · 10 clean and jerks, 115 lb. (52 kg) · 10 clean and jerks, 145 lb. (66 kg) · 5 clean and jerks, 175 lb. (79 kg) · 5 clean and jerks, 205 lb. (93 kg)', 'CrossFit Open 2020, Workout 20.4. Skaliert: 15 clean and jerks, 65 lb. (29 kg) · 10 clean and jerks, 115 lb. (52 kg) · 30 medicine-ball step-ups, 20 lb. (9 kg) · 10 clean and jerks, 135 lb. (61 kg) · 30 medicine-ball step-ups, 20 lb. (9 kg) · 5 clean and jerks, 155 lb. (70 kg) · 30 medicine-ball step-ups, 20 lb. (9 kg) · 5 clean and jerks, 185 lb. (84 kg)', array['Open', 'For Time', 'Langhantel', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 20.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 20.5', 'For time, partitioned any way:
40 muscle-ups
80-cal. row
120 wall-ball shots, 20-lb. (9 kg) ball to 10 ft.
Time cap: 20 min.
♀ 120 wall-ball shots, 14-lb. (6 kg) ball to 9 ft.', 'CrossFit Open 2020, Workout 20.5. Skaliert: 40 chin-over-bar pull-ups · 120 wall-ball shots, 14-lb. (6 kg) ball to 10 ft.', array['Open', 'For Time', 'Ringe', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 20.5'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 21.1', 'For time:
1 wall walk
10 double-unders
3 wall walks
30 double-unders
6 wall walks
60 double-unders
9 wall walks
90 double-unders
15 wall walks
150 double-unders
21 wall walks
210 double-unders
Time cap: 15 min.', 'CrossFit Open 2021, Workout 21.1. Skaliert: 1 scaled wall walk · 10 single-unders · 3 scaled wall walks · 30 single-unders · 6 scaled wall walks · 60 single-unders · 9 scaled wall walks · 90 single-unders · 15 scaled wall walks · 150 single-unders · 21 scaled wall walks · 210 single-unders', array['Open', 'For Time', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 21.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 21.2', 'For time:
10 dumbbell snatches
15 burpee box jump-overs
20 dumbbell snatches
15 burpee box jump-overs
30 dumbbell snatches
15 burpee box jump-overs
40 dumbbell snatches
15 burpee box jump-overs
50 dumbbell snatches
15 burpee box jump-overs
50-lb. (22,5 kg) dumbbell, 24 in (60 cm) box
Time cap: 20 min.
♀ 35-lb. (15 kg) dumbbell, 20 in (50 cm) box', 'CrossFit Open 2021, Workout 21.2. Skaliert: 35-lb. (15 kg) dumbbell, 20 in (50 cm) box (step-ups permitted)', array['Open', 'For Time', 'Kurzhanteln', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 21.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 21.3', 'For total time:
15 front squats
30 toes-to-bars
15 thrusters
Then, rest 1 minute before continuing with:
15 front squats
30 chest-to-bar pull-ups
15 thrusters
Then, rest 1 minute before continuing with:
15 front squats
30 bar muscle-ups
15 thrusters
Workout 21.4 begins immediately upon completing or reaching the time cap for 21.3.
95 lb. (43 kg) for the front squats and thrusters
Time cap: 15 min.
♀ 65 lb. (29 kg) for the front squats and thrusters', 'CrossFit Open 2021, Workout 21.3. Skaliert: 30 hanging knee-raises · 30 chin-over-bar pull-ups · 65 lb. (29 kg) for the front squats and thrusters', array['Open', 'For Time', 'Intervalle', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 21.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 21.4', 'Complete the following complex for max load:
1 deadlift
1 clean
1 hang clean
1 jerk
Time begins immediately following the completion of 21.3.
Time cap: 7 min.', 'CrossFit Open 2021, Workout 21.4.', array['Open', 'Kraft', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 21.4'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 22.1', 'Complete as many rounds as possible in 15 minutes of:
3 wall walks
12 dumbbell snatches
15 box jump-overs
50-lb (22,5 kg) dumbbell, 24 in (60 cm) box
♀ 35-lb (15 kg) dumbbell, 20 in (50 cm) box', 'CrossFit Open 2022, Workout 22.1. Skaliert: Scaled wall walks, 35-lb (15 kg) dumbbell, 24 in (60 cm) box, may step up on box jump-overs', array['Open', 'AMRAP', 'Kurzhanteln', 'Box']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 22.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 22.2', '1-2-3-4-5-6-7-8-9-10-9-8-7-6-5-4-3-2-1 reps for time of:
Deadlifts
Bar-facing burpees
225-lb (102 kg) barbell
Time cap: 10 minutes
♀ 155-lb (70 kg) barbell', 'CrossFit Open 2022, Workout 22.2. Skaliert: 135-lb (61 kg) barbell, may step over on burpees', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 22.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 22.3', 'For time:
21 pull-ups
42 double-unders
21 thrusters (weight 1)
18 chest-to-bar pull-ups
36 double-unders
18 thrusters (weight 2)
15 bar muscle-ups
30 double-unders
15 thrusters (weight 3)
95 lb (43 kg), then 115 lb (52 kg), then 135 lb (61 kg)
Time cap: 12 minutes
♀ 65 lb (29 kg), then 75 lb (34 kg), then 85 lb (38 kg)', 'CrossFit Open 2022, Workout 22.3. Skaliert: 21 jumping chin-over-bar pull-ups · 42 single-unders · 18 chin-over-bar pull-ups · 36 single-unders · 15 chest-to-bar pull-ups · 30 single-unders · 65 lb (29 kg), then 85 lb (38 kg), then 105 lb (47 kg)', array['Open', 'For Time', 'Chipper', 'Langhantel', 'Klimmzugstange', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 22.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 23.1', 'Complete as many reps as possible in 14 minutes of:
60-calorie row
50 toes-to-bars
40 wall-ball shots
30 cleans
20 muscle-ups
♀ 14-lb (6 kg) ball to 9-ft target, 95-lb (43 kg) cleans
♂ 20-lb (9 kg) ball to 10-ft target, 135-lb (61 kg) cleans', 'CrossFit Open 2023, Workout 23.1. Skaliert: 50 hanging knee raises · 20 chin-over-bar pull-ups · ♀ 10-lb (4 kg) ball to 9-ft target, 65-lb (29 kg) cleans · ♂ 14-lb (6 kg) ball to 10-ft target, 95-lb (43 kg) cleans', array['Open', 'AMRAP', 'Langhantel', 'Klimmzugstange', 'Ringe', 'Wall Ball', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 23.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 23.2', 'Complete as many reps as possible in 15 minutes of:
5 burpee pull-ups
10 shuttle runs (1 rep = 25 ft out/25 ft back)
*Add 5 burpee pull-ups after each round.
23.2B:
Immediately following 23.2A, athletes will have 5 minutes to establish:
1-rep-max thruster (from the floor)
♀ 23.2A:', 'CrossFit Open 2023, Workout 23.2. Skaliert: 23.2A: · 5 burpees · *Add 5 burpees after each round.', array['Open', 'AMRAP', 'Kraft', 'Langhantel', 'Klimmzugstange', 'Laufen']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 23.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 23.3', 'Starting with a 6-minute time cap, complete as many reps as possible of:
5 wall walks
50 double-unders
15 snatches (weight 1)
5 wall walks
50 double-unders
12 snatches (weight 2)
*If completed before the 6-minute time cap, add 3 minutes to the time cap and complete:
20 strict handstand push-ups
50 double-unders
9 snatches (weight 3)
*If completed before the 9-minute time cap, add 3 minutes to the time cap and complete:
20 strict handstand push-ups
50 double-unders
6 snatches (weight 4)
♀ 65 lb (29 kg), 95 lb (43 kg), 125 lb (56 kg), 155 lb (70 kg)
♂ 95 lb (43 kg), 135 lb (61 kg), 185 lb (84 kg), 225 lb (102 kg)', 'CrossFit Open 2023, Workout 23.3. Skaliert: 5 scaled wall walks · 50 single-unders · 5 scaled wall walks · 50 single-unders · 20 hand-release push-ups · 50 single-unders · 20 hand-release push-ups · 50 single-unders · ♀ 45 lb (20 kg), 65 lb (29 kg), 75 lb (34 kg), 85 lb (38 kg) · ♂ 65 lb (29 kg), 95 lb (43 kg), 115 lb (52 kg), 135 lb (61 kg)', array['Open', 'AMRAP', 'Langhantel', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 23.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 24.1', 'For time:
21 dumbbell snatches, arm 1
21 lateral burpees over dumbbell
21 dumbbell snatches, arm 2
21 lateral burpees over dumbbell
15 dumbbell snatches, arm 1
15 lateral burpees over dumbbell
15 dumbbell snatches, arm 2
15 lateral burpees over dumbbell
9 dumbbell snatches, arm 1
9 lateral burpees over dumbbell
9 dumbbell snatches, arm 2
9 lateral burpees over dumbbell
*Time cap: 15 minutes
♀ 35-lb (15-kg) dumbbell
♂ 50-lb (22.5-kg) dumbbell', 'CrossFit Open 2024, Workout 24.1. Skaliert: ♀ 20-lb (10-kg) dumbbell · ♂ 35-lb (15-kg) dumbbell', array['Open', 'For Time', 'Kurzhanteln']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 24.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 24.2', 'As many rounds and reps as possible in 20 minutes of:
300-meter row
10 deadlifts
50 double-unders
♀ 125 lb (56 kg)
♂ 185 lb (83 kg)', 'CrossFit Open 2024, Workout 24.2. Skaliert: 50 single-unders · ♀ 95 lb (43 kg) · ♂ 135 lb (61 kg)', array['Open', 'AMRAP', 'Langhantel', 'Springseil', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 24.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 24.3', 'All for time:
5 rounds of:
10 thrusters, weight 1
10 chest-to-bar pull-ups
Rest 1 minute, then:
5 rounds of:
7 thrusters, weight 2
7 bar muscle-ups
Time cap: 15 minutes
♀ 65, 95 lb (29, 43 kg)
♂ 95, 135 lb (43, 61 kg)', 'CrossFit Open 2024, Workout 24.3. Skaliert: 10 jumping chest-to-bar pull-ups · 7 chin-over-bar pull-ups · ♀ 45 lb (20 kg), 65 lb (20, 29 kg) · ♂ 65 lb (29 kg), 95 lb (29, 43 kg)', array['Open', 'For Time', 'Intervalle', 'Langhantel', 'Klimmzugstange']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 24.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 25.1', 'As many rounds and reps as possible in 15 minutes of:
3 lateral burpees over the dumbbell
3 dumbbell hang clean-to-overheads
30-foot walking lunge (2 x 15 feet)
*After completing each round, add 3 reps to the burpees and hang clean-to-overheads.
♀ 35-lb (15-kg) dumbbell
♂ 50-lb (22.5-kg) dumbbell', 'CrossFit Open 2025, Workout 25.1. Skaliert: ♀ 20-lb (10-kg) dumbbell · ♂ 35-lb (15-kg) dumbbell', array['Open', 'AMRAP', 'Kurzhanteln']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 25.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 25.2', 'For time:
21 pull-ups
42 double-unders
21 thrusters (weight 1)
18 chest-to-bar pull-ups
36 double-unders
18 thrusters (weight 2)
15 bar muscle-ups
30 double-unders
15 thrusters (weight 3)
Time cap: 12 minutes
♀ 65, 75, 85 lb (29, 34, 38 kg)
♂ 95, 115, 135 lb (43, 52, 61 kg)', 'CrossFit Open 2025, Workout 25.2. Wiederholung von 22.3. Skaliert: ♀ Jumping pull-ups, then pull-ups, then chest-to-bar pull-ups | single-unders | 45, 55, 65 lb (20, 25, 29 kg) · ♂ Jumping pull-ups, then pull-ups, then chest-to-bar pull-ups | single-unders | 65, 85, 105 lb (29, 38, 47 kg)', array['Open', 'For Time', 'Chipper', 'Langhantel', 'Klimmzugstange', 'Springseil']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 25.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 25.3', 'For time:
5 wall walks
50-calorie row
5 wall walks
25 deadlifts
5 wall walks
25 cleans
5 wall walks
25 snatches
5 wall walks
50-calorie row
Time cap: 20 minutes
♀ 155-lb (70-kg) deadlift, 85-lb (38-kg) clean, 65-lb (29-kg) snatch
♂ 225-lb (102-kg) deadlift, 135-lb (61-kg) clean, 95-lb (43-kg) snatch', 'CrossFit Open 2025, Workout 25.3. Skaliert: ♀ Scaled wall walks | 85, 65, 45 lb (38, 29, 20 kg) · ♂ Scaled wall walks | 135, 95, 65 lb (61, 43, 29 kg)', array['Open', 'For Time', 'Chipper', 'Langhantel', 'Rudergerät']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 25.3'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 26.1', 'For time:
20 wall-ball shots
18 box jump-overs
30 wall-ball shots
18 box jump-overs
40 wall-ball shots
18 medicine-ball box step-overs
66 wall-ball shots
18 medicine-ball box step-overs
40 wall-ball shots
18 box jump-overs
30 wall-ball shots
18 box jump-overs
20 wall-ball shots
Time cap: 12 minutes
♀ 14-lb (6-kg) medicine ball, 9-foot target, 20 in (50 cm) box
♂ 20-lb (9-kg) medicine ball, 10-ft target, 24 in (60 cm) box', 'CrossFit Open 2026, Workout 26.1. Skaliert: ♀ 10-lb (4-kg) medicine ball, 9-foot target, 20 in (50 cm) box (may step up) · ♂ 14-lb (6-kg) medicine ball, 10-foot target, 24 in (60 cm) box (may step up)', array['Open', 'For Time', 'Box', 'Wall Ball', 'Medizinball']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 26.1'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 26.2', 'For time:
80-foot dumbbell overhead walking lunge
20 alternating dumbbell snatches
20 pull-ups
80-foot dumbbell overhead walking lunge
20 alternating dumbbell snatches
20 chest-to-bar pull-ups
80-foot dumbbell overhead walking lunge
20 alternating dumbbell snatches
20 muscle-ups
Time cap: 15 minutes
♀ 35-lb (15-kg) dumbbell
♂ 50-lb (22.5-kg) dumbbell', 'CrossFit Open 2026, Workout 26.2. Skaliert: 20 jumping pull-ups · ♀ 20-lb (10-kg) dumbbell · ♂ 35-lb (15-kg) dumbbell', array['Open', 'For Time', 'Chipper', 'Kurzhanteln', 'Klimmzugstange', 'Ringe']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 26.2'));

insert into workout_templates (title, workout, notes, tags)
select 'Open 26.3', 'For time:
2 rounds of:
12 burpees over the bar
12 cleans, weight 1
12 burpees over the bar
12 thrusters, weight 1
2 rounds of:
12 burpees over the bar
12 cleans, weight 2
12 burpees over the bar
12 thrusters, weight 2
2 rounds of:
12 burpees over the bar
12 cleans, weight 3
12 burpees over the bar
12 thrusters, weight 3
Time cap: 16 minutes
♀ 65, 75, 85 lb (29, 34, 38 kg)
♂ 95, 115, 135 lb (43, 52, 61 kg)', 'CrossFit Open 2026, Workout 26.3. Skaliert: 12 burpees over the bar (may step over barbell) · 12 burpees over the bar (may step over barbell) · 12 burpees over the bar (may step over barbell) · 12 burpees over the bar (may step over barbell) · 12 burpees over the bar (may step over barbell) · 12 burpees over the bar (may step over barbell) · ♀ 45, 55, 65 lb (20, 25, 29 kg) · ♂ 65, 85, 95 lb (29, 38, 43 kg)', array['Open', 'For Time', 'Langhantel']::text[]
 where not exists (select 1 from workout_templates where lower(title) = lower('Open 26.3'));

-- Kontrolle
select count(*) as vorlagen, count(*) filter (where 'Open' = any(tags)) as open_workouts from workout_templates;
