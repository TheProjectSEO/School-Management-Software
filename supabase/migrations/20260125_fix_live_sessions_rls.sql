-- Fix RLS policies for live_sessions table
-- The column is teacher_profile_id, not teacher_id

-- Drop old policies that reference wrong column name
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can insert sessions for their courses" ON live_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled courses" ON live_sessions;

-- Create correct policy for teachers (using teacher_profile_id)
CREATE POLICY "Teachers can manage their sessions"
ON live_sessions FOR ALL
USING (
  teacher_profile_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Create policy for students to view sessions for their enrolled courses
CREATE POLICY "Students can view sessions for enrolled courses"
ON live_sessions FOR SELECT
USING (
  course_id IN (
    SELECT e.course_id FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON live_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
