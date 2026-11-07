// DEMO-MODUS: bildet die Supabase-RPCs im Browser nach (localStorage).
// Nur aktiv, solange config.js leer ist. Logik entspricht supabase/migrations/002_rpc.sql.
import { SEED_RULES } from './seed-rules.js';
import { viennaToISO, toDateInput, vienna } from './format.js';

const KEY = 'stodlbox.demo.v1';
export const DEMO_CODE = 'STODL-DEMO';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const nowISO = () => new Date().toISOString();
const err = (code) => { const e = new Error(code); e.code = code; return e; };
const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));

// ---------- Startdaten ----------
function nextWeekday(isoDow, weeksAhead = 0) {
  const today = new Date();
  const v = vienna(today);
  const dow = v.wd + 1; // 1 = Mo
  let add = (isoDow - dow + 7) % 7;
  if (add === 0) add = 7;
  const d = new Date(Date.UTC(v.y, v.m - 1, v.d + add + weeksAhead * 7));
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const v = vienna(new Date());
  return new Date(Date.UTC(v.y, v.m - 1, v.d - n)).toISOString().slice(0, 10);
}

function seed() {
  const names = ['Mike', 'Lukas', 'Kathi', 'Flo', 'Sabine', 'Tom', 'Jana', 'Markus', 'Vroni'];
  const members = names.map((name, i) => ({ id: uid(), name, active: true, created_at: new Date(Date.now() - (100 - i) * 864e5).toISOString() }));
  const m = Object.fromEntries(members.map((x) => [x.name, x.id]));
  const series = [{ id: uid(), title: 'Samstags-WOD', weekday: 6, start_time: '09:00', duration_min: 90, capacity: 8, starts_on: daysAgo(60), ends_on: null, active: true }];

  const e1 = {
    id: uid(), series_id: series[0].id, series_slot: null, starts_at: viennaToISO(nextWeekday(6), '09:00'), duration_min: 90,
    title: 'HYROX-Sim Light', workout: '4 Runden:\n1 km Run\n20 Wall Balls\n15 Toes-to-Bar\n50 m Sled Push\n\nCap 45 min',
    workout_mode: 'fixed', vote_deadline: null, vote_closed: false, capacity: 8, media_url: null, note: 'Bitte pünktlich – wir starten mit 15 min Aufwärmen.', status: 'planned',
  };
  e1.series_slot = e1.starts_at;
  const e2 = {
    id: uid(), series_id: null, series_slot: null, starts_at: viennaToISO(nextWeekday(7, 1), '10:00'), duration_min: 90,
    title: 'Sonntags-Spezial', workout: null, workout_mode: 'vote', vote_deadline: viennaToISO(nextWeekday(5, 1), '20:00'), vote_closed: false,
    capacity: null, media_url: null, note: null, status: 'planned',
  };
  const e3 = {
    id: uid(), series_id: series[0].id, series_slot: null, starts_at: viennaToISO(nextWeekday(6, 1), '09:00'), duration_min: 90,
    title: 'Samstags-WOD', workout: null, workout_mode: 'fixed', vote_deadline: null, vote_closed: false, capacity: 8, media_url: null, note: null, status: 'planned',
  };
  e3.series_slot = e3.starts_at;
  const e4 = {
    id: uid(), series_id: series[0].id, series_slot: null, starts_at: viennaToISO(nextWeekday(6, 2), '09:00'), duration_min: 90,
    title: 'Samstags-WOD', workout: null, workout_mode: 'fixed', vote_deadline: null, vote_closed: false, capacity: 8, media_url: null, note: null, status: 'cancelled',
  };
  e4.series_slot = e4.starts_at;
  const past = [
    { title: 'Murph light', workout: 'For Time:\n1 km Run\n50 Pull-Ups\n100 Push-Ups\n150 Air Squats\n1 km Run', ago: 7, media: 'https://photos.app.goo.gl/' },
    { title: 'Chipper 100er', workout: '100 DU\n100 Wall Balls\n100 Burpees', ago: 14, media: null },
    { title: 'Ruder-Intervalle', workout: '8 x 500 m Row\n2 min Pause', ago: 21, media: null },
  ].map((p) => ({
    id: uid(), series_id: null, series_slot: null, starts_at: viennaToISO(daysAgo(p.ago), '09:00'), duration_min: 90, title: p.title, workout: p.workout,
    workout_mode: 'fixed', vote_deadline: null, vote_closed: false, capacity: null, media_url: p.media, note: null, status: 'planned',
  }));

  const events = [e1, e2, e3, e4, ...past];
  const opts = [
    { id: uid(), event_id: e2.id, label: 'Chipper 100er', workout: '100 DU\n100 Wall Balls\n100 Burpees', sort: 1 },
    { id: uid(), event_id: e2.id, label: 'Partner-Row', workout: 'Partner, For Time:\n5000 m Row\n(abwechseln nach Wunsch)', sort: 2 },
    { id: uid(), event_id: e2.id, label: 'Barbell', workout: '5 Runden:\n5 Deadlift\n10 Front Squat\n15 Burpees', sort: 3 },
  ];
  const t = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString();
  const rsvps = [
    ['Mike', 'yes', 300], ['Lukas', 'yes', 290], ['Sabine', 'yes', 280], ['Tom', 'yes', 270], ['Jana', 'yes', 260], ['Markus', 'yes', 250],
    ['Kathi', 'maybe', 240], ['Vroni', 'no', 200],
  ].map(([n, status, ago]) => ({ event_id: e1.id, member_id: m[n], status, status_since: t(ago), promoted_at: null, promotion_seen: true }));
  past.forEach((p, i) => ['Mike', 'Lukas', 'Kathi', 'Flo', 'Tom'].slice(0, 5 - i).forEach((n) =>
    rsvps.push({ event_id: p.id, member_id: m[n], status: 'yes', status_since: t(20000), promoted_at: null, promotion_seen: true })));
  const votes = [
    { event_id: e2.id, member_id: m.Lukas, option_id: opts[0].id }, { event_id: e2.id, member_id: m.Tom, option_id: opts[0].id },
    { event_id: e2.id, member_id: m.Sabine, option_id: opts[1].id }, { event_id: e2.id, member_id: m.Jana, option_id: opts[0].id },
    { event_id: e2.id, member_id: m.Markus, option_id: opts[2].id },
  ];
  const poll = { id: uid(), title: 'Training KW ' + (isoWeek(nextWeekday(1, 1))), deadline: viennaToISO(nextWeekday(5), '20:00'), closed: false, event_id: null, created_at: nowISO() };
  const pollOpts = [
    { id: uid(), poll_id: poll.id, starts_at: viennaToISO(nextWeekday(2, 1), '18:30') },
    { id: uid(), poll_id: poll.id, starts_at: viennaToISO(nextWeekday(4, 1), '18:30') },
    { id: uid(), poll_id: poll.id, starts_at: viennaToISO(nextWeekday(5, 1), '17:00') },
  ];
  const answers = [
    [0, 'Lukas'], [1, 'Lukas'], [1, 'Kathi'], [1, 'Flo'], [1, 'Tom'], [2, 'Tom'], [0, 'Sabine'], [1, 'Jana'],
  ].map(([i, n]) => ({ option_id: pollOpts[i].id, member_id: m[n] }));

  return {
    settings: { admin_email: 'mike@demo.local', code: DEMO_CODE, default_duration_min: 90, default_capacity: 8 },
    members, series, events, options: opts, votes, rsvps, polls: [poll], pollOptions: pollOpts, answers,
    rules: SEED_RULES.map((r, i) => ({ id: uid(), ...r, active: true, sort: (i + 1) * 10 })),
    templates: [
      { id: uid(), title: 'Cindy', workout: 'AMRAP 20 min:\n5 Pull-Ups\n10 Push-Ups\n15 Air Squats', created_at: nowISO() },
      { id: uid(), title: 'Fran', workout: '21-15-9:\nThruster (43/30 kg)\nPull-Ups', created_at: nowISO() },
      { id: uid(), title: 'HYROX-Sim Light', workout: '4 Runden:\n1 km Run\n20 Wall Balls\n15 Toes-to-Bar\n50 m Sled Push', created_at: nowISO() },
    ],
    session: null,
  };
}

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - first) / 864e5 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}

