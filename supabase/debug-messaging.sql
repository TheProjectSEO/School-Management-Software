-- ============================================================================
-- MESSAGING DEBUG SCRIPT
-- Run this to check if messaging is set up correctly
-- ============================================================================

-- 1. Check if required functions exist
SELECT '1. CHECKING FUNCTIONS' as step;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_unread_count',
  'mark_messages_delivered',
  'mark_messages_read',
  'send_teacher_message',
  'send_student_message',
  'check_student_message_quota',
  'get_user_conversations',
  'get_conversation',
  'get_student_profile_by_id'
)
ORDER BY routine_name;

-- 2. Check if tables exist
SELECT '2. CHECKING TABLES' as step;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('teacher_direct_messages', 'student_message_quotas');

-- 3. Check RLS policies on teacher_direct_messages
SELECT '3. CHECKING RLS POLICIES' as step;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'teacher_direct_messages';

-- 4. Check if RLS is enabled
SELECT '4. CHECKING RLS STATUS' as step;
SELECT
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname IN ('teacher_direct_messages', 'student_message_quotas');

-- 5. Check for existing messages (limited to 10)
SELECT '5. SAMPLE MESSAGES (last 10)' as step;
SELECT
  id,
  sender_type,
  from_profile_id,
  to_profile_id,
  LEFT(body, 50) as body_preview,
  is_read,
  created_at
FROM public.teacher_direct_messages
ORDER BY created_at DESC
LIMIT 10;

-- 6. Test get_conversation function with dummy UUIDs
-- Replace these with actual profile IDs to test
SELECT '6. TESTING get_conversation FUNCTION' as step;
-- This will fail if the function doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'get_conversation' AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE 'get_conversation function EXISTS';
  ELSE
    RAISE NOTICE 'get_conversation function DOES NOT EXIST - Run complete-messaging-setup.sql!';
  END IF;
END $$;

-- 7. Test get_student_profile_by_id function
SELECT '7. TESTING get_student_profile_by_id FUNCTION' as step;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'get_student_profile_by_id' AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE 'get_student_profile_by_id function EXISTS';
  ELSE
    RAISE NOTICE 'get_student_profile_by_id function DOES NOT EXIST - Run complete-messaging-setup.sql!';
  END IF;
END $$;

-- ============================================================================
-- IF ANY FUNCTIONS ARE MISSING:
-- Run the complete-messaging-setup.sql script in Supabase SQL Editor
-- ============================================================================
