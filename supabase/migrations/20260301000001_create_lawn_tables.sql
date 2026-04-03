-- Create lawn_profiles table
CREATE TABLE IF NOT EXISTS lawn_profiles (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  grass_type TEXT NOT NULL,
  sqft INTEGER,
  climate_zone TEXT,
  sun_exposure TEXT CHECK (sun_exposure IS NULL OR sun_exposure IN ('full_sun', 'partial_shade', 'full_shade')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lawn_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lawn_profiles_updated_at
  BEFORE UPDATE ON lawn_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_lawn_profiles_updated_at();

-- Create lawn_plans table
CREATE TABLE IF NOT EXISTS lawn_plans (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES lawn_profiles(id) ON DELETE CASCADE,
  chat_id TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  plan_data JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lawn_plans_profile_id_idx ON lawn_plans(profile_id);
CREATE INDEX lawn_plans_status_idx ON lawn_plans(status);
