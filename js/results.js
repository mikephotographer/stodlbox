// Ergebnisse: Arten, Anzeige-Text, Reihenfolge (Rangliste, Bestwert). Ohne DOM.
import { detect, clock } from './timer.js';

/** Eingabe-Arten. cap ist „Zeit, aber im Time Cap nicht fertig“ und hat keinen eigenen Reiter. */
export const KINDS = {
  time: { label: 'Zeit' },
  rounds: { label: 'Runden' },
  reps: { label: 'Wdh.' },
  load: { label: 'Gewicht' },
  other: { label: 'Text' },
};

export const SCALES = { rx: 'Rx', scaled: 'Skaliert', beginner: 'Einsteiger' };

const SCALE_ORDER = { rx: 0, scaled: 1, beginner: 2 };
const KIND_ORDER = { time: 0, cap: 1, rounds: 2, reps: 3, load: 4, other: 5 };
const LOWER_IS_BETTER = new Set(['time']);

const deNum = (n) => String(n).replace('.', ',');

/** Anzeige-Text aus Art + Wert. Für „other“ den Text selbst übergeben. */
export function scoreText(kind, value, text = '') {
  const v = Number(value);
  if (kind === 'time') return clock(v, { up: true });
  if (kind === 'cap') return `Cap · ${v} Wdh.`;
  if (kind === 'rounds') {
    const r = Math.floor(v / 1000);
    const reps = v % 1000;
    return reps ? `${r} Rd. + ${reps}` : `${r} ${r === 1 ? 'Runde' : 'Runden'}`;
  }
  if (kind === 'reps') return `${v} Wdh.`;
  if (kind === 'load') return `${deNum(Math.round(v * 10) / 10)} kg`;
  return String(text || '').trim();
}

/** Vorschlag für die Art aus dem Workout-Text */
export function guessKind(workout) {
  const c = detect(workout);
  if (c) return c.mode === 'fortime' ? 'time' : c.mode === 'amrap' ? 'rounds' : 'reps';
  if (/\b(1\s*rm|3\s*rm|5\s*rm|max(?:imal)?\s*(?:load|gewicht)|heavy|schwer)/i.test(workout || '')) return 'load';
  return 'time';
}

/** Sortierung: Rx vor skaliert vor Einsteiger, dann Art, dann Wert (Zeit aufsteigend, sonst absteigend). */
export function compare(a, b) {
  const s = (SCALE_ORDER[a.scale] ?? 3) - (SCALE_ORDER[b.scale] ?? 3);
  if (s) return s;
  const k = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
  if (k) return k;
  if (a.kind === 'other' || a.value == null || b.value == null) return 0;
  return LOWER_IS_BETTER.has(a.kind) ? a.value - b.value : b.value - a.value;
}

const same = (a, b) => a.scale === b.scale && a.kind === b.kind && a.kind !== 'other' && Number(a.value) === Number(b.value);

/** Sortiert und vergibt Plätze (gleicher Wert = gleicher Platz, Zählung je Stufe). */
export function rank(list) {
  const sorted = [...list].sort(compare);
  let place = 0;
  let prev = null;
  let n = 0;
  return sorted.map((r) => {
    if (!prev || prev.scale !== r.scale) n = 0;
    n += 1;
    if (!prev || !same(prev, r)) place = n;
    prev = r;
    return { ...r, place: r.kind === 'other' ? null : place };
  });
}

/** Bestes Ergebnis einer Liste (oder null) */
export function best(list) {
  const scored = list.filter((r) => r.kind !== 'other' && r.value != null);
  return scored.length ? [...scored].sort(compare)[0] : null;
}

/** Ist a besser als b? */
export const better = (a, b) => !b || compare(a, b) < 0;

/** Bestwert pro Person (für die Workout-Seite) */
export function bestPerPerson(list) {
  const by = new Map();
  for (const r of list) {
    if (r.kind === 'other') continue;
    const cur = by.get(r.member_id);
    if (!cur || better(r, cur)) by.set(r.member_id, r);
  }
  return rank([...by.values()]);
}
