-- Link enrollments to academic year and grading periods
-- Run this in the Supabase SQL Editor

-- 1. Add academic_year_id to enrollments (nullable — older records may not have it)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'academic_year_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add status column if missing (gradebook filters by status = 'active')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'status'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- 3. Backfill academic_year_id on existing enrollments using the current academic year
UPDATE enrollments
SET academic_year_id = (
  SELECT id FROM academic_years
  WHERE is_current = true
  LIMIT 1
)
WHERE academic_year_id IS NULL;

-- 4. Create index for fast gradebook queries
CREATE INDEX IF NOT EXISTS idx_enrollments_academic_year
  ON enrollments (academic_year_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status
  ON enrollments (course_id, status);

-- 5. Verify: show enrollment counts per academic year
SELECT
  ay.name AS academic_year,
  COUNT(e.id) AS enrolled_students
FROM enrollments e
LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
GROUP BY ay.name
ORDER BY ay.name DESC;
