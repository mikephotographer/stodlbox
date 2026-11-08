// API-Schicht: Supabase (echt) oder Demo-Backend (wenn config.js leer ist).
// Alle Views sprechen nur mit diesem Modul.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { state } from './state.js';

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'stodlbox.auth' },
  });
  return sb;
}

class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

function check({ data, error }) {
  if (error) throw new ApiError(error.message || 'Fehler', error.message || error.code);
  return data;
}

async function rpc(fn, args = {}) {
  const c = await client();
  return check(await c.rpc(fn, args));
}

const code = () => state.code;

const real = {
  // ---------- Freunde ----------
  checkCode: (c) => rpc('check_code', { p_code: c }),
  listMembers: () => rpc('list_members', { p_code: code() }),
  addMember: (name) => rpc('add_member', { p_code: code(), p_name: name }),
  getBoard: (memberId) => rpc('get_board', { p_code: code(), p_member_id: memberId || null }),
  getEvent: (id, memberId) => rpc('get_event', { p_code: code(), p_event_id: id, p_member_id: memberId || null }),
  getArchive: (offset = 0) => rpc('get_archive', { p_code: code(), p_offset: offset }),
  setRsvp: (eventId, memberId, status) => rpc('set_rsvp', { p_code: code(), p_event_id: eventId, p_member_id: memberId, p_status: status }),
  ackPromotion: (eventId, memberId) => rpc('ack_promotion', { p_code: code(), p_event_id: eventId, p_member_id: memberId }),
  voteWorkout: (eventId, memberId, optionId) => rpc('vote_workout', { p_code: code(), p_event_id: eventId, p_member_id: memberId, p_option_id: optionId }),
  answerDatePoll: (pollId, memberId, optionIds) => rpc('answer_date_poll', { p_code: code(), p_poll_id: pollId, p_member_id: memberId, p_option_ids: optionIds }),
  searchWorkouts: (q, tag) => rpc('search_workouts', { p_code: code(), p_query: q || '', p_tag: tag || null }),
  listWorkouts: () => rpc('list_workouts', { p_code: code() }),

  // ---------- Fotos ----------
  photoUrl: (path) => `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`,
  async getEventPhotos(eventId, memberId) {
    const r = await rpc('get_event_photos', { p_code: code(), p_event_id: eventId, p_member_id: memberId || null });
    r.photos = (r.photos || []).map((p) => ({ ...p, url: real.photoUrl(p.path), thumb: real.photoUrl(p.thumb_path), display: p.display_path ? real.photoUrl(p.display_path) : null }));
    return r;
  },
  photoTicket: (eventId, memberId) => rpc('photo_ticket', { p_code: code(), p_event_id: eventId, p_member_id: memberId }),
  async uploadPhotoFile(path, blob) {
    const c = await client();
    check(await c.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '604800', upsert: false }));
  },
  addMedia: (memberId, path, thumbPath, w, h, kind, duration, displayPath) => rpc('add_media', { p_code: code(), p_member_id: memberId, p_path: path, p_thumb_path: thumbPath, p_width: w, p_height: h, p_kind: kind, p_duration: duration, p_display_path: displayPath || null }),
  deletePhoto: (memberId, photoId) => rpc('delete_photo', { p_code: code(), p_member_id: memberId || null, p_photo_id: photoId }),
  recentPhotoEvents: (memberId) => rpc('recent_photo_events', { p_code: code(), p_member_id: memberId }),

  // ---------- Admin: Login ----------
  async session() {
    const c = await client();
    const { data } = await c.auth.getSession();
    return data.session ? { email: data.session.user.email } : null;
  },
  /** Rücksprung aus dem Magic Link (#access_token=… bzw. ?code=…) verarbeiten */
  async handleAuthRedirect() {
    const h = location.hash;
    const q = new URLSearchParams(location.search);
    if (!/access_token=|error_description=/.test(h) && !q.has('code')) return false;
    const c = await client();
    await c.auth.getSession(); // detectSessionInUrl wertet die URL beim Start aus
    q.delete('code');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + '#/admin');
    return true;
  },
  async sendLogin(email) {
    const c = await client();
    const redirect = location.origin + location.pathname;
    check(await c.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect } }));
  },
  async verifyLogin(email, token) {
    const c = await client();
    check(await c.auth.verifyOtp({ email, token, type: 'email' }));
  },
  async signOut() {
    const c = await client();
    await c.auth.signOut();
  },
  isAdmin: () => rpc('is_admin'),

  // ---------- Admin: Termine ----------
  saveEvent: (evt) => rpc('admin_save_event', { p_event: evt }),
  setEventStatus: (id, status) => rpc('admin_set_event_status', { p_event_id: id, p_status: status }),
  deleteEvent: (id) => rpc('admin_delete_event', { p_event_id: id }),
  closeVote: (eventId, optionId = null) => rpc('admin_close_vote', { p_event_id: eventId, p_option_id: optionId }),
  adminSetRsvp: (eventId, memberId, status) => rpc('admin_set_rsvp', { p_event_id: eventId, p_member_id: memberId, p_status: status }),

  // ---------- Admin: Serien ----------
  async listSeries() {
    const c = await client();
    return check(await c.from('series').select('*').order('active', { ascending: false }).order('weekday'));
  },
  saveSeries: (s) => rpc('admin_save_series', { p_series: s }),
  setSeriesActive: (id, active) => rpc('admin_set_series_active', { p_series_id: id, p_active: active }),
  deleteEmptySeriesEvents: (id) => rpc('admin_delete_empty_series_events', { p_series_id: id }),

  // ---------- Admin: Terminfindung ----------
  savePoll: (p) => rpc('admin_save_poll', { p_poll: p }),
  closePoll: (id, closed = true) => rpc('admin_close_poll', { p_poll_id: id, p_closed: closed }),
  deletePoll: (id) => rpc('admin_delete_poll', { p_poll_id: id }),
  pollToEvent: (optionId, evt, prefillMaybe) => rpc('admin_poll_to_event', { p_option_id: optionId, p_event: evt, p_prefill_maybe: !!prefillMaybe }),

  // ---------- Admin: Vorlagen ----------
  async listTemplates() {
    const c = await client();
    return check(await c.from('workout_templates').select('*').order('title'));
  },
  async saveTemplate(t) {
    const c = await client();
    const row = { title: t.title, workout: t.workout, tags: t.tags || [], notes: t.notes || null, updated_at: new Date().toISOString() };
    if (t.id) return check(await c.from('workout_templates').update(row).eq('id', t.id).select().single());
    return check(await c.from('workout_templates').insert(row).select().single());
  },
  async deleteTemplate(id) {
    const c = await client();
    check(await c.from('workout_templates').delete().eq('id', id));
  },

  // ---------- Admin: Equipment ----------
  async listRules() {
    const c = await client();
    return check(await c.from('equipment_rules').select('*').order('sort').order('tip'));
  },
  async saveRule(r) {
    const c = await client();
    const row = { keywords: r.keywords, tip: r.tip, case_sensitive: !!r.case_sensitive, active: r.active !== false, sort: r.sort || 0 };
    if (r.id) return check(await c.from('equipment_rules').update(row).eq('id', r.id).select().single());
    return check(await c.from('equipment_rules').insert(row).select().single());
  },
  async deleteRule(id) {
    const c = await client();
    check(await c.from('equipment_rules').delete().eq('id', id));
  },

  // ---------- Admin: Leute ----------
  async listAllMembers() {
    const c = await client();
    return check(await c.from('members').select('id,name,active,created_at').order('active', { ascending: false }).order('name'));
  },
  adminAddMember: (name) => rpc('admin_add_member', { p_name: name }),
  renameMember: (id, name) => rpc('admin_rename_member', { p_member_id: id, p_name: name }),
  setMemberActive: (id, active) => rpc('admin_set_member_active', { p_member_id: id, p_active: active }),
  mergeMembers: (from, into) => rpc('admin_merge_members', { p_from: from, p_into: into }),

  // ---------- Admin: Einstellungen ----------
  async getSettings() {
    const c = await client();
    return check(await c.from('app_settings').select('admin_email,default_duration_min,default_capacity,admin_member_id,auto_join_series').eq('id', 1).single());
  },
  async saveSettings(s) {
    const c = await client();
    check(await c.from('app_settings').update({ default_duration_min: s.default_duration_min, default_capacity: s.default_capacity }).eq('id', 1));
  },
  async saveAutoJoin(s) {
    const c = await client();
    check(await c.from('app_settings').update({ admin_member_id: s.admin_member_id || null, auto_join_series: !!s.auto_join_series }).eq('id', 1));
  },
  setGroupCode: (c) => rpc('admin_set_group_code', { p_new_code: c }),
};

let impl = real;
if (DEMO) {
  const mod = await import('./mock.js');
  impl = mod.mockApi;
}

export const api = impl;
