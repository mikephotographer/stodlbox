// Admin-Bereich: Login-Gate, Unterrouten, untere Leiste.
import { html, mount } from '../../html.js';
import { icons } from '../../icons.js';
import { api, DEMO } from '../../api.js';
import { state } from '../../state.js';
import { errText, busy, toast, sheet, confirmSheet } from '../../ui.js';
import { short, hhmm, dueText, WEEKDAYS } from '../../format.js';
import { counts, isOpenVote, voteEnded, dateBlock } from '../../components/event.js';
import { pollMatrix, bestOptionIds, optionHead } from '../../components/poll.js';
import { appLink, shareText, voteShareText, eventShareText, pollShareText } from '../../share.js';
import { navigate } from '../../router.js';
import { renderEventForm } from './event-form.js';
import { renderSeriesForm, renderPollForm } from './forms.js';
import { renderTemplates, renderEquipment, renderPeople, renderSettings } from './manage.js';

const TABS = [
  ['', 'Termine', icons.list],
  ['umfragen', 'Umfragen', icons.vote],
  ['vorlagen', 'Vorlagen', icons.doc],
  ['equipment', 'Equipment', icons.bag],
  ['mehr', 'Mehr', icons.more],
];

export function adminHead(title, { back, plus } = {}) {
  return html`<header class="admin-head">
    <div style="min-width:0">
      ${back ? html`<a class="back" href="${back}">${icons.back()} Zurück</a>` : html`<a class="logo" href="#/admin">STODL<b>BOX</b><small>Admin</small></a>`}
      ${title ? html`<h1 class="page-title">${title}</h1>` : ''}
    </div>
    ${plus ? html`<button class="plus" data-action="${plus}" aria-label="Neu anlegen">${icons.plus()}</button>` : ''}
  </header>
  ${DEMO ? html`<p class="demo">Demo</p>` : ''}`;
}

function tabbar(active) {
  document.querySelector('.tabbar')?.remove();
  const el = document.createElement('div');
  el.className = 'tabbar';
  mount(el, html`<nav aria-label="Admin">${TABS.map(([path, label, icon]) => html`<a href="#/admin${path ? '/' + path : ''}"
    ${path === active ? html`aria-current="page"` : ''}>${icon(22)}<span>${label}</span></a>`)}</nav>`);
  document.getElementById('app').after(el);
  document.getElementById('app').classList.add('has-tabbar');
}

// ---------------------------------------------------------------- Login
function renderLogin(root, { notAdmin, email } = {}) {
  document.title = 'STODLBOX · Admin-Login';
  mount(root, html`<div class="screen">
    <div class="topbar"><a class="logo" href="#/">STODL<b>BOX</b></a></div>
    <h1>Admin-Login</h1>
    ${notAdmin ? html`<div class="banner"><p>${email} hat keine Admin-Rechte.</p></div>
      <button class="btn ghost" data-action="logout">Abmelden</button>` : html`
    <p class="lead">Du bekommst eine Mail mit einem Login-Link. Öffne ihn am besten auf demselben Gerät.</p>
    <form id="login-mail" novalidate>
      <label class="field"><span class="label">E-Mail</span>
        <input class="input" type="email" name="email" autocomplete="email" required value="${email || ''}"></label>
      <div class="form-actions"><button class="btn" type="submit">Login-Link schicken</button></div>
    </form>
    <form id="login-code" novalidate hidden>
      <div class="banner">${icons.check(20)}<p>Mail ist unterwegs. Tipp in der Mail auf <strong>„Sign in“</strong> – du landest dann direkt im Admin-Bereich.</p></div>
      <label class="field"><span class="label">Oder: Code aus der Mail (falls einer drinsteht)</span>
        <input class="input" name="token" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label>
      <div class="form-actions"><button class="btn" type="submit">Einloggen</button>
        <button class="link" type="button" data-action="login-back">andere mail</button></div>
    </form>
    <p class="err" id="login-err" role="alert"></p>
    ${DEMO ? html`<p class="demo">Demo: beliebige Mail, Code 123456</p>` : ''}`}
    <footer class="footer"><a href="#/">Zur Übersicht</a></footer>
  </div>`);

  const errEl = root.querySelector('#login-err');
  const fMail = root.querySelector('#login-mail');
  const fCode = root.querySelector('#login-code');
  let mail = email || '';
  if (fMail) {
    fMail.onsubmit = async (ev) => {
      ev.preventDefault();
      mail = fMail.elements.email.value.trim();
      errEl.textContent = '';
      if (!/^\S+@\S+\.\S+$/.test(mail)) { errEl.textContent = 'Bitte eine gültige Mail eingeben.'; return; }
      await busy(fMail.querySelector('button'), async () => {
        try {
          await api.sendLogin(mail);
          fMail.hidden = true;
          fCode.hidden = false;
          fCode.elements.token.focus();
          toast('Mail ist unterwegs');
        } catch (e) {
          errEl.textContent = /signups not allowed|not found|Signups/i.test(e.message)
            ? 'Diese Mail ist nicht als Admin angelegt.'
            : errText(e, 'Mail konnte nicht verschickt werden. Kurz warten und nochmal probieren.');
        }
      });
    };
    fCode.onsubmit = async (ev) => {
      ev.preventDefault();
      errEl.textContent = '';
      await busy(fCode.querySelector('button[type=submit]'), async () => {
        try {
          await api.verifyLogin(mail, fCode.elements.token.value.trim());
          navigate('/admin', { replace: true });
        } catch (e) {
          errEl.textContent = 'Der Code passt nicht oder ist abgelaufen.';
        }
      });
    };
  }
  root.onclick = async (ev) => {
    const a = ev.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'login-back') { fMail.hidden = false; fCode.hidden = true; }
    if (a.dataset.action === 'logout') { await api.signOut(); renderLogin(root); }
  };
}

