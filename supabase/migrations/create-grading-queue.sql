-- Create teacher_grading_queue table for manual grading of essay/open-ended questions
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.teacher_grading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'essay',
  question_text TEXT,
  student_response TEXT,
  max_points INTEGER NOT NULL DEFAULT 1,
  points_awarded INTEGER,
  feedback TEXT,
  rubric_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'graded', 'flagged')),
  priority INTEGER NOT NULL DEFAULT 0,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tgq_submission_question_unique UNIQUE (submission_id, question_id),
  CONSTRAINT tgq_points_valid CHECK (
    points_awarded IS NULL OR (points_awarded >= 0 AND points_awarded <= max_points)
  )
);

CREATE INDEX IF NOT EXISTS idx_tgq_status ON public.teacher_grading_queue(status);
CREATE INDEX IF NOT EXISTS idx_tgq_submission ON public.teacher_grading_queue(submission_id);
CREATE INDEX IF NOT EXISTS idx_tgq_priority ON public.teacher_grading_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tgq_composite ON public.teacher_grading_queue(status, priority DESC, created_at ASC);
