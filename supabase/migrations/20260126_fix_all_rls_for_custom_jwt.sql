-- ============================================================================
-- FIX ALL RLS POLICIES FOR CUSTOM JWT AUTHENTICATION
-- Since this system uses custom JWT auth (not Supabase Auth), auth.uid() won't work
-- We need permissive policies that allow the application to enforce authorization
-- ============================================================================

-- 1. teacher_live_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_live_sessions') THEN
    DROP POLICY IF EXISTS "Allow all on teacher_live_sessions" ON teacher_live_sessions;
    CREATE POLICY "Allow all on teacher_live_sessions" ON teacher_live_sessions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. live_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'live_sessions') THEN
    DROP POLICY IF EXISTS "Allow all on live_sessions" ON live_sessions;
    CREATE POLICY "Allow all on live_sessions" ON live_sessions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. session_transcripts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_transcripts') THEN
    DROP POLICY IF EXISTS "Allow all on session_transcripts" ON session_transcripts;
    CREATE POLICY "Allow all on session_transcripts" ON session_transcripts FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. enrollments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enrollments') THEN
    DROP POLICY IF EXISTS "Allow all on enrollments" ON enrollments;
    CREATE POLICY "Allow all on enrollments" ON enrollments FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. assessments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessments') THEN
    DROP POLICY IF EXISTS "Allow all on assessments" ON assessments;
    CREATE POLICY "Allow all on assessments" ON assessments FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. submissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'submissions') THEN
    DROP POLICY IF EXISTS "Allow all on submissions" ON submissions;
    CREATE POLICY "Allow all on submissions" ON submissions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. modules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'modules') THEN
    DROP POLICY IF EXISTS "Allow all on modules" ON modules;
    CREATE POLICY "Allow all on modules" ON modules FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. lessons
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lessons') THEN
    DROP POLICY IF EXISTS "Allow all on lessons" ON lessons;
    CREATE POLICY "Allow all on lessons" ON lessons FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. direct_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'direct_messages') THEN
    DROP POLICY IF EXISTS "Allow all on direct_messages" ON direct_messages;
    CREATE POLICY "Allow all on direct_messages" ON direct_messages FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
    CREATE POLICY "Allow all on notifications" ON notifications FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 11. grading_periods
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grading_periods') THEN
    DROP POLICY IF EXISTS "Allow all on grading_periods" ON grading_periods;
    CREATE POLICY "Allow all on grading_periods" ON grading_periods FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 12. grades
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grades') THEN
    DROP POLICY IF EXISTS "Allow all on grades" ON grades;
    CREATE POLICY "Allow all on grades" ON grades FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 13. teacher_daily_attendance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_daily_attendance') THEN
    DROP POLICY IF EXISTS "Allow all on teacher_daily_attendance" ON teacher_daily_attendance;
    CREATE POLICY "Allow all on teacher_daily_attendance" ON teacher_daily_attendance FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 14. lesson_progress (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_progress') THEN
    DROP POLICY IF EXISTS "Allow all on lesson_progress" ON lesson_progress;
    CREATE POLICY "Allow all on lesson_progress" ON lesson_progress FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 15. session_attendance (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_attendance') THEN
    DROP POLICY IF EXISTS "Allow all on session_attendance" ON session_attendance;
    CREATE POLICY "Allow all on session_attendance" ON session_attendance FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: List all policies created
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'Allow all on%'
ORDER BY tablename;
