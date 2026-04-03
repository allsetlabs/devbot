-- Remove terminal_type column (xterm is now the only terminal type)
ALTER TABLE public.sessions DROP COLUMN IF EXISTS terminal_type;
