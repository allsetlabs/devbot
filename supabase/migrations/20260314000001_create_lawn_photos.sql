-- Lawn photo journal for tracking lawn progress over time
CREATE TABLE lawn_photos (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES lawn_profiles(id) ON DELETE CASCADE,
  application_order INTEGER, -- nullable link to which plan application this photo relates to
  file_path TEXT NOT NULL, -- server-side path to the uploaded image
  caption TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- when the photo was taken/captured
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lawn_photos_profile_id ON lawn_photos(profile_id);
CREATE INDEX idx_lawn_photos_taken_at ON lawn_photos(profile_id, taken_at DESC);
