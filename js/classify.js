// Workout-Einteilung: Gruppe, Art (Format) und Geräte. Ohne DOM, läuft auch in Node.
// Alles landet in workout_templates.tags (feste Begriffe), damit Suche und Filter einfach bleiben.

/** Gruppen: genau eine pro Workout */
export const CATEGORIES = ['Girls', 'Hero', 'Open', 'CrossFit', 'Hyrox', 'Eigene'];

/** Art des Workouts (mehrere möglich) */
export const FORMATS = ['For Time', 'AMRAP', 'EMOM', 'Tabata', 'Chipper', 'Intervalle', 'Leiter', 'Max. Wdh.', 'Kraft'];

/** Geräte in fester Reihenfolge. „Ohne Geräte“ = nur Körpergewicht (Laufen zählt nicht als Gerät). */
export const EQUIPMENT = [
  'Langhantel', 'Kurzhanteln', 'Kettlebell', 'Klimmzugstange', 'Ringe', 'Kletterseil', 'Box', 'Wall Ball',
  'Medizinball', 'Sandbag', 'Gewichtsweste', 'Hantelscheibe', 'Springseil', 'Rudergerät', 'Bike', 'SkiErg',
  'Schlitten', 'GHD', 'Laufen', 'Schwimmen', 'Ohne Geräte',
];

/** Weitere Merkmale */
export const EXTRAS = ['Benchmark', 'Partner', 'Team'];

const KNOWN = new Map([...CATEGORIES, ...FORMATS, ...EQUIPMENT, ...EXTRAS].map((t) => [t.toLowerCase(), t]));
/** Alte Schreibweisen aus dem Import auf die festen Begriffe abbilden */
const ALIASES = { girls: 'Girls', hero: 'Hero', hyrox: 'Hyrox', 'for time': 'For Time', amrap: 'AMRAP', emom: 'EMOM', kraft: 'Kraft', bodyweight: 'Ohne Geräte', partner: 'Partner', benchmark: 'Benchmark' };

export const canonical = (t) => KNOWN.get(String(t).toLowerCase()) || ALIASES[String(t).toLowerCase()] || String(t).trim();
export const categoryOf = (tags) => (tags || []).map(canonical).find((t) => CATEGORIES.includes(t)) || null;
export const formatsOf = (tags) => (tags || []).map(canonical).filter((t) => FORMATS.includes(t));
export const equipmentOf = (tags) => (tags || []).map(canonical).filter((t) => EQUIPMENT.includes(t));
export const extrasOf = (tags) => (tags || []).map(canonical).filter((t) => !CATEGORIES.includes(t) && !FORMATS.includes(t) && !EQUIPMENT.includes(t));

/** Tags in fester Reihenfolge: Gruppe, Art, Geräte, Rest */
export function orderTags({ category, formats = [], equipment = [], extras = [] }) {
  const out = [];
  if (category) out.push(category);
  FORMATS.forEach((f) => { if (formats.includes(f)) out.push(f); });
  EQUIPMENT.forEach((e) => { if (equipment.includes(e)) out.push(e); });
  extras.forEach((x) => { if (!out.includes(x)) out.push(x); });
  return out;
}

// ------------------------------------------------------------ Erkennung aus dem Text

const has = (re, s) => re.test(s);

