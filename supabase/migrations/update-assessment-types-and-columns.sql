-- ============================================================
-- DepEd Assessment Types & Grading Columns Migration
-- Run in Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Drop the old assessments_type_check constraint
--    (only allowed: quiz|exam|assignment|project|midterm|final)
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check;

-- 2. Add new constraint with all DepEd-aligned types:
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

-- 3. Add word count columns for essay assessments (idempotent)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS min_word_count INT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_word_count INT;

-- 4. Add unique index on course_grades for reliable upsert
--    (required by: onConflict: 'student_id,course_id,grading_period_id')
CREATE UNIQUE INDEX IF NOT EXISTS course_grades_student_course_period_unique
  ON course_grades(student_id, course_id, grading_period_id);

-- 5. Backfill deped_component for existing assessments that are missing it
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
-- Verification queries (run after migration to confirm):
-- ============================================================

-- Check constraint definition:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'assessments'::regclass AND conname = 'assessments_type_check';

-- Check word count columns exist (should return 2 rows):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'assessments'
-- AND column_name IN ('min_word_count', 'max_word_count');

-- Check unique index exists (should return 1 row):
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'course_grades'
-- AND indexname = 'course_grades_student_course_period_unique';
