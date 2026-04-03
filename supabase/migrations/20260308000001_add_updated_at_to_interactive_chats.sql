-- Add updated_at column to interactive_chats for sorting by last activity
ALTER TABLE interactive_chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: set updated_at = created_at for existing rows
UPDATE interactive_chats SET updated_at = created_at WHERE updated_at = NOW();

-- Index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_interactive_chats_updated_at ON interactive_chats (updated_at DESC);