/** Geräte pro Zeile erkennen (Englisch und Deutsch) */
export function detectEquipment(text) {
  const found = new Set();
  const lines = String(text || '').toLowerCase().split('\n');
  for (const raw of lines) {
    const l = raw.replace(/[–—]/g, '-');
    const db = /\bdumbbells?\b|\bdb\b|kurzhantel/.test(l);
    const kb = /\bkettlebells?\b|\bkb\b|russian swing|american swing|\bkbs\b/.test(l);
    if (db) found.add('Kurzhanteln');
    if (kb) found.add('Kettlebell');
    if (/\bsandbags?\b/.test(l)) found.add('Sandbag');
    const implement = db || kb || /\bsandbags?\b|\bwall[- ]?balls?\b|medicine[- ]ball|med[- ]?ball|\bplates?\b|\bd-?ball/.test(l);
    if (!implement && has(/\bbarbell\b|langhantel|\bclean(s|-and-jerks?| and jerks?)?\b|\bjerks?\b|\bsnatch(es)?\b|deadlifts?|thrusters?|\b(back|front|overhead)[- ]squats?\b|push[- ]press(es)?|shoulder press(es)?|strict press(es)?|bench press(es)?|\bpresses\b|sumo deadlift|\bsdhp\b|hang power|power clean|squat clean|good mornings?|\blunges? with (a )?bar|overhead lunge|bar(bell)? (complex|rows?)|\bbear complex|hang squat/, l)) found.add('Langhantel');
    if (has(/pull-?ups?|chin-?ups?|toes-?to-?bars?|\bt2b\b|knees-?to-?elbows?|\bk2e\b|chest-?to-?bar|\bc2b\b|bar muscle-?ups?|hanging|klimmz/, l)) found.add('Klimmzugstange');
    if (has(/\brings?\b|ring (dips?|rows?|push-?ups?)|(?<!bar )muscle-?ups?/, l) && !/bar muscle-?up/.test(l.replace(/ring muscle/, ''))) found.add('Ringe');
    if (/ring muscle-?ups?/.test(l)) found.add('Ringe');
    if (has(/rope climbs?|rope ascents?|\bropes?\b(?! jump)|kletterseil|legless/, l) && !/jump[- ]?rope|double-?unders?|single-?unders?/.test(l)) found.add('Kletterseil');
    if (has(/\bbox\b|box jumps?|box step|step-?ups?|-inch box|\bbjo?\b|burpee box/, l)) found.add('Box');
    if (has(/wall[- ]?balls?|wall-ball/, l)) found.add('Wall Ball');
    // „medicine ball to a 10-foot target“ ist die Wall-Ball-Angabe
    if (/(medicine|med)[- ]?ball to (a )?\d+[- ]?(-?foot|feet|ft)/.test(l)) found.add('Wall Ball');
    else if (has(/medicine[- ]ball|med[- ]?ball|slam ?balls?|ball slams?|\bd-?balls?\b|atlas stones?|ball clean/, l) && !/wall[- ]?ball/.test(l)) found.add('Medizinball');
    if (has(/weight(ed)? vest|\bvests?\b|body armor|gewichtsweste|\bweste\b/, l)) found.add('Gewichtsweste');
    if (has(/\bplates?\b|hantelscheibe|plate (carry|ground|pinch)/, l)) found.add('Hantelscheibe');
    if (has(/double-?unders?|single-?unders?|jump[- ]?rope|\bdus?\b|seilspring/, l)) found.add('Springseil');
    if (has(/\brow(s|ing|er)?\b|rudern/, l) && !/(ring|bent[- ]over|renegade|upright|dumbbell|kettlebell|barbell|pendlay|inverted|seated|gorilla|bar|db|kb|plate)\s*-?\s*rows?/.test(l)) found.add('Rudergerät');
    if (has(/\bbike\b|assault|echo bike|airdyne|\bbiking\b|cycle/, l)) found.add('Bike');
    if (has(/\bski(-?erg| erg|ing)?\b/, l)) found.add('SkiErg');
    if (has(/\bsled\b|sled (push|pull|drag)|schlitten|prowler/, l)) found.add('Schlitten');
    if (has(/\bghd\b|glute-?ham/, l)) found.add('GHD');
    if (has(/\brun(s|ning)?\b|\bsprints?\b|\bmile\b|\bmiles\b|\blauf|\bjog/, l) && !/run\s*through|runner-?up/.test(l)) found.add('Laufen');
    if (has(/\bswim(s|ming)?\b|schwimm/, l)) found.add('Schwimmen');
  }
  // „With a single kettlebell“: Übungen wie Overhead Squats sind dann mit der Kettlebell
  if (/(with|using) (a|one) (single )?kettlebell/.test(String(text).toLowerCase()) && !/barbell/i.test(text)) found.delete('Langhantel');
  const gear = [...found].filter((e) => e !== 'Laufen' && e !== 'Schwimmen');
  if (!gear.length) found.add('Ohne Geräte');
  return EQUIPMENT.filter((e) => found.has(e));
}

const NUMWORDS = 'two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty';

