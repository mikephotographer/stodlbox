// Formulare: Serie und Terminfindung.
import { html, mount } from '../../html.js';
import { api } from '../../api.js';
import { errText, busy, toast, confirmSheet } from '../../ui.js';
import { toDateInput, toTimeInput, viennaToISO, todayInput, WEEKDAYS } from '../../format.js';
import { navigate } from '../../router.js';
import { adminHead } from './index.js';

// ---------------------------------------------------------------- Serie
export async function renderSeriesForm(root, id) {
  document.title = id ? 'STODLBOX · Serie' : 'STODLBOX · Neue Serie';
  mount(root, html`${adminHead(id ? 'Serie' : 'Neue Serie', { back: '#/admin' })}<div class="skeleton" style="height:300px" aria-busy="true"></div>`);
  let s = null;
  let settings = { default_duration_min: 90, default_capacity: null };
  try {
    const [list, st] = await Promise.all([api.listSeries(), api.getSettings()]);
    settings = st;
    if (id) {
      s = list.find((x) => x.id === id);
      if (!s) throw new Error('NOT_FOUND');
    }
  } catch (e) {
    mount(root, html`${adminHead('Serie', { back: '#/admin' })}<p class="err">${errText(e)}</p>`);
    return;
  }
  const v = s || { title: 'Samstags-WOD', weekday: 6, start_time: '09:00', duration_min: settings.default_duration_min || 90, capacity: settings.default_capacity, starts_on: todayInput(), ends_on: '', active: true };

  mount(root, html`${adminHead(s ? 'Serie' : 'Neue Serie', { back: '#/admin' })}
    ${s && !s.active ? html`<div class="banner"><p><strong>Pausiert.</strong> Diese Serie legt keine neuen Termine an.</p></div>` : ''}
    <p class="hint">Die Serie legt automatisch Termine für die nächsten 6 Wochen an (täglich geprüft). Das Workout bleibt leer („WOD folgt“) – du trägst es beim einzelnen Termin ein.</p>
    <form id="sf" novalidate>
      <label class="field"><span class="label">Titel</span><input class="input" name="title" maxlength="80" required value="${v.title}"></label>
      <div class="grid2">
        <label class="field"><span class="label">Wochentag</span>
          <select class="select" name="weekday">${WEEKDAYS.map((d, i) => html`<option value="${i + 1}" ${v.weekday === i + 1 ? 'selected' : ''}>${d}</option>`)}</select></label>
        <label class="field"><span class="label">Uhrzeit</span><input class="input" type="time" name="start_time" required step="300" value="${String(v.start_time).slice(0, 5)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span class="label">Dauer (Min.)</span><input class="input" type="number" name="duration_min" min="15" max="600" step="5" value="${v.duration_min}"></label>
        <label class="field"><span class="label">Max. Teilnehmer</span><input class="input" type="number" name="capacity" min="1" placeholder="unbegrenzt" value="${v.capacity ?? ''}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span class="label">Ab</span><input class="input" type="date" name="starts_on" required value="${v.starts_on}"></label>
        <label class="field"><span class="label">Bis (optional)</span><input class="input" type="date" name="ends_on" value="${v.ends_on || ''}"></label>
      </div>
      ${s ? html`<p class="hint">Änderungen gelten für neu angelegte Termine. Bestehende Termine bearbeitest du einzeln.</p>` : ''}
      <p class="err" id="sf-err" role="alert"></p>
      <div class="form-actions">
        <button class="btn" type="submit">${s ? 'SPEICHERN' : 'SERIE ANLEGEN'}</button>
        ${s ? (s.active
          ? html`<button type="button" class="btn ghost" data-action="pause">Serie pausieren oder beenden</button>`
          : html`<button type="button" class="btn ghost" data-action="resume">Serie fortsetzen</button>
                 <button type="button" class="link danger" data-action="purge">Künftige Termine ohne Zusagen löschen</button>`) : ''}
      </div>
    </form>`);

  root.onsubmit = async (e) => {
    e.preventDefault();
    const el = e.target.elements;
    const errEl = root.querySelector('#sf-err');
    const payload = {
      id: s ? s.id : null,
      title: el.title.value.trim(), weekday: +el.weekday.value, start_time: el.start_time.value,
      duration_min: +el.duration_min.value || 90, capacity: el.capacity.value === '' ? null : +el.capacity.value,
      starts_on: el.starts_on.value, ends_on: el.ends_on.value || null,
    };
    if (!payload.title || !payload.start_time || !payload.starts_on) { errEl.textContent = 'Titel, Uhrzeit und Startdatum fehlen.'; return; }
    if (payload.ends_on && payload.ends_on < payload.starts_on) { errEl.textContent = 'Das Enddatum liegt vor dem Start.'; return; }
    await busy(e.target.querySelector('button[type=submit]'), async () => {
      try {
        await api.saveSeries(payload);
        toast(s ? 'Gespeichert' : 'Serie angelegt – Termine sind da');
        navigate('/admin');
      } catch (err) { errEl.textContent = errText(err); }
    });
  };

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a || !s) return;
    try {
      if (a.dataset.action === 'pause') {
        if (!(await confirmSheet('Serie pausieren', 'Die Serie erzeugt dann keine neuen Termine mehr. Bestehende Termine bleiben.', 'Pausieren'))) return;
        await api.setSeriesActive(s.id, false);
        toast('Pausiert');
        renderSeriesForm(root, s.id);
      } else if (a.dataset.action === 'resume') {
        await api.setSeriesActive(s.id, true);
        toast('Läuft wieder');
        renderSeriesForm(root, s.id);
      } else if (a.dataset.action === 'purge') {
        if (!(await confirmSheet('Termine löschen', 'Alle künftigen Termine dieser Serie ohne Zusagen und Stimmen löschen?', 'Löschen', true))) return;
        const n = await api.deleteEmptySeriesEvents(s.id);
        toast(`${n} ${n === 1 ? 'Termin' : 'Termine'} gelöscht`);
      }
    } catch (err) { toast(errText(err), 'error'); }
  };
}

