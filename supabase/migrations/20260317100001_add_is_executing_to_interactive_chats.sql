-- Track execution state in DB so we can detect interrupted chats after backend restart
ALTER TABLE interactive_chats ADD COLUMN is_executing BOOLEAN NOT NULL DEFAULT FALSE;
