-- Add permission_mode column to interactive_chats
-- Modes: 'plan' (read-only), 'auto-accept' (standard), 'dangerous' (skip all permissions)
ALTER TABLE interactive_chats
  ADD COLUMN permission_mode TEXT NOT NULL DEFAULT 'dangerous'
  CHECK (permission_mode IN ('plan', 'auto-accept', 'dangerous'));
