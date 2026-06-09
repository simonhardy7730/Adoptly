-- ============================================================================
-- ADOPTLY — Activation RLS (Row Level Security) sur toutes les tables
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Coller → Run
--
-- Le backend Express utilise la clé service_role qui BYPASS le RLS,
-- donc aucune route backend ne sera affectée par ces changements.
-- Seul l'accès DIRECT via la clé anon (exposée côté frontend) sera restreint.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Activer RLS sur TOUTES les tables
-- (Par défaut, RLS activé = TOUT bloqué, sauf policies explicites)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoptants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_matches ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Révoquer les permissions par défaut de Supabase
-- (Supabase donne INSERT/UPDATE/DELETE à anon + authenticated par défaut)
-- ──────────────────────────────────────────────────────────────────────────────

-- Tables PRIVÉES : révoquer TOUT accès direct
REVOKE ALL ON adoptants FROM anon, authenticated;
REVOKE ALL ON matches FROM anon, authenticated;
REVOKE ALL ON messages FROM anon, authenticated;
REVOKE ALL ON fosters FROM anon, authenticated;
REVOKE ALL ON foster_matches FROM anon, authenticated;

-- Tables PUBLIQUES : révoquer l'écriture, garder la lecture
REVOKE INSERT, UPDATE, DELETE ON animals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON articles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON shelters FROM anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Protéger les colonnes sensibles de shelters
-- (On expose uniquement les infos publiques, PAS le password_hash ni reset_token)
-- ──────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON shelters FROM anon, authenticated;
GRANT SELECT (id, name, email, phone, address, latitude, longitude, created_at, logo_url, description, description_photo_url) ON shelters TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Créer les policies de lecture publique
-- (Permet à n'importe qui de VOIR les animaux, articles et refuges)
-- ──────────────────────────────────────────────────────────────────────────────

-- Animaux : visibles par tous (page d'accueil, swipe, recherche)
CREATE POLICY "Lecture publique des animaux"
  ON animals FOR SELECT
  TO anon, authenticated
  USING (true);

-- Articles : visibles par tous (blog public)
CREATE POLICY "Lecture publique des articles"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Refuges : profil public visible (nom, adresse, téléphone)
CREATE POLICY "Lecture publique des refuges"
  ON shelters FOR SELECT
  TO anon, authenticated
  USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Vérification
-- ──────────────────────────────────────────────────────────────────────────────
-- Ces requêtes vérifient que RLS est bien activé sur toutes les tables.

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('animals','articles','shelters','adoptants','matches','messages','fosters','foster_matches')
ORDER BY tablename;
