// Termin anlegen / bearbeiten (inkl. Voting, Workout-Datenbank, Teilnehmer, Absagen).
import { html, mount } from '../../html.js';
import { icons } from '../../icons.js';
import { api } from '../../api.js';
import { errText, busy, toast, sheet, confirmSheet } from '../../ui.js';
import { toDateInput, toTimeInput, viennaToISO, short, todayInput, vienna } from '../../format.js';
import { matchEquipment, tipWithTerms } from '../../equipment.js';
import { counts } from '../../components/event.js';
import { appLink, shareText, voteShareText, eventShareText } from '../../share.js';
import { navigate } from '../../router.js';
import { adminHead } from './index.js';
import { filterChips, categoryCounts, hasTag, matchesQuery } from '../../components/workouts.js';

const STATUS_LABEL = { yes: 'dabei', maybe: 'vielleicht', no: 'kann nicht', waitlist: 'warteliste' };

function nextSaturday() {
  const v = vienna(new Date());
  const add = ((5 - v.wd + 7) % 7) || 7;
  return new Date(Date.UTC(v.y, v.m - 1, v.d + add)).toISOString().slice(0, 10);
}
function dayBefore(dateStr) {
  return new Date(Date.parse(dateStr) - 864e5).toISOString().slice(0, 10);
}

function equipPreview(text, rules) {
  const m = matchEquipment(text, rules);
  return m.length ? `Mitnehmen: ${m.map((x) => tipWithTerms(x.tip, [x.terms[0]])).join(' · ')}` : '';
}

