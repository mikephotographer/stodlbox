// Termin-Detailseite (#/t/:id) – auch für vergangene Termine.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { eventHero } from '../components/event.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';
import { photoSection } from '../components/photos.js';
import { resultSection } from '../components/results.js';
import { route } from '../router.js';

export async function renderEvent(root, id) {
  const me = state.member;
  let ev = null;
  const photos = photoSection(id, me, { onLoad: () => {
    // Vom „Fotos“-Knopf gekommen: direkt zum Foto-Bereich
    if (route().query.get('fotos') !== '1') return;
    history.replaceState(null, '', location.pathname + location.search + '#/t/' + id);
    const el = document.getElementById('photos');
    if (el && !el.hidden) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } });
  // Vom „Ergebnis“-Knopf oder aus dem Timer: Formular öffnen (einmal), Werte aus dem Timer vorbelegen
  const rq = route().query;
  let wantResult = rq.get('ergebnis') === '1' ? { kind: rq.get('k') || null, value: rq.get('v') != null && rq.get('v') !== '' ? Number(rq.get('v')) : null } : null;
  if (wantResult && (wantResult.kind === 'time' || wantResult.kind === 'rounds') && wantResult.value == null) wantResult.kind = null;
  const results = resultSection(() => ev, me, { onChange: () => reload({ quiet: true, skipResults: true }) });
  const afterResults = () => {
    if (!wantResult) return;
    const pre = wantResult;
    wantResult = null;
    history.replaceState(null, '', location.pathname + location.search + '#/t/' + id);
    const el = document.getElementById('results');
    if (el && !el.hidden) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (results.data && results.data.open) results.open(pre.kind ? pre : null);
    else if (results.data) toast(errText({ code: 'RESULTS_EARLY' }));
  };
  const draw = () => {
    document.title = `STODLBOX · ${ev.title}`;
    mount(root, html`${topbar({ refresh: true })}
      <main id="main">${eventHero(ev, { rules: ev.rules || [], meId: me && me.id, back: html`<a class="back" href="#/">${icons.back()} Übersicht</a>` })}
        <section class="section res-section" id="results" hidden></section>
        <section class="section ph-section" id="photos" hidden></section></main>`);
    results.paint();
    photos.paint();
  };

  async function reload({ quiet = false, skipResults = false } = {}) {
    try {
      ev = await api.getEvent(id, me && me.id);
      draw();
      if (!skipResults) results.load().then(afterResults);
      photos.load();
    } catch (e) {
      if (handleAuthError(e)) return;
      if (!quiet || !ev) {
        mount(root, html`${topbar()}<a class="back" href="#/">${icons.back()} Übersicht</a>
          <div class="empty-state"><p class="label">Termin nicht gefunden</p><p>${errText(e)}</p></div>`);
      } else {
        toast(errText(e), 'error');
      }
    }
  }

  // Aus dem Board-Cache sofort anzeigen, falls vorhanden
  const cached = state.board && state.board.events.find((e) => e.id === id);
  if (cached) {
    ev = { ...cached, rules: state.board.rules };
    draw();
  } else {
    mount(root, html`${topbar()}<div class="skeleton" style="height:36px;width:70%;margin-top:24px" aria-busy="true"></div>`);
  }

  bindFriendActions(root, {
    findEvent: (eid) => (ev && ev.id === eid ? ev : null),
    findPoll: () => null,
    rerender: () => ev && draw(),
    reload,
  });
  await reload();
  return reload;
}
