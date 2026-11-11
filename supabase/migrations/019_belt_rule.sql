-- =====================================================================
-- 019: Gewichthebergürtel nur noch bei Front/Back Squats und Deadlifts.
-- Die bisherige Regel „Gewichthebergürtel / Hebeschuhe (optional)“ wird
-- aufgeteilt: Gürtel bei Squats/Deadlifts, Hebeschuhe weiter bei Cleans,
-- Snatches und Squats. Mehrfach ausführbar.
-- =====================================================================

-- Gürtel-Regel (bisherige Regel wird umgebaut)
update equipment_rules
   set keywords = array['front squat','back squat','frontkniebeuge','deadlift','kreuzheben'],
       tip = 'Gewichthebergürtel (optional)'
 where tip ilike '%gewichthebergürtel%';

-- Hebeschuhe als eigene Regel (nur einmal anlegen)
insert into equipment_rules (keywords, tip, case_sensitive, sort)
select array['clean','snatch','front squat','back squat','overhead squat'], 'Hebeschuhe (optional)', false,
       coalesce((select sort from equipment_rules where tip = 'Gewichthebergürtel (optional)' limit 1), 60) + 1
 where not exists (select 1 from equipment_rules where tip ilike 'hebeschuhe%');

-- Kontrolle
select tip, keywords from equipment_rules where tip ilike '%gürtel%' or tip ilike '%hebeschuhe%' order by sort;