// ---------- Speicher ----------
let db;
function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !db.members) { db = seed(); generateSeries(6); persist(); }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* egal */ }
}
load();

// ---------- Helfer wie in SQL ----------
const dayStart = () => viennaToISO(toDateInput(new Date()), '00:00');
const codeOk = (c) => !!c && String(c).trim().toUpperCase() === db.settings.code;
const isAdmin = () => !!db.session;
function assertCode(c) { if (!isAdmin() && !codeOk(c)) throw err('BAD_CODE'); }
function requireAdmin() { if (!isAdmin()) throw err('NOT_ADMIN'); }
function assertMember(id) { if (!db.members.some((m) => m.id === id && m.active)) throw err('BAD_MEMBER'); }
const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim();
const memberName = (id) => (db.members.find((m) => m.id === id) || {}).name || '?';
const ORDER = { yes: 0, maybe: 1, waitlist: 2, no: 3 };
const byTime = (a, b) => (a.status_since < b.status_since ? -1 : a.status_since > b.status_since ? 1 : a.member_id < b.member_id ? -1 : 1);

function waitlist(eventId) {
  return db.rsvps.filter((r) => r.event_id === eventId && r.status === 'waitlist').sort(byTime);
}

function eventJson(e, memberId) {
  const rs = db.rsvps.filter((r) => r.event_id === e.id)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || byTime(a, b))
    .map((r) => ({ member_id: r.member_id, name: memberName(r.member_id), status: r.status, since: r.status_since }));
  const options = db.options.filter((o) => o.event_id === e.id).sort((a, b) => a.sort - b.sort)
    .map((o) => ({ ...o, votes: db.votes.filter((v) => v.option_id === o.id).length }));
  const mine = db.rsvps.find((r) => r.event_id === e.id && r.member_id === memberId);
  const wl = waitlist(e.id).findIndex((r) => r.member_id === memberId);
  const { series_slot, ...rest } = e;
  return {
    ...rest,
    started: e.starts_at <= nowISO(),
    rsvps: rs,
    options,
    my_vote: (db.votes.find((v) => v.event_id === e.id && v.member_id === memberId) || {}).option_id || null,
    my_rsvp: mine ? mine.status : null,
    my_waitlist_pos: wl >= 0 ? wl + 1 : null,
  };
}

