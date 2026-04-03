-- Add archived_at column to interactive_chats for soft-archive support
ALTER TABLE interactive_chats ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-archived chats
CREATE INDEX idx_interactive_chats_archived_at ON interactive_chats (archived_at);