/** Art des Workouts erkennen */
export function detectFormats(text) {
  const t = String(text || '').toLowerCase();
  const f = new Set();
  if (/\bamrap\b|as many (rounds|reps)|so viele runden|complete as many|max(imum)? reps possible/.test(t)) f.add('AMRAP');
  if (/\be\d*mom\b|every minute|on the minute|every \d+(:\d+)? ?min|every (two|three|four|five) minutes|jede minute|alle \d+ min/.test(t)) f.add('EMOM');
  if (/\btabata\b/.test(t)) f.add('Tabata');
  if (/death by|ladder|ascending|\bleiter\b/.test(t)) f.add('Leiter');
  if (/1-?rep max|\b1 ?rm\b|\b\d ?rm\b|max(imum)? (load|weight)|for max load|heaviest|find (a|your) (\d-rep|max|heavy (single|double|triple))|\d-rep-max|establish a|\bheavy single|\bkraft\b|for load\b/.test(t)) f.add('Kraft');
  if (/max(imum)? (reps|repetitions)|total reps|for reps|for max|as many reps|(?<!rep-)max (rounds|reps|pull|push|burpees)|score is (the )?(total|number)|fight gone bad/.test(t) && !f.has('AMRAP')) f.add('Max. Wdh.');
  // „Time cap“ allein macht noch kein For Time (AMRAPs und Maximalversuche haben auch eines)
  if (/\bfor (total )?time\b|\bauf zeit\b|for completion/.test(t) || (/\btime cap\b/.test(t) && !f.has('AMRAP') && !f.has('Kraft'))) f.add('For Time');
  // Absteigende Wiederholungen wie 21-15-9 oder 30-25-20-15-10-5 sind auf Zeit
  if (!f.size && /\b\d+(-\d+){2,}\b/.test(t)) f.add('For Time');
  if (/\brest\b|\bpause\b|then rest|followed by/.test(t) && /\brounds?\b|\bsets?\b|\bintervals?\b|\brunden\b/.test(t)) f.add('Intervalle');

  // Chipper: For Time, nur eine Runde, mindestens 5 Übungen untereinander
  if (f.has('For Time') && !new RegExp(`(\\d+|${NUMWORDS})[ -]rounds?|rounds? (for time|of)|\\brunden\\b`).test(t)) {
    const moves = t.split('\n').filter((l) => (/^\s*\d[\d,.]*\s*(-|x|×)?\s*[a-zäöü]/.test(l) || /^\s*(run|row|swim|bike|ski|sprint)\b[^\n]*\d/.test(l)) && !/^\s*[♂♀]/.test(l));
    // mindestens 4 verschiedene Übungen (sonst ist es eine Leiter aus 2–3 Übungen)
    const names = new Set(moves.map((l) => l.replace(/^[\s\d,.\-x×]+/, '').replace(/^(cal(orie)?s?\.?|meters?|m|ft\.?|foot|feet|-)\s+/, '').split(/[,(]/)[0].replace(/[\d.,:-]+/g, ' ').replace(/\b(meters?|m|miles?|calories?|cal|ft|feet|foot|with|a|an|the|to)\b/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ').replace(/s\b/g, '')));
    if (moves.length >= 5 && names.size >= 4) f.add('Chipper');
  }
  // Keine Art erkannt, aber Runden mit Übungen → meist auf Zeit
  if (!f.size && new RegExp(`(\\d+|${NUMWORDS})[ -]rounds?|\\brunden\\b`).test(t)) f.add('For Time');
  return FORMATS.filter((x) => f.has(x));
}

/**
 * Vorschlag für ein Workout. Bestehende Gruppe und Merkmale (Benchmark, Partner …) bleiben erhalten.
 * Gibt die neuen tags zurück.
 */
export function suggestTags({ title = '', workout = '', tags = [] } = {}) {
  const cur = (tags || []).map(canonical);
  let category = categoryOf(cur);
  const t = `${title}\n${workout}`;
  if (!category) category = /hyrox/i.test(t) ? 'Hyrox' : 'CrossFit';
  const formats = detectFormats(workout);
  const equipment = detectEquipment(workout);
  const extras = extrasOf(cur).filter((x) => x !== 'Skaliert');
  if (/\bpartner|zu zweit|with a partner|in teams? of 2|\bteams? of two\b/i.test(t) && !extras.includes('Partner')) extras.push('Partner');
  if (/\bteams? of (3|4|three|four)\b/i.test(t) && !extras.includes('Team')) extras.push('Team');
  return orderTags({ category, formats, equipment, extras });
}
