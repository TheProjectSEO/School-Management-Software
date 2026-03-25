-- Fix grading_periods table: add all columns the application expects
-- Run this in the Supabase SQL Editor

-- 1. Add is_active column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_periods' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE grading_periods ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Add order column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_periods' AND column_name = 'order'
  ) THEN
    ALTER TABLE grading_periods ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Add academic_year_id column (FK to academic_years)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_periods' AND column_name = 'academic_year_id'
  ) THEN
    ALTER TABLE grading_periods ADD COLUMN academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add DEFAULT to period_number so inserts without it don't fail
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_periods' AND column_name = 'period_number'
  ) THEN
    ALTER TABLE grading_periods ALTER COLUMN period_number SET DEFAULT 1;
  END IF;
END $$;

-- 5. Populate order from quarter name for existing rows
UPDATE grading_periods SET "order" = CASE
  WHEN name ILIKE '%first%'  OR name ILIKE '%1st%' OR name ILIKE 'q1' THEN 1
  WHEN name ILIKE '%second%' OR name ILIKE '%2nd%' OR name ILIKE 'q2' THEN 2
  WHEN name ILIKE '%third%'  OR name ILIKE '%3rd%' OR name ILIKE 'q3' THEN 3
  WHEN name ILIKE '%fourth%' OR name ILIKE '%4th%' OR name ILIKE 'q4' THEN 4
  ELSE 0
END
WHERE "order" = 0;
