-- Create interactive_chats table for Claude Code interactive chat sessions
CREATE TABLE interactive_chats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'New Chat',
  claude_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries by creation date
CREATE INDEX interactive_chats_created_at_idx ON interactive_chats (created_at DESC);
