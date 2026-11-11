// Workout-Datenbank: Tags, Filter-Chips, Listenzeilen.
import { html } from '../html.js';
import { sheet } from '../ui.js';
import { CATEGORIES, FORMATS, EQUIPMENT, EXTRAS, canonical, categoryOf, formatsOf, equipmentOf } from '../classify.js';

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

export const hasTag = (w, tag) => !tag || (w.tags || []).some((t) => canonical(t).toLowerCase() === canonical(tag).toLowerCase());

// ------------------------------------------------------------ Gruppen und Filter

/** Gruppen mit Anzahl (nur vorhandene), in fester Reihenfolge */
export function categoryCounts(list) {
  const m = new Map();
  list.forEach((w) => { const c = categoryOf(w.tags) || 'CrossFit'; m.set(c, (m.get(c) || 0) + 1); });
  return CATEGORIES.filter((c) => m.has(c)).map((c) => ({ tag: c, n: m.get(c) }));
}

export const emptyFilter = () => ({ cat: '', formats: [], equipment: [], extras: [] });
export const filterCount = (f) => f.formats.length + f.equipment.length + f.extras.length;

/** Art: eine davon reicht. Geräte und Merkmale: alle gewählten müssen vorkommen. */
export function matchesFilter(w, f) {
  const tags = (w.tags || []).map(canonical);
  if (f.cat && (categoryOf(tags) || 'CrossFit') !== f.cat) return false;
  if (f.formats.length && !f.formats.some((x) => tags.includes(x))) return false;
  if (f.equipment.some((x) => !tags.includes(x))) return false;
  if (f.extras.some((x) => !tags.includes(x))) return false;
  return true;
}

/** Ein einzelner Tag (z. B. aus einem Link) als Filter */
export function filterFromTag(t) {
  const f = emptyFilter();
  const c = canonical(t || '');
  if (!c) return f;
  if (CATEGORIES.includes(c)) f.cat = c;
  else if (FORMATS.includes(c)) f.formats = [c];
  else if (EQUIPMENT.includes(c)) f.equipment = [c];
  else f.extras = [c];
  return f;
}

/** Zeile unter der Suche: Gruppen-Chips */
export function categoryChips(list, active) {
  const counts = categoryCounts(list);
  return html`<div class="chips" role="group" aria-label="Nach Gruppe filtern">
    <button type="button" class="chip" data-cat="" aria-pressed="${String(!active)}">Alle <span class="n">${list.length}</span></button>
    ${counts.map((c) => html`<button type="button" class="chip" data-cat="${c.tag}" aria-pressed="${String(active === c.tag)}">${c.tag} <span class="n">${c.n}</span></button>`)}
  </div>`;
}

/** „Filter“-Knopf und die gewählten Filter zum Wegtippen */
export function filterBar(f) {
  const n = filterCount(f);
  const all = [...f.formats.map((v) => ['formats', v]), ...f.equipment.map((v) => ['equipment', v]), ...f.extras.map((v) => ['extras', v])];
  return html`<div class="wo-filterbar">
    <button type="button" class="chip filter-btn" data-action="filters" aria-pressed="${String(n > 0)}">Art &amp; Geräte${n ? html` <span class="n">${n}</span>` : ''}</button>
    ${all.map(([k, v]) => html`<button type="button" class="chip on" data-remove="${k}" data-value="${v}" aria-label="Filter ${v} entfernen">${v} ×</button>`)}
  </div>`;
}

/** Sheet zum Wählen von Art, Geräten und Merkmalen. Resolve: neuer Filter oder undefined. */
export function filterSheet(list, f) {
  const cur = { ...f, formats: [...f.formats], equipment: [...f.equipment], extras: [...f.extras] };
  const base = list.filter((w) => matchesFilter(w, { ...emptyFilter(), cat: f.cat }));
  const count = (k, v) => base.filter((w) => (w.tags || []).map(canonical).includes(v)).length;
  const group = (title, k, values, hint) => {
    const shown = values.filter((v) => count(k, v) > 0 || cur[k].includes(v));
    if (!shown.length) return '';
    return html`<p class="label" style="margin:18px 0 0">${title}</p>${hint ? html`<p class="hint" style="margin:2px 0 0">${hint}</p>` : ''}
      <div class="chips wrap">${shown.map((v) => html`<button type="button" class="chip" data-k="${k}" data-v="${v}" aria-pressed="${String(cur[k].includes(v))}">${v} <span class="n">${count(k, v)}</span></button>`)}</div>`;
  };
  const result = () => base.filter((w) => matchesFilter(w, cur)).length;
  return sheet('Filter', html`<div class="wo-filter-sheet">
      ${group('Art', 'formats', FORMATS, 'Eine davon reicht.')}
      ${group('Geräte', 'equipment', EQUIPMENT, 'Alle gewählten müssen vorkommen.')}
      ${group('Merkmale', 'extras', EXTRAS)}
      <div class="form-actions" style="margin-top:22px">
        <button class="btn" type="button" data-apply>${result()} Workouts zeigen</button>
        <button class="link" type="button" data-reset>Filter zurücksetzen</button>
      </div></div>`, (dlg, close) => {
    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-k]');
      if (b) {
        const { k, v } = b.dataset;
        cur[k] = cur[k].includes(v) ? cur[k].filter((x) => x !== v) : [...cur[k], v];
        b.setAttribute('aria-pressed', String(cur[k].includes(v)));
        dlg.querySelector('[data-apply]').textContent = `${result()} Workouts zeigen`;
        return;
      }
      if (ev.target.closest('[data-apply]')) close(cur);
      if (ev.target.closest('[data-reset]')) close({ ...emptyFilter(), cat: f.cat });
    });
  });
}

/** Kurzzeile unter dem Titel: „Hero · For Time“ und darunter die Geräte */
export function metaLine(w) {
  const tags = w.tags || [];
  const head = [categoryOf(tags), ...formatsOf(tags)].filter(Boolean).join(' · ');
  const gear = equipmentOf(tags).join(', ');
  return html`${head ? html`<span class="tags">${head}</span>` : ''}${gear ? html`<span class="gear">${gear}</span>` : ''}`;
}

/** Tags als Links zur gefilterten Liste (Detailseite) */
export function tagLinks(tags, base = '#/workouts') {
  const t = (tags || []).map(canonical);
  const link = (v) => html`<a class="chip" href="${base}?g=${encodeURIComponent(v)}">${v}</a>`;
  const groups = [[categoryOf(t)].filter(Boolean), formatsOf(t), equipmentOf(t), t.filter((x) => !CATEGORIES.includes(x) && !FORMATS.includes(x) && !EQUIPMENT.includes(x))];
  return html`<div class="chips wrap tag-groups">${groups.filter((g) => g.length).map((g, i) => html`${i ? html`<span class="tag-sep" aria-hidden="true"></span>` : ''}${g.map(link)}`)}</div>`;
}

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
    ${metaLine(w)}
    <span class="w">${preview(w.workout)}</span></button></li>`;
}
