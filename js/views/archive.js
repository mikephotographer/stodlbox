// Archiv (#/archiv): vergangene Trainings, je 20, dann „Mehr laden“.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { errText, busy } from '../ui.js';
import { short, dayNum } from '../format.js';
import { counts, safeUrl, wodBox } from '../components/event.js';
import { topbar, handleAuthError } from './common.js';

function item(e) {
  const c = counts(e);
  const names = e.rsvps.filter((r) => r.status === 'yes').map((r) => r.name);
  const photo = safeUrl(e.media_url);
  return html`<li class="${e.status === 'cancelled' ? 'cancelled' : ''}" style="padding:14px 0">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:14px">
      <span class="daynum sm" aria-hidden="true">${dayNum(e.starts_at)}</span>
      <div style="flex:1;min-width:0">
        <a class="title md" href="#/t/${e.id}" style="text-decoration:none;display:block;margin:0">${e.title}</a>
        <p class="mono muted" style="font-size:12px;margin-top:4px">${short(e.starts_at)}${e.status === 'cancelled' ? ' · ABGESAGT' : ` · ${c.yes} DABEI`}</p>
        ${names.length ? html`<p class="mono" style="font-size:13px;margin-top:6px">✓ ${names.join(' · ')}</p>` : ''}
        ${e.workout ? html`<details style="margin-top:8px"><summary class="link" style="padding:0;display:inline-flex;align-items:center">workout anzeigen</summary>${wodBox(e.workout)}</details>` : ''}
        ${photo ? html`<a class="icon-btn" style="margin-top:10px" href="${photo}" target="_blank" rel="noopener noreferrer">${icons.photo(18)} Fotos</a>` : ''}
      </div>
    </div>
  </li>`;
}

export async function renderArchive(root) {
  document.title = 'STODLBOX · Archiv';
  let items = [];
  let more = false;
  const draw = () => mount(root, html`${topbar()}
    <a class="back" href="#/">${icons.back()} Board</a>
    <h1 class="title" style="margin:6px 0 16px">Archiv</h1>
    <main id="main">
      ${items.length ? html`<ul class="list">${items.map(item)}</ul>` : html`<div class="empty-state"><p class="label">// NOCH NICHTS IM ARCHIV</p><p>Hier landen vergangene Trainings.</p></div>`}
      ${more ? html`<div class="form-actions"><button class="btn ghost" id="more">MEHR LADEN</button></div>` : ''}
    </main>`);

  mount(root, html`${topbar()}<div class="skeleton" style="height:200px;margin-top:24px" aria-busy="true"></div>`);
  async function load() {
    const res = await api.getArchive(items.length);
    items = items.concat(res.items);
    more = res.has_more;
    draw();
  }
  root.onclick = async (ev) => {
    const b = ev.target.closest('#more');
    if (!b) return;
    await busy(b, async () => {
      try { await load(); } catch (e) { b.insertAdjacentHTML('afterend', `<p class="err">${errText(e).replace(/</g, '&lt;')}</p>`); }
    });
  };
  try {
    await load();
  } catch (e) {
    if (handleAuthError(e)) return;
    mount(root, html`${topbar()}<div class="empty-state"><p class="label">// FEHLER</p><p>${errText(e)}</p></div>`);
  }
}