// ---------------------------------------------------------------- Termine
async function renderEvents(root) {
  document.title = 'STODLBOX · Admin';
  tabbar('');
  mount(root, html`${adminHead('Termine', { plus: 'new-menu' })}<div class="skeleton" style="height:240px" aria-busy="true"></div>`);
  let board;
  let series = [];
  try {
    [board, series] = await Promise.all([api.getBoard(null), api.listSeries()]);
  } catch (e) {
    mount(root, html`${adminHead('Termine')}<p class="err">${errText(e)}</p>`);
    return;
  }

  const line = (e) => {
    const t = html`<span class="num">${hhmm(e.starts_at)}</span>`;
    if (e.status === 'cancelled') return html`${t} · abgesagt`;
    const c = counts(e);
    const parts = [t, e.capacity != null ? `${c.yes}/${e.capacity} dabei` : `${c.yes} dabei`];
    if (c.waitlist) parts.push(`${c.waitlist} auf der Warteliste`);
    if (isOpenVote(e)) {
      const total = e.options.reduce((s, o) => s + o.votes, 0);
      parts.push(voteEnded(e) ? html`<span class="todo">Abstimmung zu – Sieger wählen</span>` : `Abstimmung · ${total} Stimmen`);
    } else if (!e.workout) parts.push(html`<span class="todo">Workout fehlt</span>`);
    return parts.map((p, i) => html`${i ? ' · ' : ''}${p}`);
  };

  mount(root, html`${adminHead('Termine', { plus: 'new-menu' })}
    ${board.events.length ? html`<ul class="list">${board.events.map((e) => html`<li>
      <a class="list-item ${e.status === 'cancelled' ? 'cancelled' : ''}" href="#/admin/t/${e.id}">
        ${dateBlock(e.starts_at)}
        <span class="grow"><span class="t">${e.title}</span><span class="m">${line(e)}</span></span>
        <span class="chev">${icons.chevron()}</span></a></li>`)}</ul>`
      : html`<div class="empty-state"><p class="label">Noch kein Termin geplant</p><p>Mit dem gelben Plus legst du einen Termin oder eine Serie an.</p></div>`}

    <section class="section">
      <div class="label-row"><h2 class="section-title" style="margin:0">Serien</h2><a class="link" href="#/admin/serie/new">Neue Serie</a></div>
      ${series.length ? html`<ul class="list">${series.map((s) => html`<li><a class="list-item" href="#/admin/serie/${s.id}">
        <span class="grow"><span class="t">${s.title}</span>
        <span class="m">Jeden ${WEEKDAYS[s.weekday - 1]} · <span class="num">${s.start_time.slice(0, 5)}</span>${s.capacity ? ` · max. ${s.capacity}` : ''}${s.active ? '' : ' · pausiert'}</span></span>
        <span class="chev">${icons.chevron()}</span></a></li>`)}</ul>`
        : html`<p class="muted">Noch keine Serie. Eine Serie legt automatisch Termine für die nächsten 6 Wochen an.</p>`}
    </section>
    <footer class="footer"><a href="#/">So sehen es die Freunde</a><a href="#/archiv">Archiv</a></footer>`);

  root.onclick = async (ev) => {
    const a = ev.target.closest('[data-action="new-menu"]');
    if (!a) return;
    const choice = await sheet('Neu anlegen', html`<div class="menu">
      <button data-pick="t">${icons.calendar(22)} Termin</button>
      <button data-pick="serie">${icons.refresh(22)} Serie</button>
      <button data-pick="umfrage">${icons.vote(22)} Terminfindung</button>
    </div>`, (dlg, close) => dlg.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => close(b.dataset.pick))));
    if (choice) navigate(`/admin/${choice}/new`);
  };
}

