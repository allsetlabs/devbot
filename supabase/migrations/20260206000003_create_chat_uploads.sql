-- Create chat_uploads table to track uploaded files per chat
CREATE TABLE chat_uploads (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES interactive_chats(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX chat_uploads_chat_id_idx ON chat_uploads(chat_id);
