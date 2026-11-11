-- =====================================================================
-- 018: Art bei bestehenden Workouts nachgeschärft.
-- „Chipper“ nur noch bei mindestens 4 verschiedenen Übungen (nicht bei
-- Leitern wie 21-15-9 aus 2–3 Übungen). Erkennung wie js/classify.js.
-- Mehrfach ausführbar.
-- =====================================================================

update workout_templates set tags = array['Hero', 'For Time', 'Langhantel', 'Laufen']::text[], updated_at = now() where title = 'Abbate';
update workout_templates set tags = array['Hero', 'For Time', 'Kettlebell']::text[], updated_at = now() where title = 'Arnie';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel', 'Klimmzugstange', 'Laufen']::text[], updated_at = now() where title = 'Daniel';
update workout_templates set tags = array['Hero', 'For Time', 'Kurzhanteln', 'Laufen']::text[], updated_at = now() where title = 'Feeks';
update workout_templates set tags = array['Hero', 'For Time', 'Klimmzugstange', 'Medizinball', 'Laufen']::text[], updated_at = now() where title = 'Gallant';
update workout_templates set tags = array['Hero', 'For Time', 'Chipper', 'Langhantel', 'Kletterseil', 'Laufen']::text[], updated_at = now() where title = 'Glen';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel']::text[], updated_at = now() where title = 'J.J.';
update workout_templates set tags = array['Hero', 'For Time', 'Chipper', 'Kettlebell', 'Klimmzugstange', 'Laufen']::text[], updated_at = now() where title = 'Jag 28';
update workout_templates set tags = array['Hero', 'For Time', 'Ringe']::text[], updated_at = now() where title = 'Jason';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel', 'GHD']::text[], updated_at = now() where title = 'Jorge';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel', 'Klimmzugstange']::text[], updated_at = now() where title = 'Josh';
update workout_templates set tags = array['Girls', 'For Time', 'Langhantel', 'Laufen', 'Benchmark']::text[], updated_at = now() where title = 'Ladder Nancy';
update workout_templates set tags = array['Hero', 'For Time', 'Chipper', 'Langhantel', 'Klimmzugstange', 'Kletterseil', 'Hantelscheibe', 'Laufen']::text[], updated_at = now() where title = 'Liam';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel']::text[], updated_at = now() where title = 'Omar';
update workout_templates set tags = array['Hero', 'For Time', 'Laufen', 'Ohne Geräte']::text[], updated_at = now() where title = 'Terry';
update workout_templates set tags = array['Hero', 'For Time', 'Langhantel', 'Kletterseil']::text[], updated_at = now() where title = 'Tommy V';
update workout_templates set tags = array['Hero', 'For Time', 'Klimmzugstange', 'Ringe', 'Laufen']::text[], updated_at = now() where title = 'Yeti';

-- Kontrolle
select count(*) filter (where 'Chipper' = any(tags)) as chipper, count(*) as vorlagen from workout_templates;
