-- Fix grading flow: add missing columns to submissions table
-- and relax the status CHECK on teacher_grading_queue
-- Safe to run multiple times.

-- 1. Add graded_by to submissions (may be missing — was causing gradeSubmission() to fail)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'graded_by'
  ) THEN
    ALTER TABLE submissions ADD COLUMN graded_by UUID;
  END IF;
END $$;

-- 2. Add graded_at to submissions (may be missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'graded_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN graded_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Add released_at to submissions (required by releaseSubmission())
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'released_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN released_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Add released_by to submissions (required by releaseSubmission())
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'released_by'
  ) THEN
    ALTER TABLE submissions ADD COLUMN released_by UUID;
  END IF;
END $$;

-- 5. Drop and recreate the status CHECK on teacher_grading_queue to allow 'completed' and 'in_review'
--    The current constraint only allows ('pending', 'graded', 'flagged').
--    We need 'completed' for released grades and 'in_review' for in-progress grading.
DO $$ BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'teacher_grading_queue'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
  ) THEN
    ALTER TABLE teacher_grading_queue DROP CONSTRAINT IF EXISTS teacher_grading_queue_status_check;
  END IF;

  -- Add updated constraint with all valid statuses
  ALTER TABLE teacher_grading_queue
    ADD CONSTRAINT teacher_grading_queue_status_check
    CHECK (status IN ('pending', 'in_review', 'graded', 'flagged', 'completed'));
END $$;

-- Verify
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='submissions' AND column_name='graded_by') as submissions_graded_by,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='submissions' AND column_name='released_at') as submissions_released_at,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='teacher_grading_queue' AND constraint_type='CHECK') as queue_check_constraints;
