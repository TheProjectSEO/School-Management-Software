-- Migration 012: Grading Queue System
-- Description: Creates a queue for items that need manual teacher review
-- Schema: n8n_content_creation

-- ============================================================================
-- TEACHER GRADING QUEUE TABLE
-- Purpose: Tracks questions/submissions that need manual grading by teachers
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_grading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.student_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  student_response TEXT,
  max_points INTEGER NOT NULL DEFAULT 1,
  awarded_points INTEGER,
  rubric_json JSONB,
  teacher_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'skipped')),
  priority INTEGER DEFAULT 0,
  graded_by UUID REFERENCES n8n_content_creation.profiles(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT max_points_positive CHECK (max_points > 0),
  CONSTRAINT awarded_points_valid CHECK (awarded_points IS NULL OR (awarded_points >= 0 AND awarded_points <= max_points)),
  UNIQUE(submission_id, question_id)
);

-- Indexes for performance
CREATE INDEX idx_teacher_grading_queue_status ON n8n_content_creation.teacher_grading_queue(status);
CREATE INDEX idx_teacher_grading_queue_submission ON n8n_content_creation.teacher_grading_queue(submission_id);
CREATE INDEX idx_teacher_grading_queue_priority ON n8n_content_creation.teacher_grading_queue(priority DESC, created_at ASC);
CREATE INDEX idx_teacher_grading_queue_grader ON n8n_content_creation.teacher_grading_queue(graded_by);
CREATE INDEX idx_teacher_grading_queue_composite ON n8n_content_creation.teacher_grading_queue(status, priority DESC, created_at ASC);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_grading_queue IS 'Queue system for questions requiring manual teacher review';
COMMENT ON COLUMN n8n_content_creation.teacher_grading_queue.status IS 'Queue item status: pending (awaiting review), in_review (being graded), completed (graded), skipped (excluded from grading)';
COMMENT ON COLUMN n8n_content_creation.teacher_grading_queue.priority IS 'Higher values appear first. Essays get priority over short answers.';
COMMENT ON COLUMN n8n_content_creation.teacher_grading_queue.rubric_json IS 'Grading rubric if applicable: {criteria: [{name, points, description}]}';

-- ============================================================================
-- ASSESSMENT QUESTIONS TABLE (if not exists)
-- Purpose: Stores questions for assessments
-- ============================================================================
CREATE TABLE IF NOT EXISTS n8n_content_creation.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES n8n_content_creation.assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false', 'short_answer', 'essay',
    'multiple_choice_single', 'multiple_choice_multi', 'matching',
    'fill_in_blank', 'ordering'
  )),
  choices_json JSONB,
  answer_key_json JSONB,
  points INTEGER DEFAULT 1,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[],
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT question_text_not_empty CHECK (length(question_text) > 0),
  CONSTRAINT points_positive CHECK (points > 0)
);

-- Indexes for assessment_questions
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON n8n_content_creation.assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON n8n_content_creation.assessment_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_order ON n8n_content_creation.assessment_questions(assessment_id, order_index);

-- Comments
COMMENT ON TABLE n8n_content_creation.assessment_questions IS 'Questions for assessments with answer keys';
COMMENT ON COLUMN n8n_content_creation.assessment_questions.choices_json IS 'Array of choice objects: [{"id": "a", "text": "Answer A"}]';
COMMENT ON COLUMN n8n_content_creation.assessment_questions.answer_key_json IS 'Answer key for auto-grading. Format varies by question type.';

-- ============================================================================
-- STUDENT ANSWERS TABLE (if not exists)
-- Purpose: Stores student answers to assessment questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS n8n_content_creation.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.student_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES n8n_content_creation.assessment_questions(id) ON DELETE CASCADE,
  selected_option_id TEXT,
  text_answer TEXT,
  file_attachments JSONB,
  is_correct BOOLEAN,
  points_earned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(submission_id, question_id)
);

-- Indexes for student_answers
CREATE INDEX IF NOT EXISTS idx_student_answers_submission ON n8n_content_creation.student_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question ON n8n_content_creation.student_answers(question_id);

-- Comments
COMMENT ON TABLE n8n_content_creation.student_answers IS 'Student responses to individual questions';
COMMENT ON COLUMN n8n_content_creation.student_answers.selected_option_id IS 'Selected option ID for MCQ/True-False questions';
COMMENT ON COLUMN n8n_content_creation.student_answers.text_answer IS 'Text response for short answer/essay questions';
COMMENT ON COLUMN n8n_content_creation.student_answers.is_correct IS 'Auto-graded correctness (null if requires manual grading)';

-- ============================================================================
-- STUDENT SUBMISSIONS TABLE UPDATE
-- Purpose: Ensure submissions table has necessary fields for grading
-- ============================================================================
DO $$
BEGIN
  -- Add score column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'n8n_content_creation'
    AND table_name = 'student_submissions'
    AND column_name = 'score'
  ) THEN
    ALTER TABLE n8n_content_creation.student_submissions
    ADD COLUMN score INTEGER;
  END IF;

  -- Add graded_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'n8n_content_creation'
    AND table_name = 'student_submissions'
    AND column_name = 'graded_at'
  ) THEN
    ALTER TABLE n8n_content_creation.student_submissions
    ADD COLUMN graded_at TIMESTAMPTZ;
  END IF;

  -- Add graded_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'n8n_content_creation'
    AND table_name = 'student_submissions'
    AND column_name = 'graded_by'
  ) THEN
    ALTER TABLE n8n_content_creation.student_submissions
    ADD COLUMN graded_by UUID REFERENCES n8n_content_creation.profiles(id);
  END IF;
END$$;

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================================================
CREATE TRIGGER update_teacher_grading_queue_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_grading_queue
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Get grading queue count for a teacher
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_grading_queue_count(
  p_teacher_id UUID,
  p_status TEXT DEFAULT 'pending'
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM n8n_content_creation.teacher_grading_queue gq
  INNER JOIN n8n_content_creation.student_submissions s ON gq.submission_id = s.id
  INNER JOIN n8n_content_creation.assessments a ON s.assessment_id = a.id
  WHERE a.created_by = p_teacher_id
    AND (p_status IS NULL OR gq.status = p_status);
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_grading_queue_count IS 'Returns count of items in grading queue for a teacher, optionally filtered by status';

-- ============================================================================
-- HELPER FUNCTION: Get next item in grading queue
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_next_grading_item(
  p_teacher_id UUID
)
RETURNS TABLE (
  queue_id UUID,
  submission_id UUID,
  question_id UUID,
  question_type TEXT,
  question_text TEXT,
  student_response TEXT,
  max_points INTEGER,
  student_name TEXT,
  assessment_title TEXT
) AS $$
  SELECT
    gq.id AS queue_id,
    gq.submission_id,
    gq.question_id,
    gq.question_type,
    gq.question_text,
    gq.student_response,
    gq.max_points,
    p.full_name AS student_name,
    a.title AS assessment_title
  FROM n8n_content_creation.teacher_grading_queue gq
  INNER JOIN n8n_content_creation.student_submissions s ON gq.submission_id = s.id
  INNER JOIN n8n_content_creation.assessments a ON s.assessment_id = a.id
  INNER JOIN n8n_content_creation.students st ON s.student_id = st.id
  INNER JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
  WHERE a.created_by = p_teacher_id
    AND gq.status = 'pending'
  ORDER BY gq.priority DESC, gq.created_at ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_next_grading_item IS 'Retrieves the next item in the grading queue for a teacher, sorted by priority and creation date';

-- ============================================================================
-- END OF MIGRATION 012
-- ============================================================================
