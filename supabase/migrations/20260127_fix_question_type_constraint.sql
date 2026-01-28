-- Fix question_type constraint to include 'multiple_choice'
-- The app uses 'multiple_choice' but the current constraint doesn't include it

-- Drop the existing constraint
ALTER TABLE teacher_assessment_questions
DROP CONSTRAINT IF EXISTS teacher_assessment_questions_question_type_check;

-- Add the correct constraint with all needed types
ALTER TABLE teacher_assessment_questions
ADD CONSTRAINT teacher_assessment_questions_question_type_check
CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_blank', 'matching'));

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Question type constraint updated to include: multiple_choice, true_false, short_answer, essay, fill_in_blank, matching';
END $$;
