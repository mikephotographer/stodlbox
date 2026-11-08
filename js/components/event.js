// Bausteine für Termine: Kopf, Platzbalken, Zusage, Teilnehmer, Workout, Equipment, Abstimmung.
// Laut ist nur, was gerade eine Entscheidung braucht (gelber Button). Alles Beantwortete ist ruhig.
import { html } from '../html.js';
import { icons } from '../icons.js';
import { whenLine, relText, dueText, wdShort, dm, hhmm } from '../format.js';
import { matchEquipment, equipmentSentence, tipWithTerms } from '../equipment.js';
import { detect, toQuery, describe } from '../timer.js';

export const safeUrl = (u) => (u && /^https?:\/\//i.test(String(u).trim()) ? String(u).trim() : null);

export function counts(e) {
  const c = { yes: 0, maybe: 0, no: 0, waitlist: 0 };
  for (const r of e.rsvps || []) c[r.status]++;
  return c;
}

export const isFull = (e) => e.capacity != null && counts(e).yes >= e.capacity;
export const isOpenVote = (e) => e.workout_mode === 'vote' && !e.vote_closed;
export const voteEnded = (e) => !!(e.vote_deadline && Date.parse(e.vote_deadline) <= Date.now());

/** Kleiner Datumsblock für Listen: „SA / 21.11.“ */
export const dateBlock = (t) => html`<span class="date" aria-hidden="true"><span class="wd">${wdShort(t)}</span><span class="d">${dm(t)}</span></span>`;

/** Platzbalken + Text */
export function capacityBar(e) {
  const c = counts(e);
  const extra = [];
  if (c.maybe) extra.push(`${c.maybe} vielleicht`);
  if (c.waitlist) extra.push(`${c.waitlist} auf der Warteliste`);
  const tail = extra.length ? ' · ' + extra.join(' · ') : '';
  if (e.capacity == null) {
    return html`<div class="cap"><p class="cap-text"><strong>${c.yes} dabei</strong>${tail}</p></div>`;
  }
  const n = Math.min(e.capacity, 40);
  const on = Math.min(c.yes, n);
  const free = Math.max(e.capacity - c.yes, 0);
  const segs = Array.from({ length: n }, (_, i) => html`<i class="${i < on ? 'on' : ''}"></i>`);
  return html`<div class="cap">
    <div class="cap-bar" role="img" aria-label="${c.yes} von ${e.capacity} Plätzen belegt">${segs}</div>
    <p class="cap-text num"><strong>${c.yes} von ${e.capacity} Plätzen</strong> · ${free ? `${free} frei` : 'voll'}${tail}</p>
  </div>`;
}

/**
 * Workout-Text. compact: nur die ersten Zeilen, Rest aufklappbar.
 */
/** Link „Timer“ mit Einstellung aus dem Workout-Text (oder leer, wenn nichts erkannt wird) */
export function timerLink(text, name = '') {
  const c = detect(text);
  if (!c) return '';
  const q = toQuery(c) + (name ? '&n=' + encodeURIComponent(name) : '');
  return html`<a class="timer-link" href="#/timer?${q}">${icons.timer(16)}<span>${describe(c)}</span></a>`;
}

export function wodBox(text, { title = 'Workout', aside = '', compact = false, timer = '' } = {}) {
  const t = text ? String(text).trim() : '';
  const side = timer && t ? timerLink(t, timer) : (aside ? html`<span class="label">${aside}</span>` : '');
  const head = html`<div class="wod-head"><span class="label">${title}</span>${side}</div>`;
  if (!t) return html`<div class="wod">${head}<div class="wod-body empty">Workout folgt.</div></div>`;
  const lines = t.split('\n');
  if (!compact || lines.length <= 5) {
    return html`<div class="wod">${head}<div class="wod-body">${t}</div></div>`;
  }
  return html`<div class="wod">${head}<div class="wod-body">${lines.slice(0, 4).join('\n')}<details class="wod-more"><summary>Ganzes Workout (${lines.length} Zeilen)</summary>${lines.slice(4).join('\n')}</details></div></div>`;
}

export function equipBanner(text, rules) {
  const m = matchEquipment(text, rules);
  if (!m.length) return '';
  return html`<p class="equip">${icons.bag(18)}<span><strong>Einpacken:</strong> ${equipmentSentence(m)}</span></p>`;
}

export function equipInline(text, rules) {
  const m = matchEquipment(text, rules);
  if (!m.length) return '';
  return html`<p class="equip-inline">Mitnehmen: ${m.map((x) => tipWithTerms(x.tip, [x.terms[0]])).join(' · ')}</p>`;
}

/** Welche Option bei offenen Votings aufgeklappt ist (pro Termin, über Re-Render hinweg) */
export const shownOption = new Map();

export function voteBlock(e, rules, { canVote }) {
  const opts = e.options || [];
  const total = opts.reduce((s, o) => s + o.votes, 0);
  const shownId = shownOption.get(e.id) || null;
  const ended = voteEnded(e);
  const due = e.vote_deadline ? (ended ? 'Abstimmung beendet' : `bis ${dueText(e.vote_deadline)}`) : '';
  return html`<section class="vote" aria-label="Workout-Abstimmung">
    <div class="wod-head"><span class="label">Abstimmung</span>
      <span class="label">${total} ${total === 1 ? 'Stimme' : 'Stimmen'}${due ? ` · ${due}` : ''}</span></div>
    ${canVote && !e.my_vote ? html`<p class="hint" style="margin:0 0 8px">Tipp eine Option an, um das Workout zu sehen und abzustimmen.</p>` : ''}
    <div class="vote-opts">
      ${opts.map((o) => {
        const open = shownId === o.id;
        const mine = o.id === e.my_vote;
        return html`<button class="vote-opt ${mine ? 'mine' : ''}" data-action="show-option" data-option="${o.id}" aria-expanded="${String(open)}">
            <span class="l">${o.label}</span>
            ${mine ? html`<span class="mine-tag">Deine Wahl</span>` : ''}
            <span class="n">${o.votes}</span>
            <span class="chev">${icons.chevron(16)}</span>
          </button>
          ${open ? html`<div class="vote-detail">
            <div class="wod-body">${o.workout}</div>
            ${equipInline(o.workout, rules)}
            ${canVote ? (mine
              ? html`<p class="voted">${icons.check(16)} Deine Stimme</p>`
              : html`<div style="margin-top:12px"><button class="btn sm" style="width:100%" data-action="vote" data-option="${o.id}">Dafür stimmen</button></div>`) : ''}
          </div>` : ''}`;
      })}
    </div>
  </section>`;
}

export function rsvpBlock(e) {
  if (e.status === 'cancelled') {
    return html`<div class="answer neutral" style="margin-top:20px">${icons.close(20)}<p class="what">Abgesagt<small>Dieser Termin fällt aus.</small></p></div>`;
  }
  if (e.started) {
    return html`<p class="locked">Der Termin hat begonnen – Zusagen sind geschlossen.</p>`;
  }
  const my = e.my_rsvp;
  const full = isFull(e);
  const seg = html`<div class="seg3" role="group" aria-label="Antwort ändern">
    <button data-action="rsvp" data-status="yes" aria-pressed="${String(my === 'yes' || my === 'waitlist')}">${full && my !== 'yes' ? 'Warteliste' : 'Dabei'}</button>
    <button data-action="rsvp" data-status="maybe" aria-pressed="${String(my === 'maybe')}">Vielleicht</button>
    <button data-action="rsvp" data-status="no" aria-pressed="${String(my === 'no')}">Kann nicht</button>
  </div>`;

  // Noch keine Antwort: die eine laute Stelle der Seite
  if (!my) {
    return html`<div class="rsvp">
      <button class="btn" data-action="rsvp" data-status="yes">${full ? 'Auf die Warteliste' : 'Bin dabei'}</button>
      <div class="rsvp-alt">
        <button class="link" data-action="rsvp" data-status="maybe">vielleicht</button>
        <button class="link" data-action="rsvp" data-status="no">kann nicht</button>
      </div>
      ${full ? html`<p class="hint" style="text-align:center">Alle Plätze sind belegt. Wird einer frei, rückst du automatisch nach.</p>` : ''}
    </div>`;
  }

  const text = {
    yes: ['Du bist dabei', ''],
    waitlist: [`Warteliste, Platz ${e.my_waitlist_pos || '?'}`, 'Wird ein Platz frei, rückst du automatisch nach.'],
    maybe: ['Vielleicht', 'Sag noch fix zu oder ab, wenn du es weißt.'],
    no: ['Du kannst nicht', ''],
  }[my];
  const icon = my === 'yes' ? icons.check(20) : my === 'no' ? icons.close(20) : icons.user(20);
  return html`<div class="rsvp" aria-live="polite">
    <div class="answer ${my === 'yes' ? '' : 'neutral'}">${icon}<p class="what">${text[0]}${text[1] ? html`<small>${text[1]}</small>` : ''}</p></div>
    ${seg}
  </div>`;
}

export function peopleList(e, meId) {
  const by = { yes: [], maybe: [], waitlist: [], no: [] };
  for (const r of e.rsvps || []) by[r.status].push(r);
  const name = (r) => html`<span class="${r.member_id === meId ? 'me' : ''}">${r.name}</span>`;
  const join = (list, fmt = name) => list.map((r, i) => html`${i ? ', ' : ''}${fmt(r, i)}`);
  if (!e.rsvps || !e.rsvps.length) return html`<div class="people"><p class="muted">Noch hat niemand geantwortet.</p></div>`;
  return html`<div class="people">
    ${by.yes.length ? html`<p><span class="k">Dabei</span><span>${join(by.yes)}</span></p>` : ''}
    ${by.maybe.length ? html`<p><span class="k">Vielleicht</span><span>${join(by.maybe)}</span></p>` : ''}
    ${by.waitlist.length ? html`<p><span class="k">Warteliste</span><span>${join(by.waitlist, (r, i) => html`${i + 1}. ${name(r)}`)}</span></p>` : ''}
    ${by.no.length ? html`<details><summary>${by.no.length} ${by.no.length === 1 ? 'kann' : 'können'} nicht</summary>
      <p><span class="k"></span><span class="muted">${join(by.no)}</span></p></details>` : ''}
  </div>`;
}

/** Ab Trainingsbeginn bis 7 Tage danach: Knopf zu den Fotos für alle, die dabei waren */
function photoCta(e) {
  if (e.status === 'cancelled' || e.my_rsvp !== 'yes') return '';
  const start = Date.parse(e.starts_at);
  if (Date.now() < start || Date.now() >= start + 7 * 864e5) return '';
  return html`<a class="btn ph-cta" href="#/t/${e.id}?fotos=1">${icons.photo(22)} Fotos &amp; Videos</a>`;
}

export function eventActions(e) {
  const photo = safeUrl(e.media_url);
  return html`<div class="actions">
    <button class="icon-btn" data-action="calendar">${icons.calendar(18)} In Kalender</button>
    <button class="icon-btn" data-action="share">${icons.share(18)} Teilen</button>
    ${photo ? html`<a class="icon-btn" href="${photo}" target="_blank" rel="noopener noreferrer">${icons.link(18)} Album</a>` : ''}
  </div>`;
}

/**
 * Termin-Block. compact (Board): Workout gekürzt.
 * Reihenfolge: Titel → Zeit → Plätze → Zusage → Teilnehmer → Workout/Abstimmung → Notiz → Aktionen.
 */
export function eventHero(e, { rules, meId, headingTag = 'h1', compact = false, eyebrow = '', back = '' }) {
  const cancelled = e.status === 'cancelled';
  const openVote = isOpenVote(e);
  const canVote = !!meId && openVote && !voteEnded(e) && !e.started && !cancelled;
  const rel = relText(e.starts_at);
  // Auf dem Board (compact) führt der Titel zur Detailseite
  const inner = compact ? html`<a class="title-link" href="#/t/${e.id}">${e.title}</a>` : e.title;
  const title = headingTag === 'h1' ? html`<h1 class="title">${inner}</h1>` : html`<h2 class="title">${inner}</h2>`;
  return html`<article class="hero ${cancelled ? 'cancelled' : ''}" data-event="${e.id}">
    <div class="band hero-band">
      ${back}
      ${eyebrow || compact ? html`<div class="eyebrow-row">
        ${eyebrow ? html`<span class="label eyebrow">${eyebrow}</span>` : html`<span></span>`}
        ${compact ? html`<a class="details-link" href="#/t/${e.id}">Details ${icons.chevron(14)}</a>` : ''}
      </div>` : ''}
      <header class="hero-head">
        ${title}
        <p class="when num">${whenLine(e.starts_at)}${rel && !cancelled ? html` <span class="rel">· ${rel}</span>` : ''}</p>
      </header>
      ${cancelled ? '' : capacityBar(e)}
      ${rsvpBlock(e)}
      ${photoCta(e)}
    </div>
    <div class="hero-body">
    ${peopleList(e, meId)}
    ${openVote
      ? voteBlock(e, rules, { canVote })
      : html`${wodBox(e.workout, { compact, timer: e.title })}${equipBanner(e.workout, rules)}`}
    ${e.note ? html`<p class="note">${e.note}</p>` : ''}
    ${eventActions(e)}
    </div>
  </article>`;
}

/** Kompakte Listenzeile */
export function eventRow(e, meId, href) {
  const c = counts(e);
  const parts = [html`<span class="num">${hhmm(e.starts_at)}</span>`];
  if (e.status === 'cancelled') parts.push('abgesagt');
  else {
    parts.push(e.capacity != null ? `${c.yes}/${e.capacity} dabei` : `${c.yes} dabei`);
    if (isOpenVote(e) && meId && !e.my_vote && !voteEnded(e)) parts.push(html`<span class="todo">Workout abstimmen</span>`);
    else if (isOpenVote(e)) parts.push('Workout-Abstimmung');
    const my = { yes: 'du bist dabei', maybe: 'du: vielleicht', no: 'du kannst nicht', waitlist: 'du: Warteliste' }[e.my_rsvp];
    if (my && meId) parts.push(html`<span class="${e.my_rsvp === 'yes' ? 'you' : ''}">${my}</span>`);
  }
  return html`<li><a class="list-item ${e.status === 'cancelled' ? 'cancelled' : ''}" href="${href}">
    ${dateBlock(e.starts_at)}
    <span class="grow"><span class="t">${e.title}</span><span class="m">${parts.map((p, i) => html`${i ? ' · ' : ''}${p}`)}</span></span>
    <span class="chev">${icons.chevron()}</span>
  </a></li>`;
}
