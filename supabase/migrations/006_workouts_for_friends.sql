-- =====================================================================
-- 006: Workout-Datenbank auch für Teilnehmer (nur lesen, mit Gruppen-Code).
-- Mehrfach ausführbar.
-- =====================================================================

create or replace function list_workouts(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_code(p_code);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'workout', t.workout,
                                        'tags', to_jsonb(t.tags), 'notes', t.notes)
                     order by lower(t.title))
    from workout_templates t), '[]'::jsonb);
end $$;
revoke all on function list_workouts(text) from public;
grant execute on function list_workouts(text) to anon, authenticated;