// ---------------------------------------------------------------- Terminfindung
export async function renderPollForm(root, id) {
  document.title = id ? 'STODLBOX · Terminfindung' : 'STODLBOX · Neue Terminfindung';
  let poll = null;
  if (id) {
    try {
      const board = await api.getBoard(null);
      poll = board.polls.find((p) => p.id === id);
      if (!poll) throw new Error('NOT_FOUND');
    } catch (e) {
      mount(root, html`${adminHead('Terminfindung', { back: '#/admin/umfragen' })}<p class="err">${errText(e)}</p>`);
      return;
    }
  }
  const f = {
    title: poll ? poll.title : '',
    dl_date: poll && poll.deadline ? toDateInput(poll.deadline) : '',
    dl_time: poll && poll.deadline ? toTimeInput(poll.deadline) : '20:00',
    options: poll
      ? poll.options.map((o) => ({ id: o.id, date: toDateInput(o.starts_at), time: toTimeInput(o.starts_at), n: o.members.length }))
      : [{ date: '', time: '18:30' }, { date: '', time: '18:30' }],
  };

  const collect = () => {
    const el = root.querySelector('#pf').elements;
    f.title = el.title.value; f.dl_date = el.dl_date.value; f.dl_time = el.dl_time.value;
    f.options = f.options.map((o, i) => ({ ...o, date: el[`o_date_${i}`].value, time: el[`o_time_${i}`].value }));
  };

  const draw = () => mount(root, html`${adminHead(poll ? 'Terminfindung' : 'Neue Terminfindung', { back: '#/admin/umfragen' })}
    <form id="pf" novalidate>
      <label class="field"><span class="label">Titel</span><input class="input" name="title" maxlength="80" required placeholder="z. B. Training KW 47" value="${f.title}"></label>
      <h2 class="section-title" style="margin-top:24px">Zeitoptionen (2–6)</h2>
      ${f.options.map((o, i) => html`<div class="grid2" style="grid-template-columns:1fr 110px auto;align-items:end">
        <label class="field"><span class="label">Option ${i + 1}${o.n ? ` · ${o.n} können` : ''}</span><input class="input" type="date" name="o_date_${i}" value="${o.date}" min="${todayInput()}" required></label>
        <label class="field"><span class="sr-only">Uhrzeit Option ${i + 1}</span><input class="input" type="time" name="o_time_${i}" value="${o.time}" step="300" required></label>
        ${f.options.length > 2 ? html`<button type="button" class="icon-btn" data-action="rm" data-i="${i}" aria-label="Option ${i + 1} entfernen" style="margin-top:16px">–</button>` : html`<span></span>`}
      </div>`)}
      ${f.options.length < 6 ? html`<button type="button" class="link" data-action="add" style="margin-top:6px">+ Option hinzufügen</button>` : ''}
      <div class="grid2">
        <label class="field"><span class="label">Antworten bis (optional)</span><input class="input" type="date" name="dl_date" value="${f.dl_date}"></label>
        <label class="field"><span class="label">Uhrzeit</span><input class="input" type="time" name="dl_time" value="${f.dl_time}" step="300"></label>
      </div>
      ${poll ? html`<p class="hint">Achtung: Entfernte Optionen verlieren ihre Antworten.</p>` : ''}
      <p class="err" id="pf-err" role="alert"></p>
      <div class="form-actions"><button class="btn" type="submit">${poll ? 'SPEICHERN' : 'UMFRAGE ANLEGEN'}</button></div>
    </form>`);
  draw();

  root.onclick = (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    collect();
    if (a.dataset.action === 'add') {
      const last = f.options[f.options.length - 1];
      f.options.push({ date: '', time: last ? last.time : '18:30' });
    }
    if (a.dataset.action === 'rm') f.options.splice(+a.dataset.i, 1);
    draw();
  };

  root.onsubmit = async (e) => {
    e.preventDefault();
    collect();
    const errEl = root.querySelector('#pf-err');
    if (!f.title.trim()) { errEl.textContent = 'Der Titel fehlt.'; return; }
    if (f.options.some((o) => !o.date || !o.time)) { errEl.textContent = 'Jede Option braucht Datum und Uhrzeit.'; return; }
    const options = f.options.map((o) => ({ id: o.id || null, starts_at: viennaToISO(o.date, o.time) }));
    if (new Set(options.map((o) => o.starts_at)).size !== options.length) { errEl.textContent = 'Zwei Optionen sind gleich.'; return; }
    options.sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));
    await busy(e.target.querySelector('button[type=submit]'), async () => {
      try {
        await api.savePoll({ id: poll ? poll.id : null, title: f.title.trim(), deadline: f.dl_date ? viennaToISO(f.dl_date, f.dl_time || '20:00') : null, options });
        toast('Gespeichert');
        navigate('/admin/umfragen');
      } catch (err) { errEl.textContent = errText(err); }
    });
  };
}
