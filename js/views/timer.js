// Workout-Timer (#/timer): Einstellen, Laufen (Vollbild), Ergebnis.
// #/timer?m=amrap&d=1200&n=Cindy füllt die Einstellung vor (Link aus einem Workout).
import { html, mount } from '../html.js';
import { icons } from '../icons.js';
import { state } from '../state.js';
import { route } from '../router.js';
import { MODES, DEFAULTS, PREP, normalize, stateAt, clock, describe, fromQuery, totalRounds, mainDuration } from '../timer.js';
import { topbar } from './common.js';

// ------------------------------------------------------------ Ton, Vibration, Bildschirm an

let audio = null;

// Musik (Spotify & Co.): iOS kennt für Web-Apps nur zwei Wege.
// „ambient“ = Musik läuft weiter, Piepser kommt darüber, aber der Lautlos-Schalter macht ihn stumm.
// „playback“ = Piepser auch bei Lautlos, dafür hält iOS die Musik an.
const mixMusic = () => state.timer.mix !== false;

function unlockAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = mixMusic() ? 'ambient' : 'playback'; } catch { /* ältere Browser */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audio && AC) audio = new AC();
    if (audio && audio.state !== 'running') audio.resume();
    if (audio) beep(1, 0.01, 0.0001); // iOS gibt den Ton erst nach einem Abspielen im Tipp frei
  } catch { audio = null; }
}

// Old-School-Piepser wie die Wanduhr im Gym: Rechteckton, volle Lautstärke über die ganze Länge,
// nur ganz kurz ein- und ausgeblendet (sonst knackt es). Zwei leicht verstimmte Stimmen machen ihn dicker.
let out = null;
function output() {
  if (out) return out;
  const comp = audio.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 6;
  comp.attack.value = 0.002;
  comp.release.value = 0.1;
  const master = audio.createGain();
  master.gain.value = 1;
  comp.connect(master).connect(audio.destination);
  out = comp;
  return out;
}

function beep(freq, dur, vol = 0.9, at = 0) {
  if (!audio) return;
  try {
    const t = audio.currentTime + at;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + dur - 0.015);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(output());
    [freq, freq * 1.004].forEach((f) => {
      const o = audio.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch { /* kein Ton, kein Drama */ }
}

const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* iOS kann das nicht */ } };

const HI = 1000; // Grundton wie bei klassischen Gym-Uhren
const sounds = {
  tick: () => { beep(HI, 0.25); vibrate(80); }, // 3-2-1
  go: () => { beep(HI, 1.0); vibrate(400); }, // langer Ton: los
  rest: () => { beep(650, 0.35); beep(650, 0.35, 0.9, 0.45); vibrate([150, 100, 150]); }, // zweimal tief: Pause
  half: () => { beep(HI, 0.12); beep(HI, 0.12, 0.9, 0.2); vibrate([60, 60, 60]); }, // kurz-kurz: Halbzeit
  done: () => { beep(HI, 0.3); beep(HI, 0.3, 0.9, 0.45); beep(HI, 1.6, 0.9, 0.9); vibrate([300, 100, 300, 100, 800]); },
};

let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) {
      await wake.release();
      wake = null;
    }
  } catch { wake = null; }
}

// ------------------------------------------------------------ Einstellen

const FIELDS = {
  fortime: [['cap', 'Time Cap', 60, 0]],
  amrap: [['duration', 'Dauer', 60, 60]],
  emom: [['interval', 'Alle', 15, 15], ['rounds', 'Runden', 1, 1]],
  tabata: [['work', 'Arbeit', 5, 5], ['rest', 'Pause', 5, 0], ['rounds', 'Runden', 1, 1]],
};

const fieldValue = (c, key) => {
  if (key === 'rounds') return String(c.rounds);
  if (key === 'cap' && !c.cap) return 'ohne';
  return clock(c[key]);
};

