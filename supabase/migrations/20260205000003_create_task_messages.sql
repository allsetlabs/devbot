-- Create task_messages table to store parsed Claude messages from each run
CREATE TABLE task_messages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES task_runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user', 'assistant', 'tool_use', 'tool_result', 'system')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, sequence)
);

-- Index for efficient queries
CREATE INDEX task_messages_run_id_idx ON task_messages(run_id);
