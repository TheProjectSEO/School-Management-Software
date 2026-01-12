-- Migration 007: Teacher Row Level Security Policies
-- Description: RLS policies for all teacher tables
-- Schema: n8n_content_creation (ALL tables in this schema)
--
-- POLICY PRINCIPLES:
-- 1. Teachers can only access data within their school_id
-- 2. Teachers can only manage courses/sections they are assigned to
-- 3. Teachers can read student data for their assigned sections
-- 4. Students can only see published content
-- 5. Students can only see released grades/feedback

-- ============================================================================
-- ENABLE RLS ON ALL TEACHER TABLES
-- ============================================================================
ALTER TABLE n8n_content_creation.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_session_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_assessment_bank_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_student_quiz_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_rubric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_content_creation.teacher_direct_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION n8n_content_creation.current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM n8n_content_creation.profiles
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is a teacher
CREATE OR REPLACE FUNCTION n8n_content_creation.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.teacher_profiles
    WHERE profile_id = n8n_content_creation.current_profile_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current teacher's profile ID
CREATE OR REPLACE FUNCTION n8n_content_creation.current_teacher_profile_id()
RETURNS UUID AS $$
  SELECT id FROM n8n_content_creation.teacher_profiles
  WHERE profile_id = n8n_content_creation.current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current teacher's school ID
CREATE OR REPLACE FUNCTION n8n_content_creation.current_teacher_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM n8n_content_creation.teacher_profiles
  WHERE profile_id = n8n_content_creation.current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if teacher is assigned to a course
CREATE OR REPLACE FUNCTION n8n_content_creation.teacher_assigned_to_course(p_course_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.teacher_assignments
    WHERE teacher_profile_id = n8n_content_creation.current_teacher_profile_id()
      AND course_id = p_course_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if teacher is assigned to a section
CREATE OR REPLACE FUNCTION n8n_content_creation.teacher_assigned_to_section(p_section_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.teacher_assignments
    WHERE teacher_profile_id = n8n_content_creation.current_teacher_profile_id()
      AND section_id = p_section_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is a student
CREATE OR REPLACE FUNCTION n8n_content_creation.is_student()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.students
    WHERE profile_id = n8n_content_creation.current_profile_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current student's ID
CREATE OR REPLACE FUNCTION n8n_content_creation.current_student_id()
RETURNS UUID AS $$
  SELECT id FROM n8n_content_creation.students
  WHERE profile_id = n8n_content_creation.current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- TEACHER PROFILES POLICIES
-- ============================================================================

-- Teachers can view their own profile
CREATE POLICY "Teachers view own profile"
  ON n8n_content_creation.teacher_profiles
  FOR SELECT
  USING (profile_id = n8n_content_creation.current_profile_id());

-- Teachers can update their own profile
CREATE POLICY "Teachers update own profile"
  ON n8n_content_creation.teacher_profiles
  FOR UPDATE
  USING (profile_id = n8n_content_creation.current_profile_id());

-- ============================================================================
-- TEACHER ASSIGNMENTS POLICIES
-- ============================================================================

-- Teachers can view their own assignments
CREATE POLICY "Teachers view own assignments"
  ON n8n_content_creation.teacher_assignments
  FOR SELECT
  USING (teacher_profile_id = n8n_content_creation.current_teacher_profile_id());

-- ============================================================================
-- TEACHER CONTENT POLICIES (Transcripts, Notes, Assets)
-- ============================================================================

-- Teachers can manage transcripts for their assigned courses
CREATE POLICY "Teachers manage transcripts"
  ON n8n_content_creation.teacher_transcripts
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.courses c ON m.course_id = c.id
      WHERE m.id = module_id
        AND n8n_content_creation.teacher_assigned_to_course(c.id)
    )
  );

-- Students can view published transcripts for enrolled courses
CREATE POLICY "Students view published transcripts"
  ON n8n_content_creation.teacher_transcripts
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.enrollments e ON e.course_id = m.course_id
      WHERE m.id = module_id
        AND e.student_id = n8n_content_creation.current_student_id()
    )
  );

-- Teachers can manage notes for their assigned courses
CREATE POLICY "Teachers manage notes"
  ON n8n_content_creation.teacher_notes
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.courses c ON m.course_id = c.id
      WHERE m.id = module_id
        AND n8n_content_creation.teacher_assigned_to_course(c.id)
    )
  );

