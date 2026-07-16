-- Adoptly — autoriser le statut "reserved" (animal en cours d'adoption, retiré du matching)
-- À exécuter une fois dans Supabase → SQL Editor
alter table animals drop constraint if exists animals_status_check;
alter table animals add constraint animals_status_check
  check (status in ('active', 'adopted', 'reserved'));
