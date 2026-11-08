-- =====================================================================
-- 008: Mike ist bei neuen Terminen automatisch dabei.
-- In den Einstellungen wählt der Admin, welcher Name er selbst ist.
-- Jeder neu angelegte Termin bekommt für diesen Namen sofort „dabei“,
-- Serien-Termine nur, wenn auto_join_series an ist.
-- Mehrfach ausführbar.
-- =====================================================================

alter table app_settings add column if not exists admin_member_id uuid references members(id) on delete set null;
alter table app_settings add column if not exists auto_join_series boolean not null default false;

grant select (admin_member_id, auto_join_series) on app_settings to authenticated;
grant update (admin_member_id, auto_join_series) on app_settings to authenticated;

create or replace function auto_join_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare s app_settings;
begin
  select * into s from app_settings where id = 1;
  if s.admin_member_id is null then return new; end if;
  if new.series_id is not null and not s.auto_join_series then return new; end if;
  if new.status <> 'planned' then return new; end if;
  if not exists (select 1 from members where id = s.admin_member_id and active) then return new; end if;
  insert into rsvps (event_id, member_id, status) values (new.id, s.admin_member_id, 'yes')
  on conflict do nothing;
  return new;
end $$;
revoke all on function auto_join_admin() from public, anon, authenticated;

drop trigger if exists events_auto_join_admin on events;
create trigger events_auto_join_admin after insert on events
  for each row execute function auto_join_admin();
