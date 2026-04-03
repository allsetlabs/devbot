-- Merge diaper and potty log types into a single diaper type
-- Update any existing 'potty' entries to 'diaper'
UPDATE baby_logs SET log_type = 'diaper' WHERE log_type = 'potty';

-- Update the check constraint to remove 'potty' as a valid type
ALTER TABLE baby_logs DROP CONSTRAINT IF EXISTS baby_logs_log_type_check;
ALTER TABLE baby_logs ADD CONSTRAINT baby_logs_log_type_check CHECK (log_type IN ('feeding', 'diaper'));
