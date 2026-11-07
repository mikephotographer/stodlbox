-- STODLBOX · 004 · Startdaten: Equipment-Regeln (im Admin-Bereich bearbeitbar)
-- app_settings kommt NICHT hier rein, sondern über das Snippet in SETUP.md (Mail + Gruppen-Code).

insert into equipment_rules (keywords, tip, case_sensitive, sort) values
  (array['pull-up','pullup','chin-up','toes-to-bar','t2b','ttb','muscle-up','bar muscle-up','ring muscle-up'], 'Grips', false, 10),
  (array['double under','double-under','single under'], 'eigenes Springseil', false, 20),
  -- "DU" nur in Großbuchstaben, damit "wenn du willst" keinen Treffer liefert
  (array['DU','DUs'], 'eigenes Springseil', true, 21),
  (array['run','lauf','laufen','sled','schlitten','hyrox','1 km','400 m','200 m'], 'Laufschuhe', false, 30),
  (array['burpee','burpees','handstand','hspu','handstand walk'], 'Handtuch & Wechselshirt', false, 40),
  (array['rope climb','seilklettern'], 'lange Socken / Kniestrümpfe', false, 50),
  (array['clean','snatch','squat clean','front squat','back squat','deadlift'], 'Gewichthebergürtel / Hebeschuhe (optional)', false, 60),
  (array['row','rower','rudern','ski','skierg'], 'Handtuch', false, 70),
  (array['wall ball','wall balls'], 'Handgelenk-Bandagen (optional)', false, 80);
