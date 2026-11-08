// Gemeinsames für die Freunde-Ansicht: Kopfzeile und Aktionen (Zusage, Voting, Umfrage, Kalender, Teilen).
import { html } from '../html.js';
import { icons } from '../icons.js';
import { api, DEMO } from '../api.js';
import { state } from '../state.js';
import { toast, errText, errCode, sheet, busy } from '../ui.js';
import { shownOption, isFull } from '../components/event.js';
import { downloadIcs, googleLink } from '../calendar.js';
import { appLink, shareText, eventShareText, voteShareText, pollShareText } from '../share.js';
import { navigate } from '../router.js';

export function topbar({ refresh = false } = {}) {
  const me = state.member;
  return html`<div class="band"><header class="topbar">
    <a class="logo" href="#/" aria-label="STODLBOX – zum Board">STODL<b>BOX</b></a>
    <div class="row" style="flex-wrap:nowrap;gap:8px;min-width:0">
      ${refresh ? html`<button class="icon-btn" data-action="refresh" aria-label="Neu laden">${icons.refresh()}</button>` : ''}
      ${me ? html`<a class="me-btn" href="#/wer" aria-label="Du bist ${me.name}. Nicht du? Wechseln">${icons.user()}<span>${me.name}</span></a>` : ''}
    </div>
  </header>
  ${DEMO ? html`<p class="demo">Demo – die Daten liegen nur in diesem Browser.</p>` : ''}</div>`;
}

/** Bei BAD_CODE / BAD_MEMBER zurück ins Onboarding. Gibt true zurück, wenn behandelt. */
export function handleAuthError(e) {
  const c = errCode(e);
  if (c === 'BAD_CODE') {
    state.code = null;
    state.board = null;
    navigate('/code', { replace: true });
    return true;
  }
  if (c === 'BAD_MEMBER') {
    state.member = null;
    toast(errText(e), 'error');
    navigate('/wer', { replace: true });
    return true;
  }
  return false;
}

function applyOptimisticRsvp(e, me, status) {
  const prev = { my_rsvp: e.my_rsvp, rsvps: e.rsvps.map((r) => ({ ...r })), my_waitlist_pos: e.my_waitlist_pos };
  let next = status;
  if (status === 'yes' && e.my_rsvp !== 'yes' && (e.my_rsvp === 'waitlist' || isFull(e))) next = 'waitlist';
  const others = e.rsvps.filter((r) => r.member_id !== me.id);
  const mine = { member_id: me.id, name: me.name, status: next, since: new Date().toISOString() };
  e.rsvps = [...others, mine];
  e.my_rsvp = next;
  if (next === 'waitlist' && !e.my_waitlist_pos) e.my_waitlist_pos = others.filter((r) => r.status === 'waitlist').length + 1;
  return () => Object.assign(e, prev);
}

function applyOptimisticPoll(poll, me, optionId) {
  const prev = structuredClone(poll);
  const on = !poll.my.includes(optionId);
  poll.my = on ? [...poll.my, optionId] : poll.my.filter((x) => x !== optionId);
  for (const o of poll.options) {
    o.members = o.members.filter((id) => id !== me.id);
    if (poll.my.includes(o.id)) o.members.push(me.id);
  }
  if (!poll.people.some((p) => p.id === me.id)) poll.people.push({ id: me.id, name: me.name });
  return () => Object.assign(poll, prev);
}

/** Kalender-Abo: alle Trainings landen automatisch im Handy-Kalender und bleiben aktuell */
export async function subscribeSheet() {
  let feed;
  try {
    feed = await api.calendarFeed(state.member && state.member.id);
  } catch (err) {
    if (!handleAuthError(err)) toast(errText(err), 'error');
    return;
  }
  if (!feed) { toast('Im Demo gibt es kein Kalender-Abo.'); return; }
  const google = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(feed.webcal);
  await sheet('Kalender-Abo', html`<p style="margin:0 0 16px">Alle Trainings erscheinen in deinem Kalender und bleiben aktuell: neue Termine, Änderungen und Absagen kommen von selbst nach. Wo du dabei bist, steht ein Haken vor dem Titel.</p>
    <div class="menu">
      <a href="${feed.webcal}" data-close>${icons.calendar(22)} iPhone / Mac / Outlook</a>
      <a href="${google}" target="_blank" rel="noopener noreferrer" data-close>${icons.calendar(22)} Google Kalender</a>
      <button data-sub="copy">${icons.copy(22)} Adresse kopieren</button>
    </div>
    <p class="hint">Am iPhone fragt der Kalender nach, dann auf „Abonnieren“ tippen. Der Kalender schaut etwa jede Stunde nach Neuem.</p>`, (dlg, close) => {
    dlg.querySelector('[data-sub="copy"]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(feed.https); toast('Adresse kopiert'); close(); } catch { toast('Kopieren ging nicht', 'error'); }
    });
  });
}

