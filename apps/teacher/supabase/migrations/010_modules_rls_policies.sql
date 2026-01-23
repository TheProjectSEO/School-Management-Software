-- Migration 010: Add RLS Policies for Modules Table
-- Description: Allow teachers to update modules for their assigned courses
-- Schema: n8n_content_creation

-- ============================================================================
-- ENABLE RLS ON MODULES TABLE (if not already enabled)
-- ============================================================================
ALTER TABLE n8n_content_creation.modules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any) TO RECREATE CLEANLY
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view modules for assigned courses" ON n8n_content_creation.modules;
DROP POLICY IF EXISTS "Teachers can update modules for assigned courses" ON n8n_content_creation.modules;
DROP POLICY IF EXISTS "Teachers can insert modules for assigned courses" ON n8n_content_creation.modules;
DROP POLICY IF EXISTS "Teachers can delete modules for assigned courses" ON n8n_content_creation.modules;
DROP POLICY IF EXISTS "Students can view published modules for enrolled courses" ON n8n_content_creation.modules;

-- ============================================================================
-- TEACHER POLICIES FOR MODULES
-- ============================================================================

-- Teachers can SELECT modules for courses they're assigned to
CREATE POLICY "Teachers can view modules for assigned courses"
  ON n8n_content_creation.modules
  FOR SELECT
  USING (
    n8n_content_creation.teacher_assigned_to_course(course_id)
  );

-- Teachers can UPDATE modules for courses they're assigned to
CREATE POLICY "Teachers can update modules for assigned courses"
  ON n8n_content_creation.modules
  FOR UPDATE
  USING (
    n8n_content_creation.teacher_assigned_to_course(course_id)
  );

-- Teachers can INSERT modules for courses they're assigned to
CREATE POLICY "Teachers can insert modules for assigned courses"
  ON n8n_content_creation.modules
  FOR INSERT
  WITH CHECK (
    n8n_content_creation.teacher_assigned_to_course(course_id)
  );

-- Teachers can DELETE modules for courses they're assigned to
CREATE POLICY "Teachers can delete modules for assigned courses"
  ON n8n_content_creation.modules
  FOR DELETE
  USING (
    n8n_content_creation.teacher_assigned_to_course(course_id)
  );

-- ============================================================================
-- STUDENT POLICIES FOR MODULES
-- ============================================================================

-- Students can view published modules for courses they're enrolled in
CREATE POLICY "Students can view published modules for enrolled courses"
  ON n8n_content_creation.modules
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS(
      SELECT 1 FROM n8n_content_creation.enrollments e
      WHERE e.course_id = modules.course_id
        AND e.student_id = n8n_content_creation.current_student_id()
    )
  );

-- ============================================================================
-- SIMILAR POLICIES FOR LESSONS TABLE
-- ============================================================================
ALTER TABLE n8n_content_creation.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view lessons for assigned courses" ON n8n_content_creation.lessons;
DROP POLICY IF EXISTS "Teachers can update lessons for assigned courses" ON n8n_content_creation.lessons;
DROP POLICY IF EXISTS "Teachers can insert lessons for assigned courses" ON n8n_content_creation.lessons;
DROP POLICY IF EXISTS "Teachers can delete lessons for assigned courses" ON n8n_content_creation.lessons;
DROP POLICY IF EXISTS "Students can view published lessons for enrolled courses" ON n8n_content_creation.lessons;

-- Teachers can SELECT lessons for courses they're assigned to
CREATE POLICY "Teachers can view lessons for assigned courses"
  ON n8n_content_creation.lessons
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      WHERE m.id = lessons.module_id
        AND n8n_content_creation.teacher_assigned_to_course(m.course_id)
    )
  );

-- Teachers can UPDATE lessons for courses they're assigned to
CREATE POLICY "Teachers can update lessons for assigned courses"
  ON n8n_content_creation.lessons
  FOR UPDATE
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      WHERE m.id = lessons.module_id
        AND n8n_content_creation.teacher_assigned_to_course(m.course_id)
    )
  );

-- Teachers can INSERT lessons for courses they're assigned to
CREATE POLICY "Teachers can insert lessons for assigned courses"
  ON n8n_content_creation.lessons
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      WHERE m.id = module_id
        AND n8n_content_creation.teacher_assigned_to_course(m.course_id)
    )
  );

-- Teachers can DELETE lessons for courses they're assigned to
CREATE POLICY "Teachers can delete lessons for assigned courses"
  ON n8n_content_creation.lessons
  FOR DELETE
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      WHERE m.id = lessons.module_id
        AND n8n_content_creation.teacher_assigned_to_course(m.course_id)
    )
  );

-- Students can view published lessons for courses they're enrolled in
CREATE POLICY "Students can view published lessons for enrolled courses"
  ON n8n_content_creation.lessons
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.enrollments e ON e.course_id = m.course_id
      WHERE m.id = lessons.module_id
        AND e.student_id = n8n_content_creation.current_student_id()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Teachers can view modules for assigned courses" ON n8n_content_creation.modules
  IS 'Teachers can view modules for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can update modules for assigned courses" ON n8n_content_creation.modules
  IS 'Teachers can update modules for courses they are assigned to teach';

-- ============================================================================
-- END OF MIGRATION 010
-- ============================================================================
