-- ============================================================
-- DepEd Assessment Types & Grading Columns Migration
-- Run in Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- ============================================================

-- 0. Safety: neutralize any rows with unrecognized type values so the
--    ADD CONSTRAINT below cannot fail due to existing bad data.
--    Maps anything outside our known list to 'quiz' (Performance Task).
UPDATE assessments
  SET type = 'quiz'
  WHERE type NOT IN (
    'essay', 'assignment',
    'short_quiz', 'long_quiz', 'quiz', 'project', 'participation',
    'exam', 'midterm', 'final'
  );

-- 1. Drop the old assessments_type_check constraint (whatever it currently is).
--    IF NOT EXISTS means this is safe even if it was never created.
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check;

-- 2. Add new constraint with all DepEd-aligned types.
--    DROP above ensures this never hits "already exists".
--    Written Work:         essay, assignment
--    Performance Task:     short_quiz, long_quiz, quiz, project, participation
--    Quarterly Assessment: exam, midterm, final
ALTER TABLE assessments
  ADD CONSTRAINT assessments_type_check
  CHECK (type IN (
    'essay', 'assignment',
    'short_quiz', 'long_quiz', 'quiz', 'project', 'participation',
    'exam', 'midterm', 'final'
  ));

-- 3. Add word count columns for essay assessments (idempotent).
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS min_word_count INT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_word_count INT;

-- 4. Add unique index on course_grades required for upsert
--    (onConflict: 'student_id,course_id,grading_period_id').
--    IF NOT EXISTS makes this idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS course_grades_student_course_period_unique
  ON course_grades(student_id, course_id, grading_period_id);

-- 5. Add attendance_bonus column if it does not exist yet
--    (created by add-attendance-bonus-to-course-grades.sql; included here for completeness).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_grades' AND column_name = 'attendance_bonus'
  ) THEN
    ALTER TABLE course_grades ADD COLUMN attendance_bonus NUMERIC(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 6. Backfill deped_component for any assessments that are missing it.
--    Only updates rows where deped_component is NULL or empty; leaves correct values alone.
UPDATE assessments
  SET deped_component = 'written_work'
  WHERE type IN ('essay', 'assignment')
    AND (deped_component IS NULL OR deped_component = '');

UPDATE assessments
  SET deped_component = 'performance_task'
  WHERE type IN ('short_quiz', 'long_quiz', 'quiz', 'project', 'participation')
    AND (deped_component IS NULL OR deped_component = '');

UPDATE assessments
  SET deped_component = 'quarterly_assessment'
  WHERE type IN ('exam', 'midterm', 'final')
    AND (deped_component IS NULL OR deped_component = '');

-- ============================================================
-- Verification (uncomment and run separately to confirm):
-- ============================================================

-- 1. Constraint definition — should list all 10 types:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'assessments'::regclass AND conname = 'assessments_type_check';

-- 2. Word count columns — should return 2 rows:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'assessments'
-- AND column_name IN ('min_word_count', 'max_word_count');

-- 3. Unique index — should return 1 row:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'course_grades'
-- AND indexname = 'course_grades_student_course_period_unique';

-- 4. attendance_bonus column — should return 1 row:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'course_grades' AND column_name = 'attendance_bonus';
