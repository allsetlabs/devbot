-- Create task_runs table to track each execution of a scheduled task
CREATE TABLE task_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
  run_index INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  output_file TEXT,
  error_message TEXT,
  UNIQUE(task_id, run_index)
);

-- Index for efficient queries
CREATE INDEX task_runs_task_id_idx ON task_runs(task_id);
CREATE INDEX task_runs_task_run_idx ON task_runs(task_id, run_index DESC);
