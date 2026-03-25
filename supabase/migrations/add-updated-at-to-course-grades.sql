-- Add updated_at column to course_grades
ALTER TABLE course_grades
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
