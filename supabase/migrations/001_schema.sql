-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Adoptants
CREATE TABLE IF NOT EXISTS adoptants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  questionnaire_answers JSONB,
  swiped_animals JSONB DEFAULT '[]'::jsonb
);

-- Shelters
CREATE TABLE IF NOT EXISTS shelters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Animals
CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelter_id UUID NOT NULL REFERENCES shelters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'rabbit', 'guinea_pig', 'other')),
  breed TEXT,
  age INTEGER, -- in months
  size TEXT CHECK (size IN ('small', 'medium', 'large')),
  temperament TEXT CHECK (temperament IN ('calm', 'playful', 'energetic', 'mixed')),
  special_needs TEXT,
  story TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  requirements JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'adopted'))
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adoptant_id UUID NOT NULL REFERENCES adoptants(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  swipe_direction TEXT NOT NULL CHECK (swipe_direction IN ('left', 'right')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  contacted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'contacted', 'adopted', 'closed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_animals_shelter ON animals(shelter_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
CREATE INDEX IF NOT EXISTS idx_matches_adoptant ON matches(adoptant_id);
CREATE INDEX IF NOT EXISTS idx_matches_animal ON matches(animal_id);

-- ============================================================
-- STORAGE: Run these commands in your Supabase SQL editor
-- OR create the bucket manually in the Supabase dashboard:
--   Storage > New bucket > "animal-photos" > Public: true
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('animal-photos', 'animal-photos', true)
-- ON CONFLICT (id) DO NOTHING;
