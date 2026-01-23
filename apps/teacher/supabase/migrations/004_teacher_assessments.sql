-- Migration 004: Teacher Assessments & Question Banks
-- Description: Creates tables for question banks, randomization rules, and quiz snapshots
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER QUESTION BANKS TABLE
-- Purpose: Organizes question pools for random assessment generation
-- Links to: courses
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_question_banks_course ON n8n_content_creation.teacher_question_banks(course_id);
CREATE INDEX idx_teacher_question_banks_created_by ON n8n_content_creation.teacher_question_banks(created_by);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_question_banks IS 'Question pools for random assessment generation';
COMMENT ON COLUMN n8n_content_creation.teacher_question_banks.name IS 'Descriptive name for the question bank';

-- ============================================================================
-- TEACHER BANK QUESTIONS TABLE
-- Purpose: Individual questions within question banks
-- Links to: teacher_question_banks
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_question_banks(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  choices_json JSONB,
  answer_key_json JSONB,
  points INTEGER DEFAULT 1,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[],
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT question_text_not_empty CHECK (length(question_text) > 0),
  CONSTRAINT points_positive CHECK (points > 0),
  CONSTRAINT mcq_has_choices CHECK (
    question_type != 'multiple_choice' OR
    (choices_json IS NOT NULL AND jsonb_array_length(choices_json) > 0)
  ),
  CONSTRAINT true_false_choices CHECK (
    question_type != 'true_false' OR
    (choices_json IS NOT NULL AND jsonb_array_length(choices_json) = 2)
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_bank_questions_bank ON n8n_content_creation.teacher_bank_questions(bank_id);
CREATE INDEX idx_teacher_bank_questions_type ON n8n_content_creation.teacher_bank_questions(question_type);
CREATE INDEX idx_teacher_bank_questions_difficulty ON n8n_content_creation.teacher_bank_questions(difficulty);
CREATE INDEX idx_teacher_bank_questions_tags ON n8n_content_creation.teacher_bank_questions USING gin(tags);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_bank_questions IS 'Individual questions stored in question banks';
COMMENT ON COLUMN n8n_content_creation.teacher_bank_questions.choices_json IS 'Array of choice objects: [{"id": "a", "text": "Answer A", "is_correct": true}]';
COMMENT ON COLUMN n8n_content_creation.teacher_bank_questions.answer_key_json IS 'Correct answer(s) for auto-grading: {"correct_ids": ["a", "c"]} or {"correct_text": "answer"}';
COMMENT ON COLUMN n8n_content_creation.teacher_bank_questions.tags IS 'Tags for filtering (e.g., ["algebra", "equations", "chapter-3"])';
COMMENT ON COLUMN n8n_content_creation.teacher_bank_questions.explanation IS 'Explanation shown after student submits';

-- ============================================================================
-- TEACHER ASSESSMENT BANK RULES TABLE
-- Purpose: Defines randomization rules linking assessments to question banks
-- Links to: assessments, teacher_question_banks
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_assessment_bank_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES n8n_content_creation.assessments(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_question_banks(id) ON DELETE CASCADE,
  pick_count INTEGER NOT NULL DEFAULT 5,
  tag_filter TEXT[],
  difficulty_filter TEXT[],
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_choices BOOLEAN DEFAULT true,
  seed_mode TEXT DEFAULT 'per_student' CHECK (seed_mode IN ('per_student', 'per_attempt', 'fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT pick_count_positive CHECK (pick_count > 0),
  CONSTRAINT difficulty_filter_valid CHECK (
    difficulty_filter IS NULL OR
    difficulty_filter <@ ARRAY['easy', 'medium', 'hard']::TEXT[]
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_assessment_bank_rules_assessment ON n8n_content_creation.teacher_assessment_bank_rules(assessment_id);
CREATE INDEX idx_teacher_assessment_bank_rules_bank ON n8n_content_creation.teacher_assessment_bank_rules(bank_id);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_assessment_bank_rules IS 'Randomization rules for assessments using question banks';
COMMENT ON COLUMN n8n_content_creation.teacher_assessment_bank_rules.pick_count IS 'Number of questions to randomly select from bank';
COMMENT ON COLUMN n8n_content_creation.teacher_assessment_bank_rules.tag_filter IS 'Only include questions with these tags (OR logic)';
COMMENT ON COLUMN n8n_content_creation.teacher_assessment_bank_rules.difficulty_filter IS 'Only include questions with these difficulty levels';
COMMENT ON COLUMN n8n_content_creation.teacher_assessment_bank_rules.seed_mode IS 'Randomization strategy: per_student (same quiz), per_attempt (new quiz), or fixed (same for all)';

-- ============================================================================
-- TEACHER STUDENT QUIZ SNAPSHOTS TABLE
-- Purpose: Stores frozen/generated quiz for each student attempt
-- Links to: assessments, students
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_student_quiz_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES n8n_content_creation.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  questions_json JSONB NOT NULL,
  seed_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(assessment_id, student_id, attempt_number),
  CONSTRAINT attempt_number_positive CHECK (attempt_number > 0),
  CONSTRAINT questions_not_empty CHECK (jsonb_array_length(questions_json) > 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_student_quiz_snapshots_assessment ON n8n_content_creation.teacher_student_quiz_snapshots(assessment_id);
CREATE INDEX idx_teacher_student_quiz_snapshots_student ON n8n_content_creation.teacher_student_quiz_snapshots(student_id);
CREATE INDEX idx_teacher_student_quiz_snapshots_composite ON n8n_content_creation.teacher_student_quiz_snapshots(assessment_id, student_id, attempt_number);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_student_quiz_snapshots IS 'Frozen quiz instances generated per student/attempt';
COMMENT ON COLUMN n8n_content_creation.teacher_student_quiz_snapshots.questions_json IS 'Complete quiz structure: questions, shuffled choices, metadata';
COMMENT ON COLUMN n8n_content_creation.teacher_student_quiz_snapshots.seed_value IS 'Random seed used for generation (for reproducibility)';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_teacher_question_banks_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_question_banks
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_bank_questions_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_bank_questions
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Count questions in a bank matching filters
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.count_bank_questions(
  p_bank_id UUID,
  p_tag_filter TEXT[] DEFAULT NULL,
  p_difficulty_filter TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM n8n_content_creation.teacher_bank_questions
  WHERE bank_id = p_bank_id
    AND (p_tag_filter IS NULL OR tags && p_tag_filter)
    AND (p_difficulty_filter IS NULL OR difficulty = ANY(p_difficulty_filter));
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.count_bank_questions IS 'Counts questions in bank matching tag and difficulty filters';

-- ============================================================================
-- HELPER FUNCTION: Validate bank rule has enough questions
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.validate_bank_rule()
RETURNS TRIGGER AS $$
DECLARE
  available_count INTEGER;
BEGIN
  -- Count available questions
  SELECT count_bank_questions(
    NEW.bank_id,
    NEW.tag_filter,
    NEW.difficulty_filter
  ) INTO available_count;

  -- Check if we have enough questions
  IF available_count < NEW.pick_count THEN
    RAISE EXCEPTION 'Insufficient questions in bank. Need %, have % matching filters',
      NEW.pick_count, available_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_bank_rule_trigger
  BEFORE INSERT OR UPDATE ON n8n_content_creation.teacher_assessment_bank_rules
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.validate_bank_rule();

-- ============================================================================
-- HELPER FUNCTION: Generate quiz snapshot for a student
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.generate_quiz_snapshot(
  p_assessment_id UUID,
  p_student_id UUID,
  p_attempt_number INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_rule RECORD;
  v_questions JSONB := '[]'::JSONB;
  v_selected_questions JSONB;
  v_seed TEXT;
BEGIN
  -- Generate seed based on seed_mode
  v_seed := p_assessment_id::TEXT || '-' || p_student_id::TEXT || '-' || p_attempt_number::TEXT;

  -- Iterate through bank rules for this assessment
  FOR v_rule IN
    SELECT * FROM n8n_content_creation.teacher_assessment_bank_rules
    WHERE assessment_id = p_assessment_id
  LOOP
    -- Select random questions from bank (simplified - actual implementation needs proper randomization)
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question_text', question_text,
        'question_type', question_type,
        'choices', CASE
          WHEN v_rule.shuffle_choices THEN choices_json
          ELSE choices_json
        END,
        'points', points,
        'explanation', explanation
      )
    )
    INTO v_selected_questions
    FROM (
      SELECT *
      FROM n8n_content_creation.teacher_bank_questions
      WHERE bank_id = v_rule.bank_id
        AND (v_rule.tag_filter IS NULL OR tags && v_rule.tag_filter)
        AND (v_rule.difficulty_filter IS NULL OR difficulty = ANY(v_rule.difficulty_filter))
      ORDER BY RANDOM()
      LIMIT v_rule.pick_count
    ) selected;

    -- Append to questions array
    v_questions := v_questions || v_selected_questions;
  END LOOP;

  -- Create snapshot
  INSERT INTO n8n_content_creation.teacher_student_quiz_snapshots (
    assessment_id,
    student_id,
    attempt_number,
    questions_json,
    seed_value
  ) VALUES (
    p_assessment_id,
    p_student_id,
    p_attempt_number,
    v_questions,
    v_seed
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.generate_quiz_snapshot IS 'Generates a random quiz snapshot for a student based on bank rules';

-- ============================================================================
-- END OF MIGRATION 004
-- ============================================================================
