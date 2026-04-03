-- Add name and description columns to birth_time_entries
ALTER TABLE birth_time_entries ADD COLUMN name TEXT;
ALTER TABLE birth_time_entries ADD COLUMN description TEXT;
