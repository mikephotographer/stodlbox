// Lokaler Test der Migrationen + supabase/tests.sql mit PGlite (Supabase-Umgebung wird nachgestellt).
// Aufruf: cd tools/sql-test && npm install && npm test
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
const dir = process.argv[2] || new URL('../../supabase', import.meta.url).pathname;
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema extensions; create schema auth;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, created_at timestamptz default now());
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
  create or replace function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
  grant usage on schema auth, extensions, public to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of ['migrations/001_schema.sql','migrations/002_rpc.sql','migrations/004_seed.sql','migrations/005_workout_db.sql','migrations/006_workouts_for_friends.sql','migrations/007_photos.sql','migrations/008_admin_auto_join.sql','migrations/009_videos.sql']) {
  try { await db.exec(readFileSync(`${dir}/${f}`, 'utf8')); console.log('ok', f); }
  catch (e) { console.error('FAIL', f, e.message); process.exit(1); }
}
const notices = [];
try {
  const res = await db.exec(readFileSync(`${dir}/tests.sql`, 'utf8'), { onNotice: (n) => console.log('NOTICE', n.message) });
} catch (e) { console.error('TEST FAIL:', e.message, e.where || ''); process.exit(1); }
console.log('tests finished without error');
