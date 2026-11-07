// Erstbesuch: Code eingeben, „Wer bist du?“, Namen anlegen.
import { html, mount } from '../html.js';
import { api, DEMO } from '../api.js';
import { state, normCode } from '../state.js';
import { errText, busy, toast } from '../ui.js';
import { navigate } from '../router.js';

const logo = html`<a class="logo" href="#/">STODL<b>BOX</b></a>`;

export function renderCode(root, { error } = {}) {
  document.title = 'STODLBOX · Code';
  mount(root, html`<div class="screen">
    <div class="topbar">${logo}</div>
    <p class="label">// ZUGANG ZUR TRAININGSGRUPPE</p>
    <h1>Code eingeben</h1>
    <p class="lead">Die Stodlbox ist nur für unsere Trainingsgruppe. Frag Mike nach dem Link.</p>
    <form id="code-form" novalidate>
      <label class="field"><span class="label">Gruppen-Code</span>
        <input class="input" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="STODL-XXXX" required
          value="${state.code || ''}" aria-describedby="code-err"></label>
      <p class="err" id="code-err" role="alert">${error || ''}</p>
      <div class="form-actions"><button class="btn" type="submit">WEITER</button></div>
    </form>
    ${DEMO ? html`<p class="demo">DEMO-MODUS · Code: STODL-DEMO</p>` : ''}
  </div>`);
  const form = root.querySelector('#code-form');
  const input = form.elements.code;
  if (!error) input.focus();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const c = normCode(input.value);
    const errEl = root.querySelector('#code-err');
    if (!c) { errEl.textContent = 'Bitte gib den Code ein.'; return; }
    await busy(form.querySelector('button'), async () => {
      try {
        const ok = await api.checkCode(c);
        if (!ok) { errEl.textContent = 'Der Code passt nicht. Frag Mike nach dem aktuellen Link.'; return; }
        state.code = c;
        navigate(state.member ? '/' : '/wer');
      } catch (e) {
        errEl.textContent = errText(e);
      }
    });
  };
}

export async function renderWho(root) {
  document.title = 'STODLBOX · Wer bist du?';
  mount(root, html`<div class="screen">
    <div class="topbar">${logo}</div>
    <p class="label">// SCHRITT 2 VON 2</p>
    <h1>Wer bist du?</h1>
    <p class="lead">Wähl deinen Namen. Das merkt sich dein Handy.</p>
    <div id="names" class="name-grid" aria-busy="true">
      ${[1, 2, 3, 4].map(() => html`<div class="name-tile skeleton" aria-hidden="true"></div>`)}
    </div>
    <div class="section">
      <p class="label">// NEU HIER?</p>
      <form id="new-form" class="row" style="margin-top:10px;flex-wrap:nowrap" novalidate>
        <label class="sr-only" for="new-name">Dein Name</label>
        <input class="input" id="new-name" name="name" maxlength="30" autocomplete="given-name" placeholder="Namen anlegen" required>
        <button class="btn sm" type="submit">LOS</button>
      </form>
      <p class="err" id="new-err" role="alert"></p>
    </div>
  </div>`);

  const list = root.querySelector('#names');
  let members = [];
  try {
    members = await api.listMembers();
  } catch (e) {
    if (String(e.code || e.message).includes('BAD_CODE')) { state.code = null; navigate('/code'); return; }
    mount(list, html`<p class="err">${errText(e)}</p>`);
    return;
  }
  list.removeAttribute('aria-busy');
  const cur = state.member && state.member.id;
  mount(list, members.length
    ? html`${members.map((m) => html`<button class="name-tile ${m.id === cur ? 'on' : ''}" data-id="${m.id}" data-name="${m.name}">${m.name}</button>`)}`
    : html`<p class="muted" style="grid-column:1/-1">Noch niemand da – leg dich unten an.</p>`);

  list.onclick = (ev) => {
    const b = ev.target.closest('[data-id]');
    if (!b) return;
    state.member = { id: b.dataset.id, name: b.dataset.name };
    toast(`Servus ${b.dataset.name}!`);
    navigate('/');
  };

  const form = root.querySelector('#new-form');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const name = form.elements.name.value.replace(/\s+/g, ' ').trim();
    const errEl = root.querySelector('#new-err');
    errEl.textContent = '';
    if (name.length < 2 || name.length > 30) { errEl.textContent = 'Der Name muss 2–30 Zeichen lang sein.'; return; }
    const existing = members.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existing) { errEl.textContent = `„${existing.name}“ gibt es schon – tipp oben einfach drauf.`; return; }
    await busy(form.querySelector('button'), async () => {
      try {
        const id = await api.addMember(name);
        state.member = { id, name };
        toast(`Servus ${name}!`);
        navigate('/');
      } catch (e) {
        errEl.textContent = errText(e);
      }
    });
  };
}
