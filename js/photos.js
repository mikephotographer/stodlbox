// Fotos: am Handy verkleinern, hochladen, sichern (Teilen-Menü bzw. Download).
import { api } from './api.js';

const BIG = 2000; // längste Kante
const THUMB = 480;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, done: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); const e = new Error('NOT_IMAGE'); e.code = 'NOT_IMAGE'; reject(e); };
    img.src = url; // Browser drehen nach EXIF automatisch richtig
  });
}

function toJpeg(img, max, quality) {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * k);
  const h = Math.round(h0 * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => c.toBlob((b) => {
    c.width = 0; c.height = 0; // Speicher am iPhone sofort freigeben
    if (b) resolve({ blob: b, width: w, height: h }); else reject(new Error('NOT_IMAGE'));
  }, 'image/jpeg', quality));
}

const rid = () => crypto.randomUUID();

/**
 * Lädt Dateien nacheinander hoch. onStep(done, total) für den Fortschritt.
 * Gibt { ok, failed, error } zurück.
 */
export async function uploadPhotos(eventId, memberId, files, onStep = () => {}) {
  const list = [...files].filter((f) => !f.type || f.type.startsWith('image/'));
  let ticket = await api.photoTicket(eventId, memberId);
  const todo = list.slice(0, ticket.left);
  let ok = 0;
  let failed = list.length - todo.length;
  let error = failed ? 'PHOTOS_LIMIT' : null;
  let issued = Date.now();
  onStep(0, todo.length);
  for (const f of todo) {
    try {
      if (Date.now() - issued > 10 * 60 * 1000) { ticket = await api.photoTicket(eventId, memberId); issued = Date.now(); }
      const { img, done } = await loadImage(f);
      const big = await toJpeg(img, BIG, 0.82);
      const small = await toJpeg(img, THUMB, 0.72);
      done();
      const id = rid();
      const path = `${ticket.prefix}${id}.jpg`;
      const thumb = `${ticket.prefix}${id}_t.jpg`;
      await api.uploadPhotoFile(path, big.blob);
      await api.uploadPhotoFile(thumb, small.blob);
      await api.addPhoto(memberId, path, thumb, big.width, big.height);
      ok += 1;
    } catch (e) {
      failed += 1;
      error = error || e;
      if (String((e && (e.code || e.message)) || '').includes('PHOTOS_LIMIT')) break;
    }
    onStep(ok + failed - (list.length - todo.length), todo.length);
  }
  return { ok, failed, error };
}

// ------------------------------------------------------------ Sichern

const blobs = new Map(); // url → File, damit ein zweiter Tipp sofort teilt

async function fileFor(p, i) {
  if (blobs.has(p.url)) return blobs.get(p.url);
  const res = await fetch(p.url);
  if (!res.ok) throw new Error('OFFLINE');
  const f = new File([await res.blob()], `stodlbox-${(p.created_at || '').slice(0, 10)}-${i + 1}.jpg`, { type: 'image/jpeg' });
  blobs.set(p.url, f);
  return f;
}

export const prefetch = (photos) => Promise.all(photos.map((p, i) => fileFor(p, i).catch(() => null)));

/**
 * Am Handy: Teilen-Menü („Bild sichern“ legt es in die Fotos-App). Am Computer: Download.
 * Gibt 'shared' | 'downloaded' | 'retry' (Browser wollte einen neuen Tipp) | 'cancel' zurück.
 */
export async function savePhotos(photos) {
  const files = (await prefetch(photos)).filter(Boolean);
  if (!files.length) throw new Error('OFFLINE');
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel';
      if (e && e.name === 'NotAllowedError') return 'retry';
      throw e;
    }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await new Promise((r) => setTimeout(r, 250));
  }
  return 'downloaded';
}
