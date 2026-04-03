-- Create sessions table for DevBot
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'New Chat',
  terminal_type TEXT NOT NULL CHECK (terminal_type IN ('ttyd', 'xterm')),
  port INTEGER NOT NULL,
  ws_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Create index for faster queries by creation date
CREATE INDEX sessions_created_at_idx ON sessions (created_at DESC);
