// Fotos beim Termin: Raster, Hochladen, Großansicht mit Sichern/Löschen.
// Der Bereich wird nach jedem Neuzeichnen der Termin-Seite mit paint() wieder befüllt.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { toast, errText, confirmSheet } from '../ui.js';
import { wdShort, dm } from '../format.js';
import { uploadPhotos, savePhotos, MAX_VIDEO_MB } from '../photos.js';

const untilText = (t) => `${wdShort(t)}, ${dm(t)}`;
const isVid = (p) => p.kind === 'video';
const dur = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
/** „3 Fotos und 1 Video“ */
function countText(list) {
  const v = list.filter(isVid).length;
  const f = list.length - v;
  const parts = [];
  if (f) parts.push(`${f} ${f === 1 ? 'Foto' : 'Fotos'}`);
  if (v) parts.push(`${v} ${v === 1 ? 'Video' : 'Videos'}`);
  return parts.join(' und ');
}

export function photoSection(eventId, member, { onLoad } = {}) {
  let data = null;
  let progress = null; // { done, total }
  let admin = false;
  api.session().then((s) => { admin = !!s; }).catch(() => {});

  function markup() {
    if (!data) return '';
    const a = data.access;
    if (a === 'not_participant') {
      return data.count ? html`<h2 class="section-title">Fotos &amp; Videos</h2>
        <p class="muted">${data.count} ${data.count === 1 ? 'Datei' : 'Dateien'}. Sehen und hochladen können sie nur die, die dabei waren.</p>` : '';
    }
    if (a !== 'yes') return '';
    const photos = data.photos;
    return html`<div class="label-row"><h2 class="section-title" style="margin:0">Fotos &amp; Videos</h2>
        ${photos.length ? html`<button class="link" data-ph="save-all">${icons.download(16)} Alle sichern (${photos.length})</button>` : ''}</div>
      ${photos.length ? html`<ul class="ph-grid">${photos.map((p, i) => html`<li><button class="ph-thumb ${isVid(p) ? 'vid' : ''}" data-ph="open" data-i="${i}" aria-label="${isVid(p) ? 'Video' : 'Foto'} ${i + 1} von ${p.name || '?'} öffnen">
          <img src="${p.thumb}" alt="" loading="lazy" decoding="async" width="160" height="160">
          ${isVid(p) ? html`<span class="ph-play" aria-hidden="true">${icons.play(16)}${p.duration_s != null ? html`<span>${dur(p.duration_s)}</span>` : ''}</span>` : ''}</button></li>`)}</ul>`
        : html`<p class="muted" style="margin:0 0 4px">Noch nichts da. Mach den Anfang!</p>`}
      ${progress
        ? html`<div class="ph-progress" role="status"><span>Lade hoch … ${progress.done} von ${progress.total}${progress.video ? ' · Video, kann etwas dauern' : ''}</span><div class="tr-bar"><span style="transform:scaleX(${progress.total ? progress.done / progress.total : 0})"></span></div></div>`
        : html`<label class="btn ghost ph-add">${icons.photo(20)} Fotos &amp; Videos hinzufügen
            <input type="file" accept="image/*,video/mp4,video/quicktime,video/*" multiple class="sr-only" data-ph="pick"></label>`}
      <p class="hint">Bleiben bis ${untilText(data.until)}, dann werden sie automatisch gelöscht. Fotos in voller Auflösung. Pro Person bis zu 20 Fotos und 3 kurze Videos (max. ${MAX_VIDEO_MB} MB, etwa 30 Sekunden in Full HD).</p>`;
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
    if (onLoad) { const f = onLoad; onLoad = null; f(); }
  }

  async function onChange(ev) {
    const input = ev.target.closest('[data-ph="pick"]');
    if (!input || !input.files || !input.files.length) return;
    const files = [...input.files];
    progress = { done: 0, total: files.length };
    paint();
    try {
      const r = await uploadPhotos(eventId, member.id, files, (done, total, next) => {
        progress = { done, total, video: !!(next && /^video\//.test(next.type || '')) };
        paint();
      });
      if (r.ok) toast(`${r.ok} ${r.ok === 1 ? 'Datei' : 'Dateien'} hochgeladen`);
      if (r.failed) toast(`${r.failed} nicht hochgeladen: ${errText(r.error)}`, 'error');
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
      if (r === 'downloaded') toast(`${countText(photos)} gespeichert`);
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
          ${isVid(p)
            ? html`<video src="${p.url}" poster="${p.thumb}" controls playsinline preload="none" ${p.width ? html`width="${p.width}" height="${p.height}"` : ''}></video>`
            : html`<img src="${p.display || p.url}" alt=""Foto ${i + 1}${p.name ? ` von ${p.name}` : ''}" ${p.width ? html`width="${p.width}" height="${p.height}"` : ''}>`}
          ${data.photos.length > 1 ? html`<button class="lb-nav prev" data-lb="prev" aria-label="Vorheriges Foto">${icons.back(26)}</button>
            <button class="lb-nav next" data-lb="next" aria-label="Nächstes Foto">${icons.chevron(26)}</button>` : ''}
        </div>
        <div class="lb-actions">
          <button class="btn" data-lb="save">${icons.download(20)} Sichern</button>
          ${canDelete ? html`<button class="link danger" data-lb="delete">${isVid(p) ? 'Video' : 'Foto'} löschen</button>` : ''}
        </div>`);
      // Originale nicht vorladen (Datenvolumen). Am iPhone kann „Sichern“ deshalb einen zweiten Tipp brauchen.
    };
    const go = (d) => {
      const v = dlg.querySelector('video');
      if (v) v.pause();
      i = (i + d + data.photos.length) % data.photos.length;
      draw();
    };
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
        const what = isVid(p) ? 'Video' : 'Foto';
        if (!(await confirmSheet(`${what} löschen`, `Das ${what} für alle löschen?`, 'Löschen', true))) return;
        try {
          await api.deletePhoto(member && member.id, p.id);
          data.photos.splice(i, 1);
          toast(`${what} gelöscht`);
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
    dlg.addEventListener('touchstart', (e) => { x0 = e.target.closest('video') ? null : e.touches[0].clientX; }, { passive: true });
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
    <h2 class="section-title">Fotos &amp; Videos</h2>
    <ul class="list">${list.map((e) => html`<li><a class="list-item" href="#/t/${e.id}">
      <span class="ph-ico">${icons.photo(22)}</span>
      <span class="grow"><span class="t">${e.title}</span>
        <span class="m">${wdShort(e.starts_at)}, ${dm(e.starts_at)} · ${e.count ? `${e.count} ${e.count === 1 ? 'Datei' : 'Dateien'}` : 'noch nichts hochgeladen'} · bis ${untilText(e.until)}</span></span>
      <span class="chev">${icons.chevron()}</span></a></li>`)}</ul>
  </section>`;
}
