-- ============================================================================
-- Create student_answers table if it doesn't exist
-- This table stores individual student answers for each submission question.
-- The table was referenced by code but never created in migrations, causing
-- silent upsert failures and empty answers in the teacher grading view.
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  selected_option_id UUID,
  text_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_answers_submission ON student_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question ON student_answers(question_id);

-- Enable RLS
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by API routes and DAL)
DROP POLICY IF EXISTS "Service role full access to student_answers" ON student_answers;
CREATE POLICY "Service role full access to student_answers"
ON student_answers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Students can view their own answers
DROP POLICY IF EXISTS "Students can view own answers" ON student_answers;
CREATE POLICY "Students can view own answers"
ON student_answers FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    WHERE s.student_id IN (
      SELECT st.id FROM students st
      JOIN school_profiles sp ON sp.id = st.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- Create teacher_grading_queue table if it doesn't exist
-- Stores subjective questions queued for teacher review after student submits.
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_grading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_type VARCHAR(20),
  question_text TEXT,
  student_response TEXT,
  max_points INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_grading_queue_submission ON teacher_grading_queue(submission_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grading_queue_status ON teacher_grading_queue(status);

-- Enable RLS
ALTER TABLE teacher_grading_queue ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to teacher_grading_queue" ON teacher_grading_queue;
CREATE POLICY "Service role full access to teacher_grading_queue"
ON teacher_grading_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
