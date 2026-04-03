-- Create birth_time_entries table for recording baby born times
CREATE TABLE birth_time_entries (
  id TEXT PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries by recorded time
CREATE INDEX birth_time_entries_recorded_at_idx ON birth_time_entries (recorded_at DESC);