export async function renderEventForm(root, id, { fromPoll, optionId } = {}) {
  document.title = id ? 'STODLBOX · Termin bearbeiten' : 'STODLBOX · Neuer Termin';
  mount(root, html`${adminHead(id ? 'Termin' : 'Neuer Termin', { back: '#/admin' })}<div class="skeleton" style="height:300px" aria-busy="true"></div>`);

  let ev = null;
  let rules = [];
  let settings = { default_duration_min: 90, default_capacity: null };
  let members = [];
  let pollOpt = null;
  try {
    const jobs = [api.listRules(), api.getSettings(), api.listAllMembers()];
    if (id) jobs.push(api.getEvent(id, null));
    if (fromPoll) jobs.push(api.getBoard(null));
    const res = await Promise.all(jobs);
    rules = res[0].filter((r) => r.active);
    settings = res[1];
    members = res[2].filter((m) => m.active);
    if (id) ev = res[3];
    if (fromPoll) {
      const poll = res[res.length - 1].polls.find((p) => p.id === fromPoll);
      pollOpt = poll && poll.options.find((o) => o.id === optionId);
      if (pollOpt) pollOpt.pollTitle = poll.title;
    }
  } catch (e) {
    mount(root, html`${adminHead('Termin', { back: '#/admin' })}<p class="err">${errText(e)}</p>`);
    return;
  }

  // Formularzustand
  const start = ev ? ev.starts_at : pollOpt ? pollOpt.starts_at : null;
  const f = {
    date: start ? toDateInput(start) : nextSaturday(),
    time: start ? toTimeInput(start) : '09:00',
    duration_min: ev ? ev.duration_min : settings.default_duration_min || 90,
    title: ev ? ev.title : '',
    capacity: ev ? (ev.capacity ?? '') : (settings.default_capacity ?? ''),
    mode: ev && ev.workout_mode === 'vote' && !ev.vote_closed ? 'vote' : 'fixed',
    workout: ev ? ev.workout || '' : '',
    options: ev && ev.options.length && !ev.vote_closed
      ? ev.options.map((o) => ({ id: o.id, label: o.label, workout: o.workout }))
      : [{ label: '', workout: '' }, { label: '', workout: '' }],
    vote_date: ev && ev.vote_deadline ? toDateInput(ev.vote_deadline) : '',
    vote_time: ev && ev.vote_deadline ? toTimeInput(ev.vote_deadline) : '20:00',
    note: ev ? ev.note || '' : '',
    media_url: ev ? ev.media_url || '' : '',
    private: ev ? !!ev.private : false,
    as_template: false,
    prefill: false,
  };
  if (!f.vote_date) f.vote_date = dayBefore(f.date);

  const optionFields = (o, i) => html`<div class="opt-card" data-opt="${i}">
    <div class="label-row" style="margin:0 0 4px"><span class="section-title" style="margin:0">Option ${String.fromCharCode(65 + i)}</span>
      <span class="row" style="gap:4px">
        <button type="button" class="link" data-action="pick-template" data-target="${i}">Aus Datenbank</button>
        ${f.options.length > 2 ? html`<button type="button" class="link muted" data-action="remove-option" data-target="${i}">Entfernen</button>` : ''}
      </span></div>
    <label class="field"><span class="label">Kurztitel</span>
      <input class="input" name="opt_label_${i}" maxlength="40" value="${o.label}" placeholder="z. B. Chipper 100er" required></label>
    <label class="field"><span class="label">Workout</span>
      <textarea class="textarea" name="opt_workout_${i}" rows="5" required placeholder="100 DU&#10;100 Wall Balls">${o.workout}</textarea></label>
    <p class="equip-inline" data-preview="opt_workout_${i}">${equipPreview(o.workout, rules)}</p>
  </div>`;

  const participants = () => {
    if (!ev) return '';
    const byMember = new Map(ev.rsvps.map((r) => [r.member_id, r.status]));
    const c = counts(ev);
    const list = [...members].sort((a, b) => (byMember.has(b.id) - byMember.has(a.id)) || a.name.localeCompare(b.name, 'de'));
    return html`<div class="sep" role="presentation"></div>
      <div class="label-row"><h2 class="section-title" style="margin:0">Teilnehmer</h2>
        <span class="label">${c.yes}${ev.capacity ? '/' + ev.capacity : ''} DABEI${c.waitlist ? ` · ${c.waitlist} WARTELISTE` : ''}</span></div>
      <p class="hint" style="margin:0 0 8px">Wenn dir jemand per WhatsApp zu- oder absagt, stell es hier ein.</p>
      ${list.map((m) => {
        const s = byMember.get(m.id) || 'none';
        return html`<div class="p-row"><span class="n">${m.name}</span>
          ${s === 'waitlist' ? html`<span class="label">Warteliste</span>` : ''}
          <label class="sr-only" for="ps-${m.id}">Status von ${m.name}</label>
          <select class="select" id="ps-${m.id}" data-member="${m.id}">
            ${[['none', '—'], ['yes', 'dabei'], ['maybe', 'vielleicht'], ['no', 'kann nicht']].map(([v, l]) =>
              html`<option value="${v}" ${(s === v || (s === 'waitlist' && v === 'yes')) ? 'selected' : ''}>${l}</option>`)}
          </select></div>`;
      })}`;
  };

  const voteAdmin = () => {
    if (!ev || ev.workout_mode !== 'vote' || ev.vote_closed) return '';
    const total = ev.options.reduce((s, o) => s + o.votes, 0);
    return html`<div class="card" style="margin-top:16px">
      <p class="section-title">Stand: ${total} ${total === 1 ? 'Stimme' : 'Stimmen'}</p>
      <p class="mono" style="font-size:14px;margin:8px 0 12px">${ev.options.map((o) => `${o.label}: ${o.votes}`).join(' · ')}</p>
      <button type="button" class="btn sm" style="width:100%" data-action="close-vote">Abstimmung jetzt abschließen</button>
    </div>`;
  };

  const draw = () => {
    mount(root, html`${adminHead(ev ? 'Termin' : 'Neuer Termin', { back: fromPoll ? '#/admin/umfragen' : '#/admin' })}
      ${ev && ev.status === 'cancelled' ? html`<div class="banner"><p><strong>Abgesagt.</strong> Die Freunde sehen den Termin durchgestrichen.</p></div>` : ''}
      ${pollOpt ? html`<div class="banner">${icons.vote(20)}<p>Aus der Terminfindung „${pollOpt.pollTitle}“: ${short(pollOpt.starts_at)} · ${pollOpt.members.length} können.</p></div>` : ''}
      <form id="evf" novalidate>
        <div class="grid2">
          <label class="field"><span class="label">Datum</span><input class="input" type="date" name="date" required value="${f.date}" min="${ev ? '' : todayInput()}"></label>
          <label class="field"><span class="label">Uhrzeit</span><input class="input" type="time" name="time" required value="${f.time}" step="300"></label>
        </div>
        <div class="grid2">
          <label class="field"><span class="label">Dauer (Min.)</span><input class="input" type="number" name="duration_min" min="15" max="600" step="5" inputmode="numeric" value="${f.duration_min}"></label>
          <label class="field"><span class="label">Max. Teilnehmer</span><input class="input" type="number" name="capacity" min="1" max="200" inputmode="numeric" placeholder="unbegrenzt" value="${f.capacity}"></label>
        </div>
        <label class="field"><span class="label">Titel</span><input class="input" name="title" maxlength="80" required placeholder="z. B. HYROX-Sim Light" value="${f.title}"></label>
        ${pollOpt ? '' : html`<label class="toggle-row" style="margin-top:18px"><span><strong>Nur für mich</strong>
          <span class="muted">Geheim: Die anderen sehen diesen Termin nirgends. Zum Allein-Trainieren und Mitschreiben.</span></span>
          <input type="checkbox" class="switch" name="private" ${f.private ? 'checked' : ''}></label>`}

        <div class="field"><span class="label">Workout</span>
          <div class="seg" role="group" aria-label="Workout-Modus">
            <button type="button" data-action="mode" data-mode="fixed" aria-pressed="${String(f.mode === 'fixed')}">Fixes Workout</button>
            <button type="button" data-action="mode" data-mode="vote" aria-pressed="${String(f.mode === 'vote')}">Abstimmung (2–3)</button>
          </div>
        </div>

        ${f.mode === 'fixed' ? html`
          <div class="field">
            <div class="label-row" style="margin-bottom:6px"><label class="label" for="workout">Workout-Text</label>
              <button type="button" class="link" data-action="pick-template" data-target="main">Aus Datenbank oder früher</button></div>
            <textarea class="textarea" id="workout" name="workout" rows="8" placeholder="4 Runden:&#10;400 m Run&#10;20 Wall Balls&#10;&#10;Leer lassen = „Workout folgt“">${f.workout}</textarea>
            <p class="equip-inline" data-preview="workout">${equipPreview(f.workout, rules)}</p>
          </div>` : html`
          ${f.options.map(optionFields)}
          ${f.options.length < 3 ? html`<button type="button" class="link" data-action="add-option" style="margin-top:6px">+ Option hinzufügen</button>` : ''}
          <div class="grid2">
            <label class="field"><span class="label">Abstimmung bis (Datum)</span><input class="input" type="date" name="vote_date" value="${f.vote_date}"></label>
            <label class="field"><span class="label">Uhrzeit</span><input class="input" type="time" name="vote_time" value="${f.vote_time}" step="300"></label>
          </div>
          <p class="hint">Danach wird automatisch abgeschlossen (alle 15 Min. geprüft). Bei Gleichstand wählst du den Sieger.</p>`}
        ${voteAdmin()}

        <label class="field"><span class="label">Notiz (optional)</span><textarea class="textarea" name="note" rows="2" style="min-height:72px;font-family:var(--font-body);font-size:16px">${f.note}</textarea></label>
        <label class="field"><span class="label">Foto-/Video-Link (optional)</span><input class="input" type="url" name="media_url" inputmode="url" placeholder="https://…" value="${f.media_url}"></label>

        <label class="check"><input type="checkbox" name="as_template" ${f.as_template ? 'checked' : ''}> In Workout-Datenbank speichern</label>
        ${pollOpt ? html`<label class="check"><input type="checkbox" name="prefill" ${f.prefill ? 'checked' : ''}> Alle ${pollOpt.members.length}, die für diese Option gestimmt haben, auf „vielleicht“ setzen</label>` : ''}

        <p class="err" id="evf-err" role="alert"></p>
        <div class="form-actions">
          <button class="btn" type="submit">Speichern</button>
          ${ev ? html`<div class="row" style="justify-content:center;gap:24px">
            ${ev.private ? '' : html`<button type="button" class="link" data-action="share">Teilen</button>`}
            <a class="link" href="#/t/${ev.id}">${ev.private ? 'In der App öffnen' : 'So sehen es die Freunde'}</a>
          </div>` : ''}
        </div>
      </form>
      ${participants()}
      ${ev ? html`<div class="danger-zone">
        ${ev.status === 'cancelled'
          ? html`<button type="button" class="link" style="padding:0" data-action="reactivate">Wieder aktivieren</button>`
          : html`<button type="button" class="link danger" style="padding:0" data-action="cancel">Termin absagen</button>`}
        <button type="button" class="link danger" style="padding:0" data-action="delete">Endgültig löschen</button>
      </div>` : ''}`);
  };

  // Formularwerte in f übernehmen (vor Re-Render, damit nichts verloren geht)
  const collect = () => {
    const form = root.querySelector('#evf');
    if (!form) return;
    const el = form.elements;
    f.date = el.date.value; f.time = el.time.value;
    f.duration_min = el.duration_min.value; f.capacity = el.capacity.value;
    f.title = el.title.value; f.note = el.note.value; f.media_url = el.media_url.value;
    f.as_template = el.as_template.checked;
    f.private = el.private ? el.private.checked : false;
    if (el.prefill) f.prefill = el.prefill.checked;
    if (f.mode === 'fixed') f.workout = el.workout.value;
    else {
      f.options = f.options.map((o, i) => ({ ...o, label: el[`opt_label_${i}`].value, workout: el[`opt_workout_${i}`].value }));
      f.vote_date = el.vote_date.value; f.vote_time = el.vote_time.value;
    }
  };

  draw();

  root.oninput = (e) => {
    const t = e.target;
    const prev = root.querySelector(`[data-preview="${t.name}"]`);
    if (prev) prev.textContent = equipPreview(t.value, rules);
  };

  root.onchange = async (e) => {
    const sel = e.target.closest('select[data-member]');
    if (!sel || !ev) return;
    try {
      const res = await api.adminSetRsvp(ev.id, sel.dataset.member, sel.value);
      if (res && res.status === 'waitlist') toast('Voll – auf die Warteliste gesetzt');
      else toast('Gespeichert');
      collect();
      ev = await api.getEvent(ev.id, null);
      draw();
    } catch (err) {
      toast(errText(err), 'error');
    }
  };

  async function pickTemplate(target) {
    let results = [];
    let tag = '';
    const pick = await sheet('Workout aus Datenbank oder früher', html`
      <label class="sr-only" for="tpl-q">Suchen</label>
      <input class="input" id="tpl-q" type="search" placeholder="Suchen: Name, Übung, Gruppe …" autocomplete="off">
      <div id="tpl-chips"></div>
      <div id="tpl-list" style="margin-top:4px"><p class="muted">Lädt …</p></div>`, (dlg, close) => {
      const list = dlg.querySelector('#tpl-list');
      const chips = dlg.querySelector('#tpl-chips');
      const q = dlg.querySelector('#tpl-q');
      let timer;
      let counts = [];
      // Ganze Datenbank einmal laden und lokal filtern (die Such-RPC liefert max. 60 Vorlagen).
      let all = null;
      const drawChips = () => mount(chips, counts.length ? filterChips(counts, tag) : '');
      const load = async () => {
        try {
          if (!all) {
            all = (await api.listTemplates()).map((t) => ({ kind: 'template', id: t.id, title: t.title, workout: t.workout, tags: t.tags || [], date: null }));
            counts = categoryCounts(all);
            drawChips();
          }
          const tpl = all.filter((w) => hasTag(w, tag) && matchesQuery(w, q.value));
          const past = tag ? [] : (await api.searchWorkouts(q.value)).filter((r) => r.kind === 'event');
          results = [...tpl, ...past];
          mount(list, results.length ? html`<p class="count" style="margin-top:4px">${tpl.length} aus der Datenbank${past.length ? `, ${past.length} von früheren Terminen` : ''}</p>
            ${results.map((r, i) => html`<button class="pick" data-i="${i}">
            <span class="k">${r.kind === 'template' ? ((r.tags || []).join(' · ') || 'Datenbank') : `Termin am ${short(r.date)}`}</span>
            <span class="t">${r.title}</span><span class="w">${r.workout}</span></button>`)}`
            : html`<p class="muted">Nichts gefunden.</p>`);
        } catch (err) {
          mount(list, html`<p class="err">${errText(err)}</p>`);
        }
      };
      q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 200); });
      chips.addEventListener('click', (e2) => {
        const c = e2.target.closest('[data-tag]');
        if (!c) return;
        tag = c.dataset.tag;
        drawChips();
        load();
      });
      list.addEventListener('click', (e2) => {
        const b = e2.target.closest('[data-i]');
        if (b) close(results[+b.dataset.i]);
      });
      load();
    });
    if (!pick) return;
    collect();
    if (target === 'main') {
      f.workout = pick.workout;
      if (!f.title.trim()) f.title = pick.title;
    } else {
      const i = +target;
      f.options[i] = { ...f.options[i], label: f.options[i].label.trim() || pick.title.slice(0, 40), workout: pick.workout };
    }
    draw();
  }

  root.onclick = async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'mode') { collect(); f.mode = el.dataset.mode; draw(); return; }
    if (a === 'add-option') { collect(); f.options.push({ label: '', workout: '' }); draw(); return; }
    if (a === 'remove-option') { collect(); f.options.splice(+el.dataset.target, 1); draw(); return; }
    if (a === 'pick-template') { await pickTemplate(el.dataset.target); return; }
    if (!ev) return;
    if (a === 'share') {
      const link = appLink(`/t/${ev.id}`);
      await shareText(ev.workout_mode === 'vote' && !ev.vote_closed ? voteShareText(ev, link) : eventShareText(ev, link));
    } else if (a === 'cancel') {
      if (await confirmSheet('Termin absagen', `„${ev.title}“ am ${short(ev.starts_at)} absagen? Der Termin bleibt durchgestrichen sichtbar.`, 'Absagen', true)) {
        try { await api.setEventStatus(ev.id, 'cancelled'); toast('Abgesagt'); navigate('/admin'); } catch (err) { toast(errText(err), 'error'); }
      }
    } else if (a === 'reactivate') {
      try { await api.setEventStatus(ev.id, 'planned'); toast('Wieder aktiv'); ev = await api.getEvent(ev.id, null); collect(); draw(); } catch (err) { toast(errText(err), 'error'); }
    } else if (a === 'delete') {
      const n = ev.rsvps.length;
      if (await confirmSheet('Termin löschen', `„${ev.title}“ endgültig löschen?${n ? ` ${n} Zusagen gehen verloren.` : ''}${ev.series_id ? ' Achtung: Solange die Serie läuft, legt sie den Termin wieder an – dann lieber absagen.' : ''}`, 'Löschen', true)) {
        try { await api.deleteEvent(ev.id); toast('Gelöscht'); navigate('/admin'); } catch (err) { toast(errText(err), 'error'); }
      }
    } else if (a === 'close-vote') {
      try {
        await api.closeVote(ev.id);
        toast('Voting abgeschlossen');
        ev = await api.getEvent(ev.id, null);
        f.mode = 'fixed'; f.workout = ev.workout || '';
        draw();
      } catch (err) {
        if (String(err.code || err.message).includes('TIE')) {
          const max = Math.max(...ev.options.map((o) => o.votes));
          const pick = await sheet('Gleichstand – wähle den Sieger', html`<div class="menu">${ev.options.map((o) => html`<button data-opt="${o.id}">
            ${o.votes === max ? icons.check(22) : icons.vote(22)}<span>${o.label} <span class="muted" style="font-size:14px">· ${o.votes}</span></span></button>`)}</div>`,
          (dlg, close) => dlg.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => close(b.dataset.opt))));
          if (!pick) return;
          try {
            await api.closeVote(ev.id, pick);
            toast('Sieger übernommen');
            ev = await api.getEvent(ev.id, null);
            f.mode = 'fixed'; f.workout = ev.workout || '';
            draw();
          } catch (err2) { toast(errText(err2), 'error'); }
        } else toast(errText(err), 'error');
      }
    }
  };

  root.onsubmit = async (e) => {
    e.preventDefault();
    collect();
    const errEl = root.querySelector('#evf-err');
    errEl.textContent = '';
    const fail = (msg) => { errEl.textContent = msg; };
    if (!f.date || !f.time) return fail('Datum und Uhrzeit fehlen.');
    if (!f.title.trim()) return fail('Der Titel fehlt.');
    if (f.capacity !== '' && (+f.capacity < 1 || !Number.isInteger(+f.capacity))) return fail('Max. Teilnehmer muss eine ganze Zahl ab 1 sein (oder leer).');
    if (f.media_url.trim() && !/^https?:\/\//i.test(f.media_url.trim())) return fail('Der Foto-Link muss mit https:// beginnen.');
    const starts = viennaToISO(f.date, f.time);
    const payload = {
      id: ev ? ev.id : null,
      starts_at: starts,
      duration_min: +f.duration_min || 90,
      title: f.title.trim(),
      capacity: f.capacity === '' ? null : +f.capacity,
      workout_mode: f.mode,
      workout: f.mode === 'fixed' ? f.workout.trim() : null,
      note: f.note.trim(),
      media_url: f.media_url.trim(),
      private: !pollOpt && f.private,
    };
    if (f.mode === 'vote') {
      const opts = f.options.map((o) => ({ ...o, label: o.label.trim(), workout: o.workout.trim() }));
      if (opts.some((o) => !o.label || !o.workout)) return fail('Jede Option braucht Kurztitel und Workout.');
      payload.options = opts;
      payload.vote_deadline = f.vote_date ? viennaToISO(f.vote_date, f.vote_time || '20:00') : null;
      if (payload.vote_deadline && payload.vote_deadline > starts) return fail('Das Voting muss vor dem Termin enden.');
    }
    await busy(root.querySelector('button[type=submit]'), async () => {
      try {
        let newId;
        if (pollOpt) newId = await api.pollToEvent(optionId, payload, f.prefill);
        else newId = await api.saveEvent(payload);
        if (f.as_template) {
          const tpls = f.mode === 'fixed'
            ? (payload.workout ? [{ title: payload.title, workout: payload.workout }] : [])
            : payload.options.map((o) => ({ title: o.label, workout: o.workout }));
          // Gleiches Workout nicht doppelt ablegen
          const known = new Set((await api.listTemplates()).map((t) => t.workout.trim()));
          await Promise.all(tpls.filter((t) => !known.has(t.workout.trim())).map((t) => api.saveTemplate(t)));
        }
        toast('Gespeichert');
        if (!ev && !payload.private) {
          const go = await confirmSheet('Gespeichert', 'Gleich in die WhatsApp-Gruppe teilen?', 'Teilen');
          if (go) {
            const link = appLink(`/t/${newId}`);
            const fake = { ...payload, id: newId };
            await shareText(f.mode === 'vote' ? voteShareText(fake, link) : eventShareText(fake, link));
          }
        }
        navigate(pollOpt ? '/admin/umfragen' : '/admin');
      } catch (err) {
        fail(errText(err));
      }
    });
  };
}
