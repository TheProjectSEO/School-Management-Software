-- Fix RLS policies for session_transcripts to allow teachers to INSERT
-- Run this in Supabase SQL Editor
--
-- NOTE: The live_sessions table does NOT have a teacher_id column.
-- Teachers are linked via course_id → teacher_assignments.teacher_profile_id

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view transcripts for enrolled courses" ON session_transcripts;
DROP POLICY IF EXISTS "Teachers can view transcripts for their sessions" ON session_transcripts;
DROP POLICY IF EXISTS "Teachers can insert transcripts for their sessions" ON session_transcripts;
DROP POLICY IF EXISTS "Teachers can update transcripts for their sessions" ON session_transcripts;
DROP POLICY IF EXISTS "Teachers can manage transcripts for their sessions" ON session_transcripts;
DROP POLICY IF EXISTS "Service role can manage transcripts" ON session_transcripts;

DROP POLICY IF EXISTS "Students can view chunks for enrolled courses" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Teachers can view chunks for their sessions" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Teachers can insert chunks for their sessions" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Teachers can update chunks for their sessions" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Teachers can manage chunks for their sessions" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Service role can manage chunks" ON session_transcript_chunks;

-- ============================================================================
-- RLS POLICIES FOR session_transcripts
-- ============================================================================

-- Students can VIEW transcripts for courses they're enrolled in
CREATE POLICY "Students can view transcripts for enrolled courses"
ON session_transcripts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN enrollments e ON e.course_id = ls.course_id
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE ls.id = session_transcripts.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can VIEW transcripts for sessions of courses they teach
CREATE POLICY "Teachers can view transcripts for their sessions"
ON session_transcripts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcripts.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can INSERT transcripts for sessions of courses they teach
CREATE POLICY "Teachers can insert transcripts for their sessions"
ON session_transcripts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can UPDATE transcripts for sessions of courses they teach
CREATE POLICY "Teachers can update transcripts for their sessions"
ON session_transcripts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcripts.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS POLICIES FOR session_transcript_chunks
-- ============================================================================

-- Students can VIEW chunks for courses they're enrolled in
CREATE POLICY "Students can view chunks for enrolled courses"
ON session_transcript_chunks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN enrollments e ON e.course_id = ls.course_id
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE ls.id = session_transcript_chunks.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can VIEW chunks for sessions of courses they teach
CREATE POLICY "Teachers can view chunks for their sessions"
ON session_transcript_chunks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcript_chunks.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can INSERT chunks for sessions of courses they teach
CREATE POLICY "Teachers can insert chunks for their sessions"
ON session_transcript_chunks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- Teachers can UPDATE chunks for sessions of courses they teach
CREATE POLICY "Teachers can update chunks for their sessions"
ON session_transcript_chunks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_assignments ta ON ta.course_id = ls.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcript_chunks.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- Verify policies are created
-- ============================================================================
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('session_transcripts', 'session_transcript_chunks')
ORDER BY tablename, policyname;
