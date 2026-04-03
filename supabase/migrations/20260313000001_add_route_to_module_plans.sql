-- Add route column to module_plans for categorizing plans by module/subpath
ALTER TABLE module_plans ADD COLUMN IF NOT EXISTS route text DEFAULT '';
