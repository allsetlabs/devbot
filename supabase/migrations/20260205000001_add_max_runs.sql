-- Add max_runs column to scheduled_tasks
-- NULL means infinite runs, 1 means run once, etc.
ALTER TABLE scheduled_tasks ADD COLUMN max_runs INTEGER DEFAULT NULL;

-- Remove deprecated columns (current_port and is_running are no longer needed)
-- These columns may not exist depending on migration history
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_tasks' AND column_name = 'current_port') THEN
    ALTER TABLE scheduled_tasks DROP COLUMN current_port;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_tasks' AND column_name = 'is_running') THEN
    ALTER TABLE scheduled_tasks DROP COLUMN is_running;
  END IF;
END $$;
