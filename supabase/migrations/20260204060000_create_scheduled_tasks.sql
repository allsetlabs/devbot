-- Create scheduled_tasks table for the scheduler feature
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0
);

-- Index for efficient queries by status and next_run_at
CREATE INDEX IF NOT EXISTS scheduled_tasks_status_idx ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS scheduled_tasks_next_run_idx ON scheduled_tasks(next_run_at);
