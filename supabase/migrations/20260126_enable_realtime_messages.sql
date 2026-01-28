-- ============================================================================
-- ENABLE REALTIME FOR MESSAGING TABLES
-- Description: Ensures real-time subscriptions work for teacher_direct_messages
-- ============================================================================

-- Enable realtime for teacher_direct_messages table
-- This is required for Supabase Realtime postgres_changes to work
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_direct_messages;

-- Also enable for other messaging-related tables if they exist
DO $$
BEGIN
  -- Check if announcements table exists and add to realtime
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teacher_announcements;
  END IF;

  -- Check if student_notifications table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE student_notifications;
  END IF;

  -- Check if applications table exists (for admin notifications)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE applications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
END $$;

-- Verify realtime is enabled
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
