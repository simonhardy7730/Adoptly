-- Demande refuge (Fondation Sky, 27/07/2026) :
-- 1) Ajouter le sexe de l'animal (mâle / femelle), absent jusqu'ici.
-- 2) Garantir que la description « histoire » n'a aucune limite de longueur
--    côté base (le front passe de 1000 à 3000 caractères).

ALTER TABLE animals ADD COLUMN IF NOT EXISTS sex text;

-- Sécurité : s'assurer que 'story' est bien un type sans limite de longueur.
-- No-op si la colonne est déjà en 'text'.
ALTER TABLE animals ALTER COLUMN story TYPE text;
