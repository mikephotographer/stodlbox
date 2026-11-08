// Startseite „Board“: nächster Termin groß, Abstimmungen, weitere Termine.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { errText, toast } from '../ui.js';
import { short } from '../format.js';
import { eventHero, eventRow } from '../components/event.js';
import { pollRow } from '../components/poll.js';
import { topbar, bindFriendActions, handleAuthError } from './common.js';

let data = null;
let offline = false;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function a2hsTip() {
  if (state.flag('a2hs') || isStandalone()) return '';
  const how = isIOS()
    ? 'In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.'
    : 'Im Browser-Menü (⋮) auf „App installieren“ tippen.';
  return html`<details class="tip"><summary>${icons.home(18)} Als App auf den Home-Bildschirm legen</summary>
    <p>${how} <button class="link muted" style="min-height:32px;padding:0" data-action="dismiss-a2hs">Nicht mehr anzeigen</button></p></details>`;
}

function promoBanners(d) {
  return (d.promotions || []).map((p) => html`<div class="banner you" role="alert">${icons.check(20)}
    <p><strong>Du bist nachgerückt – du bist dabei.</strong><br><span class="muted">${short(p.starts_at)} · ${p.title}</span></p>
    <button class="x" data-action="ack-promo" data-event-id="${p.event_id}" aria-label="Okay">${icons.close(18)}</button></div>`);
}

function view(d) {
  const me = state.member;
  const events = d.events || [];
  const next = events.find((e) => e.status !== 'cancelled' && !(e.started && Date.parse(e.starts_at) + e.duration_min * 60000 < Date.now()))
    || events[0];
  const rest = events.filter((e) => e !== next);
  const polls = d.polls || [];

  return html`${topbar({ refresh: true })}
    <div class="band">${offline ? html`<p class="offline">Offline – du siehst den letzten Stand.</p>` : ''}${promoBanners(d)}</div>
    <main id="main">
      ${next
        ? eventHero(next, { rules: d.rules, meId: me && me.id, compact: true, eyebrow: 'Nächstes Training' })
        : html`<div class="empty-state"><p class="label">Noch kein Termin geplant</p><p>Sobald Mike etwas einträgt, steht es hier.</p></div>`}

      ${polls.length ? html`<section class="section">
        <h2 class="section-title">Terminfindung</h2>
        <ul class="list">${polls.map((p) => pollRow(p, me))}</ul>
      </section>` : ''}

      ${rest.length ? html`<section class="section">
        <h2 class="section-title">Weitere Termine</h2>
        <ul class="list">${rest.map((e) => eventRow(e, me && me.id, `#/t/${e.id}`))}</ul>
      </section>` : ''}

      ${a2hsTip()}
    </main>
    <footer class="footer">
      <a href="#/archiv">Archiv</a>
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
      if (!data) mount(root, html`${topbar({ refresh: true })}<div class="empty-state"><p class="label">Das hat nicht geklappt</p><p>${errText(e)}</p></div>`);
    }
  }

  // Sofort letzten Stand zeigen (schneller Start), dann frisch laden
  if (state.board) {
    data = state.board;
    draw();
  } else {
    mount(root, html`${topbar()}<div class="hero" aria-busy="true"><div class="skeleton" style="height:36px;width:70%"></div>
      <div class="skeleton" style="height:16px;width:55%;margin-top:12px"></div><div class="skeleton" style="height:54px;margin-top:28px"></div></div>`);
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
