-- Re-add terminal_type column with mosh support (default: mosh)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS terminal_type TEXT NOT NULL DEFAULT 'mosh'
  CHECK (terminal_type IN ('xterm', 'mosh'));

-- Add mosh-specific columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS mosh_key TEXT,
  ADD COLUMN IF NOT EXISTS mosh_udp_port INTEGER;
