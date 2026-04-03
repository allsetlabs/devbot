-- Add detailed location columns to birth_time_entries
ALTER TABLE birth_time_entries ADD COLUMN city TEXT;
ALTER TABLE birth_time_entries ADD COLUMN state TEXT;
ALTER TABLE birth_time_entries ADD COLUMN country TEXT;
ALTER TABLE birth_time_entries ADD COLUMN full_address TEXT;
