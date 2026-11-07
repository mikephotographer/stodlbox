// Kleine UI-Helfer: Toast, Bottom-Sheet, Fehlermeldungen.
import { html, mount } from './html.js';
import { icons } from './icons.js';

let toastTimer;
export function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, type === 'error' ? 4500 : 2600);
}

const MESSAGES = {
  BAD_CODE: 'Der Gruppen-Code passt nicht (mehr). Frag Mike nach dem Link.',
  BAD_MEMBER: 'Deinen Namen gibt es so nicht mehr. Wähl dich bitte neu aus.',
  NAME_TAKEN: 'Den Namen gibt es schon. Wähl ihn einfach aus der Liste.',
  NAME_INVALID: 'Der Name muss 2–30 Zeichen lang sein.',
  LOCKED: 'Der Termin hat schon begonnen – Zusagen sind gesperrt.',
  CANCELLED: 'Der Termin ist abgesagt.',
  NOT_FOUND: 'Gibt’s nicht (mehr).',
  VOTE_CLOSED: 'Die Abstimmung ist schon zu.',
  POLL_CLOSED: 'Die Umfrage ist schon zu.',
  TIE: 'Gleichstand – wähle den Sieger selbst.',
  NOT_ADMIN: 'Dafür brauchst du Admin-Rechte.',
  INVALID: 'Da passt etwas bei den Eingaben nicht.',
  OFFLINE: 'Keine Verbindung – nochmal probieren, wenn du online bist.',
};

/** Fehler aus der API in einen verständlichen Satz übersetzen */
export function errText(e, fallback = 'Hat nicht geklappt – nochmal?') {
  const code = e && (e.code || e.message);
  for (const k of Object.keys(MESSAGES)) {
    if (code && String(code).includes(k)) return MESSAGES[k];
  }
  if (e && /fetch|network|Failed/i.test(String(e.message))) return MESSAGES.OFFLINE;
  return fallback;
}

export const errCode = (e) => {
  const s = String((e && (e.code || e.message)) || '');
  return Object.keys(MESSAGES).find((k) => s.includes(k)) || null;
};

/**
 * Öffnet ein Bottom-Sheet (<dialog>). content: html``. bind(dialogEl, close) für Events.
 * Gibt ein Promise zurück, das beim Schließen mit dem Rückgabewert auflöst.
 */
export function sheet(title, content, bind) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    dlg.setAttribute('aria-label', title);
    mount(dlg, html`<div class="sheet-inner">
      <div class="sheet-head"><span class="label">// ${title}</span>
        <button class="icon-btn" data-close aria-label="Schließen">${icons.close()}</button></div>
      ${content}
    </div>`);
    document.body.appendChild(dlg);
    let result;
    const close = (v) => { result = v; dlg.close(); };
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg || ev.target.closest('[data-close]')) close();
    });
    if (bind) bind(dlg, close);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
}

export async function confirmSheet(title, text, okLabel = 'Ja', danger = false) {
  return sheet(title, html`<p style="margin-bottom:20px">${text}</p>
    <div class="form-actions">
      <button class="btn ${danger ? 'danger' : ''}" data-ok>${okLabel}</button>
      <button class="link" data-close>abbrechen</button>
    </div>`, (dlg, close) => {
    dlg.querySelector('[data-ok]').addEventListener('click', () => close(true));
  });
}

/** Button während einer Aktion sperren */
export async function busy(btn, fn) {
  if (!btn) return fn();
  if (btn.dataset.busy) return;
  btn.dataset.busy = '1';
  btn.classList.add('busy');
  btn.setAttribute('aria-busy', 'true');
  try {
    return await fn();
  } finally {
    delete btn.dataset.busy;
    btn.classList.remove('busy');
    btn.removeAttribute('aria-busy');
  }
}
