-- Enables reliable upsert with onConflict: 'student_id,course_id,grading_period_id'
-- Run in Supabase SQL Editor after deploying code changes.
CREATE UNIQUE INDEX IF NOT EXISTS course_grades_student_course_period_unique
  ON course_grades(student_id, course_id, grading_period_id);
