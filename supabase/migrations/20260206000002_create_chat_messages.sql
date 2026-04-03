-- Create chat_messages table for interactive chat message history
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES interactive_chats(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user', 'assistant', 'tool_use', 'tool_result', 'system')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chat_id, sequence)
);

-- Index for efficient queries
CREATE INDEX chat_messages_chat_id_idx ON chat_messages(chat_id);
CREATE INDEX chat_messages_chat_sequence_idx ON chat_messages(chat_id, sequence);
