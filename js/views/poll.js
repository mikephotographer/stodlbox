// Terminfindung (#/umfrage/:id): Matrix zum Antippen.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { pollBlock } from '../components/poll.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';

export async function renderPoll(root, id) {
  const me = state.member;
  let poll = null;
  const draw = () => {
    document.title = `STODLBOX · ${poll.title}`;
    mount(root, html`${topbar({ refresh: true })}
      <a class="back" href="#/">${icons.back()} Übersicht</a>
      <main id="main" style="margin-top:12px">
        <h1 class="title">${poll.title}</h1>
        ${pollBlock(poll, me)}
      </main>`);
  };
  const notFound = (msg) => mount(root, html`${topbar()}<a class="back" href="#/">${icons.back()} Übersicht</a>
    <div class="empty-state"><p class="label">Umfrage nicht gefunden</p><p>${msg}</p></div>`);

  async function reload({ quiet = false } = {}) {
    try {
      const d = await api.getBoard(me && me.id);
      state.board = d;
      poll = d.polls.find((p) => p.id === id) || null;
      if (!poll) return notFound('Vielleicht ist sie schon geschlossen – schau auf der Übersicht nach dem Termin.');
      draw();
    } catch (e) {
      if (handleAuthError(e)) return;
      if (!quiet || !poll) notFound(errText(e));
      else toast(errText(e), 'error');
    }
  }

  const cached = state.board && state.board.polls.find((p) => p.id === id);
  if (cached) { poll = cached; draw(); }
  else mount(root, html`${topbar()}<div class="skeleton" style="height:36px;width:70%;margin-top:24px" aria-busy="true"></div>`);

  bindFriendActions(root, {
    findEvent: () => null,
    findPoll: (pid) => (poll && poll.id === pid ? poll : null),
    rerender: () => poll && draw(),
    reload,
  });
  await reload();
  return reload;
}
