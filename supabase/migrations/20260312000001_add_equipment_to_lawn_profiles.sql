-- Add equipment preference fields to lawn_profiles
ALTER TABLE lawn_profiles
  ADD COLUMN IF NOT EXISTS application_method TEXT CHECK (application_method IS NULL OR application_method IN ('spreader', 'sprayer')),
  ADD COLUMN IF NOT EXISTS equipment_model TEXT;