function setupView(cfg, source, half, head = topbar, mix = true) {
  const m = cfg.mode;
  const total = mainDuration(cfg);
  const own = head !== topbar;
  return html`${head()}
    ${own ? '' : html`<h1 class="page-title" style="margin-bottom:4px">Timer</h1>`}
    ${source ? html`<p class="muted" style="margin:0">Eingestellt nach „${source}“. Passt was nicht, einfach ändern.</p>` : ''}
    <main id="main">
      <div class="seg" role="group" aria-label="Art">
        ${Object.entries(MODES).map(([k, v]) => html`<button type="button" data-mode="${k}" aria-pressed="${String(k === m)}">${v.label}</button>`)}
      </div>
      <p class="hint" style="margin:10px 0 0">${MODES[m].hint}</p>
      <div class="steppers">
        ${FIELDS[m].map(([key, label]) => html`<div class="stepper">
          <span class="lbl">${label}</span>
          <div class="ctrl">
            <button type="button" data-step="${key}" data-dir="-1" aria-label="${label} weniger">−</button>
            <output aria-live="polite">${fieldValue(cfg, key)}</output>
            <button type="button" data-step="${key}" data-dir="1" aria-label="${label} mehr">+</button>
          </div>
        </div>`)}
      </div>
      ${m === 'emom' || m === 'tabata' ? html`<p class="count" style="margin-top:12px">Gesamt ${clock(total)}</p>` : ''}
      ${m === 'fortime' && !cfg.cap ? '' : html`<label class="toggle-row"><span><strong>Halbzeit-Ton</strong><span class="muted">Kurz-kurz in der Mitte jedes Intervalls</span></span>
        <input type="checkbox" class="switch" id="t-half" ${half ? 'checked' : ''}></label>`}
      <label class="toggle-row"><span><strong>Musik weiterlaufen lassen</strong><span class="muted">${mix ? 'Spotify & Co. spielen weiter. Am iPhone Lautlos-Schalter aus, sonst kein Piepser.' : 'Piepser auch bei Lautlos, Musik wird aber angehalten.'}</span></span>
        <input type="checkbox" class="switch" id="t-mix" ${mix ? 'checked' : ''}></label>
      <button class="btn" data-action="start" style="margin-top:24px">${icons.timer(22)} Start</button>
      <p class="hint" style="margin-top:12px">${PREP} Sekunden Vorlauf. Der Bildschirm bleibt an, Töne: 3-2-1 vor jedem Wechsel, langer Ton bei Start, zweimal tief bei Pause.</p>
    </main>`;
}

// ------------------------------------------------------------ Laufen

const now = () => Date.now();
const elapsedOf = (run) => ((run.pausedAt || now()) - run.start - run.pausedTotal) / 1000;

function runView(run) {
  const c = run.cfg;
  const lapBtn = c.mode === 'amrap' || c.mode === 'fortime';
  return html`<div class="timer-run band" id="tr" data-kind="prep" role="dialog" aria-label="Timer läuft">
    <div class="tr-top">
      <span class="label">${run.name ? `${run.name} · ` : ''}${describe(c)}</span>
      <span class="label" id="tr-round"></span>
    </div>
    <div class="tr-mid">
      <p class="tr-phase" id="tr-phase"></p>
      <div class="tr-clock num" id="tr-clock" role="timer" aria-live="off">0:00</div>
      <p class="tr-sub" id="tr-sub"></p>
    </div>
    <div class="tr-bar" aria-hidden="true"><span id="tr-fill"></span></div>
    <div class="tr-actions">
      ${lapBtn ? html`<button class="btn tr-lap" data-action="lap">Runde fertig <span id="tr-laps"></span></button>` : ''}
      <div class="tr-row">
        <button class="btn ghost" data-action="pause" id="tr-pause">Anhalten</button>
        ${c.mode === 'fortime' ? html`<button class="btn ghost" data-action="finish">Fertig</button>` : ''}
      </div>
      <button class="link muted tr-stop" data-action="stop" id="tr-stop">Beenden</button>
    </div>
  </div>`;
}

