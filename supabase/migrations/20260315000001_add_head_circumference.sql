-- Add head circumference tracking to baby_logs
ALTER TABLE baby_logs ADD COLUMN IF NOT EXISTS head_circumference_cm NUMERIC(5,2);

-- Update log_type check constraint to include 'head_circumference'
ALTER TABLE baby_logs DROP CONSTRAINT IF EXISTS baby_logs_log_type_check;
ALTER TABLE baby_logs ADD CONSTRAINT baby_logs_log_type_check
  CHECK (log_type IN ('feeding', 'diaper', 'weight', 'height', 'head_circumference'));
