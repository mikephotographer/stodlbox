// Terminfindung als Matrix: Zeilen = Personen, Spalten = Zeitoptionen.
import { html } from '../html.js';
import { icons } from '../icons.js';
import { vienna, deadline } from '../format.js';

const WD = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
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
 * @param opts  { editable: boolean, admin: boolean }
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
                aria-pressed="${String(mine.has(o.id))}" aria-label="${mine.has(o.id) ? 'Kann' : 'Kann nicht'}"><span class="box">${mine.has(o.id) ? icons.check(14) : ''}</span></button></td>`
            : html`<td>${mine.has(o.id) ? html`<span class="tick">✓</span>` : ''}</td>`)}
        </tr>` : ''}
        ${others.map((p) => html`<tr>
          <th class="who" scope="row">${p.name}</th>
          ${poll.options.map((o) => html`<td>${o.members.includes(p.id) ? html`<span class="tick" aria-label="kann">✓</span>` : html`<span class="sr-only">kann nicht</span>`}</td>`)}
        </tr>`)}
      </tbody>
      <tfoot><tr>
        <td class="who"></td>
        ${poll.options.map((o) => html`<td class="${best.has(o.id) ? 'best' : ''}">${o.members.length} können</td>`)}
      </tr></tfoot>
    </table>
  </div>`;
}

export function pollBlock(poll, me) {
  return html`<section class="block" data-poll-block="${poll.id}">
    <div class="label-row"><span class="label">// TERMINFINDUNG</span>
      ${poll.deadline ? html`<span class="label ${poll.open ? 'accent' : ''}">${poll.open ? 'BIS ' + deadline(poll.deadline) : 'ZU'}</span>` : ''}</div>
    <h2 class="block-title">${poll.title}</h2>
    <p class="hint" style="margin:0 0 12px">${poll.open ? (me ? 'Tipp in deiner Zeile alles an, was dir passt.' : '') : 'Die Umfrage ist geschlossen.'}</p>
    ${pollMatrix(poll, me)}
    <div class="actions"><button class="icon-btn" data-action="share-poll" data-poll="${poll.id}">${icons.share(18)} Teilen</button></div>
  </section>`;
}
