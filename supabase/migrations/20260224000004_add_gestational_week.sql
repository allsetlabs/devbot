-- Add gestational week column to baby_profiles
ALTER TABLE baby_profiles
  ADD COLUMN gestational_week numeric(3,1)
  CHECK (gestational_week IS NULL OR (gestational_week >= 20 AND gestational_week <= 42));
