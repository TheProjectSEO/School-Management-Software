-- Add missing `order` column to grading_periods table
-- Run this in the Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_periods' AND column_name = 'order'
  ) THEN
    ALTER TABLE grading_periods ADD COLUMN "order" INTEGER DEFAULT 0;

    -- Populate order from quarter name for existing rows
    UPDATE grading_periods SET "order" = CASE
      WHEN name ILIKE '%first%'   OR name ILIKE '%1st%'  OR name ILIKE 'q1' THEN 1
      WHEN name ILIKE '%second%'  OR name ILIKE '%2nd%'  OR name ILIKE 'q2' THEN 2
      WHEN name ILIKE '%third%'   OR name ILIKE '%3rd%'  OR name ILIKE 'q3' THEN 3
      WHEN name ILIKE '%fourth%'  OR name ILIKE '%4th%'  OR name ILIKE 'q4' THEN 4
      ELSE 0
    END;
  END IF;
END $$;
