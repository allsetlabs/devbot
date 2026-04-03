-- Increase weight_kg precision to 4 decimal places
ALTER TABLE baby_logs ALTER COLUMN weight_kg TYPE numeric(8, 4);
