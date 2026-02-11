-- Add missing 'explanation' column to teacher_assessment_questions
-- The column was defined in the original CREATE TABLE migration but may not exist in the live DB
ALTER TABLE teacher_assessment_questions
  ADD COLUMN IF NOT EXISTS explanation TEXT;
