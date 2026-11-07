// Startseite „Board“: nächster Termin groß, Abstimmungen, weitere Termine.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { short } from '../format.js';
import { eventHero, eventRow, isOpenVote, voteBlock, voteEnded } from '../components/event.js';
import { pollBlock } from '../components/poll.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';

let data = null;
let offline = false;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function a2hsBanner() {
  if (state.flag('a2hs') || isStandalone()) return '';
  const how = isIOS()
    ? 'In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.'
    : 'Im Browser-Menü (⋮) auf „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ tippen.';
  return html`<div class="banner" role="note">${icons.home(20)}<p><span class="label" style="display:block;color:var(--accent)">Tipp</span>
    Zum Home-Bildschirm hinzufügen – dann ist die Stodlbox wie eine App da. ${how}</p>
    <button class="x" data-action="dismiss-a2hs" aria-label="Hinweis schließen">${icons.close(18)}</button></div>`;
}

function promoBanners(d) {
  return (d.promotions || []).map((p) => html`<div class="banner accent" role="alert">${icons.check(22)}
    <p><strong>Du bist nachgerückt – du bist dabei!</strong><br><span class="mono" style="font-size:13px">${short(p.starts_at)} · ${p.title}</span></p>
    <button class="x" data-action="ack-promo" data-event-id="${p.event_id}" aria-label="Okay">${icons.close(18)}</button></div>`);
}

function view(d) {
  const me = state.member;
  const events = d.events || [];
  const next = events.find((e) => e.status !== 'cancelled' && !(e.started && Date.parse(e.starts_at) + e.duration_min * 60000 < Date.now()))
    || events[0];
  const rest = events.filter((e) => e !== next);
  // Offene Workout-Votings anderer Termine als eigene Blöcke
  const votes = rest.filter((e) => isOpenVote(e) && e.status !== 'cancelled');
  const polls = d.polls || [];

  return html`${topbar({ refresh: true })}
    ${offline ? html`<p class="offline">// OFFLINE – letzter Stand</p>` : ''}
    ${promoBanners(d)}
    ${a2hsBanner()}
    <main id="main">
      ${next
        ? html`<p class="label" style="margin:4px 0 10px">// NÄCHSTER TERMIN</p>${eventHero(next, { rules: d.rules, meId: me && me.id })}`
        : html`<div class="empty-state"><p class="label">// KEIN TERMIN GEPLANT</p><p>Mike hat noch nichts eingetragen. Schau bald wieder vorbei.</p></div>`}

      ${votes.length || polls.length ? html`<div class="sep" role="presentation"></div>
        <p class="label" style="margin-bottom:14px">// OFFENE ABSTIMMUNGEN</p>
        <div class="stack">
        ${votes.map((e) => html`<section class="block" data-event="${e.id}">
          <a href="#/t/${e.id}" style="text-decoration:none"><h2 class="block-title">${e.title}</h2></a>
          <p class="mono muted" style="font-size:12px">${short(e.starts_at)}</p>
          ${voteBlock(e, d.rules, { canVote: !!me && !voteEnded(e) && !e.started })}
          <div class="actions"><button class="icon-btn" data-action="share">${icons.share(18)} Teilen</button></div>
        </section>`)}
        ${polls.map((p, i) => html`${votes.length || i ? html`<div class="sep" role="presentation" style="margin:24px calc(-1 * var(--pad))"></div>` : ''}${pollBlock(p, me)}`)}
        </div>` : ''}

      ${rest.length ? html`<div class="sep" role="presentation"></div>
        <p class="label" style="margin-bottom:8px">// WEITERE TERMINE</p>
        <ul class="list">${rest.map((e) => eventRow(e, me && me.id, `#/t/${e.id}`))}</ul>` : ''}

    </main>
    <footer class="footer">
      <a href="#/archiv">→ Archiv</a>
      <a href="#/admin">Admin</a>
    </footer>`;
}

export async function renderBoard(root) {
  document.title = 'STODLBOX';
  const me = state.member;
  const draw = () => mount(root, view(data));

  async function reload({ quiet = false } = {}) {
    try {
      const d = await api.getBoard(me && me.id);
      if (me && d.member_ok === false) {
        state.member = null;
        location.hash = '#/wer';
        return;
      }
      data = d;
      offline = false;
      state.board = d;
      draw();
    } catch (e) {
      if (handleAuthError(e)) return;
      if (state.board && !data) {
        data = state.board;
        offline = true;
        draw();
      } else if (!quiet) {
        toast(errText(e), 'error');
      }
      if (!data) mount(root, html`${topbar({ refresh: true })}<div class="empty-state"><p class="label">// FEHLER</p><p>${errText(e)}</p></div>`);
    }
  }

  // Sofort letzten Stand zeigen (schneller Start), dann frisch laden
  if (state.board) {
    data = state.board;
    draw();
  } else {
    mount(root, html`${topbar()}<div class="hero" aria-busy="true"><div class="skeleton" style="height:112px;width:60%;margin-top:8px"></div>
      <div class="skeleton" style="height:10px;margin-top:24px"></div><div class="skeleton" style="height:160px;margin-top:20px"></div></div>`);
  }

  bindFriendActions(root, {
    findEvent: (id) => data && data.events.find((e) => e.id === id),
    findPoll: (id) => data && data.polls.find((p) => p.id === id),
    rerender: () => data && draw(),
    reload,
  });

  await reload();
  return reload;
}
