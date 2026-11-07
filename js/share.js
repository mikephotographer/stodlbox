// Teilen: Web Share API am Handy, sonst WhatsApp-Link.
import { state } from './state.js';
import { shareDate, hhmm } from './format.js';
import { toast } from './ui.js';

/** Basis-URL der App (ohne Hash/Query), z. B. https://mike.github.io/stodlbox/ */
export const appBase = () => location.origin + location.pathname.replace(/index\.html$/, '');

/** Link zu einer Route inkl. Gruppen-Code, z. B. …/#/t/<id>?c=STODL-XXXX */
export function appLink(route = '/', code = state.code) {
  const q = code ? `?c=${encodeURIComponent(code)}` : '';
  return `${appBase()}#${route}${q}`;
}

export function eventShareText(e, link) {
  return `🏋️ STODLBOX – ${shareDate(e.starts_at)}, ${hhmm(e.starts_at)}\n${e.title}\nWer ist dabei? 👉 ${link}`;
}

export function voteShareText(e, link) {
  const until = e.vote_deadline ? ` Abstimmen bis ${shareDate(e.vote_deadline).slice(0, 2)} ${hhmm(e.vote_deadline)}` : '';
  return `🗳️ Welches WOD am ${shareDate(e.starts_at)}?${until} 👉 ${link}`;
}

export function pollShareText(p, link) {
  return `📅 ${p.title}: Wann passt's? 👉 ${link}`;
}

export async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Kopiert');
  } catch {
    toast('Kopieren ging nicht – bitte manuell markieren.', 'error');
  }
}
