CREATE TABLE remotion_videos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  video_path TEXT NOT NULL,
  chat_id TEXT NOT NULL REFERENCES interactive_chats(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX remotion_videos_created_at_idx ON remotion_videos(created_at DESC);
CREATE INDEX remotion_videos_chat_id_idx ON remotion_videos(chat_id);
