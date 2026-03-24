-- Enable Supabase Realtime for tables used by RealtimeRefresher
-- Run this once in the Supabase SQL Editor
-- Safe to run multiple times (ADD TABLE ignores already-added tables)

-- Core assessment & grading tables
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE grades;

-- Enrollment & applications
ALTER PUBLICATION supabase_realtime ADD TABLE enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE student_applications;

-- Verify: list all tables currently in the realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
