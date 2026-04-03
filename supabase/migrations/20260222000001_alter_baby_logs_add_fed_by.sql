-- Add fed_by column to track who performed the care (feeding or diaper change)
ALTER TABLE baby_logs ADD COLUMN IF NOT EXISTS fed_by TEXT;