-- Students can view published notes for enrolled courses
CREATE POLICY "Students view published notes"
  ON n8n_content_creation.teacher_notes
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.enrollments e ON e.course_id = m.course_id
      WHERE m.id = module_id
        AND e.student_id = n8n_content_creation.current_student_id()
    )
  );

-- Teachers can manage content assets for their assigned courses
CREATE POLICY "Teachers manage content assets"
  ON n8n_content_creation.teacher_content_assets
  FOR ALL
  USING (created_by = n8n_content_creation.current_profile_id());

-- Students can view content assets for enrolled courses
CREATE POLICY "Students view content assets"
  ON n8n_content_creation.teacher_content_assets
  FOR SELECT
  USING (
    -- Allow if asset belongs to an enrolled course
    (owner_type = 'module' AND EXISTS(
      SELECT 1 FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.enrollments e ON e.course_id = m.course_id
      WHERE m.id = owner_id AND e.student_id = n8n_content_creation.current_student_id()
    ))
    OR
    (owner_type = 'lesson' AND EXISTS(
      SELECT 1 FROM n8n_content_creation.lessons l
      JOIN n8n_content_creation.modules m ON l.module_id = m.id
      JOIN n8n_content_creation.enrollments e ON e.course_id = m.course_id
      WHERE l.id = owner_id AND e.student_id = n8n_content_creation.current_student_id()
    ))
  );

-- ============================================================================
-- LIVE SESSIONS & ATTENDANCE POLICIES
-- ============================================================================

-- Teachers can manage live sessions for their assigned courses
CREATE POLICY "Teachers manage live sessions"
  ON n8n_content_creation.teacher_live_sessions
  FOR ALL
  USING (
    n8n_content_creation.teacher_assigned_to_course(course_id)
    AND n8n_content_creation.teacher_assigned_to_section(section_id)
  );

-- Students can view live sessions for their enrolled courses
CREATE POLICY "Students view live sessions"
  ON n8n_content_creation.teacher_live_sessions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.enrollments e
      JOIN n8n_content_creation.students s ON e.student_id = s.id
      WHERE e.course_id = teacher_live_sessions.course_id
        AND s.section_id = teacher_live_sessions.section_id
        AND s.id = n8n_content_creation.current_student_id()
    )
  );

-- Teachers can view session presence for their sessions
CREATE POLICY "Teachers view session presence"
  ON n8n_content_creation.teacher_session_presence
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.teacher_live_sessions s
      WHERE s.id = session_id
        AND n8n_content_creation.teacher_assigned_to_course(s.course_id)
    )
  );

-- Students can create/update their own presence records
CREATE POLICY "Students manage own presence"
  ON n8n_content_creation.teacher_session_presence
  FOR ALL
  USING (student_id = n8n_content_creation.current_student_id());

-- Teachers can manage attendance for their sections
CREATE POLICY "Teachers manage attendance"
  ON n8n_content_creation.teacher_attendance
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.teacher_live_sessions s
      WHERE s.id = session_id
        AND n8n_content_creation.teacher_assigned_to_section(s.section_id)
    )
  );

-- Students can view their own attendance
CREATE POLICY "Students view own attendance"
  ON n8n_content_creation.teacher_attendance
  FOR SELECT
  USING (student_id = n8n_content_creation.current_student_id());

-- Teachers can manage daily attendance for their sections
CREATE POLICY "Teachers manage daily attendance"
  ON n8n_content_creation.teacher_daily_attendance
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.students s
      WHERE s.id = student_id
        AND n8n_content_creation.teacher_assigned_to_section(s.section_id)
    )
  );

-- Students can view their own daily attendance
CREATE POLICY "Students view own daily attendance"
  ON n8n_content_creation.teacher_daily_attendance
  FOR SELECT
  USING (student_id = n8n_content_creation.current_student_id());

-- ============================================================================
-- QUESTION BANKS & ASSESSMENTS POLICIES
-- ============================================================================

-- Teachers can manage question banks for their courses
CREATE POLICY "Teachers manage question banks"
  ON n8n_content_creation.teacher_question_banks
  FOR ALL
  USING (n8n_content_creation.teacher_assigned_to_course(course_id));