// ---------------------------------------------------------------- Umfragen
async function renderPolls(root) {
  document.title = 'STODLBOX · Umfragen';
  tabbar('umfragen');
  mount(root, html`${adminHead('Umfragen', { plus: 'new-poll' })}<div class="skeleton" style="height:240px" aria-busy="true"></div>`);
  let board;
  try {
    board = await api.getBoard(null);
  } catch (e) {
    mount(root, html`${adminHead('Umfragen')}<p class="err">${errText(e)}</p>`);
    return;
  }
  const votes = board.events.filter((e) => isOpenVote(e));
  const polls = board.polls;

  mount(root, html`${adminHead('Umfragen', { plus: 'new-poll' })}
    <h2 class="section-title">Workout-Abstimmungen</h2>
    ${votes.length ? html`<ul class="list">${votes.map((e) => {
      const total = e.options.reduce((s, o) => s + o.votes, 0);
      return html`<li><a class="list-item" href="#/admin/t/${e.id}">
        ${dateBlock(e.starts_at)}
        <span class="grow"><span class="t">${e.title}</span>
        <span class="m">${total} Stimmen · ${e.options.map((o) => `${o.label} ${o.votes}`).join(', ')}${e.vote_deadline ? (voteEnded(e) ? html` · <span class="todo">zu – Sieger wählen</span>` : ` · bis ${dueText(e.vote_deadline)}`) : ''}</span></span>
        <span class="chev">${icons.chevron()}</span></a></li>`;
    })}</ul>` : html`<p class="muted">Keine offene Abstimmung. Du legst sie beim Termin an (Workout → „Abstimmung“).</p>`}

    <h2 class="section-title" style="margin-top:32px">Terminfindung</h2>
    ${polls.length ? polls.map((p) => html`<section class="card" style="margin-bottom:16px">
      <div class="label-row"><h3 class="block-title" style="margin:0">${p.title}</h3>
        <span class="label">${p.deadline ? (p.open ? 'bis ' + dueText(p.deadline) : 'geschlossen') : 'offen'}</span></div>
      ${pollMatrix(p, null, { editable: false })}
      <div class="form-actions" style="margin-top:14px">
        <button class="btn sm" style="width:100%" data-action="poll-to-event" data-poll="${p.id}">Als Termin übernehmen</button>
        <div class="row" style="justify-content:space-between">
          <a class="link" href="#/admin/umfrage/${p.id}">Bearbeiten</a>
          <button class="link" data-action="poll-share" data-poll="${p.id}">Teilen</button>
          <button class="link" data-action="poll-close" data-poll="${p.id}">Schließen</button>
          <button class="link danger" data-action="poll-delete" data-poll="${p.id}">Löschen</button>
        </div>
      </div>
    </section>`) : html`<p class="muted">Keine offene Terminfindung. Mit dem gelben Plus legst du eine an.</p>`}`);

  root.onclick = async (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const p = polls.find((x) => x.id === el.dataset.poll);
    switch (el.dataset.action) {
      case 'new-poll':
        navigate('/admin/umfrage/new');
        break;
      case 'poll-share':
        await shareText(pollShareText(p, appLink('/')));
        break;
      case 'poll-close':
        if (await confirmSheet('Umfrage schließen', `„${p.title}“ schließen? Die Umfrage verschwindet dann vom Board.`, 'Schließen')) {
          try { await api.closePoll(p.id); toast('Geschlossen'); renderPolls(root); } catch (e) { toast(errText(e), 'error'); }
        }
        break;
      case 'poll-delete':
        if (await confirmSheet('Umfrage löschen', `„${p.title}“ samt allen Antworten löschen?`, 'Löschen', true)) {
          try { await api.deletePoll(p.id); toast('Gelöscht'); renderPolls(root); } catch (e) { toast(errText(e), 'error'); }
        }
        break;
      case 'poll-to-event': {
        const best = bestOptionIds(p);
        const pick = await sheet('Welche Option?', html`<div class="menu">${p.options.map((o) => html`<button data-opt="${o.id}">
          ${best.has(o.id) ? icons.check(22) : icons.calendar(22)}
          <span>${short(o.starts_at)} <span class="muted" style="font-size:14px">· ${o.members.length} können</span></span></button>`)}</div>`,
          (dlg, close) => dlg.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => close(b.dataset.opt))));
        if (pick) navigate(`/admin/umfrage/${p.id}/uebernehmen/${pick}`);
        break;
      }
      default:
    }
  };
}