/**
 * Verdrahtet alle Klicks im Container.
 * ctx.findEvent(id), ctx.findPoll(id), ctx.rerender(), ctx.reload()
 */
export function bindFriendActions(root, ctx) {
  root.onclick = async (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const action = el.dataset.action;
    const art = el.closest('[data-event]');
    const e = art ? ctx.findEvent(art.dataset.event) : null;
    const me = state.member;

    switch (action) {
      case 'refresh':
        await busy(el, () => ctx.reload());
        return;

      case 'rsvp': {
        if (!e || !me) return;
        const status = el.dataset.status;
        const undo = applyOptimisticRsvp(e, me, status);
        ctx.rerender();
        try {
          const res = await api.setRsvp(e.id, me.id, status);
          if (res && res.status === 'waitlist' && status === 'yes') toast(`Voll – du bist auf Platz ${res.waitlist_pos} der Warteliste`);
          else if (res && res.status === 'yes') toast('Du bist dabei!');
          await ctx.reload({ quiet: true });
        } catch (err) {
          undo();
          ctx.rerender();
          if (!handleAuthError(err)) toast(errText(err), 'error');
        }
        return;
      }

      case 'show-option': {
        if (!e) return;
        const id = el.dataset.option;
        shownOption.set(e.id, shownOption.get(e.id) === id ? null : id);
        ctx.rerender();
        return;
      }

      case 'vote': {
        if (!e || !me) return;
        const id = el.dataset.option;
        const prev = { my_vote: e.my_vote, options: e.options.map((o) => ({ ...o })) };
        e.options.forEach((o) => { if (o.id === e.my_vote) o.votes--; if (o.id === id) o.votes++; });
        e.my_vote = id;
        ctx.rerender();
        try {
          await api.voteWorkout(e.id, me.id, id);
          toast('Stimme gezählt');
          await ctx.reload({ quiet: true });
        } catch (err) {
          Object.assign(e, prev);
          ctx.rerender();
          if (!handleAuthError(err)) toast(errText(err), 'error');
        }
        return;
      }

      case 'calendar': {
        if (!e) return;
        const link = appLink(`/t/${e.id}`);
        await sheet('In Kalender eintragen', html`<div class="menu">
          <button data-cal="ics">${icons.download(22)} Apple / Outlook (.ics)</button>
          <a href="${googleLink(e, link)}" target="_blank" rel="noopener noreferrer" data-close>${icons.calendar(22)} Google Kalender</a>
          <button data-cal="sub">${icons.refresh(22)} Alle Trainings abonnieren</button>
        </div>`, (dlg, close) => {
          dlg.querySelector('[data-cal="ics"]').addEventListener('click', () => { downloadIcs(e, link); close(); });
          dlg.querySelector('[data-cal="sub"]').addEventListener('click', () => { close(); subscribeSheet(); });
        });
        return;
      }

      case 'subscribe':
        await subscribeSheet();
        return;

      case 'share': {
        if (!e) return;
        const link = appLink(`/t/${e.id}`);
        const vote = e.workout_mode === 'vote' && !e.vote_closed;
        await shareText(vote ? voteShareText(e, link) : eventShareText(e, link));
        return;
      }

      case 'poll-toggle': {
        const poll = ctx.findPoll && ctx.findPoll(el.dataset.poll);
        if (!poll || !me) return;
        const undo = applyOptimisticPoll(poll, me, el.dataset.option);
        ctx.rerender();
        try {
          await api.answerDatePoll(poll.id, me.id, poll.my);
        } catch (err) {
          undo();
          ctx.rerender();
          if (!handleAuthError(err)) toast(errText(err), 'error');
        }
        return;
      }

      case 'share-poll': {
        const poll = ctx.findPoll && ctx.findPoll(el.dataset.poll);
        if (!poll) return;
        await shareText(pollShareText(poll, appLink('/')));
        return;
      }

      case 'ack-promo': {
        const id = el.dataset.eventId;
        el.closest('.banner')?.remove();
        if (me) api.ackPromotion(id, me.id).catch(() => {});
        return;
      }

      case 'dismiss-a2hs':
        state.setFlag('a2hs');
        el.closest('.tip')?.remove();
        return;

      default:
        if (ctx.onAction) ctx.onAction(action, el, ev);
    }
  };
}
