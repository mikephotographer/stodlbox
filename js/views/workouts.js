// Workout-Datenbank für Teilnehmer (#/workouts, #/workouts/:id): nur lesen, als Inspiration.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { errText } from '../ui.js';
import { route, navigate } from '../router.js';
import { tagCounts, hasTag, matchesQuery, filterChips, preview } from '../components/workouts.js';
import { topbar, handleAuthError } from './common.js';
import { timerLink } from '../components/event.js';

// Bleibt zwischen Liste und Detail erhalten: Daten, Suche, Filter, Scroll-Position.
let list = null;
let loadedAt = 0;
let q = '';
let tag = '';
let scrollY = 0;

async function ensureList() {
  if (list && Date.now() - loadedAt < 10 * 60 * 1000) return list;
  list = await api.listWorkouts();
  loadedAt = Date.now();
  return list;
}

function failed(root, e, back = false) {
  if (handleAuthError(e)) return;
  mount(root, html`${topbar()}
    ${back ? html`<a class="back" href="#/workouts">${icons.back()} Workouts</a>` : html`<a class="back" href="#/">${icons.back()} Übersicht</a>`}
    <div class="empty-state"><p class="label">Das hat nicht geklappt</p><p>${errText(e)}</p></div>`);
}

const row = (w) => html`<li><a class="pick wo" href="#/workouts/${w.id}">
  <span class="t">${w.title}</span>
  ${w.tags && w.tags.length ? html`<span class="tags">${w.tags.join(' · ')}</span>` : ''}
  <span class="w">${preview(w.workout)}</span></a></li>`;

export async function renderWorkouts(root) {
  document.title = 'STODLBOX · Workouts';
  const g = route().query.get('g');
  if (g != null) { tag = g; q = ''; scrollY = 0; }

  if (!list) mount(root, html`${topbar()}<div class="skeleton" style="height:200px;margin-top:24px" aria-busy="true"></div>`);
  try { await ensureList(); } catch (e) { return failed(root, e); }
  if (tag && !list.some((w) => hasTag(w, tag))) tag = '';

  const shown = () => list.filter((w) => hasTag(w, tag) && matchesQuery(w, q));
  const drawList = () => {
    const counts = tagCounts(list);
    mount(root.querySelector('#wo-chips'), counts.length ? filterChips(counts, tag, { total: list.length }) : '');
    const s = shown();
    mount(root.querySelector('#wo-list'), !list.length
      ? html`<div class="empty-state"><p class="label">Noch keine Workouts</p><p>Mike hat noch nichts in die Datenbank gelegt.</p></div>`
      : s.length
        ? html`<div class="wo-count"><p class="count">${s.length} ${s.length === 1 ? 'Workout' : 'Workouts'}</p>
            ${s.length > 1 ? html`<button type="button" class="link" data-action="random">${icons.shuffle()} Zufällig</button>` : ''}</div>
            <ul class="list">${s.map(row)}</ul>`
        : html`<p class="muted" style="padding:16px 0">Nichts gefunden.</p>`);
  };

  mount(root, html`${topbar()}
    <h1 class="page-title" style="margin-bottom:4px">Workouts</h1>
    <p class="muted" style="margin:0 0 16px">Zum Nachschlagen und für dein eigenes Training.</p>
    <main id="main">
      <label class="sr-only" for="wo-q">Workouts durchsuchen</label>
      <input class="input" id="wo-q" type="search" placeholder="Suchen: Name, Übung, Gruppe …" autocomplete="off" value="${q}">
      <div id="wo-chips"></div>
      <div id="wo-list"></div>
    </main>`);
  drawList();
  if (scrollY) requestAnimationFrame(() => window.scrollTo(0, scrollY));

  // Filter in der Adresse nicht festhalten, sonst setzt „Zurück“ ihn wieder.
  if (g != null) history.replaceState(null, '', location.pathname + location.search + '#/workouts');

  root.oninput = (e) => {
    if (e.target.id !== 'wo-q') return;
    q = e.target.value;
    drawList();
  };
  root.onclick = (e) => {
    const chip = e.target.closest('[data-tag]');
    if (chip && chip.closest('#wo-chips')) { tag = chip.dataset.tag; drawList(); return; }
    if (e.target.closest('[data-action="random"]')) {
      const s = shown();
      scrollY = window.scrollY;
      navigate(`/workouts/${s[Math.floor(Math.random() * s.length)].id}`);
      return;
    }
    if (e.target.closest('a.pick')) scrollY = window.scrollY;
  };
}

export async function renderWorkout(root, id) {
  try { await ensureList(); } catch (e) { return failed(root, e, true); }
  const w = list.find((x) => x.id === id);
  if (!w) {
    document.title = 'STODLBOX · Workouts';
    mount(root, html`${topbar()}<a class="back" href="#/workouts">${icons.back()} Workouts</a>
      <div class="empty-state"><p class="label">Workout nicht gefunden</p><p>Vielleicht wurde es gelöscht.</p></div>`);
    return;
  }
  document.title = `STODLBOX · ${w.title}`;
  mount(root, html`${topbar()}
    <a class="back" href="#/workouts">${icons.back()} Workouts</a>
    <main id="main">
      <h1 class="page-title" style="margin:8px 0 0">${w.title}</h1>
      ${w.tags && w.tags.length ? html`<div class="chips wrap">${w.tags.map((t) => html`<a class="chip" href="#/workouts?g=${encodeURIComponent(t)}">${t}</a>`)}</div>` : ''}
      <div class="wod"><div class="wod-head"><span class="label">Workout</span>${timerLink(w.workout, w.title)}</div><div class="wod-body">${w.workout}</div></div>
      ${w.notes ? html`<p class="wo-notes">${w.notes}</p>` : ''}
    </main>`);
}
