-- Baby profiles: stable/immutable details about a baby
CREATE TABLE baby_profiles (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  place_of_birth TEXT,         -- hospital or specific place
  city_of_birth TEXT,
  state_of_birth TEXT,
  country_of_birth TEXT,
  citizenship TEXT,
  father_name TEXT,
  mother_name TEXT,
  birth_weight_kg NUMERIC(5,3),  -- weight at birth in kg
  birth_height_cm NUMERIC(5,2),  -- height at birth in cm
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_baby_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER baby_profiles_updated_at
  BEFORE UPDATE ON baby_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_baby_profiles_updated_at();
