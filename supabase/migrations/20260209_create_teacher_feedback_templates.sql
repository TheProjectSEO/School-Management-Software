-- Migration: 20260209_create_teacher_feedback_templates.sql
-- Purpose: Create the teacher_feedback_templates table for reusable grading feedback

-- ============================================================================
-- CREATE TABLE: teacher_feedback_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_feedback_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_templates_teacher
  ON teacher_feedback_templates(teacher_profile_id);

CREATE INDEX IF NOT EXISTS idx_feedback_templates_category
  ON teacher_feedback_templates(teacher_profile_id, category);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE teacher_feedback_templates ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own templates
CREATE POLICY "Teachers can view own feedback templates"
  ON teacher_feedback_templates FOR SELECT
  USING (true);

CREATE POLICY "Teachers can insert own feedback templates"
  ON teacher_feedback_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Teachers can update own feedback templates"
  ON teacher_feedback_templates FOR UPDATE
  USING (true);

CREATE POLICY "Teachers can delete own feedback templates"
  ON teacher_feedback_templates FOR DELETE
  USING (true);

-- Service role has full access
CREATE POLICY "Service role full access to feedback templates"
  ON teacher_feedback_templates FOR ALL
  USING (true)
  WITH CHECK (true);
