-- Add grade_level and is_active columns to courses table if they don't exist
-- These are needed for Grade 1-6 elementary subject management

DO $$
BEGIN
  -- Add grade_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE courses ADD COLUMN grade_level TEXT;
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add credits column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'credits'
  ) THEN
    ALTER TABLE courses ADD COLUMN credits INTEGER;
  END IF;
END $$;

-- Create index on grade_level for filtering
CREATE INDEX IF NOT EXISTS idx_courses_grade_level ON courses(grade_level);
CREATE INDEX IF NOT EXISTS idx_courses_school_grade ON courses(school_id, grade_level);
