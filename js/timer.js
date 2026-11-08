// Workout-Timer: reine Logik ohne DOM (For Time, AMRAP, EMOM, Tabata).
// Die Zeit wird immer aus Start-Zeitpunkt und Pausen berechnet, nie hochgezählt.
// So läuft der Timer auch richtig weiter, wenn das Handy kurz gesperrt war.

export const MODES = {
  fortime: { label: 'For Time', hint: 'Zeit läuft hoch. Optional mit Time Cap.' },
  amrap: { label: 'AMRAP', hint: 'So viele Runden wie möglich in der Zeit.' },
  emom: { label: 'EMOM', hint: 'Jede Minute (oder alle X Minuten) eine neue Runde.' },
  tabata: { label: 'Tabata', hint: 'Arbeit und Pause im Wechsel, klassisch 20/10 × 8.' },
};

export const DEFAULTS = {
  fortime: { mode: 'fortime', cap: 0 },
  amrap: { mode: 'amrap', duration: 12 * 60 },
  emom: { mode: 'emom', interval: 60, rounds: 10 },
  tabata: { mode: 'tabata', work: 20, rest: 10, rounds: 8 },
};

export const PREP = 10; // Sekunden Vorlauf

const clampInt = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Konfiguration säubern (aus URL, Speicher oder Formular) */
export function normalize(c) {
  const mode = MODES[c && c.mode] ? c.mode : 'fortime';
  const d = DEFAULTS[mode];
  if (mode === 'fortime') return { mode, cap: clampInt(c.cap, 0, 6 * 3600, d.cap) };
  if (mode === 'amrap') return { mode, duration: clampInt(c.duration, 30, 6 * 3600, d.duration) };
  if (mode === 'emom') return { mode, interval: clampInt(c.interval, 10, 3600, d.interval), rounds: clampInt(c.rounds, 1, 200, d.rounds) };
  return { mode, work: clampInt(c.work, 5, 3600, d.work), rest: clampInt(c.rest, 0, 3600, d.rest), rounds: clampInt(c.rounds, 1, 100, d.rounds) };
}

/** Abschnitte: Vorlauf, dann Arbeit/Pause. dur in Sekunden, Infinity = offen (For Time ohne Cap). */
export function segments(c) {
  const s = [{ kind: 'prep', dur: PREP, round: 0 }];
  if (c.mode === 'fortime') s.push({ kind: 'work', dur: c.cap || Infinity, round: 1 });
  else if (c.mode === 'amrap') s.push({ kind: 'work', dur: c.duration, round: 1 });
  else if (c.mode === 'emom') for (let r = 1; r <= c.rounds; r++) s.push({ kind: 'work', dur: c.interval, round: r });
  else {
    for (let r = 1; r <= c.rounds; r++) {
      s.push({ kind: 'work', dur: c.work, round: r });
      if (c.rest > 0 && r < c.rounds) s.push({ kind: 'rest', dur: c.rest, round: r });
    }
  }
  return s;
}

export const totalRounds = (c) => (c.mode === 'emom' || c.mode === 'tabata' ? c.rounds : 0);

/** Gesamtdauer ohne Vorlauf in Sekunden (Infinity bei For Time ohne Cap) */
export function mainDuration(c) {
  return segments(c).slice(1).reduce((a, s) => a + s.dur, 0);
}

/**
 * Zustand nach elapsed Sekunden (inkl. Vorlauf).
 * remaining: Rest im aktuellen Abschnitt, main: Sekunden seit dem Start nach dem Vorlauf.
 */
export function stateAt(c, elapsed) {
  const segs = segments(c);
  let t = Math.max(0, elapsed);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (t < s.dur) {
      return { done: false, index: i, kind: s.kind, round: s.round, inSeg: t, remaining: s.dur - t, segDur: s.dur, main: Math.max(0, elapsed - PREP) };
    }
    t -= s.dur;
  }
  const last = segs[segs.length - 1];
  return { done: true, index: segs.length - 1, kind: 'done', round: last.round, inSeg: last.dur, remaining: 0, segDur: last.dur, main: mainDuration(c) };
}

