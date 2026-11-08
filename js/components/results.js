// Ergebnisse beim Termin: Rangliste, eigener Verlauf, Eintragen (Bottom-Sheet).
// Wie die Fotos: der Bereich wird nach jedem Neuzeichnen der Termin-Seite mit paint() wieder befüllt.
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { api } from '../api.js';
import { toast, errText, sheet, busy, confirmSheet } from '../ui.js';
import { wdShort, dm } from '../format.js';
import { KINDS, SCALES, scoreText, guessKind, rank, best, better } from '../results.js';

const day = (t) => `${wdShort(t)}, ${dm(t)}`;
const intOrNull = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export function resultSection(getEvent, member, { onChange } = {}) {
  let data = null;

  const mine = () => data && data.list.find((r) => r.mine);

  function rows(list) {
    const ranked = rank(list);
    const groups = new Set(ranked.map((r) => r.scale)).size > 1;
    let cur = null;
    return ranked.map((r) => {
      const head = groups && r.scale !== cur ? html`<li class="res-group"><span class="label">${SCALES[r.scale] || ''}</span></li>` : '';
      cur = r.scale;
      return html`${head}<li class="res-row ${r.mine ? 'mine' : ''}">
        <span class="res-place num">${r.place ?? '–'}</span>
        <span class="res-who"><span class="res-name">${r.name || '?'}</span>${!groups ? html` <span class="res-scale">${SCALES[r.scale]}</span>` : ''}
          ${r.note ? html`<small>${r.note}</small>` : ''}</span>
        <span class="res-score num">${r.text}</span>
      </li>`;
    });
  }

  function historyBlock() {
    const h = data.history || [];
    if (!h.length) return '';
    const m = mine();
    const all = m ? [m, ...h] : h;
    const top = all.length > 1 ? best(all) : null;
    const isTop = (r) => top && r.event_id === top.event_id;
    return html`<div class="res-hist">
      <p class="label">Dein Verlauf bei diesem Workout</p>
      <ul>${all.map((r) => html`<li class="${r === m ? 'now' : ''}">
        <span class="d">${r === m ? 'Heute' : day(r.starts_at)}</span>
        <span class="num s">${r.text}</span>
        <span class="muted">${SCALES[r.scale]}</span>
        ${isTop(r) ? html`<span class="res-best">${icons.trophy(14)} Bestwert</span>` : ''}
      </li>`)}</ul>
    </div>`;
  }

  function markup() {
    if (!data) return '';
    if (!data.open && !data.list.length) return '';
    const m = mine();
    const can = data.open && !!member;
    return html`<div class="label-row"><h2 class="section-title" style="margin:0">Ergebnisse</h2>
        ${can && data.list.length ? html`<button class="link" data-res="open">${m ? 'Ändern' : 'Eintragen'}</button>` : ''}</div>
      ${data.list.length
        ? html`<ol class="res-list">${rows(data.list)}</ol>`
        : html`<p class="muted" style="margin:0 0 12px">Noch keine Ergebnisse. Trag deins als Erstes ein.</p>`}
      ${can && !m ? html`<button class="btn ${data.list.length ? 'ghost' : ''} res-add" data-res="open">${icons.trophy(20)} Mein Ergebnis eintragen</button>` : ''}
      ${historyBlock()}`;
  }

  function paint() {
    const el = document.getElementById('results');
    if (!el) return;
    mount(el, html`${markup()}`);
    el.hidden = !el.innerHTML.trim();
    el.onclick = (ev) => { if (ev.target.closest('[data-res="open"]')) openForm(); };
  }

  async function load() {
    const e = getEvent();
    if (!e) return;
    try { data = await api.getResults(e.id, member && member.id); } catch { /* ohne Ergebnisse weiter */ }
    paint();
  }

  // ------------------------------------------------------------ Eintragen

  function fields(f) {
    if (f.kind === 'time') {
      return html`${f.cap
        ? html`<label class="field"><span class="label">Geschaffte Wiederholungen bis zum Cap</span>
            <input class="input num" id="rf-capreps" inputmode="numeric" pattern="[0-9]*" value="${f.capreps ?? ''}" autocomplete="off"></label>`
        : html`<div class="res-time">
            <label class="field"><span class="label">Minuten</span><input class="input num" id="rf-min" inputmode="numeric" pattern="[0-9]*" value="${f.min ?? ''}" autocomplete="off"></label>
            <span class="res-colon" aria-hidden="true">:</span>
            <label class="field"><span class="label">Sekunden</span><input class="input num" id="rf-sec" inputmode="numeric" pattern="[0-9]*" value="${f.sec ?? ''}" autocomplete="off"></label>
          </div>`}
        <label class="check"><input type="checkbox" id="rf-cap" ${f.cap ? 'checked' : ''}> Im Time Cap nicht fertig geworden</label>`;
    }
    if (f.kind === 'rounds') {
      return html`<div class="grid2">
        <label class="field"><span class="label">Runden</span><input class="input num" id="rf-r" inputmode="numeric" pattern="[0-9]*" value="${f.r ?? ''}" autocomplete="off"></label>
        <label class="field"><span class="label">+ Wiederholungen</span><input class="input num" id="rf-rr" inputmode="numeric" pattern="[0-9]*" value="${f.rr ?? ''}" placeholder="0" autocomplete="off"></label>
      </div>`;
    }
    if (f.kind === 'reps') {
      return html`<label class="field"><span class="label">Wiederholungen gesamt</span><input class="input num" id="rf-n" inputmode="numeric" pattern="[0-9]*" value="${f.n ?? ''}" autocomplete="off"></label>`;
    }
    if (f.kind === 'load') {
      return html`<label class="field"><span class="label">Gewicht in kg</span><input class="input num" id="rf-kg" inputmode="decimal" value="${f.kg ?? ''}" autocomplete="off"></label>`;
    }
    return html`<label class="field"><span class="label">Ergebnis</span><input class="input" id="rf-text" maxlength="40" value="${f.text ?? ''}" placeholder="z. B. 3 von 5 Runden" autocomplete="off"></label>`;
  }

  /** Formularwerte aus einem gespeicherten Ergebnis bzw. aus dem Timer */
  function initial(prefill) {
    const e = getEvent();
    const m = mine();
    const src = prefill && prefill.kind ? prefill : m;
    const f = { kind: guessKind(e && e.workout), cap: false, scale: (m && m.scale) || 'rx', note: (m && m.note) || '' };
    if (!src) return f;
    const v = src.value == null ? null : Number(src.value);
    if (src.kind === 'time' || src.kind === 'cap') {
      f.kind = 'time';
      f.cap = src.kind === 'cap';
      if (v != null && !f.cap) { f.min = Math.floor(v / 60); f.sec = String(Math.round(v % 60)).padStart(2, '0'); }
      if (v != null && f.cap) f.capreps = v;
    } else if (src.kind === 'rounds') {
      f.kind = 'rounds';
      if (v != null) { f.r = Math.floor(v / 1000); f.rr = v % 1000 || ''; }
    } else if (src.kind === 'reps') { f.kind = 'reps'; if (v != null) f.n = v; }
    else if (src.kind === 'load') { f.kind = 'load'; if (v != null) f.kg = String(v).replace('.', ','); }
    else if (src.kind === 'other') { f.kind = 'other'; f.text = src.text; }
    return f;
  }

  /** Eingaben lesen. Gibt { kind, value, text } oder { error } zurück. */
  function read(dlg, f) {
    const val = (id) => (dlg.querySelector('#' + id) || {}).value;
    if (f.kind === 'time') {
      if (f.cap) {
        const n = intOrNull(val('rf-capreps'));
        if (n == null || Number.isNaN(n)) return { error: 'Wie viele Wiederholungen hast du geschafft?' };
        return { kind: 'cap', value: n };
      }
      const min = intOrNull(val('rf-min'));
      const sec = intOrNull(val('rf-sec'));
      if (Number.isNaN(min) || Number.isNaN(sec) || (min == null && sec == null)) return { error: 'Bitte deine Zeit eingeben.' };
      if ((sec ?? 0) > 59) return { error: 'Sekunden gehen nur bis 59.' };
      const total = (min ?? 0) * 60 + (sec ?? 0);
      if (!total) return { error: 'Bitte deine Zeit eingeben.' };
      return { kind: 'time', value: total };
    }
    if (f.kind === 'rounds') {
      const r = intOrNull(val('rf-r'));
      const rr = intOrNull(val('rf-rr')) ?? 0;
      if (r == null || Number.isNaN(r) || Number.isNaN(rr)) return { error: 'Bitte die Runden eingeben.' };
      if (rr > 999 || r > 999) return { error: 'Das sind zu viele.' };
      return { kind: 'rounds', value: r * 1000 + rr };
    }
    if (f.kind === 'reps') {
      const n = intOrNull(val('rf-n'));
      if (n == null || Number.isNaN(n)) return { error: 'Bitte die Wiederholungen eingeben.' };
      return { kind: 'reps', value: n };
    }
    if (f.kind === 'load') {
      const kg = Number(String(val('rf-kg') || '').replace(',', '.').trim());
      if (!kg || kg < 0 || kg > 1000) return { error: 'Bitte das Gewicht in kg eingeben.' };
      return { kind: 'load', value: Math.round(kg * 10) / 10 };
    }
    const text = String(val('rf-text') || '').trim();
    if (!text) return { error: 'Bitte dein Ergebnis eintragen.' };
    return { kind: 'other', value: null, text };
  }

  async function openForm(prefill) {
    const e = getEvent();
    if (!e || !member || !data || !data.open) return;
    const m = mine();
    const f = initial(prefill);
    const content = html`<form class="res-form" novalidate>
      <div class="res-kind" role="group" aria-label="Art des Ergebnisses">
        ${Object.entries(KINDS).map(([k, v]) => html`<button type="button" data-kind="${k}" aria-pressed="${String(f.kind === k)}">${v.label}</button>`)}
      </div>
      <div id="rf-fields">${fields(f)}</div>
      <p class="label" style="margin:20px 0 0">Wie gemacht?</p>
      <div class="seg3" role="group" aria-label="Stufe">
        ${Object.entries(SCALES).map(([k, v]) => html`<button type="button" data-scale="${k}" aria-pressed="${String(f.scale === k)}">${v}</button>`)}
      </div>
      <label class="field"><span class="label">Notiz (optional)</span>
        <input class="input" id="rf-note" maxlength="140" value="${f.note}" placeholder="z. B. 20 kg statt 30, Ring Rows" autocomplete="off"></label>
      <p class="form-error" id="rf-err" role="alert" hidden></p>
      <div class="form-actions" style="margin-top:20px">
        <button class="btn" type="submit">Speichern</button>
        ${m ? html`<button class="link danger" type="button" data-res="delete">Ergebnis löschen</button>` : ''}
      </div>
    </form>`;

    await sheet(m ? 'Dein Ergebnis' : 'Ergebnis eintragen', content, (dlg, close) => {
      const form = dlg.querySelector('form');
      const errEl = dlg.querySelector('#rf-err');
      const showErr = (msg) => { errEl.textContent = msg || ''; errEl.hidden = !msg; };
      const redraw = () => {
        mount(dlg.querySelector('#rf-fields'), fields(f));
        dlg.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === f.kind)));
        showErr('');
      };
      // Eingaben über das Umschalten hinweg behalten
      const keep = () => {
        for (const [id, key] of [['rf-min', 'min'], ['rf-sec', 'sec'], ['rf-capreps', 'capreps'], ['rf-r', 'r'], ['rf-rr', 'rr'], ['rf-n', 'n'], ['rf-kg', 'kg'], ['rf-text', 'text']]) {
          const el = dlg.querySelector('#' + id);
          if (el) f[key] = el.value;
        }
      };
      dlg.addEventListener('click', async (ev) => {
        const k = ev.target.closest('[data-kind]');
        if (k) { keep(); f.kind = k.dataset.kind; redraw(); return; }
        const s = ev.target.closest('[data-scale]');
        if (s) {
          f.scale = s.dataset.scale;
          dlg.querySelectorAll('[data-scale]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scale === f.scale)));
          return;
        }
        if (ev.target.closest('[data-res="delete"]')) {
          close();
          if (!(await confirmSheet('Ergebnis löschen', 'Dein Ergebnis von diesem Training löschen?', 'Löschen', true))) return;
          try {
            data = await api.deleteResult(e.id, member.id);
            paint();
            toast('Ergebnis gelöscht');
            if (onChange) onChange();
          } catch (err) { toast(errText(err), 'error'); }
        }
      });
      dlg.addEventListener('change', (ev) => {
        if (ev.target.id === 'rf-cap') { keep(); f.cap = ev.target.checked; redraw(); }
      });
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        keep();
        const r = read(dlg, f);
        if (r.error) { showErr(r.error); return; }
        const prevBest = best(data.history || []);
        const btn = form.querySelector('[type=submit]');
        await busy(btn, async () => {
          try {
            const text = scoreText(r.kind, r.value, r.text);
            data = await api.saveResult(e.id, member.id, { ...r, text, scale: f.scale, note: dlg.querySelector('#rf-note').value });
            close();
            paint();
            const now = mine();
            if (prevBest && now && better(now, prevBest)) toast(`Neuer Bestwert! Vorher ${prevBest.text}`);
            else toast('Ergebnis gespeichert');
            if (onChange) onChange();
          } catch (err) { showErr(errText(err)); }
        });
      });
      // Erstes Feld fokussieren, aber am Handy nicht sofort die Tastatur aufreißen, wenn schon etwas drinsteht
      const first = dlg.querySelector('#rf-fields input');
      if (first && !first.value) setTimeout(() => first.focus(), 50);
    });
  }

  return { load, paint, open: openForm, get data() { return data; } };
}
