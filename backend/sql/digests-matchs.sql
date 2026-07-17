-- ─────────────────────────────────────────────────────────────────────────────
-- Récaps de matchs : au lieu d'un email par swipe (spam + quota), on regroupe.
-- Chaque match porte deux drapeaux « déjà notifié ? » ; le cron
-- /api/cron/match-digests envoie un récap groupé puis les passe à true.
--
-- À lancer dans l'éditeur SQL de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

alter table matches add column if not exists adoptant_notified boolean default false;
alter table matches add column if not exists shelter_notified  boolean default false;

-- IMPORTANT : tous les matchs DÉJÀ existants ont été notifiés par l'ancien
-- système (un email par swipe). On les marque comme notifiés pour éviter que
-- le cron n'envoie un récap géant sur tout l'historique.
update matches set adoptant_notified = true, shelter_notified = true
  where adoptant_notified = false or shelter_notified = false;

-- Le cron ne balaie que les matchs non notifiés : index partiel léger.
create index if not exists matches_pending_notif_idx on matches (timestamp)
  where adoptant_notified = false or shelter_notified = false;