function pollJson(p, memberId) {
  const opts = db.pollOptions.filter((o) => o.poll_id === p.id).sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));
  const optIds = new Set(opts.map((o) => o.id));
  const ans = db.answers.filter((a) => optIds.has(a.option_id));
  const peopleIds = [...new Set(ans.map((a) => a.member_id))];
  return {
    id: p.id, title: p.title, deadline: p.deadline, closed: p.closed, event_id: p.event_id,
    open: !p.closed && (!p.deadline || p.deadline > nowISO()),
    options: opts.map((o) => ({ id: o.id, starts_at: o.starts_at, members: ans.filter((a) => a.option_id === o.id).map((a) => a.member_id) })),
    people: peopleIds.map((id) => ({ id, name: memberName(id) })).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    my: ans.filter((a) => a.member_id === memberId).map((a) => a.option_id),
  };
}

function promote(eventId) {
  const e = db.events.find((x) => x.id === eventId);
  if (!e || e.status !== 'planned' || e.starts_at <= nowISO()) return;
  for (;;) {
    const yes = db.rsvps.filter((r) => r.event_id === eventId && r.status === 'yes').length;
    if (e.capacity != null && yes >= e.capacity) break;
    const next = waitlist(eventId)[0];
    if (!next) break;
    Object.assign(next, { status: 'yes', status_since: nowISO(), promoted_at: nowISO(), promotion_seen: false });
  }
}

function doSetRsvp(eventId, memberId, status, admin) {
  if (!['yes', 'maybe', 'no'].includes(status)) throw err('INVALID');
  const e = db.events.find((x) => x.id === eventId);
  if (!e) throw err('NOT_FOUND');
  if (!admin) {
    if (e.status !== 'planned') throw err('CANCELLED');
    if (e.starts_at <= nowISO()) throw err('LOCKED');
  }
  if (!db.members.some((m) => m.id === memberId && (m.active || admin))) throw err('BAD_MEMBER');
  let r = db.rsvps.find((x) => x.event_id === eventId && x.member_id === memberId);
  const old = r ? r.status : null;
  let next = status;
  if (status === 'yes') {
    if (old === 'waitlist') next = 'waitlist';
    else if (old !== 'yes' && e.capacity != null) {
      const yes = db.rsvps.filter((x) => x.event_id === eventId && x.status === 'yes').length;
      if (yes >= e.capacity) next = 'waitlist';
    }
  }
  if (!r) {
    r = { event_id: eventId, member_id: memberId, status: next, status_since: nowISO(), promoted_at: null, promotion_seen: true };
    db.rsvps.push(r);
  } else if (r.status !== next) {
    Object.assign(r, { status: next, status_since: nowISO(), promoted_at: null, promotion_seen: true });
  }
  promote(eventId);
  const pos = waitlist(eventId).findIndex((x) => x.member_id === memberId);
  return { status: r.status, waitlist_pos: r.status === 'waitlist' ? pos + 1 : null };
}

