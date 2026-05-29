-- Table fosters
CREATE TABLE IF NOT EXISTS fosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  questionnaire_answers JSONB,
  swiped_animals JSONB DEFAULT '[]',
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonnes foster sur animals
ALTER TABLE animals ADD COLUMN IF NOT EXISTS needs_foster BOOLEAN DEFAULT false;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS foster_duration_days INTEGER;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS foster_reason TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS foster_expenses_covered BOOLEAN DEFAULT false;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS foster_special_care TEXT;

-- Table foster_matches
CREATE TABLE IF NOT EXISTS foster_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foster_id UUID NOT NULL REFERENCES fosters(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  swipe_direction TEXT NOT NULL CHECK (swipe_direction IN ('left', 'right')),
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'closed')),
  contacted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
