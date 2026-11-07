// Verwaltung: Vorlagen, Equipment-Regeln, Leute, Einstellungen.
import { html, mount } from '../../html.js';
import { icons } from '../../icons.js';
import { api, DEMO } from '../../api.js';
import { state, normCode } from '../../state.js';
import { errText, busy, toast, sheet, confirmSheet } from '../../ui.js';
import { matchEquipment, equipmentSentence } from '../../equipment.js';
import { appLink, shareText, copyText } from '../../share.js';
import { navigate } from '../../router.js';
import { adminHead } from './index.js';

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

// ---------------------------------------------------------------- Vorlagen
export async function renderTemplates(root) {
  document.title = 'STODLBOX · Vorlagen';
  mount(root, html`${adminHead('Vorlagen', { plus: 'new' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let list = [];
  const load = async () => {
    try { list = await api.listTemplates(); } catch (e) { mount(root, html`${adminHead('Vorlagen')}<p class="err">${errText(e)}</p>`); return false; }
    return true;
  };
  const draw = () => mount(root, html`${adminHead('Vorlagen', { plus: 'new' })}
    <p class="hint" style="margin-bottom:12px">Vorlagen wählst du beim Termin über „aus vorlage“. Dort kannst du auch frühere Workouts übernehmen.</p>
    ${list.length ? html`<ul class="list">${list.map((t) => html`<li><button class="pick" data-action="edit" data-id="${t.id}" style="padding:14px 0">
      <span class="t" style="display:block">${t.title}</span><span class="w" style="display:block">${t.workout}</span></button></li>`)}</ul>`
      : html`<div class="empty-state"><p class="label">// NOCH KEINE VORLAGEN</p><p>Leg eine an oder hak beim Termin „Als Vorlage speichern“ an.</p></div>`}`);
  if (!(await load())) return;
  draw();

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const t = a.dataset.id ? list.find((x) => x.id === a.dataset.id) : null;
    let del = false;
    const data = await sheet(t ? 'VORLAGE' : 'NEUE VORLAGE', html`<form novalidate>
      <label class="field" style="margin-top:0"><span class="label">Titel</span><input class="input" name="title" maxlength="80" value="${t ? t.title : ''}" required></label>
      <label class="field"><span class="label">Workout</span><textarea class="textarea" name="workout" rows="8" required>${t ? t.workout : ''}</textarea></label>
      <p class="err" role="alert"></p>
      <div class="form-actions"><button class="btn" type="submit">Speichern</button>
        ${t ? html`<button class="link danger" type="button" data-del>vorlage löschen</button>` : ''}
        <button class="link" type="button" data-close>abbrechen</button></div></form>`, (dlg, close) => {
      const form = dlg.querySelector('form');
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const title = form.elements.title.value.trim();
        const workout = form.elements.workout.value.trim();
        if (!title || !workout) { form.querySelector('.err').textContent = 'Titel und Workout ausfüllen.'; return; }
        close({ title, workout });
      });
      dlg.querySelector('[data-del]')?.addEventListener('click', () => { del = true; close(); });
    });
    try {
      if (del && t) {
        if (await confirmSheet('LÖSCHEN', `Vorlage „${t.title}“ löschen?`, 'Löschen', true)) { await api.deleteTemplate(t.id); toast('Gelöscht'); }
      } else if (data) {
        await api.saveTemplate({ id: t && t.id, ...data });
        toast('Gespeichert');
      }
    } catch (err) { toast(errText(err), 'error'); }
    if (await load()) draw();
  };
}

// ---------------------------------------------------------------- Equipment
export async function renderEquipment(root) {
  document.title = 'STODLBOX · Equipment';
  mount(root, html`${adminHead('Equipment', { plus: 'new' })}<div class="skeleton" style="height:200px" aria-busy="true"></div>`);
  let rules = [];
  let testText = '5 Runden:\n400 m Run\n10 Toes-to-Bar\n50 DU\nwenn du magst: 10 Burpees';
  const load = async () => {
    try { rules = await api.listRules(); return true; } catch (e) { mount(root, html`${adminHead('Equipment')}<p class="err">${errText(e)}</p>`); return false; }
  };
  const testResult = () => {
    const m = matchEquipment(testText, rules);
    return m.length ? `Einpacken: ${equipmentSentence(m)}` : 'Kein Tipp.';
  };
  const draw = () => mount(root, html`${adminHead('Equipment', { plus: 'new' })}
    <p class="hint" style="margin-bottom:12px">Kommt ein Keyword im Workout vor, erscheint der Tipp als gelbes Banner. Treffer nur als ganzes Wort („run“ trifft nicht „Runden“).</p>
    ${rules.map((r) => html`<div class="rule ${r.active ? '' : 'off'}">
      <div class="row" style="flex-wrap:nowrap">
        <button class="pick" data-action="edit" data-id="${r.id}" style="border:0;padding:0;flex:1">
          <span class="t" style="display:block">${r.tip}</span>
          <span class="kw" style="display:block">${r.keywords.join(', ')}${r.case_sensitive ? ' · GROSS/KLEIN BEACHTEN' : ''}</span></button>
        <label class="check" style="margin:0"><input type="checkbox" data-toggle="${r.id}" ${r.active ? 'checked' : ''}><span class="sr-only">${r.tip} aktiv</span></label>
      </div></div>`)}
    <div class="sep" role="presentation"></div>
    <p class="label">// TESTEN</p>
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
    const data = await sheet(r ? 'REGEL' : 'NEUE REGEL', html`<form novalidate>
      <label class="field" style="margin-top:0"><span class="label">Tipp</span><input class="input" name="tip" maxlength="60" value="${r ? r.tip : ''}" placeholder="z. B. Grips" required></label>
      <label class="field"><span class="label">Keywords (mit Komma getrennt)</span><textarea class="textarea" name="keywords" rows="3" style="min-height:90px">${r ? r.keywords.join(', ') : ''}</textarea></label>
      <label class="check"><input type="checkbox" name="case_sensitive" ${r && r.case_sensitive ? 'checked' : ''}> Groß-/Kleinschreibung beachten (z. B. „DU“)</label>
      <label class="check"><input type="checkbox" name="active" ${!r || r.active ? 'checked' : ''}> Aktiv</label>
      <p class="err" role="alert"></p>
      <div class="form-actions"><button class="btn" type="submit">Speichern</button>
        ${r ? html`<button class="link danger" type="button" data-del>regel löschen</button>` : ''}
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
        if (await confirmSheet('LÖSCHEN', `Regel „${r.tip}“ löschen?`, 'Löschen', true)) { await api.deleteRule(r.id); toast('Gelöscht'); }
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
      <p class="label" style="margin:8px 0">// AKTIV · ${active.length}</p>
      ${active.map(row)}
      ${inactive.length ? html`<p class="label" style="margin:24px 0 8px">// DEAKTIVIERT · ${inactive.length}</p>${inactive.map(row)}` : ''}
      <p class="hint" style="margin-top:16px">Deaktivierte tauchen nicht mehr in „Wer bist du?“ auf, ihre Historie bleibt.</p>`);
  };
  if (!(await load())) return;
  draw();

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    try {
      if (a.dataset.action === 'new') {
        const d = await formSheet('NEUER NAME', html`<label class="field" style="margin-top:0"><span class="label">Name</span><input class="input" name="name" maxlength="30" required></label>`,
          'Anlegen', (x) => (x.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : ''));
        if (d) { await api.adminAddMember(d.name); toast('Angelegt'); }
      } else if (a.dataset.action === 'person') {
        const p = people.find((x) => x.id === a.dataset.id);
        const choice = await sheet(p.name.toUpperCase(), html`<div class="menu">
          <button data-c="rename">Umbenennen</button>
          ${p.active ? html`<button data-c="merge">Zusammenführen mit …</button><button data-c="off">Deaktivieren</button>` : html`<button data-c="on">Wieder aktivieren</button>`}
        </div>`, (dlg, close) => dlg.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => close(b.dataset.c))));
        if (choice === 'rename') {
          const d = await formSheet('UMBENENNEN', html`<label class="field" style="margin-top:0"><span class="label">Name</span><input class="input" name="name" maxlength="30" value="${p.name}" required></label>`,
            'Speichern', (x) => (x.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : ''));
          if (d) { await api.renameMember(p.id, d.name); toast('Umbenannt'); }
        } else if (choice === 'off') {
          await api.setMemberActive(p.id, false); toast('Deaktiviert');
        } else if (choice === 'on') {
          await api.setMemberActive(p.id, true); toast('Aktiv');
        } else if (choice === 'merge') {
          const targets = people.filter((x) => x.active && x.id !== p.id);
          const into = await sheet(`„${p.name}“ ZUSAMMENFÜHREN MIT`, html`<p class="hint" style="margin-bottom:8px">Alle Zusagen und Stimmen von „${p.name}“ gehen auf die gewählte Person über. „${p.name}“ wird deaktiviert.</p>
            <div class="menu">${targets.map((t) => html`<button data-t="${t.id}">${t.name}</button>`)}</div>`,
          (dlg, close) => dlg.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => close(b.dataset.t))));
          if (into) {
            const t = people.find((x) => x.id === into);
            if (await confirmSheet('SICHER?', `„${p.name}“ in „${t.name}“ zusammenführen? Das lässt sich nicht rückgängig machen.`, 'Zusammenführen', true)) {
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
  try { s = await api.getSettings(); } catch (e) { mount(root, html`${adminHead('Einstellungen', { back: '#/admin/mehr' })}<p class="err">${errText(e)}</p>`); return; }

  const draw = () => {
    const link = state.code ? appLink('/') : null;
    mount(root, html`${adminHead('Einstellungen', { back: '#/admin/mehr' })}
      <p class="label" style="margin-top:8px">// EINLADUNGSLINK</p>
      ${link ? html`<div class="copy-box"><label class="sr-only" for="inv">Einladungslink</label><input class="input" id="inv" readonly value="${link}">
          <button class="icon-btn" data-action="copy" aria-label="Link kopieren">${icons.copy(18)}</button></div>
        <div class="actions"><button class="icon-btn fill" data-action="share-invite">${icons.share(18)} In WhatsApp teilen</button></div>`
      : html`<p class="hint">Der Code ist nur verschlüsselt gespeichert. Gib ihn einmal ein (oder setz einen neuen), dann steht hier der Link.</p>
        <form id="known" class="row" style="margin-top:8px;flex-wrap:nowrap" novalidate>
          <input class="input" name="code" placeholder="aktueller Code" autocapitalize="characters" autocomplete="off">
          <button class="btn sm" type="submit">OK</button></form>`}

      <div class="sep" role="presentation"></div>
      <p class="label">// GRUPPEN-CODE ÄNDERN</p>
      <p class="hint">Danach funktionieren alte Links nicht mehr – alle brauchen den neuen Link.</p>
      <form id="newcode" class="row" style="margin-top:8px;flex-wrap:nowrap" novalidate>
        <label class="sr-only" for="nc">Neuer Code</label>
        <input class="input" id="nc" name="code" placeholder="STODL-${Math.random().toString(36).slice(2, 6).toUpperCase()}" autocapitalize="characters" autocomplete="off" minlength="4" maxlength="40">
        <button class="btn sm" type="submit">ÄNDERN</button></form>

      <div class="sep" role="presentation"></div>
      <p class="label">// STANDARDWERTE FÜR NEUE TERMINE</p>
      <form id="defaults" novalidate>
        <div class="grid2">
          <label class="field"><span class="label">Dauer (Min.)</span><input class="input" type="number" name="default_duration_min" min="15" max="600" step="5" value="${s.default_duration_min}"></label>
          <label class="field"><span class="label">Max. Teilnehmer</span><input class="input" type="number" name="default_capacity" min="1" placeholder="unbegrenzt" value="${s.default_capacity ?? ''}"></label>
        </div>
        <div class="form-actions"><button class="btn ghost" type="submit">SPEICHERN</button></div>
      </form>

      <div class="sep" role="presentation"></div>
      <div class="kv"><span class="label">Admin</span><span class="mono" style="font-size:13px">${s.admin_email}</span></div>
      ${DEMO ? html`<div class="form-actions"><button class="btn danger" data-action="reset-demo">DEMO-DATEN ZURÜCKSETZEN</button></div>` : ''}`);
  };
  draw();

  root.onclick = async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const link = appLink('/');
    if (a.dataset.action === 'copy') await copyText(link);
    if (a.dataset.action === 'share-invite') await shareText(`🏋️ STODLBOX – Training im Stadl\nHier siehst du alle Termine und sagst zu 👉 ${link}`);
    if (a.dataset.action === 'reset-demo' && (await confirmSheet('ZURÜCKSETZEN', 'Alle Demo-Daten neu erzeugen?', 'Zurücksetzen', true))) {
      await api.resetDemo();
      state.reset();
      toast('Demo zurückgesetzt');
      navigate('/admin');
    }
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
          if (!(await confirmSheet('CODE ÄNDERN', `Neuer Code: ${c}. Alte Links funktionieren dann nicht mehr.`, 'Ändern', true))) return;
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
