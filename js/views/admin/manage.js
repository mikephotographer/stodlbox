// Verwaltung: Workout-Datenbank, Equipment-Regeln, Leute, Einstellungen.
import { html, mount } from '../../html.js';
import { icons } from '../../icons.js';
import { api, DEMO } from '../../api.js';
import { state, normCode } from '../../state.js';
import { errText, busy, toast, sheet, confirmSheet } from '../../ui.js';
import { matchEquipment, equipmentSentence } from '../../equipment.js';
import { appLink, shareText, copyText } from '../../share.js';
import { navigate } from '../../router.js';
import { adminHead } from './index.js';
import { parseTags, matchesQuery, workoutRow, categoryChips, filterBar, filterSheet, matchesFilter, emptyFilter, benchOn, toggleBench } from '../../components/workouts.js';
import { CATEGORIES, FORMATS, EQUIPMENT, EXTRAS, canonical, categoryOf, formatsOf, equipmentOf, extrasOf, orderTags, suggestTags } from '../../classify.js';

/** Sheet mit Formular; resolve mit FormData-Objekt oder undefined */
function formSheet(title, body, okLabel = 'Speichern', validate) {
  return sheet(title, html`<form novalidate data-sheet-form>${body}<p class="err" role="alert"></p>
    <div class="form-actions"><button class="btn" type="submit">${okLabel}</button><button class="link" type="button" data-close>abbrechen</button></div></form>`,
  (dlg, close) => {
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      form.querySelectorAll('input[type=checkbox]').forEach((c) => { data[c.name] = c.checked; });
      const msg = validate && validate(data);
      if (msg) { form.querySelector('.err').textContent = msg; return; }
      close(data);
    });
    const first = form.querySelector('input,textarea');
    if (first) setTimeout(() => first.focus(), 50);
  });
}