function resultView(run) {
  const c = run.cfg;
  const laps = run.laps || [];
  let big = '';
  let sub = '';
  if (c.mode === 'fortime') {
    big = run.finishedAt != null ? clock(run.finishedAt, { up: true }) : 'Time Cap';
    sub = run.finishedAt != null ? 'Deine Zeit' : `Cap ${clock(c.cap)} erreicht${laps.length ? ` · ${laps.length} Runden` : ''}`;
  } else if (c.mode === 'amrap') {
    big = `${laps.length}`;
    sub = laps.length === 1 ? 'Runde' : 'Runden';
  } else {
    big = clock(mainDuration(c), { up: true });
    sub = `${totalRounds(c)} Runden geschafft`;
  }
  const splits = laps.map((t, i) => ({ n: i + 1, t, d: t - (i ? laps[i - 1] : 0) }));
  return html`<div class="timer-run band" data-kind="done" role="dialog" aria-label="Timer fertig">
    <div class="tr-top"><span class="label">${run.name ? `${run.name} · ` : ''}${describe(c)}</span></div>
    <div class="tr-mid">
      <p class="tr-phase">${run.stopped ? 'Abgebrochen' : 'Geschafft'}</p>
      <div class="tr-clock num">${big}</div>
      <p class="tr-sub">${sub}</p>
      ${splits.length ? html`<ol class="tr-splits">${splits.map((s) => html`<li><span>Runde ${s.n}</span><span class="num">${clock(s.d, { up: true })}</span><span class="num muted">${clock(s.t, { up: true })}</span></li>`)}</ol>` : ''}
    </div>
    <div class="tr-actions">
      ${run.eventId ? html`<a class="btn" data-action="result" href="#/t/${run.eventId}?${resultQuery(run)}">${icons.trophy(20)} Ergebnis eintragen</a>` : ''}
      <div class="${run.eventId ? 'tr-row' : 'tr-col'}">
        <button class="btn ${run.eventId ? 'ghost' : ''}" data-action="again">Nochmal</button>
        <button class="btn ghost" data-action="close">Schließen</button>
      </div>
    </div>
  </div>`;
}

/** Ergebnis für das Eintragen beim Termin: Art und Wert aus dem Timer */
function resultQuery(run) {
  const c = run.cfg;
  const q = new URLSearchParams({ ergebnis: '1' });
  if (c.mode === 'fortime') {
    if (run.finishedAt != null && !run.stopped) { q.set('k', 'time'); q.set('v', Math.floor(run.finishedAt + 1e-6)); } else if (run.finishedAt == null) q.set('k', 'cap');
  } else if (c.mode === 'amrap') {
    q.set('k', 'rounds');
    q.set('v', (run.laps || []).length * 1000);
  } else q.set('k', 'reps');
  return q.toString();
}

// ------------------------------------------------------------ Seite

