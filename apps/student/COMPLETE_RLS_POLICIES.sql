-- ============================================================================
-- COMPLETE RLS POLICIES FOR STUDENT PORTAL
-- ============================================================================
-- This migration creates comprehensive RLS policies for ALL tables
-- Purpose: Ensure students can ONLY see data relevant to them
-- Critical: Without these policies, students cannot access their data!
-- ============================================================================

-- ============================================================================
-- HELPER: Get student ID from current auth user
-- ============================================================================
-- This function is used throughout the policies to map auth.uid() to student_id
CREATE OR REPLACE FUNCTION get_current_student_id()
RETURNS UUID AS $$
  SELECT s.id
  FROM students s
  JOIN profiles p ON p.id = s.profile_id
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Already has policies, but let's ensure they're correct

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ============================================================================
-- 2. SCHOOLS TABLE
-- ============================================================================
-- Students can view their own school

DROP POLICY IF EXISTS "Schools are publicly viewable" ON schools;

CREATE POLICY "Students can view their school" ON schools
  FOR SELECT USING (
    id IN (
      SELECT s.school_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. SECTIONS TABLE
-- ============================================================================
-- Students can view their own section and sections with courses they're enrolled in

DROP POLICY IF EXISTS "Sections are viewable by school members" ON sections;

CREATE POLICY "Students can view relevant sections" ON sections
  FOR SELECT USING (
    -- Their own section
    id IN (
      SELECT s.section_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
    OR
    -- Sections for courses they're enrolled in
    id IN (
      SELECT c.section_id FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND c.section_id IS NOT NULL
    )
  );

-- ============================================================================
-- 4. STUDENTS TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own data" ON students;

CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. COURSES TABLE
-- ============================================================================
-- Students can ONLY view courses they are enrolled in (CRITICAL FIX!)

DROP POLICY IF EXISTS "Enrolled students can view courses" ON courses;

CREATE POLICY "Students can view enrolled courses" ON courses
  FOR SELECT USING (
    id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. ENROLLMENTS TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own enrollments" ON enrollments;

CREATE POLICY "Students can view own enrollments" ON enrollments
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. MODULES TABLE
-- ============================================================================
-- Students can view published modules for enrolled courses (CRITICAL FIX!)

DROP POLICY IF EXISTS "Published modules are viewable" ON modules;

CREATE POLICY "Students can view modules for enrolled courses" ON modules
  FOR SELECT USING (
    is_published = true AND
    course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. LESSONS TABLE
-- ============================================================================
-- Students can view published lessons for enrolled courses (CRITICAL FIX!)

DROP POLICY IF EXISTS "Published lessons are viewable" ON lessons;

CREATE POLICY "Students can view lessons for enrolled courses" ON lessons
  FOR SELECT USING (
    is_published = true AND
    module_id IN (
      SELECT m.id FROM modules m
      JOIN courses c ON c.id = m.course_id
      JOIN enrollments e ON e.course_id = c.id
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. ASSESSMENTS TABLE
-- ============================================================================
-- Students can view assessments for enrolled courses (CRITICAL FIX!)

DROP POLICY IF EXISTS "Assessments viewable by enrolled students" ON assessments;

CREATE POLICY "Students can view assessments for enrolled courses" ON assessments
  FOR SELECT USING (
    course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. SUBMISSIONS TABLE
-- ============================================================================
-- Already has good policies, but let's ensure completeness

DROP POLICY IF EXISTS "Students can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON submissions;

CREATE POLICY "Students can view own submissions" ON submissions
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own submissions" ON submissions
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. STUDENT_PROGRESS TABLE
-- ============================================================================
-- Already has good policies, verified

DROP POLICY IF EXISTS "Students can view own progress" ON student_progress;
DROP POLICY IF EXISTS "Students can insert own progress" ON student_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON student_progress;

CREATE POLICY "Students can view own progress" ON student_progress
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own progress" ON student_progress
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own progress" ON student_progress
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. NOTES TABLE
-- ============================================================================
-- Already has complete CRUD policies, verified

DROP POLICY IF EXISTS "Students can view own notes" ON notes;
DROP POLICY IF EXISTS "Students can insert own notes" ON notes;
DROP POLICY IF EXISTS "Students can update own notes" ON notes;
DROP POLICY IF EXISTS "Students can delete own notes" ON notes;

CREATE POLICY "Students can view own notes" ON notes
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own notes" ON notes
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own notes" ON notes
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own notes" ON notes
  FOR DELETE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 13. NOTIFICATIONS TABLE
-- ============================================================================
-- Already has good policies, verified

DROP POLICY IF EXISTS "Students can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Students can update own notifications" ON notifications;

CREATE POLICY "Students can view own notifications" ON notifications
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own notifications" ON notifications
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 14. DOWNLOADS TABLE
-- ============================================================================
-- Already has good policies, verified

DROP POLICY IF EXISTS "Students can view own downloads" ON downloads;
DROP POLICY IF EXISTS "Students can insert own downloads" ON downloads;
DROP POLICY IF EXISTS "Students can delete own downloads" ON downloads;

CREATE POLICY "Students can view own downloads" ON downloads
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own downloads" ON downloads
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own downloads" ON downloads
  FOR DELETE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 15. ANNOUNCEMENTS TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view relevant announcements" ON announcements;

CREATE POLICY "Students can view relevant announcements" ON announcements
  FOR SELECT USING (
    -- School-wide announcements (no course/section specified)
    (course_id IS NULL AND section_id IS NULL AND school_id IN (
      SELECT s.school_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )) OR
    -- Course-specific announcements for enrolled courses
    (course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )) OR
    -- Section-specific announcements for student's section
    (section_id IN (
      SELECT s.section_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 16. DIRECT_MESSAGES TABLE
-- ============================================================================
-- Already has good policies, verified

DROP POLICY IF EXISTS "Students can view own messages" ON direct_messages;
DROP POLICY IF EXISTS "Students can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Students can update received messages" ON direct_messages;

CREATE POLICY "Students can view own messages" ON direct_messages
  FOR SELECT USING (
    from_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    ) OR
    to_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can send messages" ON direct_messages
  FOR INSERT WITH CHECK (
    from_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update received messages" ON direct_messages
  FOR UPDATE USING (
    to_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 17. GRADING_PERIODS TABLE
-- ============================================================================
-- Students can view grading periods for their school

DROP POLICY IF EXISTS "Grading periods are publicly viewable" ON grading_periods;

CREATE POLICY "Students can view school grading periods" ON grading_periods
  FOR SELECT USING (
    school_id IN (
      SELECT s.school_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 18. COURSE_GRADES TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own released grades" ON course_grades;

CREATE POLICY "Students can view own released grades" ON course_grades
  FOR SELECT USING (
    is_released = true AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 19. SEMESTER_GPA TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own GPA" ON semester_gpa;

CREATE POLICY "Students can view own GPA" ON semester_gpa
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 20. REPORT_CARDS TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own released report cards" ON report_cards;

CREATE POLICY "Students can view own released report cards" ON report_cards
  FOR SELECT USING (
    status = 'released' AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 21. TEACHER_ATTENDANCE TABLE
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view own attendance" ON teacher_attendance;

CREATE POLICY "Students can view own attendance" ON teacher_attendance
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 22. QUESTIONS TABLE (Quiz System)
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view questions for their assessments" ON questions;

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

-- ============================================================================
-- 23. ANSWER_OPTIONS TABLE (Quiz System)
-- ============================================================================
-- Already has good policy, verified

DROP POLICY IF EXISTS "Students can view answer options" ON answer_options;

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

-- ============================================================================
-- 24. STUDENT_ANSWERS TABLE (Quiz System)
-- ============================================================================
-- Already has good policies, verified

DROP POLICY IF EXISTS "Students can insert their answers" ON student_answers;
DROP POLICY IF EXISTS "Students can view their own answers" ON student_answers;
DROP POLICY IF EXISTS "Students can update their own answers" ON student_answers;

CREATE POLICY "Students can insert their answers" ON student_answers
  FOR INSERT WITH CHECK (
    submission_id IN (
      SELECT sub.id FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN profiles p ON p.id = st.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own answers" ON student_answers
  FOR SELECT USING (
    submission_id IN (
      SELECT sub.id FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN profiles p ON p.id = st.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

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

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify RLS policies are working correctly
-- (These are comments, not executed - use them for manual testing)
-- ============================================================================

-- Verify student can see their own data:
-- SELECT * FROM students WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid());

-- Verify student can see enrolled courses:
-- SELECT c.* FROM courses c
-- JOIN enrollments e ON e.course_id = c.id
-- JOIN students s ON s.id = e.student_id
-- JOIN profiles p ON p.id = s.profile_id
-- WHERE p.auth_user_id = auth.uid();

-- Verify student can see modules for enrolled courses:
-- SELECT m.* FROM modules m
-- JOIN courses c ON c.id = m.course_id
-- JOIN enrollments e ON e.course_id = c.id
-- JOIN students s ON s.id = e.student_id
-- JOIN profiles p ON p.id = s.profile_id
-- WHERE p.auth_user_id = auth.uid();

-- ============================================================================
-- END OF COMPLETE RLS POLICIES
-- ============================================================================
-- Total tables covered: 24
-- All RLS policies are now properly configured for student access
-- Students can ONLY see data that belongs to them or their enrolled courses
-- ============================================================================
