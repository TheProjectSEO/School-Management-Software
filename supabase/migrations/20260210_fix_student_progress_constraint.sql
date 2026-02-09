-- Ensure student_progress has the UNIQUE constraint on (student_id, lesson_id)
-- This is required for upsert operations to work correctly

-- First, clean up any duplicate rows (keep the one with highest progress)
DELETE FROM student_progress a
USING student_progress b
WHERE a.student_id = b.student_id
  AND a.lesson_id = b.lesson_id
  AND a.id < b.id
  AND a.progress_percent <= b.progress_percent;

-- Also clean remaining duplicates (keep most recent)
DELETE FROM student_progress a
USING student_progress b
WHERE a.student_id = b.student_id
  AND a.lesson_id = b.lesson_id
  AND a.id < b.id;

-- Add the unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_progress_student_id_lesson_id_key'
      AND conrelid = 'student_progress'::regclass
  ) THEN
    ALTER TABLE student_progress
      ADD CONSTRAINT student_progress_student_id_lesson_id_key
      UNIQUE (student_id, lesson_id);
  END IF;
END
$$;
