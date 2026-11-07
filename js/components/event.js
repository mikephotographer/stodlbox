// Bausteine für Termine: Hero, Platzbalken, WOD-Box, Equipment, Voting-Kacheln, Zusage, Teilnehmer.
import { html } from '../html.js';
import { icons } from '../icons.js';
import { dayNum, heroMeta, short, deadline, relDay } from '../format.js';
import { matchEquipment, equipmentSentence, tipWithTerms } from '../equipment.js';

export const safeUrl = (u) => (u && /^https?:\/\//i.test(String(u).trim()) ? String(u).trim() : null);

export function counts(e) {
  const c = { yes: 0, maybe: 0, no: 0, waitlist: 0 };
  for (const r of e.rsvps || []) c[r.status]++;
  return c;
}

export const isFull = (e) => e.capacity != null && counts(e).yes >= e.capacity;
export const isOpenVote = (e) => e.workout_mode === 'vote' && !e.vote_closed;
export const voteEnded = (e) => !!(e.vote_deadline && Date.parse(e.vote_deadline) <= Date.now());

/** Platzbalken + Text */
export function capacityBar(e) {
  const c = counts(e);
  const extra = [];
  if (c.maybe) extra.push(`${c.maybe} VIELLEICHT`);
  if (c.waitlist) extra.push(`${c.waitlist} AUF WARTELISTE`);
  if (e.capacity == null) {
    return html`<div class="cap"><p class="cap-text"><strong>${c.yes} DABEI</strong>${extra.length ? ' · ' + extra.join(' · ') : ''}</p></div>`;
  }
  const n = Math.min(e.capacity, 40);
  const on = Math.min(c.yes, n);
  const free = Math.max(e.capacity - c.yes, 0);
  const segs = Array.from({ length: n }, (_, i) => html`<i class="${i < on ? 'on' : ''}"></i>`);
  return html`<div class="cap">
    <div class="cap-bar" role="img" aria-label="${c.yes} von ${e.capacity} Plätzen belegt">${segs}</div>
    <p class="cap-text"><strong>${c.yes}/${e.capacity} PLÄTZE BELEGT</strong> · ${free ? `${free} FREI` : 'VOLL'}${extra.length ? ' · ' + extra.join(' · ') : ''}</p>
  </div>`;
}

export function wodBox(text, head = '// WOD', aside = '') {
  const empty = !text || !String(text).trim();
  return html`<div class="wod">
    <div class="wod-head"><span class="label">${head}</span>${aside ? html`<span class="label">${aside}</span>` : ''}</div>
    <div class="wod-body ${empty ? 'empty' : ''}">${empty ? 'WOD folgt.' : text}</div>
  </div>`;
}

export function equipBanner(text, rules) {
  const m = matchEquipment(text, rules);
  if (!m.length) return '';
  return html`<div class="equip">${icons.warn(24)}<p><span class="label">Einpacken</span>${equipmentSentence(m)}</p></div>`;
}

export function equipInline(text, rules) {
  const m = matchEquipment(text, rules);
  if (!m.length) return '';
  return html`<p class="equip-inline">MITNEHMEN: ${m.map((x) => tipWithTerms(x.tip, [x.terms[0]])).join(' · ')}</p>`;
}

/** Welche Option bei offenen Votings aufgeklappt ist (pro Termin, über Re-Render hinweg) */
export const shownOption = new Map();

export function voteBlock(e, rules, { canVote }) {
  const opts = e.options || [];
  const total = opts.reduce((s, o) => s + o.votes, 0);
  const max = Math.max(0, ...opts.map((o) => o.votes));
  const shown = opts.find((o) => o.id === (shownOption.get(e.id) || e.my_vote)) || null;
  const ended = voteEnded(e);
  return html`<div class="wod-vote" style="margin-top:20px">
    <div class="label-row"><span class="label">// WOD-VOTING · ${total} ${total === 1 ? 'STIMME' : 'STIMMEN'}</span>
      ${e.vote_deadline ? html`<span class="label ${ended ? '' : 'accent'}">${ended ? 'ZU' : 'BIS ' + deadline(e.vote_deadline)}</span>` : ''}</div>
    <div class="vote-tiles" style="--n:${opts.length}">
      ${opts.map((o) => html`<button class="vote-tile ${o.id === e.my_vote ? 'mine' : ''} ${max > 0 && o.votes === max ? 'win' : ''}"
          data-action="show-option" data-option="${o.id}" aria-expanded="${shown && shown.id === o.id ? 'true' : 'false'}"
          aria-label="${o.label}: ${o.votes} Stimmen${o.id === e.my_vote ? ', deine Wahl' : ''}">
        <span class="n">${o.votes}</span><span class="l">${o.label}</span></button>`)}
    </div>
    ${shown ? html`<div class="vote-detail">
      ${wodBox(shown.workout, '// ' + shown.label.toUpperCase(), shown.id === e.my_vote ? 'DEINE WAHL' : '')}
      ${equipInline(shown.workout, rules)}
      ${canVote ? html`<div style="margin-top:10px">${shown.id === e.my_vote
        ? html`<button class="btn ghost on sm" style="width:100%" disabled>${icons.check()} DEINE STIMME</button>`
        : html`<button class="btn sm" style="width:100%" data-action="vote" data-option="${shown.id}">DAFÜR STIMMEN</button>`}</div>` : ''}
    </div>` : html`<p class="hint">Tipp auf eine Kachel, um das Workout zu sehen${canVote ? ' und abzustimmen' : ''}.</p>`}
  </div>`;
}

export function rsvpBlock(e) {
  if (e.status === 'cancelled') {
    return html`<div class="banner"><span class="tag danger">ABGESAGT</span><p>Dieser Termin fällt aus.</p></div>`;
  }
  if (e.started) {
    return html`<p class="rsvp-state" style="color:var(--muted)">// ZUSAGEN GESPERRT – DER TERMIN HAT BEGONNEN</p>`;
  }
  const my = e.my_rsvp;
  const full = isFull(e);
  let primaryLabel = 'BIN DABEI';
  if (my === 'waitlist') primaryLabel = 'AUF WARTELISTE';
  else if (full && my !== 'yes') primaryLabel = 'AUF WARTELISTE';
  const primaryOn = my === 'yes' || my === 'waitlist';
  const state = {
    yes: 'Du bist dabei.',
    waitlist: `Voll – du bist auf Platz ${e.my_waitlist_pos || '?'} der Warteliste.`,
    maybe: 'Du hast „vielleicht“ gesagt.',
    no: 'Du hast abgesagt.',
  }[my] || (full ? 'Alle Plätze sind belegt – du kommst auf die Warteliste.' : '');
  return html`<div class="rsvp">
    <button class="btn ${my && !primaryOn ? 'ghost' : ''} ${primaryOn ? 'is-on' : ''}" data-action="rsvp" data-status="yes" aria-pressed="${String(primaryOn)}">
      ${primaryOn ? icons.check(22) : ''}${primaryLabel}</button>
    <div class="rsvp-alt">
      <button class="link ${my === 'maybe' ? 'on' : ''}" data-action="rsvp" data-status="maybe" aria-pressed="${String(my === 'maybe')}">vielleicht</button>
      <button class="link ${my === 'no' ? 'on' : ''}" data-action="rsvp" data-status="no" aria-pressed="${String(my === 'no')}">kann nicht</button>
    </div>
    <p class="rsvp-state" aria-live="polite">${state}</p>
  </div>`;
}

export function peopleList(e, meId) {
  const by = { yes: [], maybe: [], waitlist: [], no: [] };
  for (const r of e.rsvps || []) by[r.status].push(r);
  const name = (r) => html`<span class="${r.member_id === meId ? 'me' : ''}">${r.name}</span>`;
  const join = (list, fmt = name) => list.map((r, i) => html`${i ? ' · ' : ''}${fmt(r, i)}`);
  if (!e.rsvps || !e.rsvps.length) return html`<div class="people"><p class="muted">Noch keine Zusagen.</p></div>`;
  return html`<div class="people">
    ${by.yes.length ? html`<p><span class="sym" aria-label="dabei">✓</span><span>${join(by.yes)}</span></p>` : ''}
    ${by.maybe.length ? html`<p><span class="sym" aria-label="vielleicht">?</span><span>${join(by.maybe)}</span></p>` : ''}
    ${by.waitlist.length ? html`<p><span class="sym" aria-label="Warteliste">W</span><span>${join(by.waitlist, (r, i) => html`${i + 1}. ${name(r)}`)}</span></p>` : ''}
    ${by.no.length ? html`<details><summary>${by.no.length} ${by.no.length === 1 ? 'kann' : 'können'} nicht</summary>
      <p><span class="sym" aria-hidden="true">–</span><span class="muted">${join(by.no)}</span></p></details>` : ''}
  </div>`;
}

export function eventActions(e) {
  const photo = safeUrl(e.media_url);
  return html`<div class="actions">
    <button class="icon-btn" data-action="calendar">${icons.calendar(18)} In Kalender</button>
    <button class="icon-btn" data-action="share">${icons.share(18)} Teilen</button>
    ${photo ? html`<a class="icon-btn" href="${photo}" target="_blank" rel="noopener noreferrer">${icons.photo(18)} Fotos</a>` : ''}
  </div>`;
}

/** Großer Termin-Block (Board-Hero und Detailseite) */
export function eventHero(e, { rules, meId, headingTag = 'h1', showRsvp = true }) {
  const cancelled = e.status === 'cancelled';
  const openVote = isOpenVote(e);
  const canVote = !!meId && openVote && !voteEnded(e) && !e.started && !cancelled;
  const rel = relDay(e.starts_at);
  const title = headingTag === 'h1'
    ? html`<h1 class="title">${e.title}</h1>`
    : html`<h2 class="title">${e.title}</h2>`;
  return html`<article class="hero ${cancelled ? 'cancelled' : ''}" data-event="${e.id}">
    <div class="hero-head">
      <div class="daynum" aria-hidden="true">${dayNum(e.starts_at)}</div>
      <div class="hero-meta">
        <p class="label">${heroMeta(e.starts_at)}</p>
        ${title}
        <p style="margin-top:8px" class="row">
          ${cancelled ? html`<span class="tag danger">ABGESAGT</span>` : ''}
          ${rel && !cancelled ? html`<span class="tag accent">${rel}</span>` : ''}
        </p>
      </div>
    </div>
    ${capacityBar(e)}
    ${openVote
      ? voteBlock(e, rules, { canVote })
      : html`${wodBox(e.workout)}${equipBanner(e.workout, rules)}`}
    ${e.note ? html`<p class="note">${e.note}</p>` : ''}
    ${showRsvp ? rsvpBlock(e) : ''}
    ${peopleList(e, meId)}
    ${eventActions(e)}
  </article>`;
}

/** Kompakte Listenzeile */
export function eventRow(e, meId, href) {
  const c = counts(e);
  const meta = [short(e.starts_at)];
  if (e.status === 'cancelled') meta.push('ABGESAGT');
  else {
    meta.push(e.capacity != null ? `${c.yes}/${e.capacity} DABEI` : `${c.yes} DABEI`);
    if (isOpenVote(e)) meta.push('VOTING');
    const my = { yes: 'DU: DABEI', maybe: 'DU: VIELLEICHT', no: 'DU: NEIN', waitlist: 'DU: WARTELISTE' }[e.my_rsvp];
    if (my && meId) meta.push(my);
  }
  return html`<li><a class="list-item ${e.status === 'cancelled' ? 'cancelled' : ''}" href="${href}">
    <span class="daynum sm" aria-hidden="true">${dayNum(e.starts_at)}</span>
    <span class="grow"><span class="t">${e.title}</span><span class="m" style="display:block">${meta.join(' · ')}</span></span>
    <span class="chev">${icons.chevron()}</span>
  </a></li>`;
}