-- Teachers can manage bank questions for their banks
CREATE POLICY "Teachers manage bank questions"
  ON n8n_content_creation.teacher_bank_questions
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.teacher_question_banks qb
      WHERE qb.id = bank_id
        AND n8n_content_creation.teacher_assigned_to_course(qb.course_id)
    )
  );

-- Teachers can manage assessment bank rules
CREATE POLICY "Teachers manage assessment bank rules"
  ON n8n_content_creation.teacher_assessment_bank_rules
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.assessments a
      WHERE a.id = assessment_id
        AND n8n_content_creation.teacher_assigned_to_course(a.course_id)
    )
  );

-- Teachers can view quiz snapshots for their assessments
CREATE POLICY "Teachers view quiz snapshots"
  ON n8n_content_creation.teacher_student_quiz_snapshots
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.assessments a
      WHERE a.id = assessment_id
        AND n8n_content_creation.teacher_assigned_to_course(a.course_id)
    )
  );

-- Students can view their own quiz snapshots
CREATE POLICY "Students view own quiz snapshots"
  ON n8n_content_creation.teacher_student_quiz_snapshots
  FOR SELECT
  USING (student_id = n8n_content_creation.current_student_id());

-- System can create quiz snapshots
CREATE POLICY "System creates quiz snapshots"
  ON n8n_content_creation.teacher_student_quiz_snapshots
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RUBRICS & FEEDBACK POLICIES
-- ============================================================================

-- Teachers can manage rubric templates
CREATE POLICY "Teachers manage rubric templates"
  ON n8n_content_creation.teacher_rubric_templates
  FOR ALL
  USING (
    course_id IS NULL OR n8n_content_creation.teacher_assigned_to_course(course_id)
  );

-- Teachers can manage rubric scores for their assessments
CREATE POLICY "Teachers manage rubric scores"
  ON n8n_content_creation.teacher_rubric_scores
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.submissions sub
      JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
      WHERE sub.id = submission_id
        AND n8n_content_creation.teacher_assigned_to_course(a.course_id)
    )
  );

-- Students can view rubric scores for their own submissions
CREATE POLICY "Students view own rubric scores"
  ON n8n_content_creation.teacher_rubric_scores
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.submissions sub
      WHERE sub.id = submission_id
        AND sub.student_id = n8n_content_creation.current_student_id()
    )
  );

-- Teachers can manage feedback for their assessments
CREATE POLICY "Teachers manage feedback"
  ON n8n_content_creation.teacher_feedback
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.submissions sub
      JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
      WHERE sub.id = submission_id
        AND n8n_content_creation.teacher_assigned_to_course(a.course_id)
    )
  );

-- Students can view released feedback for their submissions
CREATE POLICY "Students view released feedback"
  ON n8n_content_creation.teacher_feedback
  FOR SELECT
  USING (
    is_released = true
    AND EXISTS(
      SELECT 1 FROM n8n_content_creation.submissions sub
      WHERE sub.id = submission_id
        AND sub.student_id = n8n_content_creation.current_student_id()
    )
  );

-- ============================================================================
-- COMMUNICATION POLICIES
-- ============================================================================

-- Teachers can manage announcements for their scope
CREATE POLICY "Teachers manage announcements"
  ON n8n_content_creation.teacher_announcements
  FOR ALL
  USING (
    (scope_type = 'course' AND n8n_content_creation.teacher_assigned_to_course(scope_id))
    OR
    (scope_type = 'section' AND n8n_content_creation.teacher_assigned_to_section(scope_id))
    OR
    (scope_type = 'school' AND EXISTS(
      SELECT 1 FROM n8n_content_creation.schools s
      JOIN n8n_content_creation.teacher_profiles tp ON s.id = tp.school_id
      WHERE s.id = scope_id
        AND tp.profile_id = n8n_content_creation.current_profile_id()
    ))
  );

-- Students can view announcements for their scope
CREATE POLICY "Students view announcements"
  ON n8n_content_creation.teacher_announcements
  FOR SELECT
  USING (
    publish_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      (scope_type = 'section' AND EXISTS(
        SELECT 1 FROM n8n_content_creation.students s
        WHERE s.section_id = scope_id
          AND s.id = n8n_content_creation.current_student_id()
      ))
      OR
      (scope_type = 'course' AND EXISTS(
        SELECT 1 FROM n8n_content_creation.enrollments e
        WHERE e.course_id = scope_id
          AND e.student_id = n8n_content_creation.current_student_id()
      ))
      OR
      (scope_type = 'school' AND EXISTS(
        SELECT 1 FROM n8n_content_creation.students s
        WHERE s.school_id = scope_id
          AND s.id = n8n_content_creation.current_student_id()
      ))
    )
  );

