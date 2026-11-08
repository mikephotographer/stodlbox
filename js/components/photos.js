// Fotos beim Termin: Raster, Hochladen, Großansicht mit Sichern/Löschen.
// Der Bereich wird nach jedem Neuzeichnen der Termin-Seite mit paint() wieder befüllt.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { toast, errText, confirmSheet } from '../ui.js';
import { wdShort, dm } from '../format.js';
import { uploadPhotos, savePhotos, prefetch } from '../photos.js';

const untilText = (t) => `${wdShort(t)}, ${dm(t)}`;

export function photoSection(eventId, member) {
  let data = null;
  let progress = null; // { done, total }
  let admin = false;
  api.session().then((s) => { admin = !!s; }).catch(() => {});

  function markup() {
    if (!data) return '';
    const a = data.access;
    if (a === 'not_participant') {
      return data.count ? html`<h2 class="section-title">Fotos</h2>
        <p class="muted">${data.count} ${data.count === 1 ? 'Foto' : 'Fotos'}. Sehen und hochladen können sie nur die, die dabei waren.</p>` : '';
    }
    if (a !== 'yes') return '';
    const photos = data.photos;
    return html`<div class="label-row"><h2 class="section-title" style="margin:0">Fotos</h2>
        ${photos.length ? html`<button class="link" data-ph="save-all">${icons.download(16)} Alle sichern (${photos.length})</button>` : ''}</div>
      ${photos.length ? html`<ul class="ph-grid">${photos.map((p, i) => html`<li><button class="ph-thumb" data-ph="open" data-i="${i}" aria-label="Foto ${i + 1} von ${p.name || '?'} öffnen">
          <img src="${p.thumb}" alt="" loading="lazy" decoding="async" width="160" height="160"></button></li>`)}</ul>`
        : html`<p class="muted" style="margin:0 0 4px">Noch keine Fotos. Mach den Anfang!</p>`}
      ${progress
        ? html`<div class="ph-progress" role="status"><span>Lade hoch … ${progress.done} von ${progress.total}</span><div class="tr-bar"><span style="transform:scaleX(${progress.total ? progress.done / progress.total : 0})"></span></div></div>`
        : html`<label class="btn ghost ph-add">${icons.photo(20)} Fotos hinzufügen
            <input type="file" accept="image/*" multiple class="sr-only" data-ph="pick"></label>`}
      <p class="hint">Bleiben bis ${untilText(data.until)}, dann werden sie automatisch gelöscht. Höchstens 20 pro Person.</p>`;
  }

  function paint() {
    const el = document.getElementById('photos');
    if (!el) return;
    mount(el, html`${markup()}`);
    el.hidden = !el.innerHTML.trim();
    el.onclick = onClick;
    el.onchange = onChange;
  }

  async function load() {
    try {
      data = await api.getEventPhotos(eventId, member && member.id);
    } catch { /* ohne Fotos weiter */ }
    paint();
  }

  async function onChange(ev) {
    const input = ev.target.closest('[data-ph="pick"]');
    if (!input || !input.files || !input.files.length) return;
    const files = [...input.files];
    progress = { done: 0, total: files.length };
    paint();
    try {
      const r = await uploadPhotos(eventId, member.id, files, (done, total) => { progress = { done, total }; paint(); });
      if (r.ok) toast(r.ok === 1 ? 'Foto hochgeladen' : `${r.ok} Fotos hochgeladen`);
      if (r.failed) toast(`${r.failed} ${r.failed === 1 ? 'Foto' : 'Fotos'} nicht hochgeladen: ${errText(r.error)}`, 'error');
    } catch (e) {
      toast(errText(e), 'error');
    }
    progress = null;
    await load();
  }

  async function onClick(ev) {
    const b = ev.target.closest('[data-ph]');
    if (!b || !data) return;
    if (b.dataset.ph === 'open') lightbox(Number(b.dataset.i));
    if (b.dataset.ph === 'save-all') await save(data.photos, b);
  }

  async function save(photos, btn) {
    if (btn) btn.setAttribute('aria-busy', 'true');
    try {
      const r = await savePhotos(photos);
      if (r === 'retry') toast('Bereit – bitte nochmal tippen');
      if (r === 'downloaded') toast(photos.length === 1 ? 'Foto gespeichert' : `${photos.length} Fotos gespeichert`);
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      if (btn) btn.removeAttribute('aria-busy');
    }
  }

  function lightbox(start) {
    let i = start;
    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Foto');
    const draw = () => {
      const p = data.photos[i];
      if (!p) { dlg.close(); return; }
      const canDelete = p.mine || admin;
      mount(dlg, html`<div class="lb-top">
          <span class="label">${i + 1} / ${data.photos.length}${p.name ? ` · von ${p.name}` : ''}</span>
          <button class="icon-btn" data-lb="close" aria-label="Schließen">${icons.close()}</button>
        </div>
        <div class="lb-stage">
          <img src="${p.url}" alt="Foto ${i + 1}${p.name ? ` von ${p.name}` : ''}" ${p.width ? html`width="${p.width}" height="${p.height}"` : ''}>
          ${data.photos.length > 1 ? html`<button class="lb-nav prev" data-lb="prev" aria-label="Vorheriges Foto">${icons.back(26)}</button>
            <button class="lb-nav next" data-lb="next" aria-label="Nächstes Foto">${icons.chevron(26)}</button>` : ''}
        </div>
        <div class="lb-actions">
          <button class="btn" data-lb="save">${icons.download(20)} Sichern</button>
          ${canDelete ? html`<button class="link danger" data-lb="delete">Foto löschen</button>` : ''}
        </div>`);
      prefetch([p]); // damit „Sichern“ am iPhone direkt das Teilen-Menü öffnet
    };
    const go = (d) => { i = (i + d + data.photos.length) % data.photos.length; draw(); };
    dlg.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-lb]');
      if (!b) return;
      const act = b.dataset.lb;
      if (act === 'close') dlg.close();
      if (act === 'prev') go(-1);
      if (act === 'next') go(1);
      if (act === 'save') await save([data.photos[i]], b);
      if (act === 'delete') {
        const p = data.photos[i];
        if (!(await confirmSheet('Foto löschen', 'Das Foto für alle löschen?', 'Löschen', true))) return;
        try {
          await api.deletePhoto(member && member.id, p.id);
          data.photos.splice(i, 1);
          toast('Foto gelöscht');
          if (!data.photos.length) { dlg.close(); } else { i = Math.min(i, data.photos.length - 1); draw(); }
          paint();
        } catch (err) { toast(errText(err), 'error'); }
      }
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    // Wischen
    let x0 = null;
    dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => {
      if (x0 == null || data.photos.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    draw();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  return { load, paint };
}

/** Hinweis auf dem Board: Trainings der letzten 7 Tage, bei denen ich dabei war */
export function photoHints(list) {
  if (!list || !list.length) return '';
  return html`<section class="section">
    <h2 class="section-title">Fotos</h2>
    <ul class="list">${list.map((e) => html`<li><a class="list-item" href="#/t/${e.id}">
      <span class="ph-ico">${icons.photo(22)}</span>
      <span class="grow"><span class="t">${e.title}</span>
        <span class="m">${wdShort(e.starts_at)}, ${dm(e.starts_at)} · ${e.count ? `${e.count} ${e.count === 1 ? 'Foto' : 'Fotos'}` : 'noch keine Fotos'} · bis ${untilText(e.until)}</span></span>
      <span class="chev">${icons.chevron()}</span></a></li>`)}</ul>
  </section>`;
}
