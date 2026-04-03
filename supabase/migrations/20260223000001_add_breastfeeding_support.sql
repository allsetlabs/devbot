-- Add feeding type (bottle or breast) and breast side columns
ALTER TABLE baby_logs ADD COLUMN IF NOT EXISTS feeding_type TEXT CHECK (feeding_type IN ('bottle', 'breast'));
ALTER TABLE baby_logs ADD COLUMN IF NOT EXISTS breast_side TEXT CHECK (breast_side IN ('left', 'right', 'both'));

-- Backfill existing feeding logs as bottle (they all have feedingMl)
UPDATE baby_logs SET feeding_type = 'bottle' WHERE log_type = 'feeding' AND feeding_type IS NULL;
