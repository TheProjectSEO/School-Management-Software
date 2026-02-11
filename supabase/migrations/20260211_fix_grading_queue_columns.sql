-- ============================================================================
-- Fix teacher_grading_queue: add missing columns and fix graded_by FK
-- The graded_by column had an incorrect FK to school_profiles instead of
-- teacher_profiles, causing "Key not present" errors when grading queue items.
-- ============================================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_grading_queue' AND column_name = 'points_awarded') THEN
    ALTER TABLE teacher_grading_queue ADD COLUMN points_awarded INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_grading_queue' AND column_name = 'feedback') THEN
    ALTER TABLE teacher_grading_queue ADD COLUMN feedback TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_grading_queue' AND column_name = 'rubric_json') THEN
    ALTER TABLE teacher_grading_queue ADD COLUMN rubric_json JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_grading_queue' AND column_name = 'graded_at') THEN
    ALTER TABLE teacher_grading_queue ADD COLUMN graded_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_grading_queue' AND column_name = 'graded_by') THEN
    ALTER TABLE teacher_grading_queue ADD COLUMN graded_by UUID REFERENCES teacher_profiles(id);
  END IF;
END $$;

-- Fix graded_by FK: drop the incorrect one (school_profiles) and add the correct one (teacher_profiles)
DO $$
BEGIN
  -- Drop the incorrect FK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teacher_grading_queue_graded_by_fkey'
    AND table_name = 'teacher_grading_queue'
  ) THEN
    ALTER TABLE teacher_grading_queue DROP CONSTRAINT teacher_grading_queue_graded_by_fkey;
  END IF;

  -- Add the correct FK to teacher_profiles
  ALTER TABLE teacher_grading_queue
    ADD CONSTRAINT teacher_grading_queue_graded_by_fkey
    FOREIGN KEY (graded_by) REFERENCES teacher_profiles(id);
END $$;