/** 754 → "12:34", 3725 → "1:02:05". up: abrunden (hochzählend), sonst aufrunden (Countdown) */
export function clock(sec, { up = false } = {}) {
  const s = Math.max(0, up ? Math.floor(sec + 1e-6) : Math.ceil(sec - 1e-6));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(r).padStart(2, '0')}`;
}

/** Kurzbeschreibung, z. B. „AMRAP 20 Min.“ oder „Tabata 20/10 × 8“ */
export function describe(c) {
  const min = (s) => (s % 60 ? clock(s) : `${s / 60} Min.`);
  if (c.mode === 'fortime') return c.cap ? `For Time · Cap ${min(c.cap)}` : 'For Time';
  if (c.mode === 'amrap') return `AMRAP ${min(c.duration)}`;
  if (c.mode === 'emom') return c.interval === 60 ? `EMOM ${c.rounds} Min.` : `Alle ${min(c.interval)} × ${c.rounds}`;
  return `Tabata ${c.work}/${c.rest} × ${c.rounds}`;
}

// ------------------------------------------------------------ URL-Parameter

export function toQuery(c) {
  const p = new URLSearchParams({ m: c.mode });
  if (c.mode === 'fortime' && c.cap) p.set('cap', c.cap);
  if (c.mode === 'amrap') p.set('d', c.duration);
  if (c.mode === 'emom') { p.set('i', c.interval); p.set('r', c.rounds); }
  if (c.mode === 'tabata') { p.set('w', c.work); p.set('p', c.rest); p.set('r', c.rounds); }
  return p.toString();
}

export function fromQuery(q) {
  const m = q.get('m');
  if (!MODES[m]) return null;
  return normalize({ mode: m, cap: q.get('cap'), duration: q.get('d'), interval: q.get('i'), rounds: q.get('r'), work: q.get('w'), rest: q.get('p') });
}

// ------------------------------------------------------------ Workout-Text erkennen

const num = (s) => Number(String(s).replace(',', '.'));

/**
 * Liest aus dem Workout-Text eine passende Timer-Einstellung.
 * Deutsch und Englisch: „AMRAP 20 Min.“, „20-minute AMRAP“, „as many rounds as possible in 20 minutes“,
 * „EMOM 30“, „E2MOM 20“, „Every 2 minutes for 20 minutes“, „Tabata“, „For Time“, „Time Cap 15“.
 */
export function detect(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  let m;

  if (/\btabata\b/i.test(t)) {
    const r = t.match(/(\d+)\s*(?:runden|rounds|intervals?)/i);
    return normalize({ mode: 'tabata', work: 20, rest: 10, rounds: r ? num(r[1]) : 8 });
  }

  if ((m = t.match(/\bE(\d+)MOM\b[^\d\n]{0,12}(\d+)/i))) {
    const iv = num(m[1]) * 60;
    return normalize({ mode: 'emom', interval: iv, rounds: Math.max(1, Math.round((num(m[2]) * 60) / iv)) });
  }
  if ((m = t.match(/\bEMOM\b[^\d\n]{0,12}(\d+)/i)) || (m = t.match(/(\d+)[\s-]*(?:min(?:ute)?s?\.?)\s*EMOM/i))) {
    return normalize({ mode: 'emom', interval: 60, rounds: num(m[1]) });
  }
  if ((m = t.match(/every\s+(\d+)\s*min(?:ute)?s?\s+for\s+(\d+)\s*min/i)) || (m = t.match(/alle\s+(\d+)\s*min(?:uten)?\.?\s+(?:für|über)\s+(\d+)\s*min/i))) {
    const iv = num(m[1]) * 60;
    return normalize({ mode: 'emom', interval: iv, rounds: Math.max(1, Math.round((num(m[2]) * 60) / iv)) });
  }
  if ((m = t.match(/every\s+minute[^\n]{0,20}?for\s+(\d+)\s*min/i)) || (m = t.match(/jede\s+minute[^\n]{0,20}?(\d+)\s*min/i))) {
    return normalize({ mode: 'emom', interval: 60, rounds: num(m[1]) });
  }

  if ((m = t.match(/\bAMRAP\b[^\d\n]{0,12}(\d+(?:[.,]\d+)?)/i))
    || (m = t.match(/(\d+(?:[.,]\d+)?)[\s-]*(?:min(?:ute)?s?\.?)\s*AMRAP/i))
    || (m = t.match(/as many (?:rounds|reps)[^\n]{0,40}?in\s+(\d+(?:[.,]\d+)?)\s*min/i))) {
    return normalize({ mode: 'amrap', duration: num(m[1]) * 60 });
  }

  if ((m = t.match(/on an?\s+(\d+)[\s-]*min(?:ute)?s?\.?\s+clock/i)) || (m = t.match(/(\d+)\s*min(?:ute)?s?\.?\s+to complete/i))) {
    return normalize({ mode: 'fortime', cap: num(m[1]) * 60 });
  }
  if (/\bfor\s+time\b/i.test(t) || /\bauf\s+zeit\b/i.test(t)) {
    const cap = t.match(/(?:time\s*cap|zeitlimit|cap)\s*[:=]?\s*(\d+)/i) || t.match(/(\d+)[\s-]*min(?:ute)?s?\.?\s*(?:time\s*)?cap/i);
    return normalize({ mode: 'fortime', cap: cap ? num(cap[1]) * 60 : 0 });
  }
  return null;
}
