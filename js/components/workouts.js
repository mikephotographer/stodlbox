// Workout-Datenbank: Tags, Filter-Chips, Listenzeilen.
import { html } from '../html.js';

/** "Girls, hero ,  Partner" → ['Girls','hero','Partner'] (ohne Dubletten, Groß/klein egal) */
export function parseTags(str) {
  const out = [];
  const seen = new Set();
  String(str || '').split(',').map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean).forEach((t) => {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t.slice(0, 30)); }
  });
  return out;
}

/** Alle Tags mit Anzahl, häufigste zuerst */
export function tagCounts(list) {
  const m = new Map();
  list.forEach((w) => (w.tags || []).forEach((t) => {
    const k = t.toLowerCase();
    const cur = m.get(k) || { tag: t, n: 0 };
    cur.n += 1;
    m.set(k, cur);
  }));
  return [...m.values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'de'));
}

export const hasTag = (w, tag) => !tag || (w.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase());

export function matchesQuery(w, q) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return w.title.toLowerCase().includes(n) || (w.workout || '').toLowerCase().includes(n)
    || (w.tags || []).some((t) => t.toLowerCase().includes(n));
}

/** Filterleiste: "Alle" + Tags. active = Tag oder '' */
export function filterChips(counts, active, { total } = {}) {
  return html`<div class="chips" role="group" aria-label="Nach Gruppe filtern">
    <button type="button" class="chip" data-tag="" aria-pressed="${String(!active)}">Alle${total != null ? html` <span class="n">${total}</span>` : ''}</button>
    ${counts.map((c) => html`<button type="button" class="chip" data-tag="${c.tag}" aria-pressed="${String(!!active && active.toLowerCase() === c.tag.toLowerCase())}">${c.tag} <span class="n">${c.n}</span></button>`)}
  </div>`;
}

/** Erste Zeilen des Workouts als Vorschau */
export function preview(text, lines = 2) {
  const all = String(text || '').split('\n').filter((l) => l.trim());
  return all.slice(0, lines).join('\n') + (all.length > lines ? ' …' : '');
}

export function workoutRow(w) {
  return html`<li><button class="pick wo" data-action="edit" data-id="${w.id}">
    <span class="t">${w.title}</span>
    ${w.tags && w.tags.length ? html`<span class="tags">${w.tags.join(' · ')}</span>` : ''}
    <span class="w">${preview(w.workout)}</span></button></li>`;
}