// ---------------------------------------------------------------- Workout-Datenbank
export async function renderWorkouts(root) {
  document.title = 'STODLBOX · Workouts';
  mount(root, html`${adminHead('Workouts', { plus: 'new' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let list = [];
  let q = '';
  let filter = emptyFilter();
  const load = async () => {
    try { list = await api.listTemplates(); } catch (e) { mount(root, html`${adminHead('Workouts')}<p class="err">${errText(e)}</p>`); return false; }
    return true;
  };

  // Liste und Chips werden getrennt neu gezeichnet, damit das Suchfeld den Fokus behält.
  const drawList = () => {
    mount(root.querySelector('#wo-chips'), list.length ? html`${categoryChips(list, filter.cat, benchOn(filter))}${filterBar(filter)}` : '');
    const shown = list.filter((w) => matchesFilter(w, filter) && matchesQuery(w, q));
    mount(root.querySelector('#wo-list'), !list.length
      ? html`<div class="empty-state"><p class="label">Noch keine Workouts</p><p>Leg eines über das Plus an oder hak beim Termin „In Workout-Datenbank speichern“ an.</p></div>`
      : shown.length
        ? html`<p class="count">${shown.length} ${shown.length === 1 ? 'Workout' : 'Workouts'}</p><ul class="list">${shown.map(workoutRow)}</ul>`
        : html`<p class="muted" style="padding:16px 0">Nichts gefunden.</p>`);
  };
  const draw = () => {
    mount(root, html`${adminHead('Workouts', { plus: 'new' })}
      <label class="sr-only" for="wo-q">Workouts durchsuchen</label>
      <input class="input" id="wo-q" type="search" placeholder="Suchen: Name, Übung, Gruppe …" autocomplete="off" value="${q}">
      <div id="wo-chips"></div>
      <div id="wo-list"></div>
      <p class="hint" style="margin-top:20px">Beim Termin holst du ein Workout über „Aus Datenbank oder früher“.</p>`);
    drawList();
  };
  if (!(await load())) return;
  draw();

  root.oninput = (e) => {
    if (e.target.id !== 'wo-q') return;
    q = e.target.value;
    drawList();
  };

  root.onclick = async (e) => {
    const cat = e.target.closest('[data-cat]');
    if (cat) { filter = { ...filter, cat: cat.dataset.cat }; drawList(); return; }
    if (e.target.closest('[data-bench]')) { filter = toggleBench(filter); drawList(); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) { filter = { ...filter, [rm.dataset.remove]: filter[rm.dataset.remove].filter((x) => x !== rm.dataset.value) }; drawList(); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'filters') {
      const next = await filterSheet(list, filter);
      if (next) { filter = next; drawList(); }
      return;
    }
    const w = a.dataset.id ? list.find((x) => x.id === a.dataset.id) : null;
    const res = await workoutSheet(w, filter.cat);
    try {
      if (res === 'delete' && w) {
        if (await confirmSheet('Workout löschen', `„${w.title}“ aus der Datenbank löschen? Termine, die es schon verwenden, bleiben unverändert.`, 'Löschen', true)) {
          await api.deleteTemplate(w.id);
          toast('Gelöscht');
        }
      } else if (res) {
        await api.saveTemplate({ id: w && w.id, ...res });
        toast(w ? 'Gespeichert' : 'Workout angelegt');
      }
    } catch (err) { toast(errText(err), 'error'); }
    if (await load()) draw();
  };
}

/** Bearbeiten/Anlegen. Resolve: Daten-Objekt, 'delete' oder undefined */
function workoutSheet(w, presetCat) {
  const t0 = w ? (w.tags || []).map(canonical) : [];
  const sel = {
    category: categoryOf(t0) || presetCat || 'Eigene',
    formats: formatsOf(t0),
    equipment: equipmentOf(t0),
    extras: extrasOf(t0),
  };
  let touched = !!w; // bei neuen Workouts Art und Geräte aus dem Text vorschlagen, bis von Hand getippt wird
  const chips = (k, values) => html`${values.map((v) => html`<button type="button" class="chip" data-k="${k}" data-v="${v}" aria-pressed="${String(k === 'category' ? sel.category === v : sel[k].includes(v))}">${v}</button>`)}`;
  const groups = () => html`
    <p class="label" style="margin:18px 0 0">Gruppe</p><div class="chips wrap" data-group="category">${chips('category', CATEGORIES)}</div>
    <div class="label-row" style="margin:18px 0 0"><span class="label">Art</span>
      <button type="button" class="link" data-auto>${icons.refresh(14)} Aus dem Text erkennen</button></div>
    <div class="chips wrap" data-group="formats">${chips('formats', FORMATS)}</div>
    <p class="label" style="margin:18px 0 0">Geräte</p><div class="chips wrap" data-group="equipment">${chips('equipment', EQUIPMENT)}</div>
    <p class="label" style="margin:18px 0 0">Merkmale</p><div class="chips wrap" data-group="extras">${chips('extras', [...new Set([...EXTRAS, ...sel.extras])])}</div>`;
  return sheet(w ? 'Workout bearbeiten' : 'Neues Workout', html`<form novalidate>
    <label class="field" style="margin-top:0"><span class="label">Name</span><input class="input" name="title" maxlength="80" placeholder="z. B. Fran" value="${w ? w.title : ''}" required></label>
    <label class="field"><span class="label">Workout</span><textarea class="textarea" name="workout" rows="8" placeholder="For Time, 21-15-9:&#10;Thruster (43/30 kg)&#10;Pull-Ups" required>${w ? w.workout : ''}</textarea></label>
    <div data-groups>${groups()}</div>
    <label class="field"><span class="label">Weitere Tags (optional)</span><input class="input" name="more" autocomplete="off" placeholder="mit Komma trennen, z. B. Sommer" value=""></label>
    <label class="field"><span class="label">Notiz (optional)</span><textarea class="textarea" name="notes" rows="2" style="min-height:72px;font-family:var(--font-body);font-size:16px" placeholder="Skalierung, Herkunft, Tipps">${w && w.notes ? w.notes : ''}</textarea></label>
    <p class="err" role="alert"></p>
    <div class="form-actions"><button class="btn" type="submit">Speichern</button>
      ${w ? html`<button class="link danger" type="button" data-del>Workout löschen</button>` : ''}
      <button class="link" type="button" data-close>abbrechen</button></div></form>`, (dlg, close) => {
    const form = dlg.querySelector('form');
    const box = dlg.querySelector('[data-groups]');
    const redraw = () => mount(box, groups());
    const auto = () => {
      const s2 = suggestTags({ title: form.elements.title.value, workout: form.elements.workout.value, tags: [sel.category, ...sel.extras] });
      sel.formats = formatsOf(s2);
      sel.equipment = equipmentOf(s2);
      sel.extras = extrasOf(s2);
      redraw();
    };
    form.elements.workout.addEventListener('input', () => { if (!touched) auto(); });
    box.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-auto]')) { auto(); return; }
      const b = ev.target.closest('[data-k]');
      if (!b) return;
      const { k, v } = b.dataset;
      if (k === 'category') sel.category = v;
      else { touched = true; sel[k] = sel[k].includes(v) ? sel[k].filter((x) => x !== v) : [...sel[k], v]; }
      redraw();
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const title = form.elements.title.value.trim();
      const workout = form.elements.workout.value.trim();
      if (!title || !workout) { form.querySelector('.err').textContent = 'Name und Workout ausfüllen.'; return; }
      const extras = [...sel.extras, ...parseTags(form.elements.more.value).map(canonical)];
      const tags = orderTags({ category: sel.category, formats: sel.formats, equipment: sel.equipment, extras });
      close({ title, workout, tags, notes: form.elements.notes.value.trim() || null });
    });
    dlg.querySelector('[data-del]')?.addEventListener('click', () => close('delete'));
    if (!w) setTimeout(() => form.elements.title.focus(), 50);
  });
}

// ---------------------------------------------------------------- Equipment
export async function renderEquipment(root) {
  document.title = 'STODLBOX · Equipment';
  mount(root, html`${adminHead('Equipment', { back: '#/admin/mehr', plus: 'new' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let rules = [];
  let testText = '5 Runden:\n400 m Run\n10 Toes-to-Bar\n50 DU\nwenn du magst: 10 Burpees';
  const load = async () => {
    try { rules = await api.listRules(); return true; } catch (e) { mount(root, html`${adminHead('Equipment', { back: '#/admin/mehr' })}<p class="err">${errText(e)}</p>`); return false; }
  };
  const testResult = () => {
    const m = matchEquipment(testText, rules);
    return m.length ? `Einpacken: ${equipmentSentence(m)}` : 'Kein Tipp.';
  };
  const draw = () => mount(root, html`${adminHead('Equipment', { back: '#/admin/mehr', plus: 'new' })}
    <p class="hint" style="margin-bottom:12px">Kommt ein Keyword im Workout vor, erscheint der Tipp als gelbes Banner. Treffer nur als ganzes Wort („run“ trifft nicht „Runden“).</p>
    ${rules.map((r) => html`<div class="rule ${r.active ? '' : 'off'}">
      <div class="row" style="flex-wrap:nowrap">
        <button class="pick" data-action="edit" data-id="${r.id}" style="border:0;padding:0;flex:1">
          <span class="t" style="display:block">${r.tip}</span>
          <span class="kw" style="display:block">${r.keywords.join(', ')}${r.case_sensitive ? ' · Groß-/Kleinschreibung beachten' : ''}</span></button>
        <label class="check" style="margin:0"><input type="checkbox" data-toggle="${r.id}" ${r.active ? 'checked' : ''}><span class="sr-only">${r.tip} aktiv</span></label>
      </div></div>`)}
    <div class="sep" role="presentation"></div>
    <h2 class="section-title">Ausprobieren</h2>
    <label class="sr-only" for="eq-test">Testtext</label>
    <textarea class="textarea" id="eq-test" rows="5" style="margin-top:8px">${testText}</textarea>
    <div class="equip" id="eq-out">${icons.warn(22)}<p>${testResult()}</p></div>`);
  if (!(await load())) return;
  draw();

  root.oninput = (e) => {
    if (e.target.id !== 'eq-test') return;
    testText = e.target.value;
    root.querySelector('#eq-out p').textContent = testResult();
  };
  root.onchange = async (e) => {
    const id = e.target.dataset.toggle;
    if (!id) return;
    const r = rules.find((x) => x.id === id);
    try { await api.saveRule({ ...r, active: e.target.checked }); r.active = e.target.checked; toast(r.active ? 'Aktiv' : 'Inaktiv'); draw(); } catch (err) { toast(errText(err), 'error'); e.target.checked = !e.target.checked; }
  };
  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const r = a.dataset.id ? rules.find((x) => x.id === a.dataset.id) : null;
    let del = false;
    const data = await sheet(r ? 'Regel bearbeiten' : 'Neue Regel', html`<form novalidate>
      <label class="field" style="margin-top:0"><span class="label">Tipp</span><input class="input" name="tip" maxlength="60" value="${r ? r.tip : ''}" placeholder="z. B. Grips" required></label>
      <label class="field"><span class="label">Keywords (mit Komma getrennt)</span><textarea class="textarea" name="keywords" rows="3" style="min-height:90px">${r ? r.keywords.join(', ') : ''}</textarea></label>
      <label class="check"><input type="checkbox" name="case_sensitive" ${r && r.case_sensitive ? 'checked' : ''}> Groß-/Kleinschreibung beachten (z. B. „DU“)</label>
      <label class="check"><input type="checkbox" name="active" ${!r || r.active ? 'checked' : ''}> Aktiv</label>
      <p class="err" role="alert"></p>
      <div class="form-actions"><button class="btn" type="submit">Speichern</button>
        ${r ? html`<button class="link danger" type="button" data-del>Regel löschen</button>` : ''}
        <button class="link" type="button" data-close>abbrechen</button></div></form>`, (dlg, close) => {
      const form = dlg.querySelector('form');
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const kw = form.elements.keywords.value.split(',').map((s) => s.trim()).filter(Boolean);
        if (!form.elements.tip.value.trim() || !kw.length) { form.querySelector('.err').textContent = 'Tipp und mindestens ein Keyword ausfüllen.'; return; }
        close({ tip: form.elements.tip.value.trim(), keywords: kw, case_sensitive: form.elements.case_sensitive.checked, active: form.elements.active.checked });
      });
      dlg.querySelector('[data-del]')?.addEventListener('click', () => { del = true; close(); });
    });
    try {
      if (del && r) {
        if (await confirmSheet('Regel löschen', `Regel „${r.tip}“ löschen?`, 'Löschen', true)) { await api.deleteRule(r.id); toast('Gelöscht'); }
      } else if (data) {
        await api.saveRule({ ...(r || {}), ...data });
        toast('Gespeichert');
      }
    } catch (err) { toast(errText(err), 'error'); }
    if (await load()) draw();
  };
}

// ---------------------------------------------------------------- Leute
export async function renderPeople(root) {
  document.title = 'STODLBOX · Leute';
  mount(root, html`${adminHead('Leute', { back: '#/admin/mehr', plus: 'new' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let people = [];
  const load = async () => {
    try { people = await api.listAllMembers(); return true; } catch (e) { mount(root, html`${adminHead('Leute', { back: '#/admin/mehr' })}<p class="err">${errText(e)}</p>`); return false; }
  };
  const draw = () => {
    const active = people.filter((p) => p.active);
    const inactive = people.filter((p) => !p.active);
    const row = (p) => html`<div class="p-row"><span class="n ${p.active ? '' : 'muted'}">${p.name}</span>
      <button class="icon-btn" data-action="person" data-id="${p.id}" aria-label="${p.name} bearbeiten">${icons.more(18)}</button></div>`;
    mount(root, html`${adminHead('Leute', { back: '#/admin/mehr', plus: 'new' })}
      <h2 class="section-title">Aktiv · ${active.length}</h2>
      ${active.map(row)}
      ${inactive.length ? html`<h2 class="section-title" style="margin-top:28px">Deaktiviert · ${inactive.length}</h2>${inactive.map(row)}` : ''}
      <p class="hint" style="margin-top:16px">Deaktivierte tauchen nicht mehr in „Wer bist du?“ auf, ihre Historie bleibt.</p>`);
  };
  if (!(await load())) return;
  draw();

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    try {
      if (a.dataset.action === 'new') {
        const d = await formSheet('Neuer Name', html`<label class="field" style="margin-top:0"><span class="label">Name</span><input class="input" name="name" maxlength="30" required></label>`,
          'Anlegen', (x) => (x.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : ''));
        if (d) { await api.adminAddMember(d.name); toast('Angelegt'); }
      } else if (a.dataset.action === 'person') {
        const p = people.find((x) => x.id === a.dataset.id);
        const choice = await sheet(p.name, html`<div class="menu">
          <button data-c="rename">Umbenennen</button>
          ${p.active ? html`<button data-c="merge">Zusammenführen mit …</button><button data-c="off">Deaktivieren</button>` : html`<button data-c="on">Wieder aktivieren</button>`}
        </div>`, (dlg, close) => dlg.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => close(b.dataset.c))));
        if (choice === 'rename') {
          const d = await formSheet('Umbenennen', html`<label class="field" style="margin-top:0"><span class="label">Name</span><input class="input" name="name" maxlength="30" value="${p.name}" required></label>`,
            'Speichern', (x) => (x.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : ''));
          if (d) { await api.renameMember(p.id, d.name); toast('Umbenannt'); }
        } else if (choice === 'off') {
          await api.setMemberActive(p.id, false); toast('Deaktiviert');
        } else if (choice === 'on') {
          await api.setMemberActive(p.id, true); toast('Aktiv');
        } else if (choice === 'merge') {
          const targets = people.filter((x) => x.active && x.id !== p.id);
          const into = await sheet(`„${p.name}“ zusammenführen mit`, html`<p class="hint" style="margin-bottom:8px">Alle Zusagen und Stimmen von „${p.name}“ gehen auf die gewählte Person über. „${p.name}“ wird deaktiviert.</p>
            <div class="menu">${targets.map((t) => html`<button data-t="${t.id}">${t.name}</button>`)}</div>`,
          (dlg, close) => dlg.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => close(b.dataset.t))));
          if (into) {
            const t = people.find((x) => x.id === into);
            if (await confirmSheet('Sicher?', `„${p.name}“ in „${t.name}“ zusammenführen? Das lässt sich nicht rückgängig machen.`, 'Zusammenführen', true)) {
              await api.mergeMembers(p.id, into);
              toast('Zusammengeführt');
              if (state.member && state.member.id === p.id) state.member = { id: t.id, name: t.name };
            }
          }
        }
      }
    } catch (err) { toast(errText(err), 'error'); }
    if (await load()) draw();
  };
}

// ---------------------------------------------------------------- Einstellungen
export async function renderSettings(root) {
  document.title = 'STODLBOX · Einstellungen';
  mount(root, html`${adminHead('Einstellungen', { back: '#/admin/mehr' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let s;
  let people = [];
  try { [s, people] = await Promise.all([api.getSettings(), api.listAllMembers()]); } catch (e) { mount(root, html`${adminHead('Einstellungen', { back: '#/admin/mehr' })}<p class="err">${errText(e)}</p>`); return; }

  const draw = () => {
    const link = state.code ? appLink('/') : null;
    const active = people.filter((p) => p.active);
    mount(root, html`${adminHead('Einstellungen', { back: '#/admin/mehr' })}
      <h2 class="section-title">Ich als Teilnehmer</h2>
      <p class="hint" style="margin-bottom:10px">Wähl deinen Namen. Dann bist du bei jedem Termin, den du anlegst, gleich „dabei“.</p>
      <label class="field"><span class="label">Das bin ich</span>
        <select class="input select" id="me-member">
          <option value="" ${s.admin_member_id ? '' : 'selected'}>Niemand (nicht automatisch dabei)</option>
          ${active.map((p) => html`<option value="${p.id}" ${p.id === s.admin_member_id ? 'selected' : ''}>${p.name}</option>`)}
        </select></label>
      ${s.admin_member_id ? html`<label class="toggle-row"><span><strong>Auch bei Serien-Terminen</strong><span class="muted">Termine, die eine Serie automatisch anlegt</span></span>
        <input type="checkbox" class="switch" id="me-series" ${s.auto_join_series ? 'checked' : ''}></label>` : ''}

      <div class="sep" role="presentation"></div>
      <h2 class="section-title">Einladungslink</h2>
      ${link ? html`<div class="copy-box"><label class="sr-only" for="inv">Einladungslink</label><input class="input" id="inv" readonly value="${link}">
          <button class="icon-btn" data-action="copy" aria-label="Link kopieren">${icons.copy(18)}</button></div>
        <div class="actions"><button class="icon-btn fill" data-action="share-invite">${icons.share(18)} In WhatsApp teilen</button></div>`
      : html`<p class="hint">Der Code ist nur verschlüsselt gespeichert. Gib ihn einmal ein (oder setz einen neuen), dann steht hier der Link.</p>
        <form id="known" class="row" style="margin-top:8px;flex-wrap:nowrap" novalidate>
          <input class="input" name="code" placeholder="aktueller Code" autocapitalize="characters" autocomplete="off">
          <button class="btn sm" type="submit">OK</button></form>`}

      <div class="sep" role="presentation"></div>
      <h2 class="section-title">Gruppen-Code ändern</h2>
      <p class="hint">Danach funktionieren alte Links nicht mehr – alle brauchen den neuen Link.</p>
      <form id="newcode" class="row" style="margin-top:8px;flex-wrap:nowrap" novalidate>
        <label class="sr-only" for="nc">Neuer Code</label>
        <input class="input" id="nc" name="code" placeholder="STODL-${Math.random().toString(36).slice(2, 6).toUpperCase()}" autocapitalize="characters" autocomplete="off" minlength="4" maxlength="40">
        <button class="btn sm" type="submit">Ändern</button></form>

      <div class="sep" role="presentation"></div>
      <h2 class="section-title">Standardwerte für neue Termine</h2>
      <form id="defaults" novalidate>
        <div class="grid2">
          <label class="field"><span class="label">Dauer (Min.)</span><input class="input" type="number" name="default_duration_min" min="15" max="600" step="5" value="${s.default_duration_min}"></label>
          <label class="field"><span class="label">Max. Teilnehmer</span><input class="input" type="number" name="default_capacity" min="1" placeholder="unbegrenzt" value="${s.default_capacity ?? ''}"></label>
        </div>
        <div class="form-actions"><button class="btn ghost" type="submit">Speichern</button></div>
      </form>

      <div class="sep" role="presentation"></div>
      <div class="kv"><span class="label">Admin</span><span class="mono" style="font-size:13px">${s.admin_email}</span></div>
      ${DEMO ? html`<div class="form-actions"><button class="btn danger" data-action="reset-demo">Demo-Daten zurücksetzen</button></div>` : ''}`);
  };
  draw();

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const link = appLink('/');
    if (a.dataset.action === 'copy') await copyText(link);
    if (a.dataset.action === 'share-invite') await shareText(`🏋️ STODLBOX – Training im Stadl\nHier siehst du alle Termine und sagst zu 👉 ${link}`);
    if (a.dataset.action === 'reset-demo' && (await confirmSheet('Zurücksetzen', 'Alle Demo-Daten neu erzeugen?', 'Zurücksetzen', true))) {
      await api.resetDemo();
      state.reset();
      toast('Demo zurückgesetzt');
      navigate('/admin');
    }
  };
  root.onchange = async (e) => {
    if (e.target.id !== 'me-member' && e.target.id !== 'me-series') return;
    const memberId = root.querySelector('#me-member').value || null;
    const series = !!(root.querySelector('#me-series') && root.querySelector('#me-series').checked);
    try {
      await api.saveAutoJoin({ admin_member_id: memberId, auto_join_series: memberId ? series : false });
      s = { ...s, admin_member_id: memberId, auto_join_series: memberId ? series : false };
      toast('Gespeichert');
      draw();
    } catch (err) { toast(errText(err), 'error'); }
  };

  root.onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    await busy(btn, async () => {
      try {
        if (form.id === 'known') {
          const c = normCode(form.elements.code.value);
          if (await api.checkCode(c)) { state.code = c; toast('Passt'); draw(); } else toast('Der Code passt nicht.', 'error');
        } else if (form.id === 'newcode') {
          const c = normCode(form.elements.code.value || form.elements.code.placeholder);
          if (c.length < 4) { toast('Mindestens 4 Zeichen.', 'error'); return; }
          if (!(await confirmSheet('Code ändern', `Neuer Code: ${c}. Alte Links funktionieren dann nicht mehr.`, 'Ändern', true))) return;
          await api.setGroupCode(c);
          state.code = c;
          toast('Neuer Code gilt');
          draw();
        } else if (form.id === 'defaults') {
          const el = form.elements;
          await api.saveSettings({ default_duration_min: +el.default_duration_min.value || 90, default_capacity: el.default_capacity.value === '' ? null : +el.default_capacity.value });
          toast('Gespeichert');
        }
      } catch (err) { toast(errText(err), 'error'); }
    });
  };
}
