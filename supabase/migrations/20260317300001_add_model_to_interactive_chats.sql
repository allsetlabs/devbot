-- Add model column to interactive_chats for per-chat Claude model selection
ALTER TABLE interactive_chats
ADD COLUMN model TEXT NOT NULL DEFAULT 'sonnet';

-- Add check constraint for valid model values
ALTER TABLE interactive_chats
ADD CONSTRAINT interactive_chats_model_check CHECK (model IN ('opus', 'sonnet', 'haiku'));