// ---------------------------------------------------------------- Mehr
function renderMore(root) {
  document.title = 'STODLBOX · Mehr';
  tabbar('mehr');
  mount(root, html`${adminHead('Mehr')}
    <ul class="list">
      <li><a class="list-item" href="#/admin/leute"><span class="grow"><span class="t">Leute</span><span class="m">Namen umbenennen, zusammenführen, deaktivieren</span></span><span class="chev">${icons.chevron()}</span></a></li>
      <li><a class="list-item" href="#/admin/einstellungen"><span class="grow"><span class="t">Einstellungen</span><span class="m">Gruppen-Code, Einladungslink, Standardwerte</span></span><span class="chev">${icons.chevron()}</span></a></li>
      <li><a class="list-item" href="#/"><span class="grow"><span class="t">Übersicht ansehen</span><span class="m">So sehen es die Freunde</span></span><span class="chev">${icons.chevron()}</span></a></li>
      <li><button class="list-item" data-action="logout"><span class="grow"><span class="t">Abmelden</span></span></button></li>
    </ul>`);
  root.onclick = async (ev) => {
    if (!ev.target.closest('[data-action="logout"]')) return;
    await api.signOut();
    toast('Abgemeldet');
    navigate('/admin', { replace: true });
  };
}

// ---------------------------------------------------------------- Router
export async function renderAdmin(root, sub) {
  let session = null;
  try {
    session = await api.session();
  } catch (e) {
    mount(root, html`<div class="empty-state"><p class="label">Das hat nicht geklappt</p><p>${errText(e)}</p></div>`);
    return;
  }
  if (!session) return renderLogin(root);
  let ok = false;
  try { ok = await api.isAdmin(); } catch { ok = false; }
  if (!ok) return renderLogin(root, { notAdmin: true, email: session.email });

  const parts = sub.split('/').filter(Boolean);
  const [a, b, c, d] = parts;
  if (!a) return renderEvents(root);
  if (a === 't' && b) { tabbar(''); return renderEventForm(root, b === 'new' ? null : b); }
  if (a === 'serie' && b) { tabbar(''); return renderSeriesForm(root, b === 'new' ? null : b); }
  if (a === 'umfragen') return renderPolls(root);
  if (a === 'umfrage' && b && c === 'uebernehmen' && d) { tabbar('umfragen'); return renderEventForm(root, null, { fromPoll: b, optionId: d }); }
  if (a === 'umfrage' && b) { tabbar('umfragen'); return renderPollForm(root, b === 'new' ? null : b); }
  if (a === 'vorlagen') { tabbar('vorlagen'); return renderTemplates(root); }
  if (a === 'equipment') { tabbar('equipment'); return renderEquipment(root); }
  if (a === 'mehr') return renderMore(root);
  if (a === 'leute') { tabbar('mehr'); return renderPeople(root); }
  if (a === 'einstellungen') { tabbar('mehr'); return renderSettings(root); }
  return renderEvents(root);
}

export { optionHead, hhmm, voteShareText, eventShareText };
