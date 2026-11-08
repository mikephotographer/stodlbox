// Terminfindung: Matrix (Zeilen = Personen, Spalten = Zeitoptionen) und Listenzeile fürs Board.
import { html } from '../html.js';
import { icons } from '../icons.js';
import { vienna, dueText, short, wdShort, dm, hhmm } from '../format.js';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const pad = (n) => String(n).padStart(2, '0');

export function optionHead(t) {
  const v = vienna(t);
  return html`${WD[v.wd]}<br>${pad(v.d)}.${pad(v.m)}.<br>${pad(v.hh)}:${pad(v.mm)}`;
}

export function bestOptionIds(poll) {
  const max = Math.max(0, ...poll.options.map((o) => o.members.length));
  if (!max) return new Set();
  return new Set(poll.options.filter((o) => o.members.length === max).map((o) => o.id));
}

/**
 * @param poll  poll_json
 * @param me    { id, name } oder null
 */
export function pollMatrix(poll, me, { editable = true } = {}) {
  const best = bestOptionIds(poll);
  const mine = new Set(poll.my || []);
  const others = poll.people.filter((p) => !me || p.id !== me.id);
  const canEdit = editable && poll.open && !!me;
  return html`<div class="matrix-wrap">
    <table class="matrix" data-poll="${poll.id}">
      <caption class="sr-only">${poll.title}: wer kann wann</caption>
      <thead><tr>
        <th class="who" scope="col"><span class="sr-only">Person</span></th>
        ${poll.options.map((o) => html`<th scope="col" class="${best.has(o.id) ? 'best' : ''}">${optionHead(o.starts_at)}</th>`)}
      </tr></thead>
      <tbody>
        ${me ? html`<tr class="mine">
          <th class="who" scope="row">${me.name} (du)</th>
          ${poll.options.map((o) => canEdit
            ? html`<td><button class="cell-btn" data-action="poll-toggle" data-poll="${poll.id}" data-option="${o.id}"
                aria-pressed="${String(mine.has(o.id))}" aria-label="${short(o.starts_at)} – ich kann"><span class="box">${mine.has(o.id) ? icons.check(14) : ''}</span></button></td>`
            : html`<td>${mine.has(o.id) ? html`<span class="tick" aria-label="kann">${icons.check(16)}</span>` : ''}</td>`)}
        </tr>` : ''}
        ${others.map((p) => html`<tr>
          <th class="who" scope="row">${p.name}</th>
          ${poll.options.map((o) => html`<td>${o.members.includes(p.id)
            ? html`<span class="tick" style="display:inline-grid" aria-label="kann">${icons.check(16)}</span>`
            : html`<span class="sr-only">kann nicht</span>`}</td>`)}
        </tr>`)}
      </tbody>
      <tfoot><tr>
        <td class="who"></td>
        ${poll.options.map((o) => html`<td class="num ${best.has(o.id) ? 'best' : ''}">${o.members.length}</td>`)}
      </tr></tfoot>
    </table>
  </div>`;
}

/** Ganze Terminfindung (eigene Seite) */
export function pollBlock(poll, me) {
  return html`<section data-poll-block="${poll.id}">
    <p class="when" style="margin:0 0 16px">${poll.open
      ? (poll.deadline ? `Antworten bis ${dueText(poll.deadline)}. ` : '') + (me ? 'Hak in deiner Zeile alles an, was dir passt.' : '')
      : 'Die Umfrage ist geschlossen.'}</p>
    ${pollMatrix(poll, me)}
    <div class="actions"><button class="icon-btn" data-action="share-poll" data-poll="${poll.id}">${icons.share(18)} Teilen</button></div>
  </section>`;
}

/** Listenzeile fürs Board */
export function pollRow(poll, me) {
  const best = poll.options.filter((o) => bestOptionIds(poll).has(o.id));
  const answered = poll.people.some((p) => me && p.id === me.id);
  const parts = [];
  if (poll.open && me && !answered) parts.push(html`<span class="todo">Noch nicht beantwortet</span>`);
  if (best.length) parts.push(`vorne: ${best.map((o) => `${wdShort(o.starts_at)} ${dm(o.starts_at)} ${hhmm(o.starts_at)}`).join(', ')}`);
  if (poll.deadline && poll.open) parts.push(`bis ${dueText(poll.deadline)}`);
  return html`<li><a class="list-item" href="#/umfrage/${poll.id}">
    <span class="date" aria-hidden="true" style="color:var(--muted)">${icons.calendar(20)}</span>
    <span class="grow"><span class="t">${poll.title}</span><span class="m">${parts.map((p, i) => html`${i ? ' · ' : ''}${p}`)}</span></span>
    <span class="chev">${icons.chevron()}</span>
  </a></li>`;
}
