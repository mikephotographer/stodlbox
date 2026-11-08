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

function toJpeg(src, w0, h0, max, quality) {
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (src) ctx.drawImage(src, 0, 0, w, h);
  else drawVideoPlaceholder(ctx, w, h);
  return new Promise((resolve, reject) => c.toBlob((b) => {
    c.width = 0; c.height = 0; // Speicher am iPhone sofort freigeben
    if (b) resolve({ blob: b, width: w, height: h }); else reject(new Error('NOT_IMAGE'));
  }, 'image/jpeg', quality));
}

/** Wenn das Handy kein Standbild aus dem Video liefert: dunkle Fläche mit Play-Dreieck */
function drawVideoPlaceholder(ctx, w, h) {
  ctx.fillStyle = '#262626';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f5c400';
  const s = Math.min(w, h) * 0.22;
  ctx.beginPath();
  ctx.moveTo(w / 2 - s * 0.4, h / 2 - s / 2);
  ctx.lineTo(w / 2 + s * 0.55, h / 2);
  ctx.lineTo(w / 2 - s * 0.4, h / 2 + s / 2);
  ctx.closePath();
  ctx.fill();
}

const rid = () => crypto.randomUUID();

export const MAX_VIDEO_MB = 50;
export const isVideo = (f) => (f.type || '').startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(f.name || '');
const videoExt = (f) => (/quicktime/.test(f.type) || /\.mov$/i.test(f.name || '') ? 'mov' : 'mp4');
const videoType = (f) => (videoExt(f) === 'mov' ? 'video/quicktime' : 'video/mp4');

const fail = (code) => { const e = new Error(code); e.code = code; return e; };

/** Dauer, Größe und ein Standbild aus dem Video (Standbild kann fehlen) */
function probeVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    let done = false;
    const info = () => ({
      duration: Number.isFinite(v.duration) ? Math.round(v.duration) : null,
      width: v.videoWidth || null,
      height: v.videoHeight || null,
    });
    const finish = (poster) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const r = { ...info(), poster };
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(() => finish(null), 8000);
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = async () => {
      try {
        const j = await toJpeg(v, v.videoWidth || 480, v.videoHeight || 270, THUMB, 0.72);
        finish(j.blob);
      } catch { finish(null); }
    };
    v.onerror = () => finish(null);
    v.src = url;
    v.load();
  });
}

async function uploadOne(f, ticket, memberId) {
  const id = rid();
  const thumb = `${ticket.prefix}${id}_t.jpg`;
  if (isVideo(f)) {
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) throw fail('VIDEO_TOO_BIG');
    const v = await probeVideo(f);
    const poster = v.poster || (await toJpeg(null, 480, 270, THUMB, 0.8)).blob;
    const path = `${ticket.prefix}${id}.${videoExt(f)}`;
    const blob = f.type ? f : new Blob([f], { type: videoType(f) });
    await api.uploadPhotoFile(thumb, poster);
    await api.uploadPhotoFile(path, blob);
    await api.addMedia(memberId, path, thumb, v.width, v.height, 'video', v.duration);
    return;
  }
  const { img, done } = await loadImage(f);
  const big = await toJpeg(img, img.naturalWidth, img.naturalHeight, BIG, 0.82);
  const small = await toJpeg(img, img.naturalWidth, img.naturalHeight, THUMB, 0.72);
  done();
  const path = `${ticket.prefix}${id}.jpg`;
  await api.uploadPhotoFile(path, big.blob);
  await api.uploadPhotoFile(thumb, small.blob);
  await api.addMedia(memberId, path, thumb, big.width, big.height, 'photo', null);
}

/**
 * Lädt Fotos und Videos nacheinander hoch. onStep(done, total, current) für den Fortschritt.
 * Gibt { ok, failed, error } zurück.
 */
export async function uploadPhotos(eventId, memberId, files, onStep = () => {}) {
  const all = [...files].filter((f) => isVideo(f) || !f.type || f.type.startsWith('image/'));
  let ticket = await api.photoTicket(eventId, memberId);
  // Zu große Videos sofort aussortieren, dann die Grenzen pro Person anwenden
  const tooBig = all.filter((f) => isVideo(f) && f.size > MAX_VIDEO_MB * 1024 * 1024);
  const allVideos = all.filter((f) => isVideo(f) && !tooBig.includes(f));
  const allPhotos = all.filter((f) => !isVideo(f));
  const videos = allVideos.slice(0, ticket.left_videos ?? 3);
  const photos = allPhotos.slice(0, ticket.left);
  const todo = [...photos, ...videos];
  let ok = 0;
  let failed = all.length - todo.length;
  let error = null;
  if (tooBig.length) error = fail('VIDEO_TOO_BIG');
  else if (videos.length < allVideos.length) error = fail('VIDEO_LIMIT');
  else if (photos.length < allPhotos.length) error = fail('PHOTOS_LIMIT');
  let issued = Date.now();
  let n = 0;
  onStep(0, todo.length, todo[0]);
  for (const f of todo) {
    try {
      if (Date.now() - issued > 10 * 60 * 1000) { ticket = await api.photoTicket(eventId, memberId); issued = Date.now(); }
      await uploadOne(f, ticket, memberId);
      ok += 1;
    } catch (e) {
      failed += 1;
      error = error || e;
    }
    n += 1;
    onStep(n, todo.length, todo[n]);
  }
  return { ok, failed, error };
}

// ------------------------------------------------------------ Sichern

const blobs = new Map(); // url → File, damit ein zweiter Tipp sofort teilt

async function fileFor(p, i) {
  if (blobs.has(p.url)) return blobs.get(p.url);
  const res = await fetch(p.url);
  if (!res.ok) throw new Error('OFFLINE');
  const ext = (p.path.match(/\.(jpg|mp4|mov)$/) || [, 'jpg'])[1];
  const type = ext === 'mov' ? 'video/quicktime' : ext === 'mp4' ? 'video/mp4' : 'image/jpeg';
  const f = new File([await res.blob()], `stodlbox-${(p.created_at || '').slice(0, 10)}-${i + 1}.${ext}`, { type });
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