-- Teachers can manage discussion threads for their courses
CREATE POLICY "Teachers manage discussion threads"
  ON n8n_content_creation.teacher_discussion_threads
  FOR ALL
  USING (
    n8n_content_creation.teacher_assigned_to_course(course_id)
    AND (section_id IS NULL OR n8n_content_creation.teacher_assigned_to_section(section_id))
  );

-- Students can view discussion threads for enrolled courses
CREATE POLICY "Students view discussion threads"
  ON n8n_content_creation.teacher_discussion_threads
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.enrollments e
      WHERE e.course_id = teacher_discussion_threads.course_id
        AND e.student_id = n8n_content_creation.current_student_id()
    )
  );

-- All authenticated users can create posts in non-locked threads
CREATE POLICY "Users create discussion posts"
  ON n8n_content_creation.teacher_discussion_posts
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.teacher_discussion_threads t
      WHERE t.id = thread_id
        AND t.is_locked = false
        AND (
          n8n_content_creation.teacher_assigned_to_course(t.course_id)
          OR EXISTS(
            SELECT 1 FROM n8n_content_creation.enrollments e
            WHERE e.course_id = t.course_id
              AND e.student_id = n8n_content_creation.current_student_id()
          )
        )
    )
  );

-- Users can view posts in threads they have access to
CREATE POLICY "Users view discussion posts"
  ON n8n_content_creation.teacher_discussion_posts
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM n8n_content_creation.teacher_discussion_threads t
      WHERE t.id = thread_id
        AND (
          n8n_content_creation.teacher_assigned_to_course(t.course_id)
          OR EXISTS(
            SELECT 1 FROM n8n_content_creation.enrollments e
            WHERE e.course_id = t.course_id
              AND e.student_id = n8n_content_creation.current_student_id()
          )
        )
    )
  );

-- Users can update/delete their own posts
CREATE POLICY "Users manage own posts"
  ON n8n_content_creation.teacher_discussion_posts
  FOR UPDATE
  USING (created_by = n8n_content_creation.current_profile_id());

CREATE POLICY "Users delete own posts"
  ON n8n_content_creation.teacher_discussion_posts
  FOR DELETE
  USING (created_by = n8n_content_creation.current_profile_id());

-- Direct messages: users can send and view their own messages
CREATE POLICY "Users send direct messages"
  ON n8n_content_creation.teacher_direct_messages
  FOR INSERT
  WITH CHECK (
    from_profile_id = n8n_content_creation.current_profile_id()
    AND school_id = (
      SELECT school_id FROM n8n_content_creation.students
      WHERE profile_id = n8n_content_creation.current_profile_id()
      UNION
      SELECT school_id FROM n8n_content_creation.teacher_profiles
      WHERE profile_id = n8n_content_creation.current_profile_id()
    )
  );

CREATE POLICY "Users view own direct messages"
  ON n8n_content_creation.teacher_direct_messages
  FOR SELECT
  USING (
    from_profile_id = n8n_content_creation.current_profile_id()
    OR to_profile_id = n8n_content_creation.current_profile_id()
  );

CREATE POLICY "Users update received messages"
  ON n8n_content_creation.teacher_direct_messages
  FOR UPDATE
  USING (to_profile_id = n8n_content_creation.current_profile_id());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Teachers view own profile" ON n8n_content_creation.teacher_profiles IS 'Teachers can view their own profile data';
COMMENT ON POLICY "Teachers view own assignments" ON n8n_content_creation.teacher_assignments IS 'Teachers can view their course/section assignments';
COMMENT ON POLICY "Teachers manage transcripts" ON n8n_content_creation.teacher_transcripts IS 'Teachers can manage transcripts for their assigned courses';
COMMENT ON POLICY "Students view published transcripts" ON n8n_content_creation.teacher_transcripts IS 'Students can view published transcripts for enrolled courses';
COMMENT ON POLICY "Students view released feedback" ON n8n_content_creation.teacher_feedback IS 'Students can only view feedback that has been released by teacher';

-- ============================================================================
-- END OF MIGRATION 007 - ALL RLS POLICIES COMPLETE
-- ============================================================================
