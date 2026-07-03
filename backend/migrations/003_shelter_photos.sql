-- Add multi-photo support for shelter profiles
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS description_photos jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single photo to the array
UPDATE shelters
SET description_photos = jsonb_build_array(description_photo_url)
WHERE description_photo_url IS NOT NULL
  AND (description_photos IS NULL OR description_photos = '[]'::jsonb);