export async function renderTimer(root, { head = topbar } = {}) {
  document.title = 'STODLBOX · Timer';
  const prefs = state.timer;
  const q = route().query;
  let source = q.get('n') || '';
  // Vom Termin geöffnet: am Ende „Ergebnis eintragen“ anbieten
  let eventId = /^[\w-]{36}$/.test(q.get('e') || '') ? q.get('e') : null;
  let cfg = fromQuery(q) || normalize(prefs[prefs.last] || DEFAULTS[prefs.last] || DEFAULTS.fortime);
  if (q.get('m')) history.replaceState(null, '', location.pathname + location.search + '#' + route().path);

  let timer = null;
  let last = { index: -1, sec: -1, half: -1 };

  const saveCfg = () => {
    const p = { ...state.timer, last: cfg.mode, [cfg.mode]: cfg };
    state.timer = p;
  };

  const drawSetup = () => mount(root, setupView(cfg, source, state.timer.half !== false, head, state.timer.mix !== false));

  const stopLoop = () => { if (timer) clearInterval(timer); timer = null; keepAwake(false); };

  const showResult = (run) => {
    stopLoop();
    state.timerRun = { ...run, result: true };
    mount(root, resultView(run));
  };

  const tick = () => {
    const run = state.timerRun;
    const el = document.getElementById('tr');
    if (!run || !el) { stopLoop(); return; }
    const c = run.cfg;
    const e = elapsedOf(run);
    const st = stateAt(c, e);

    // Töne: beim Wechsel und 3-2-1 vor Ende eines Abschnitts
    if (!run.pausedAt) {
      if (st.done) { if (last.index !== -1) sounds.done(); } else if (st.index !== last.index && last.index !== -1) {
        if (st.kind === 'rest') sounds.rest();
        else sounds.go();
      }
      const sec = Math.ceil(st.remaining - 1e-6);
      if (!st.done && Number.isFinite(st.remaining) && sec !== last.sec && sec >= 1 && sec <= 3 && st.index === last.index) sounds.tick();
      // Halbzeit: kurz-kurz in der Mitte jedes Arbeits-Abschnitts ab 20 Sekunden (nur beim Überschreiten, nicht nach dem Wiederöffnen)
      let half = last.index === st.index ? last.half : -1;
      if (run.half !== false && !st.done && st.kind === 'work' && Number.isFinite(st.segDur) && st.segDur >= 20 && half !== st.index) {
        const mid = st.segDur / 2;
        if (st.inSeg >= mid) {
          if (last.index === st.index && st.inSeg - mid < 1.5) sounds.half();
          half = st.index;
        }
      }
      last = { index: st.index, sec, half };
    }
    if (st.done) { showResult(run); return; }

    const laps = (run.laps || []).length;
    let big;
    let phase;
    let sub = '';
    let round = '';
    if (st.kind === 'prep') {
      big = String(Math.ceil(st.remaining - 1e-6));
      phase = 'Gleich geht’s los';
    } else if (c.mode === 'fortime') {
      big = clock(st.main, { up: true });
      phase = 'For Time';
      sub = c.cap ? `Cap ${clock(c.cap)}` : '';
    } else if (c.mode === 'amrap') {
      big = clock(st.remaining);
      phase = 'AMRAP';
      sub = `${clock(st.main, { up: true })} gelaufen`;
    } else {
      big = clock(st.remaining);
      phase = st.kind === 'rest' ? 'Pause' : (c.mode === 'tabata' ? 'Arbeit' : 'Los');
      round = `Runde ${st.round} / ${c.rounds}`;
      sub = `noch ${clock(mainDuration(c) - st.main)} gesamt`;
    }
    if (laps && (c.mode === 'amrap' || c.mode === 'fortime')) round = `${laps} ${laps === 1 ? 'Runde' : 'Runden'}`;
    if (run.pausedAt) phase = 'Angehalten';

    const fill = Number.isFinite(st.segDur) ? Math.min(1, st.inSeg / st.segDur) : 0;
    const final = Number.isFinite(st.remaining) && st.remaining <= 3 && st.kind !== 'prep';
    el.dataset.kind = run.pausedAt ? 'paused' : st.kind;
    el.classList.toggle('final', final && !run.pausedAt);
    const set = (id, v) => { const n = document.getElementById(id); if (n && n.textContent !== v) n.textContent = v; };
    set('tr-clock', big);
    set('tr-phase', phase);
    set('tr-sub', sub);
    set('tr-round', round);
    set('tr-laps', laps ? `(${laps})` : '');
    set('tr-pause', run.pausedAt ? 'Weiter' : 'Anhalten');
    const f = document.getElementById('tr-fill');
    if (f) f.style.transform = `scaleX(${fill})`;
  };

  const startLoop = () => {
    stopLoop();
    last = { index: -1, sec: -1, half: -1 };
    mount(root, runView(state.timerRun));
    tick();
    timer = setInterval(tick, 100);
    if (!state.timerRun.pausedAt) keepAwake(true);
  };

  const begin = () => {
    unlockAudio();
    saveCfg();
    state.timerRun = { cfg, name: source, eventId, half: state.timer.half !== false, start: now(), pausedAt: null, pausedTotal: 0, laps: [] };
    startLoop();
  };

  // Läuft noch einer (App neu geladen, Tab gewechselt)? Dann dort weitermachen.
  const running = state.timerRun;
  if (running && !q.get('m')) {
    if (running.result) mount(root, resultView(running));
    else { startLoop(); }
  } else {
    if (running) state.timerRun = null;
    drawSetup();
  }

  const onVisible = () => {
    if (!document.getElementById('tr')) { document.removeEventListener('visibilitychange', onVisible); return; }
    if (document.visibilityState === 'visible' && state.timerRun && !state.timerRun.pausedAt) { keepAwake(true); tick(); }
  };
  document.addEventListener('visibilitychange', onVisible);

  root.onchange = (ev) => {
    if (ev.target.id === 't-half') {
      state.timer = { ...state.timer, half: ev.target.checked };
      if (ev.target.checked) { unlockAudio(); sounds.half(); }
    }
    if (ev.target.id === 't-mix') {
      state.timer = { ...state.timer, mix: ev.target.checked };
      drawSetup();
    }
  };

  let stopArmed = null;
  root.onclick = (ev) => {
    const modeBtn = ev.target.closest('[data-mode]');
    if (modeBtn) {
      saveCfg();
      const m = modeBtn.dataset.mode;
      cfg = normalize(state.timer[m] || DEFAULTS[m]);
      source = '';
      eventId = null;
      drawSetup();
      return;
    }
    const step = ev.target.closest('[data-step]');
    if (step) {
      const [, , by, min] = FIELDS[cfg.mode].find(([k]) => k === step.dataset.step);
      const key = step.dataset.step;
      const next = Math.max(min, cfg[key] + by * Number(step.dataset.dir));
      cfg = normalize({ ...cfg, [key]: next });
      saveCfg();
      drawSetup();
      return;
    }
    const a = ev.target.closest('[data-action]');
    if (!a) return;
    const run = state.timerRun;
    switch (a.dataset.action) {
      case 'start': begin(); break;
      case 'pause': {
        if (!run) return;
        unlockAudio();
        if (run.pausedAt) {
          state.timerRun = { ...run, pausedTotal: run.pausedTotal + (now() - run.pausedAt), pausedAt: null };
          keepAwake(true);
        } else {
          state.timerRun = { ...run, pausedAt: now() };
          keepAwake(false);
        }
        tick();
        break;
      }
      case 'lap': {
        if (!run || run.pausedAt) return;
        const st = stateAt(run.cfg, elapsedOf(run));
        if (st.kind === 'prep') return;
        state.timerRun = { ...run, laps: [...(run.laps || []), st.main] };
        vibrate(40);
        tick();
        break;
      }
      case 'finish': {
        if (!run) return;
        const st = stateAt(run.cfg, elapsedOf(run));
        if (st.kind === 'prep') return;
        sounds.done();
        showResult({ ...run, finishedAt: st.main });
        break;
      }
      case 'stop': {
        if (!run) return;
        if (!stopArmed) {
          a.textContent = 'Wirklich beenden? Nochmal tippen';
          stopArmed = setTimeout(() => { stopArmed = null; const b = document.getElementById('tr-stop'); if (b) b.textContent = 'Beenden'; }, 3000);
          return;
        }
        clearTimeout(stopArmed);
        stopArmed = null;
        const st = stateAt(run.cfg, elapsedOf(run));
        if (st.kind === 'prep' || (run.cfg.mode !== 'amrap' && !(run.laps || []).length)) {
          stopLoop();
          state.timerRun = null;
          cfg = run.cfg;
          drawSetup();
        } else {
          showResult({ ...run, stopped: true, finishedAt: run.cfg.mode === 'fortime' ? st.main : undefined });
        }
        break;
      }
      case 'again': {
        cfg = run ? run.cfg : cfg;
        source = run ? run.name : source;
        eventId = run ? run.eventId || null : eventId;
        begin();
        break;
      }
      case 'result':
        // Zum Termin: Timer zurücksetzen, der Link führt weiter
        state.timerRun = null;
        break;
      case 'close': {
        cfg = run ? run.cfg : cfg;
        state.timerRun = null;
        drawSetup();
        break;
      }
      default:
    }
  };
}
