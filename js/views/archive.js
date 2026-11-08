// Archiv (#/archiv): vergangene Trainings, je 20, dann „Mehr laden“.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { errText, busy } from '../ui.js';
import { counts, safeUrl, dateBlock } from '../components/event.js';
import { topbar, handleAuthError } from './common.js';

function item(e) {
  const c = counts(e);
  const names = e.rsvps.filter((r) => r.status === 'yes').map((r) => r.name);
  const photo = safeUrl(e.media_url);
  const year = new Date(e.starts_at).getFullYear() !== new Date().getFullYear() ? ` ${new Date(e.starts_at).getFullYear()}` : '';
  return html`<li class="${e.status === 'cancelled' ? 'cancelled' : ''}">
    <div class="list-item" style="align-items:flex-start;cursor:default">
      ${dateBlock(e.starts_at)}
      <div class="grow">
        <a class="t" href="#/t/${e.id}" style="text-decoration:none">${e.title}</a>
        <span class="m">${e.status === 'cancelled' ? 'abgesagt' : `${c.yes} dabei`}${year}${names.length ? ` · ${names.join(', ')}` : ''}</span>
        ${e.workout ? html`<details class="wod-more" style="margin-top:2px"><summary>Workout anzeigen</summary><div class="wod-body" style="margin-top:6px">${e.workout}</div></details>` : ''}
        ${photo ? html`<a class="link" style="padding:0" href="${photo}" target="_blank" rel="noopener noreferrer">Fotos ansehen</a>` : ''}
      </div>
    </div>
  </li>`;
}

export async function renderArchive(root) {
  document.title = 'STODLBOX · Archiv';
  let items = [];
  let more = false;
  const draw = () => mount(root, html`${topbar()}
    <a class="back" href="#/">${icons.back()} Übersicht</a>
    <h1 class="page-title" style="margin:8px 0 16px">Archiv</h1>
    <main id="main">
      ${items.length ? html`<ul class="list">${items.map(item)}</ul>` : html`<div class="empty-state"><p class="label">Noch nichts im Archiv</p><p>Hier landen vergangene Trainings mit Workout und Teilnehmern.</p></div>`}
      ${more ? html`<div class="form-actions"><button class="btn ghost" id="more">Mehr laden</button></div>` : ''}
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
    mount(root, html`${topbar()}<div class="empty-state"><p class="label">Das hat nicht geklappt</p><p>${errText(e)}</p></div>`);
  }
}
