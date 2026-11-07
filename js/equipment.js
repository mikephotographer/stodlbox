// Equipment-Tipps aus dem Workout-Text (Abschnitt 3.4 im Plan).
//
// Ein Keyword wird in Teile zerlegt (Leerzeichen, Bindestriche, Wechsel Zahl/Buchstabe).
// Zwischen den Teilen ist im Text beliebig viel Leerraum oder ein Bindestrich erlaubt:
//   "pull-up" trifft "Pull-Ups", "pullup", "Pull Up"; "400 m" trifft "400m".
// Treffer nur an Wortgrenzen (Unicode-fähig): "run" trifft nicht "Runden".
// Am Ende ist ein Plural-s erlaubt ("Burpees", "Rows").
// Regeln mit case_sensitive (z. B. "DU") treffen nur exakt so geschrieben – "wenn du willst" bleibt frei.

const SEP = '[\\s\\-‐‑‒–—_]*';
const cache = new Map();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokens(keyword) {
  return String(keyword)
    .trim()
    .split(/[\s\-‐-—_]+/u)
    .flatMap((t) => t.match(/\p{N}+|[^\p{N}]+/gu) || [])
    .filter(Boolean);
}

export function keywordRegex(keyword, caseSensitive = false) {
  const key = `${caseSensitive ? 1 : 0}|${keyword}`;
  if (cache.has(key)) return cache.get(key);
  const parts = tokens(keyword);
  if (!parts.length) return null;
  const body = parts.map(escapeRe).join(SEP);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:e?s)?(?![\\p{L}\\p{N}])`, caseSensitive ? 'gu' : 'giu');
  cache.set(key, re);
  return re;
}

/**
 * @param {string} text Workout-Text
 * @param {{keywords:string[], tip:string, case_sensitive?:boolean, active?:boolean}[]} rules
 * @returns {{tip:string, terms:string[]}[]} eindeutige Tipps in Regel-Reihenfolge
 */
export function matchEquipment(text, rules) {
  if (!text || !rules || !rules.length) return [];
  const byTip = new Map();
  for (const rule of rules) {
    if (rule.active === false) continue;
    for (const kw of rule.keywords || []) {
      const re = keywordRegex(kw, !!rule.case_sensitive);
      if (!re) continue;
      re.lastIndex = 0;
      const m = re.exec(text);
      if (!m) continue;
      const entry = byTip.get(rule.tip) || { tip: rule.tip, hits: [] };
      const term = m[0].trim();
      if (!entry.hits.some((h) => h.term.toLowerCase() === term.toLowerCase())) entry.hits.push({ term, index: m.index });
      byTip.set(rule.tip, entry);
    }
  }
  return [...byTip.values()].map(({ tip, hits }) => ({
    tip,
    terms: hits.sort((a, b) => a.index - b.index).map((h) => h.term),
  }));
}

/** Ein Tipp mit Auslöser: „Grips (Toes-to-Bar)“, „Handgelenk-Bandagen (Wall Balls, optional)“ */
export function tipWithTerms(tip, terms) {
  const m = String(tip).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const base = m ? m[1] : tip;
  const extra = m ? [m[2]] : [];
  return `${base} (${[...terms, ...extra].join(', ')})`;
}

/** „Grips (Toes-to-Bar) und Laufschuhe (Run)“ */
export function equipmentSentence(matches, maxTerms = 1) {
  const parts = matches.map((m) => tipWithTerms(m.tip, m.terms.slice(0, maxTerms)));
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
}
