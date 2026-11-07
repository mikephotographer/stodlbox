// Termin-Detailseite (#/t/:id) – auch für vergangene Termine.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { long } from '../format.js';
import { eventHero } from '../components/event.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';

export async function renderEvent(root, id) {
  const me = state.member;
  let ev = null;
  const draw = () => {
    document.title = `STODLBOX · ${ev.title}`;
    mount(root, html`${topbar({ refresh: true })}
      <a class="back" href="#/">${icons.back()} Board</a>
      <p class="label" style="margin:6px 0 10px">// ${long(ev.starts_at).toUpperCase()}</p>
      <main id="main">${eventHero(ev, { rules: ev.rules || [], meId: me && me.id })}</main>
      <footer class="footer"><a href="#/archiv">→ Archiv</a><a href="#/">→ Board</a></footer>`);
  };

  async function reload({ quiet = false } = {}) {
    try {
      ev = await api.getEvent(id, me && me.id);
      draw();
    } catch (e) {
      if (handleAuthError(e)) return;
      if (!quiet || !ev) {
        mount(root, html`${topbar()}<a class="back" href="#/">${icons.back()} Board</a>
          <div class="empty-state"><p class="label">// NICHT GEFUNDEN</p><p>${errText(e)}</p></div>`);
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
    mount(root, html`${topbar()}<div class="skeleton" style="height:112px;width:60%;margin-top:24px" aria-busy="true"></div>`);
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
