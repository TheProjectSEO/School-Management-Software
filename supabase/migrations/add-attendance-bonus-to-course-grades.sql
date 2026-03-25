-- Add attendance_bonus column to course_grades
-- Perfect attendance (100% rate in the grading period) = +10 points bonus
-- Run this in the Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_grades' AND column_name = 'attendance_bonus'
  ) THEN
    ALTER TABLE course_grades ADD COLUMN attendance_bonus NUMERIC(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
