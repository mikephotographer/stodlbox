-- STODLBOX · 003 · Automatische Jobs (pg_cron, im Supabase-Gratis-Tarif enthalten)
-- Falls "extension pg_cron is not available": Database → Extensions → pg_cron aktivieren, dann nochmal ausführen.

create extension if not exists pg_cron;

-- Alle 15 Minuten: Votings mit abgelaufener Deadline und eindeutigem Sieger schließen
select cron.schedule('stodlbox-close-votes', '*/15 * * * *', $$select public.auto_close_votes()$$);

-- Täglich 03:00 UTC: Serien-Termine für die nächsten 6 Wochen anlegen
select cron.schedule('stodlbox-series', '0 3 * * *', $$select public.generate_series_events(6)$$);
