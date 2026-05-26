-- Migration 002 : colonnes reset_token pour mot de passe oublié
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE adoptants
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

ALTER TABLE shelters
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Index pour accélérer la recherche par token
CREATE INDEX IF NOT EXISTS idx_adoptants_reset_token ON adoptants(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shelters_reset_token  ON shelters(reset_token)  WHERE reset_token IS NOT NULL;