function closeVote(eventId, optionId) {
  const e = db.events.find((x) => x.id === eventId);
  if (!e) throw err('NOT_FOUND');
  if (e.workout_mode !== 'vote' || e.vote_closed) throw err('VOTE_CLOSED');
  const opts = db.options.filter((o) => o.event_id === eventId);
  let win;
  if (optionId) {
    win = opts.find((o) => o.id === optionId);
    if (!win) throw err('INVALID');
  } else {
    const counts = opts.map((o) => ({ o, n: db.votes.filter((v) => v.option_id === o.id).length }));
    const top = Math.max(...counts.map((c) => c.n));
    const best = counts.filter((c) => c.n === top);
    if (best.length !== 1) throw err('TIE');
    win = best[0].o;
  }
  Object.assign(e, { workout: win.workout, workout_mode: 'fixed', vote_closed: true });
  return win.id;
}

function autoCloseVotes() {
  for (const e of db.events) {
    if (e.workout_mode === 'vote' && !e.vote_closed && e.status === 'planned' && e.vote_deadline && e.vote_deadline <= nowISO()) {
      try { closeVote(e.id, null); } catch { /* Gleichstand bleibt offen */ }
    }
  }
}

function generateSeries(weeks = 6) {
  const today = toDateInput(new Date());
  const until = new Date(Date.parse(today) + weeks * 7 * 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (const s of db.series.filter((x) => x.active)) {
    let d = s.starts_on > today ? s.starts_on : today;
    const end = s.ends_on && s.ends_on < until ? s.ends_on : until;
    while (d <= end) {
      const dow = ((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1;
      if (dow === s.weekday) {
        const slot = viennaToISO(d, s.start_time.slice(0, 5));
        if (slot > nowISO() && !db.events.some((e) => e.series_id === s.id && e.series_slot === slot)) {
          db.events.push({
            id: uid(), series_id: s.id, series_slot: slot, starts_at: slot, duration_min: s.duration_min, title: s.title, workout: null,
            workout_mode: 'fixed', vote_deadline: null, vote_closed: false, capacity: s.capacity, media_url: null, note: null, status: 'planned',
          });
          n++;
        }
      }
      d = new Date(Date.parse(d) + 864e5).toISOString().slice(0, 10);
    }
  }
  return n;
}

function rulesJson() {
  return db.rules.filter((r) => r.active).sort((a, b) => a.sort - b.sort)
    .map((r) => ({ keywords: r.keywords, tip: r.tip, case_sensitive: r.case_sensitive }));
}

function saveEvent(p) {
  const mode = p.workout_mode || 'fixed';
  const title = String(p.title || '').trim();
  if (!['fixed', 'vote'].includes(mode) || !title || title.length > 80 || !p.starts_at) throw err('INVALID');
  const cap = p.capacity === '' || p.capacity == null ? null : +p.capacity;
  if (cap != null && cap < 1) throw err('INVALID');
  const opts = p.options || [];
  if (mode === 'vote' && (opts.length < 2 || opts.length > 3)) throw err('INVALID');
  let e = p.id ? db.events.find((x) => x.id === p.id) : null;
  if (p.id && !e) throw err('NOT_FOUND');
  const wasClosed = e ? e.vote_closed : false;
  const fields = {
    starts_at: p.starts_at, duration_min: +p.duration_min || db.settings.default_duration_min, title,
    workout: mode === 'fixed' ? (String(p.workout || '').trim() || null) : null, workout_mode: mode,
    capacity: cap, media_url: String(p.media_url || '').trim() || null, note: String(p.note || '').trim() || null,
  };
  if (!e) {
    e = { id: uid(), series_id: null, series_slot: null, status: 'planned', vote_closed: false, vote_deadline: null, ...fields };
    if (mode === 'vote') e.vote_deadline = p.vote_deadline || null;
    db.events.push(e);
  } else {
    Object.assign(e, fields);
    if (mode === 'vote') { e.vote_deadline = p.vote_deadline || null; e.vote_closed = false; }
  }
  if (mode === 'vote') {
    const keep = [];
    opts.forEach((o, i) => {
      if (!String(o.label || '').trim() || !String(o.workout || '').trim()) throw err('INVALID');
      let row = o.id && db.options.find((x) => x.id === o.id && x.event_id === e.id);
      if (row) Object.assign(row, { label: o.label.trim(), workout: o.workout.trim(), sort: i + 1 });
      else { row = { id: uid(), event_id: e.id, label: o.label.trim(), workout: o.workout.trim(), sort: i + 1 }; db.options.push(row); }
      keep.push(row.id);
    });
    dropOptions(e.id, keep);
  } else if (!wasClosed) {
    dropOptions(e.id, []);
  }
  promote(e.id);
  return e.id;
}

function dropOptions(eventId, keep) {
  const gone = new Set(db.options.filter((o) => o.event_id === eventId && !keep.includes(o.id)).map((o) => o.id));
  db.options = db.options.filter((o) => !gone.has(o.id));
  db.votes = db.votes.filter((v) => !gone.has(v.option_id));
}

function deleteEvent(id) {
  db.events = db.events.filter((e) => e.id !== id);
  dropOptions(id, []);
  db.rsvps = db.rsvps.filter((r) => r.event_id !== id);
  db.polls.forEach((p) => { if (p.event_id === id) p.event_id = null; });
}

// Jede Schreib-Aktion: ausführen, speichern, Kopie zurückgeben
function tx(fn) {
  return async (...args) => {
    const v = fn(...args);
    persist();
    return delay(v === undefined ? null : v);
  };
}
function rd(fn) {
  return async (...args) => {
    autoCloseVotes();
    return delay(fn(...args));
  };
}

const code = () => {
  try { return (JSON.parse(localStorage.getItem('stodlbox.v1')) || {}).code; } catch { return null; }
};

export const mockApi = {
  demo: true,
  // ---------- Freunde ----------
  checkCode: rd((c) => codeOk(c)),
  listMembers: rd(() => { assertCode(code()); return db.members.filter((m) => m.active).map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'de')); }),
  addMember: tx((name) => {
    assertCode(code());
    const n = cleanName(name);
    if (n.length < 2 || n.length > 30) throw err('NAME_INVALID');
    if (db.members.some((m) => m.active && m.name.toLowerCase() === n.toLowerCase())) throw err('NAME_TAKEN');
    const m = { id: uid(), name: n, active: true, created_at: nowISO() };
    db.members.push(m);
    return m.id;
  }),
  getBoard: rd((memberId) => {
    assertCode(code());
    const start = dayStart();
    return {
      now: nowISO(),
      member_ok: !!memberId && db.members.some((m) => m.id === memberId && m.active),
      events: db.events.filter((e) => e.starts_at >= start).sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1)).slice(0, 30).map((e) => eventJson(e, memberId)),
      polls: db.polls.filter((p) => !p.closed).map((p) => pollJson(p, memberId)),
      rules: rulesJson(),
      promotions: db.rsvps.filter((r) => r.member_id === memberId && !r.promotion_seen && r.status === 'yes')
        .map((r) => db.events.find((e) => e.id === r.event_id)).filter((e) => e && e.starts_at >= start)
        .map((e) => ({ event_id: e.id, title: e.title, starts_at: e.starts_at })),
    };
  }),
  getEvent: rd((id, memberId) => {
    assertCode(code());
    const e = db.events.find((x) => x.id === id);
    if (!e) throw err('NOT_FOUND');
    return { ...eventJson(e, memberId), rules: rulesJson() };
  }),
  getArchive: rd((offset = 0) => {
    assertCode(code());
    const start = dayStart();
    const past = db.events.filter((e) => e.starts_at < start).sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1));
    return { items: past.slice(offset, offset + 20).map((e) => eventJson(e, null)), has_more: past.length > offset + 20 };
  }),
  setRsvp: tx((eventId, memberId, status) => { assertCode(code()); return doSetRsvp(eventId, memberId, status, false); }),
  ackPromotion: tx((eventId, memberId) => {
    assertCode(code());
    const r = db.rsvps.find((x) => x.event_id === eventId && x.member_id === memberId);
    if (r) r.promotion_seen = true;
  }),
  voteWorkout: tx((eventId, memberId, optionId) => {
    assertCode(code()); assertMember(memberId);
    const e = db.events.find((x) => x.id === eventId);
    if (!e) throw err('NOT_FOUND');
    if (e.workout_mode !== 'vote' || e.vote_closed || e.status !== 'planned' || e.starts_at <= nowISO() || (e.vote_deadline && e.vote_deadline <= nowISO())) throw err('VOTE_CLOSED');
    if (!db.options.some((o) => o.id === optionId && o.event_id === eventId)) throw err('INVALID');
    db.votes = db.votes.filter((v) => !(v.event_id === eventId && v.member_id === memberId));
    db.votes.push({ event_id: eventId, member_id: memberId, option_id: optionId });
    return eventJson(e, memberId);
  }),
  answerDatePoll: tx((pollId, memberId, optionIds) => {
    assertCode(code()); assertMember(memberId);
    const p = db.polls.find((x) => x.id === pollId);
    if (!p) throw err('NOT_FOUND');
    if (p.closed || (p.deadline && p.deadline <= nowISO())) throw err('POLL_CLOSED');
    const valid = new Set(db.pollOptions.filter((o) => o.poll_id === pollId).map((o) => o.id));
    if (optionIds.some((id) => !valid.has(id))) throw err('INVALID');
    db.answers = db.answers.filter((a) => !(valid.has(a.option_id) && a.member_id === memberId));
    [...new Set(optionIds)].forEach((id) => db.answers.push({ option_id: id, member_id: memberId }));
    return pollJson(p, memberId);
  }),
  searchWorkouts: rd((q = '') => {
    assertCode(code());
    const needle = q.trim().toLowerCase();
    const hit = (t, w) => !needle || t.toLowerCase().includes(needle) || (w || '').toLowerCase().includes(needle);
    return [
      ...db.templates.filter((t) => hit(t.title, t.workout)).map((t) => ({ kind: 'template', id: t.id, title: t.title, workout: t.workout, date: null })),
      ...db.events.filter((e) => e.workout && e.starts_at < nowISO() && hit(e.title, e.workout))
        .sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1)).slice(0, 30)
        .map((e) => ({ kind: 'event', id: e.id, title: e.title, workout: e.workout, date: e.starts_at })),
    ];
  }),

  // ---------- Admin: Login (Demo: jede Mail, Code 123456) ----------
  handleAuthRedirect: async () => false,
  session: rd(() => db.session),
  sendLogin: tx((email) => { if (!/.+@.+/.test(email)) throw err('INVALID'); db.pendingEmail = email; }),
  verifyLogin: tx((email, token) => {
    if (String(token).trim() !== '123456') throw err('INVALID');
    db.session = { email };
  }),
  signOut: tx(() => { db.session = null; }),
  isAdmin: rd(() => isAdmin()),

  // ---------- Admin: Termine ----------
  saveEvent: tx((evt) => { requireAdmin(); return saveEvent(evt); }),
  setEventStatus: tx((id, status) => {
    requireAdmin();
    const e = db.events.find((x) => x.id === id);
    if (!e) throw err('NOT_FOUND');
    e.status = status;
    if (status === 'planned') promote(id);
  }),
  deleteEvent: tx((id) => { requireAdmin(); deleteEvent(id); }),
  closeVote: tx((eventId, optionId = null) => { requireAdmin(); return closeVote(eventId, optionId); }),
  adminSetRsvp: tx((eventId, memberId, status) => {
    requireAdmin();
    if (status === 'none') {
      db.rsvps = db.rsvps.filter((r) => !(r.event_id === eventId && r.member_id === memberId));
      promote(eventId);
      return { status: null };
    }
    return doSetRsvp(eventId, memberId, status, true);
  }),

  // ---------- Admin: Serien ----------
  listSeries: rd(() => { requireAdmin(); return [...db.series].sort((a, b) => (b.active - a.active) || a.weekday - b.weekday); }),
  saveSeries: tx((s) => {
    requireAdmin();
    const title = String(s.title || '').trim();
    if (!title || !s.weekday || !s.start_time || !s.starts_on) throw err('INVALID');
    if (s.ends_on && s.ends_on < s.starts_on) throw err('INVALID');
    const row = {
      title, weekday: +s.weekday, start_time: s.start_time.slice(0, 5), duration_min: +s.duration_min || db.settings.default_duration_min,
      capacity: s.capacity === '' || s.capacity == null ? null : +s.capacity, starts_on: s.starts_on, ends_on: s.ends_on || null,
    };
    let id = s.id;
    if (id) Object.assign(db.series.find((x) => x.id === id), row);
    else { id = uid(); db.series.push({ id, active: true, ...row }); }
    generateSeries(6);
    return id;
  }),
  setSeriesActive: tx((id, active) => {
    requireAdmin();
    db.series.find((x) => x.id === id).active = active;
    if (active) generateSeries(6);
  }),
  deleteEmptySeriesEvents: tx((id) => {
    requireAdmin();
    if (db.series.find((s) => s.id === id)?.active) throw err('INVALID');
    const del = db.events.filter((e) => e.series_id === id && e.starts_at > nowISO()
      && !db.rsvps.some((r) => r.event_id === e.id) && !db.votes.some((v) => v.event_id === e.id));
    del.forEach((e) => deleteEvent(e.id));
    return del.length;
  }),

  // ---------- Admin: Terminfindung ----------
  savePoll: tx((p) => {
    requireAdmin();
    const title = String(p.title || '').trim();
    const opts = p.options || [];
    if (!title || opts.length < 2 || opts.length > 6) throw err('INVALID');
    let poll = p.id && db.polls.find((x) => x.id === p.id);
    if (poll) Object.assign(poll, { title, deadline: p.deadline || null });
    else { poll = { id: uid(), title, deadline: p.deadline || null, closed: false, event_id: null, created_at: nowISO() }; db.polls.push(poll); }
    const keep = opts.map((o) => {
      let row = o.id && db.pollOptions.find((x) => x.id === o.id && x.poll_id === poll.id);
      if (row) row.starts_at = o.starts_at;
      else { row = { id: uid(), poll_id: poll.id, starts_at: o.starts_at }; db.pollOptions.push(row); }
      return row.id;
    });
    const gone = new Set(db.pollOptions.filter((o) => o.poll_id === poll.id && !keep.includes(o.id)).map((o) => o.id));
    db.pollOptions = db.pollOptions.filter((o) => !gone.has(o.id));
    db.answers = db.answers.filter((a) => !gone.has(a.option_id));
    return poll.id;
  }),
  closePoll: tx((id, closed = true) => { requireAdmin(); db.polls.find((p) => p.id === id).closed = closed; }),
  deletePoll: tx((id) => {
    requireAdmin();
    const opts = new Set(db.pollOptions.filter((o) => o.poll_id === id).map((o) => o.id));
    db.polls = db.polls.filter((p) => p.id !== id);
    db.pollOptions = db.pollOptions.filter((o) => o.poll_id !== id);
    db.answers = db.answers.filter((a) => !opts.has(a.option_id));
  }),
  pollToEvent: tx((optionId, evt, prefill) => {
    requireAdmin();
    const opt = db.pollOptions.find((o) => o.id === optionId);
    if (!opt) throw err('NOT_FOUND');
    const id = saveEvent({ ...evt, id: null });
    const poll = db.polls.find((p) => p.id === opt.poll_id);
    Object.assign(poll, { closed: true, event_id: id });
    if (prefill) {
      db.answers.filter((a) => a.option_id === optionId).forEach((a) => {
        if (db.members.some((m) => m.id === a.member_id && m.active) && !db.rsvps.some((r) => r.event_id === id && r.member_id === a.member_id)) {
          db.rsvps.push({ event_id: id, member_id: a.member_id, status: 'maybe', status_since: nowISO(), promoted_at: null, promotion_seen: true });
        }
      });
    }
    return id;
  }),

  // ---------- Admin: Vorlagen ----------
  listTemplates: rd(() => { requireAdmin(); return [...db.templates].sort((a, b) => a.title.localeCompare(b.title, 'de')); }),
  saveTemplate: tx((t) => {
    requireAdmin();
    if (!String(t.title || '').trim() || !String(t.workout || '').trim()) throw err('INVALID');
    if (t.id) { const row = db.templates.find((x) => x.id === t.id); Object.assign(row, { title: t.title.trim(), workout: t.workout.trim() }); return row; }
    const row = { id: uid(), title: t.title.trim(), workout: t.workout.trim(), created_at: nowISO() };
    db.templates.push(row);
    return row;
  }),
  deleteTemplate: tx((id) => { requireAdmin(); db.templates = db.templates.filter((t) => t.id !== id); }),

  // ---------- Admin: Equipment ----------
  listRules: rd(() => { requireAdmin(); return [...db.rules].sort((a, b) => a.sort - b.sort); }),
  saveRule: tx((r) => {
    requireAdmin();
    if (!String(r.tip || '').trim() || !(r.keywords || []).length) throw err('INVALID');
    const row = { keywords: r.keywords, tip: r.tip.trim(), case_sensitive: !!r.case_sensitive, active: r.active !== false, sort: r.sort || 0 };
    if (r.id) { Object.assign(db.rules.find((x) => x.id === r.id), row); return r.id; }
    const id = uid();
    db.rules.push({ id, ...row, sort: row.sort || (Math.max(0, ...db.rules.map((x) => x.sort)) + 10) });
    return id;
  }),
  deleteRule: tx((id) => { requireAdmin(); db.rules = db.rules.filter((r) => r.id !== id); }),

  // ---------- Admin: Leute ----------
  listAllMembers: rd(() => { requireAdmin(); return [...db.members].sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name, 'de')); }),
  adminAddMember: tx((name) => {
    requireAdmin();
    const n = cleanName(name);
    if (n.length < 2 || n.length > 30) throw err('NAME_INVALID');
    if (db.members.some((m) => m.active && m.name.toLowerCase() === n.toLowerCase())) throw err('NAME_TAKEN');
    const m = { id: uid(), name: n, active: true, created_at: nowISO() };
    db.members.push(m);
    return m.id;
  }),
  renameMember: tx((id, name) => {
    requireAdmin();
    const n = cleanName(name);
    if (n.length < 2 || n.length > 30) throw err('NAME_INVALID');
    if (db.members.some((m) => m.active && m.id !== id && m.name.toLowerCase() === n.toLowerCase())) throw err('NAME_TAKEN');
    db.members.find((m) => m.id === id).name = n;
  }),
  setMemberActive: tx((id, active) => {
    requireAdmin();
    const me = db.members.find((m) => m.id === id);
    if (active && db.members.some((m) => m.active && m.id !== id && m.name.toLowerCase() === me.name.toLowerCase())) throw err('NAME_TAKEN');
    me.active = active;
  }),
  mergeMembers: tx((from, into) => {
    requireAdmin();
    if (!from || !into || from === into) throw err('INVALID');
    const moveRows = (list, key) => {
      list.filter((r) => r.member_id === from).forEach((r) => {
        if (!list.some((x) => x.member_id === into && x[key] === r[key])) r.member_id = into;
      });
      return list.filter((r) => r.member_id !== from);
    };
    db.rsvps = moveRows(db.rsvps, 'event_id');
    db.votes = moveRows(db.votes, 'event_id');
    db.answers = moveRows(db.answers, 'option_id');
    db.members.find((m) => m.id === from).active = false;
    db.events.filter((e) => e.starts_at > nowISO() && e.status === 'planned').forEach((e) => promote(e.id));
  }),

  // ---------- Admin: Einstellungen ----------
  getSettings: rd(() => { requireAdmin(); const { admin_email, default_duration_min, default_capacity } = db.settings; return { admin_email, default_duration_min, default_capacity }; }),
  saveSettings: tx((s) => { requireAdmin(); Object.assign(db.settings, { default_duration_min: +s.default_duration_min || 90, default_capacity: s.default_capacity ? +s.default_capacity : null }); }),
  setGroupCode: tx((c) => {
    requireAdmin();
    const v = String(c || '').trim().toUpperCase();
    if (v.length < 4 || v.length > 40) throw err('INVALID');
    db.settings.code = v;
  }),

  // Nur Demo: alles zurücksetzen
  resetDemo: async () => { db = seed(); generateSeries(6); persist(); },
};
