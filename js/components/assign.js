// Workout aus der Datenbank bei einem kommenden Termin eintragen (nur Admin).
// Der Termin öffnet sich danach im Formular mit dem Workout drin – Mike prüft und speichert.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { errText, sheet } from '../ui.js';
import { navigate } from '../router.js';
import { isOpenVote, dateBlock } from './event.js';
import { hhmm } from '../format.js';

/** „wod folgt …“, „TBA“ & Co. zählen wie kein Workout */
export const isPlaceholder = (text) => {
  const t = String(text || '').trim();
  return !t || (t.length <= 40 && /folgt|kommt noch|tba|tbd|offen|\?\?/i.test(t));
};

let adminCheck = null;
/** Ist hier der Admin angemeldet? (einmal pro Seitenaufruf geprüft) */
export function adminHere() {
  if (!adminCheck) {
    adminCheck = (async () => {
      try { return !!(await api.session()) && !!(await api.isAdmin()); } catch { return false; }
    })();
  }
  return adminCheck;
}

/** Auswahl-Sheet: Termin wählen oder neuen anlegen; führt ins Termin-Formular. */
export async function assignToEvent(w) {
  const pick = await sheet('Zu Termin hinzufügen', html`
    <p class="hint" style="margin:0 0 4px">„${w.title}“ wird Titel und Workout des Termins. Du siehst den Termin danach noch und speicherst selbst.</p>
    <div id="as-list"><p class="muted">Lädt …</p></div>`, (dlg, close) => {
    const box = dlg.querySelector('#as-list');
    (async () => {
      let events;
      try { events = (await api.getBoard(null)).events; } catch (e) { mount(box, html`<p class="err">${errText(e)}</p>`); return; }
      const open = events.filter((e) => e.status !== 'cancelled' && !isOpenVote(e) && Date.parse(e.starts_at) > Date.now() - 3 * 3600e3);
      mount(box, html`
        ${open.length ? html`<ul class="list">${open.map((e) => html`<li><button type="button" class="list-item as-ev" data-id="${e.id}">
          ${dateBlock(e.starts_at)}
          <span class="grow"><span class="t">${e.title}</span>
            <span class="m"><span class="num">${hhmm(e.starts_at)}</span>${e.private ? ' · nur für dich' : ''} · ${isPlaceholder(e.workout)
              ? html`<span class="todo">Workout fehlt</span>`
              : html`ersetzt: ${String(e.workout).split('\n')[0].slice(0, 40)}`}</span></span>
          <span class="chev">${icons.chevron()}</span></button></li>`)}</ul>`
          : html`<p class="muted" style="margin:12px 0">Kein kommender Termin ohne Abstimmung.</p>`}
        <div class="form-actions"><button type="button" class="btn ghost" data-id="new">${icons.plus(18)} Neuer Termin mit diesem Workout</button></div>`);
    })();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) close(b.dataset.id);
    });
  });
  if (pick) navigate(`/admin/t/${pick}?workout=${encodeURIComponent(w.id)}`);
}
