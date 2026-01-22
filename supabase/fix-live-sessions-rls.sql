-- Fix RLS policies for live_sessions table
-- The original policies reference teacher_id column which doesn't exist
-- Teachers are linked via course_id → teacher_assignments.teacher_profile_id
--
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Students can view sessions for enrolled courses" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can view sessions for their courses" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can create sessions for their courses" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can update sessions for their courses" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can delete sessions for their courses" ON live_sessions;

-- ============================================================================
-- FIXED RLS POLICIES FOR live_sessions
-- ============================================================================

-- Students can view sessions for courses they're enrolled in
CREATE POLICY "Students can view sessions for enrolled courses"
ON live_sessions FOR SELECT
TO authenticated
USING (
  course_id IN (
    SELECT e.course_id FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can view sessions for courses they teach
CREATE POLICY "Teachers can view sessions for their courses"
ON live_sessions FOR SELECT
TO authenticated
USING (
  course_id IN (
    SELECT ta.course_id FROM teacher_assignments ta
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can insert sessions for courses they teach
CREATE POLICY "Teachers can create sessions for their courses"
ON live_sessions FOR INSERT
TO authenticated
WITH CHECK (
  course_id IN (
    SELECT ta.course_id FROM teacher_assignments ta
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can update sessions for courses they teach
CREATE POLICY "Teachers can update sessions for their courses"
ON live_sessions FOR UPDATE
TO authenticated
USING (
  course_id IN (
    SELECT ta.course_id FROM teacher_assignments ta
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can delete sessions for courses they teach
CREATE POLICY "Teachers can delete sessions for their courses"
ON live_sessions FOR DELETE
TO authenticated
USING (
  course_id IN (
    SELECT ta.course_id FROM teacher_assignments ta
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- Verify policies are created
-- ============================================================================
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'live_sessions'
ORDER BY policyname;
