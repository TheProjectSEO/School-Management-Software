-- ============================================
-- QUIZ QUESTIONS SYSTEM
-- Migration for quiz taking functionality
-- ============================================

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
  points INTEGER NOT NULL DEFAULT 1,
  correct_answer TEXT, -- For auto-grading (stores option_id for MC, 'true'/'false' for T/F, text for short answer)
  explanation TEXT, -- Shown after submission
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer options for multiple choice questions
CREATE TABLE IF NOT EXISTS answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Student answers for each question
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES answer_options(id),
  text_answer TEXT, -- For short answer questions
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- Add time tracking columns to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Add time limit to assessments
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_assessment_id ON questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(assessment_id, order_index);
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_submission_id ON student_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON student_answers(question_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions
-- Students can view questions for assessments in their enrolled courses
CREATE POLICY "Students can view questions for their assessments" ON questions
  FOR SELECT USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN enrollments e ON e.course_id = a.course_id
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for answer_options
-- Students can view answer options for questions they can access
CREATE POLICY "Students can view answer options" ON answer_options
  FOR SELECT USING (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN enrollments e ON e.course_id = a.course_id
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for student_answers
-- Students can insert their own answers
CREATE POLICY "Students can insert their answers" ON student_answers
  FOR INSERT WITH CHECK (
    submission_id IN (
      SELECT sub.id FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN profiles p ON p.id = st.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Students can view their own answers
CREATE POLICY "Students can view their own answers" ON student_answers
  FOR SELECT USING (
    submission_id IN (
      SELECT sub.id FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN profiles p ON p.id = st.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Students can update their own answers (while quiz is in progress)
CREATE POLICY "Students can update their own answers" ON student_answers
  FOR UPDATE USING (
    submission_id IN (
      SELECT sub.id FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN profiles p ON p.id = st.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND sub.status = 'pending' -- Only while quiz is in progress
    )
  );
