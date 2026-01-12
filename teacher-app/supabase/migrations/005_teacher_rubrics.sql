-- Migration 005: Teacher Rubrics & Feedback
-- Description: Creates tables for rubric templates, rubric scoring, and feedback
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER RUBRIC TEMPLATES TABLE
-- Purpose: Reusable rubric templates for grading assignments/essays
-- Links to: courses (optional)
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES n8n_content_creation.courses(id) ON DELETE SET NULL,
  criteria_json JSONB NOT NULL,
  levels_json JSONB NOT NULL,
  max_score INTEGER,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT criteria_not_empty CHECK (jsonb_array_length(criteria_json) > 0),
  CONSTRAINT levels_not_empty CHECK (jsonb_array_length(levels_json) > 0),
  CONSTRAINT max_score_positive CHECK (max_score IS NULL OR max_score > 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_rubric_templates_course ON n8n_content_creation.teacher_rubric_templates(course_id);
CREATE INDEX idx_teacher_rubric_templates_created_by ON n8n_content_creation.teacher_rubric_templates(created_by);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_rubric_templates IS 'Reusable rubric templates for consistent grading';
COMMENT ON COLUMN n8n_content_creation.teacher_rubric_templates.criteria_json IS 'Array of criteria: [{"id": "c1", "name": "Accuracy", "description": "...", "weight": 40}]';
COMMENT ON COLUMN n8n_content_creation.teacher_rubric_templates.levels_json IS 'Performance levels: [{"id": "l1", "name": "Excellent", "description": "...", "points": 5}]';
COMMENT ON COLUMN n8n_content_creation.teacher_rubric_templates.max_score IS 'Maximum possible score (calculated from criteria weights and levels)';

-- ============================================================================
-- TEACHER RUBRIC SCORES TABLE
-- Purpose: Applied rubric scores for student submissions
-- Links to: submissions, teacher_rubric_templates
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.submissions(id) ON DELETE CASCADE,
  rubric_template_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_rubric_templates(id) ON DELETE CASCADE,
  scores_json JSONB NOT NULL,
  total_score INTEGER,
  graded_by UUID REFERENCES n8n_content_creation.profiles(id),
  graded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(submission_id),
  CONSTRAINT scores_not_empty CHECK (jsonb_typeof(scores_json) = 'object'),
  CONSTRAINT total_score_non_negative CHECK (total_score IS NULL OR total_score >= 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_rubric_scores_submission ON n8n_content_creation.teacher_rubric_scores(submission_id);
CREATE INDEX idx_teacher_rubric_scores_template ON n8n_content_creation.teacher_rubric_scores(rubric_template_id);
CREATE INDEX idx_teacher_rubric_scores_graded_by ON n8n_content_creation.teacher_rubric_scores(graded_by);
CREATE INDEX idx_teacher_rubric_scores_graded_at ON n8n_content_creation.teacher_rubric_scores(graded_at);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_rubric_scores IS 'Applied rubric scores for individual submissions';
COMMENT ON COLUMN n8n_content_creation.teacher_rubric_scores.scores_json IS 'Score per criterion: {"c1": {"level_id": "l4", "points": 20, "comment": "..."}, "c2": {...}}';
COMMENT ON COLUMN n8n_content_creation.teacher_rubric_scores.total_score IS 'Calculated total score from all criteria';

-- ============================================================================
-- TEACHER FEEDBACK TABLE
-- Purpose: Detailed teacher feedback with AI drafts and release control
-- Links to: submissions
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.submissions(id) ON DELETE CASCADE,
  teacher_comment TEXT,
  inline_notes_json JSONB,
  ai_draft TEXT,
  is_released BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(submission_id),
  CONSTRAINT release_consistency CHECK (
    (is_released = false AND released_at IS NULL AND released_by IS NULL) OR
    (is_released = true AND released_at IS NOT NULL AND released_by IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_feedback_submission ON n8n_content_creation.teacher_feedback(submission_id);
CREATE INDEX idx_teacher_feedback_released ON n8n_content_creation.teacher_feedback(is_released);
CREATE INDEX idx_teacher_feedback_released_by ON n8n_content_creation.teacher_feedback(released_by);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_feedback IS 'Detailed feedback with AI assistance and release control';
COMMENT ON COLUMN n8n_content_creation.teacher_feedback.teacher_comment IS 'Teacher-written overall feedback comment';
COMMENT ON COLUMN n8n_content_creation.teacher_feedback.inline_notes_json IS 'Line-by-line or section-specific comments: [{"position": "paragraph-3", "note": "..."}]';
COMMENT ON COLUMN n8n_content_creation.teacher_feedback.ai_draft IS 'AI-generated draft feedback for teacher to review/edit';
COMMENT ON COLUMN n8n_content_creation.teacher_feedback.is_released IS 'Whether feedback has been released to student';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_teacher_rubric_templates_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_rubric_templates
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_feedback_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_feedback
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- TRIGGER: Calculate total score when rubric scores are saved
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.calculate_rubric_total()
RETURNS TRIGGER AS $$
DECLARE
  criterion_key TEXT;
  criterion_score JSONB;
  running_total INTEGER := 0;
BEGIN
  -- Iterate through all criteria in scores_json
  FOR criterion_key, criterion_score IN
    SELECT * FROM jsonb_each(NEW.scores_json)
  LOOP
    running_total := running_total + COALESCE((criterion_score->>'points')::INTEGER, 0);
  END LOOP;

  NEW.total_score := running_total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_rubric_total_trigger
  BEFORE INSERT OR UPDATE ON n8n_content_creation.teacher_rubric_scores
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.calculate_rubric_total();

-- ============================================================================
-- TRIGGER: Update submission score when rubric scores are applied
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.sync_rubric_to_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the submission score and status
  UPDATE n8n_content_creation.submissions
  SET
    score = NEW.total_score,
    graded_at = NEW.graded_at,
    status = 'graded'
  WHERE id = NEW.submission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_rubric_to_submission_trigger
  AFTER INSERT OR UPDATE ON n8n_content_creation.teacher_rubric_scores
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.sync_rubric_to_submission();

-- ============================================================================
-- HELPER FUNCTION: Calculate max score for a rubric template
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.calculate_rubric_max_score(
  p_criteria_json JSONB,
  p_levels_json JSONB
)
RETURNS INTEGER AS $$
DECLARE
  criterion JSONB;
  max_level_points INTEGER;
  total INTEGER := 0;
BEGIN
  -- For each criterion, find the maximum level points
  FOR criterion IN SELECT * FROM jsonb_array_elements(p_criteria_json)
  LOOP
    -- Find max points from levels
    SELECT MAX((level->>'points')::INTEGER)
    INTO max_level_points
    FROM jsonb_array_elements(p_levels_json) AS level;

    -- Add weighted max points to total
    total := total + COALESCE((criterion->>'weight')::INTEGER, 1) * COALESCE(max_level_points, 0);
  END LOOP;

  RETURN total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION n8n_content_creation.calculate_rubric_max_score IS 'Calculates maximum possible score for a rubric template';

-- ============================================================================
-- TRIGGER: Auto-calculate max_score when template is created/updated
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.auto_calculate_rubric_max()
RETURNS TRIGGER AS $$
BEGIN
  NEW.max_score := calculate_rubric_max_score(NEW.criteria_json, NEW.levels_json);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_rubric_max_trigger
  BEFORE INSERT OR UPDATE ON n8n_content_creation.teacher_rubric_templates
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.auto_calculate_rubric_max();

-- ============================================================================
-- HELPER FUNCTION: Release feedback and update submission
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.release_feedback(
  p_submission_id UUID,
  p_released_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_feedback_exists BOOLEAN;
BEGIN
  -- Check if feedback exists
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.teacher_feedback
    WHERE submission_id = p_submission_id
  ) INTO v_feedback_exists;

  IF NOT v_feedback_exists THEN
    RAISE EXCEPTION 'No feedback found for submission %', p_submission_id;
  END IF;

  -- Update feedback to released
  UPDATE n8n_content_creation.teacher_feedback
  SET
    is_released = true,
    released_at = NOW(),
    released_by = p_released_by,
    updated_at = NOW()
  WHERE submission_id = p_submission_id;

  -- Update submission status
  UPDATE n8n_content_creation.submissions
  SET
    status = 'returned',
    updated_at = NOW()
  WHERE id = p_submission_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.release_feedback IS 'Releases feedback to student and updates submission status';

-- ============================================================================
-- HELPER FUNCTION: Batch release feedback for multiple submissions
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.batch_release_feedback(
  p_submission_ids UUID[],
  p_released_by UUID
)
RETURNS INTEGER AS $$
DECLARE
  submission_id UUID;
  count INTEGER := 0;
BEGIN
  FOREACH submission_id IN ARRAY p_submission_ids
  LOOP
    BEGIN
      PERFORM release_feedback(submission_id, p_released_by);
      count := count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip failed releases, continue with others
      CONTINUE;
    END;
  END LOOP;

  RETURN count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.batch_release_feedback IS 'Releases feedback for multiple submissions in batch';

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================
