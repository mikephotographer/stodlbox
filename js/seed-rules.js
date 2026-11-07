// Startregeln für Equipment-Tipps. Identisch mit supabase/migrations/004_seed.sql.
// Wird vom Demo-Modus und von tests/equipment.test.html verwendet.
export const SEED_RULES = [
  { keywords: ['pull-up', 'pullup', 'chin-up', 'toes-to-bar', 't2b', 'ttb', 'muscle-up', 'bar muscle-up', 'ring muscle-up'], tip: 'Grips', case_sensitive: false },
  { keywords: ['double under', 'double-under', 'single under'], tip: 'eigenes Springseil', case_sensitive: false },
  { keywords: ['DU', 'DUs'], tip: 'eigenes Springseil', case_sensitive: true },
  { keywords: ['run', 'lauf', 'laufen', 'sled', 'schlitten', 'hyrox', '1 km', '400 m', '200 m'], tip: 'Laufschuhe', case_sensitive: false },
  { keywords: ['burpee', 'burpees', 'handstand', 'hspu', 'handstand walk'], tip: 'Handtuch & Wechselshirt', case_sensitive: false },
  { keywords: ['rope climb', 'seilklettern'], tip: 'lange Socken / Kniestrümpfe', case_sensitive: false },
  { keywords: ['clean', 'snatch', 'squat clean', 'front squat', 'back squat', 'deadlift'], tip: 'Gewichthebergürtel / Hebeschuhe (optional)', case_sensitive: false },
  { keywords: ['row', 'rower', 'rudern', 'ski', 'skierg'], tip: 'Handtuch', case_sensitive: false },
  { keywords: ['wall ball', 'wall balls'], tip: 'Handgelenk-Bandagen (optional)', case_sensitive: false },
];
