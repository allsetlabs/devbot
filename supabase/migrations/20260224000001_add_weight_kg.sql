-- Add weight_kg and height_cm columns to baby_logs for growth tracking
ALTER TABLE baby_logs ADD COLUMN weight_kg numeric(5, 2) DEFAULT NULL;
ALTER TABLE baby_logs ADD COLUMN height_cm numeric(5, 1) DEFAULT NULL;

-- Add 'weight' and 'height' to log_type check constraint
ALTER TABLE baby_logs DROP CONSTRAINT IF EXISTS baby_logs_log_type_check;
ALTER TABLE baby_logs ADD CONSTRAINT baby_logs_log_type_check CHECK (log_type IN ('feeding', 'diaper', 'weight', 'height'));
