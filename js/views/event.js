// Termin-Detailseite (#/t/:id) – auch für vergangene Termine.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { eventHero } from '../components/event.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';

export async function renderEvent(root, id) {
  const me = state.member;
  let ev = null;
  const draw = () => {
    document.title = `STODLBOX · ${ev.title}`;
    mount(root, html`${topbar({ refresh: true })}
      <main id="main">${eventHero(ev, { rules: ev.rules || [], meId: me && me.id, back: html`<a class="back" href="#/">${icons.back()} Übersicht</a>` })}</main>
      <footer class="footer"><a href="#/">Übersicht</a><a href="#/archiv">Archiv</a></footer>`);
  };

  async function reload({ quiet = false } = {}) {
    try {
      ev = await api.getEvent(id, me && me.id);
      draw();
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
