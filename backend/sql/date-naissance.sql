-- ─────────────────────────────────────────────────────────────────────────────
-- Âge évolutif : on stocke la date de naissance (qui ne change jamais)
-- et la colonne `age` (en mois) est resynchronisée automatiquement par le
-- backend (au démarrage + chaque nuit via cron-job.org).
--
-- À lancer dans l'éditeur SQL de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

alter table animals add column if not exists birth_date date;

-- Index léger : le rafraîchissement ne balaie que les animaux datés
create index if not exists animals_birth_date_idx on animals (birth_date)
  where birth_date is not null;
