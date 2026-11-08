// Bootstrapping + Routen.
import { api } from './api.js';
import { state, normCode } from './state.js';
import { startRouter, parseHash, route } from './router.js';
import { renderCode, renderWho } from './views/onboarding.js';
import { renderBoard } from './views/board.js';
import { renderEvent } from './views/event.js';
import { renderArchive } from './views/archive.js';
import { renderPoll } from './views/poll.js';
import { html, mount } from './html.js';

const root = document.getElementById('app');
let currentReload = null;

function reset() {
  root.onclick = null;
  root.onsubmit = null;
  root.oninput = null;
  root.onchange = null;
  root.classList.remove('has-tabbar');
  document.querySelector('.tabbar')?.remove();
  currentReload = null;
  window.scrollTo(0, 0);
}

/** Freunde-Routen brauchen Code und Namen */
function friend(view) {
  return async (...args) => {
    reset();
    const codeError = await takeCodeFromUrl();
    if (codeError) return renderCode(root, { error: codeError });
    if (!state.code) return renderCode(root);
    if (!state.member) return renderWho(root);
    currentReload = await view(root, ...args);
  };
}

async function admin(sub = '') {
  reset();
  const mod = await import('./views/admin/index.js');
  currentReload = await mod.renderAdmin(root, sub || '');
}

/** ?c= aus Query oder Hash übernehmen und aus der URL entfernen */
async function takeCodeFromUrl() {
  const url = new URL(location.href);
  const { path, query } = parseHash();
  const c = url.searchParams.get('c') || query.get('c');
  if (!c) return null;
  url.searchParams.delete('c');
  query.delete('c');
  const qs = query.toString();
  history.replaceState(null, '', url.pathname + url.search + '#' + path + (qs ? '?' + qs : ''));
  const code = normCode(c);
  if (code === state.code) return null;
  try {
    if (await api.checkCode(code)) {
      if (state.code && state.code !== code) state.board = null;
      state.code = code;
      return null;
    }
    return 'Der Code aus dem Link passt nicht (mehr). Frag Mike nach dem aktuellen Link.';
  } catch {
    // offline: Code trotzdem merken, wird beim Laden geprüft
    state.code = code;
    return null;
  }
}

async function boot() {
  try { await api.handleAuthRedirect(); } catch { /* Login-Link ungültig → normaler Login */ }
  await startRouter([
    [/^\/$/, friend(renderBoard)],
    [/^\/t\/([\w-]+)$/, friend(renderEvent)],
    [/^\/archiv$/, friend(renderArchive)],
    [/^\/umfrage\/([\w-]+)$/, friend(renderPoll)],
    [/^\/code$/, async () => { reset(); renderCode(root); }],
    [/^\/wer$/, async () => { reset(); await takeCodeFromUrl(); if (!state.code) return renderCode(root); renderWho(root); }],
    [/^\/admin\/?(.*)$/, admin],
  ], async () => {
    reset();
    mount(root, html`<div class="empty-state"><p class="label">Diese Seite gibt’s nicht</p><p><a href="#/">Zur Übersicht</a></p></div>`);
  });
}

// Beim Zurückkommen in die App frisch laden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentReload) {
    currentReload({ quiet: true });
  }
});

boot().catch((e) => {
  console.error(e);
  mount(root, html`<div class="empty-state"><p class="label">Die App konnte nicht starten</p><p>Bitte lade die Seite neu.</p></div>`);
});

// Service Worker für Offline-Start
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
  if (document.readyState === 'complete') reg();
  else window.addEventListener('load', reg);
}

export { route };
