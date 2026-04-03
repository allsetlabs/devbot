-- Create baby_logs table
CREATE TABLE IF NOT EXISTS baby_logs (
  id TEXT PRIMARY KEY,
  log_type TEXT NOT NULL CHECK (log_type IN ('feeding', 'diaper')),
  feeding_start_at TIMESTAMPTZ,
  feeding_end_at TIMESTAMPTZ,
  feeding_ml INTEGER,
  diaper_wet_pct INTEGER CHECK (diaper_wet_pct IN (25, 50, 75, 100)),
  diaper_poop TEXT CHECK (diaper_poop IN ('small', 'large')),
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS baby_logs_log_type_idx ON baby_logs (log_type);
CREATE INDEX IF NOT EXISTS baby_logs_logged_at_idx ON baby_logs (logged_at DESC);
