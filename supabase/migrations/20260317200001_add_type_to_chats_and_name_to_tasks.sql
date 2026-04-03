-- Add type column to interactive_chats for categorizing chat sources
-- Values: 'Manual' (user-created), scheduler names like 'Lawn Care', 'Baby Log', etc.
ALTER TABLE interactive_chats ADD COLUMN type TEXT NOT NULL DEFAULT 'Manual';
CREATE INDEX idx_interactive_chats_type ON interactive_chats(type);

-- Add name column to scheduled_tasks for display and chat type derivation
ALTER TABLE scheduled_tasks ADD COLUMN name TEXT;

-- Add chat_id to task_runs to link scheduler runs to chat sessions
ALTER TABLE task_runs ADD COLUMN chat_id TEXT REFERENCES interactive_chats(id) ON DELETE SET NULL;
CREATE INDEX idx_task_runs_chat_id ON task_runs(chat_id);
