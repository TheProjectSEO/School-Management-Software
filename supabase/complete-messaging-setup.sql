-- ============================================================================
-- COMPLETE MESSAGING SYSTEM SETUP
-- Run this entire script in Supabase SQL Editor to set up all messaging
-- functions and tables. This is a combined script that includes all fixes.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES (if they don't exist)
-- ============================================================================

-- Teacher direct messages table
CREATE TABLE IF NOT EXISTS teacher_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'student')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student message quotas table (3 messages per day per teacher)
CREATE TABLE IF NOT EXISTS student_message_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  max_messages INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, teacher_id, quota_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tdm_from_profile ON teacher_direct_messages(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_tdm_to_profile ON teacher_direct_messages(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_tdm_school ON teacher_direct_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_tdm_created_at ON teacher_direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smq_student_teacher_date ON student_message_quotas(student_id, teacher_id, quota_date);

-- Add delivered_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_direct_messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE teacher_direct_messages ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP EXISTING FUNCTIONS (to ensure clean recreation)
-- ============================================================================

DROP FUNCTION IF EXISTS get_unread_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_delivered(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS send_teacher_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_student_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS check_student_message_quota(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_conversation(UUID, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_student_profile_by_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_teacher_message_student(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS can_student_message_teacher(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_messaging_permission(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_messageable_users(UUID) CASCADE;

-- ============================================================================
-- STEP 3: CREATE RPC FUNCTIONS
-- ============================================================================

-- Get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_profile_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.teacher_direct_messages
  WHERE to_profile_id = p_profile_id AND is_read = false;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_count IS 'Get unread message count for a user';

-- Mark messages as delivered (when user opens conversation)
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.teacher_direct_messages
  SET delivered_at = COALESCE(delivered_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND delivered_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_messages_delivered IS 'Mark messages from a partner as delivered';

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.teacher_direct_messages
  SET is_read = true, read_at = COALESCE(read_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_messages_read IS 'Mark messages from a partner as read';

-- Check student message quota
CREATE OR REPLACE FUNCTION check_student_message_quota(p_student_id UUID, p_teacher_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
BEGIN
  SELECT * INTO v_quota FROM public.student_message_quotas
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id AND quota_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_send', true,
      'remaining', 3,
      'used', 0,
      'max', 3,
      'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    );
  END IF;

  RETURN jsonb_build_object(
    'can_send', v_quota.messages_sent < v_quota.max_messages,
    'remaining', v_quota.max_messages - v_quota.messages_sent,
    'used', v_quota.messages_sent,
    'max', v_quota.max_messages,
    'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION check_student_message_quota IS 'Check how many messages a student can send to a teacher today';

-- Send student message (with quota enforcement)
CREATE OR REPLACE FUNCTION send_student_message(
  p_student_id UUID,
  p_teacher_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_quota JSONB;
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Check quota first
  v_quota := public.check_student_message_quota(p_student_id, p_teacher_id);
  IF NOT (v_quota->>'can_send')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily message limit reached', 'quota', v_quota);
  END IF;

  -- Get profile IDs (explicit public schema)
  SELECT profile_id INTO v_student_profile_id FROM public.students WHERE id = p_student_id;
  SELECT profile_id INTO v_teacher_profile_id FROM public.teacher_profiles WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid student or teacher');
  END IF;

  -- Insert the message
  INSERT INTO public.teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_student_profile_id, v_teacher_profile_id, 'student', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  -- Update or insert quota
  INSERT INTO public.student_message_quotas (student_id, teacher_id, school_id, quota_date, messages_sent)
  VALUES (p_student_id, p_teacher_id, p_school_id, CURRENT_DATE, 1)
  ON CONFLICT (student_id, teacher_id, quota_date)
  DO UPDATE SET messages_sent = public.student_message_quotas.messages_sent + 1;

  -- Get updated quota
  v_quota := public.check_student_message_quota(p_student_id, p_teacher_id);

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'quota', v_quota);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_student_message IS 'Send a message from student to teacher with quota enforcement';

-- Send teacher message (no quota limit)
CREATE OR REPLACE FUNCTION send_teacher_message(
  p_teacher_id UUID,
  p_student_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_profile_id UUID;
  v_student_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Get profile IDs (explicit public schema)
  SELECT profile_id INTO v_teacher_profile_id FROM public.teacher_profiles WHERE id = p_teacher_id;
  SELECT profile_id INTO v_student_profile_id FROM public.students WHERE id = p_student_id;

  IF v_teacher_profile_id IS NULL OR v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid teacher or student');
  END IF;

  -- Insert the message
  INSERT INTO public.teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_teacher_profile_id, v_student_profile_id, 'teacher', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_teacher_message IS 'Send a message from teacher to student';

-- Get user conversations list
CREATE OR REPLACE FUNCTION get_user_conversations(p_profile_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  partner_profile_id UUID,
  partner_name TEXT,
  partner_avatar_url TEXT,
  partner_role TEXT,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_type TEXT,
  unread_count BIGINT,
  total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CASE WHEN tdm.from_profile_id = p_profile_id THEN tdm.to_profile_id ELSE tdm.from_profile_id END AS partner_id,
      tdm.body, tdm.created_at, tdm.sender_type, tdm.is_read, tdm.to_profile_id
    FROM public.teacher_direct_messages tdm
    WHERE tdm.from_profile_id = p_profile_id OR tdm.to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (c.partner_id)
      c.partner_id,
      c.body AS last_body,
      c.created_at AS last_at,
      c.sender_type AS last_sender
    FROM conversations c
    ORDER BY c.partner_id, c.created_at DESC
  ),
  stats AS (
    SELECT
      c.partner_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE c.to_profile_id = p_profile_id AND c.is_read = false) AS unread
    FROM conversations c
    GROUP BY c.partner_id
  )
  SELECT
    l.partner_id,
    sp.full_name,
    sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.profile_id = l.partner_id) THEN 'teacher'::TEXT
      WHEN EXISTS (SELECT 1 FROM public.students st WHERE st.profile_id = l.partner_id) THEN 'student'::TEXT
      ELSE 'unknown'::TEXT
    END,
    l.last_body,
    l.last_at,
    l.last_sender,
    COALESCE(s.unread, 0),
    COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN public.school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_conversations IS 'Get list of conversations for a user with last message and unread count';

-- Get conversation messages between two users
CREATE OR REPLACE FUNCTION get_conversation(
  p_profile_1 UUID,
  p_profile_2 UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.teacher_direct_messages AS $$
  SELECT * FROM public.teacher_direct_messages
  WHERE (from_profile_id = p_profile_1 AND to_profile_id = p_profile_2)
     OR (from_profile_id = p_profile_2 AND to_profile_id = p_profile_1)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_conversation IS 'Get messages between two users';

-- Get student profile by student ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_student_profile_by_id(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  school_id UUID,
  section_id UUID,
  grade_level TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.profile_id, s.school_id, s.section_id, s.grade_level, sp.full_name, sp.avatar_url
  FROM public.students s
  JOIN public.school_profiles sp ON sp.id = s.profile_id
  WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_student_profile_by_id IS 'Get student profile data by student ID';

-- ============================================================================
-- STEP 4: MESSAGING VALIDATION FUNCTIONS
-- ============================================================================

-- Check if a teacher can message a student
CREATE OR REPLACE FUNCTION can_teacher_message_student(
  p_teacher_id UUID,
  p_student_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_can_message BOOLEAN := false;
  v_reason TEXT := 'No relationship found';
  v_shared_courses TEXT[];
BEGIN
  -- Check if student is enrolled in any course taught by this teacher
  SELECT
    true,
    'Student is enrolled in teacher''s course(s)',
    ARRAY_AGG(DISTINCT c.name)
  INTO v_can_message, v_reason, v_shared_courses
  FROM public.teacher_assignments ta
  JOIN public.enrollments e ON e.course_id = ta.course_id
  JOIN public.courses c ON c.id = ta.course_id
  WHERE ta.teacher_profile_id = p_teacher_id
    AND e.student_id = p_student_id;

  IF v_can_message IS NULL THEN
    v_can_message := false;
    v_reason := 'Student is not enrolled in any of your courses';
  END IF;

  RETURN jsonb_build_object(
    'can_message', v_can_message,
    'reason', v_reason,
    'shared_courses', COALESCE(v_shared_courses, ARRAY[]::TEXT[])
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_teacher_message_student IS 'Check if a teacher can message a student (based on course enrollment)';

-- Check if a student can message a teacher
CREATE OR REPLACE FUNCTION can_student_message_teacher(
  p_student_id UUID,
  p_teacher_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_can_message BOOLEAN := false;
  v_reason TEXT := 'No relationship found';
  v_shared_courses TEXT[];
  v_quota JSONB;
BEGIN
  -- Check if student is enrolled in any course taught by this teacher
  SELECT
    true,
    'You are enrolled in this teacher''s course(s)',
    ARRAY_AGG(DISTINCT c.name)
  INTO v_can_message, v_reason, v_shared_courses
  FROM public.enrollments e
  JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
  JOIN public.courses c ON c.id = e.course_id
  WHERE e.student_id = p_student_id
    AND ta.teacher_profile_id = p_teacher_id;

  IF v_can_message IS NULL THEN
    v_can_message := false;
    v_reason := 'You are not enrolled in any courses taught by this teacher';
    v_quota := NULL;
  ELSE
    -- Also check quota if they can message
    v_quota := public.check_student_message_quota(p_student_id, p_teacher_id);

    -- Override can_message if quota is exhausted
    IF NOT (v_quota->>'can_send')::boolean THEN
      v_can_message := false;
      v_reason := 'Daily message limit reached (3 messages per day to this teacher)';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_message', v_can_message,
    'reason', v_reason,
    'shared_courses', COALESCE(v_shared_courses, ARRAY[]::TEXT[]),
    'quota', v_quota
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_student_message_teacher IS 'Check if a student can message a teacher (based on enrollment + quota)';

-- Generic validation function (determines user types automatically)
CREATE OR REPLACE FUNCTION validate_messaging_permission(
  p_from_profile_id UUID,
  p_to_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_from_teacher_id UUID;
  v_from_student_id UUID;
  v_to_teacher_id UUID;
  v_to_student_id UUID;
  v_result JSONB;
BEGIN
  -- Get sender's role
  SELECT id INTO v_from_teacher_id FROM public.teacher_profiles WHERE profile_id = p_from_profile_id;
  SELECT id INTO v_from_student_id FROM public.students WHERE profile_id = p_from_profile_id;

  -- Get recipient's role
  SELECT id INTO v_to_teacher_id FROM public.teacher_profiles WHERE profile_id = p_to_profile_id;
  SELECT id INTO v_to_student_id FROM public.students WHERE profile_id = p_to_profile_id;

  -- Validate based on sender/recipient types
  IF v_from_teacher_id IS NOT NULL AND v_to_student_id IS NOT NULL THEN
    -- Teacher messaging a student
    v_result := public.can_teacher_message_student(v_from_teacher_id, v_to_student_id);
    v_result := v_result || jsonb_build_object('direction', 'teacher_to_student');

  ELSIF v_from_student_id IS NOT NULL AND v_to_teacher_id IS NOT NULL THEN
    -- Student messaging a teacher
    v_result := public.can_student_message_teacher(v_from_student_id, v_to_teacher_id);
    v_result := v_result || jsonb_build_object('direction', 'student_to_teacher');

  ELSIF v_from_teacher_id IS NOT NULL AND v_to_teacher_id IS NOT NULL THEN
    -- Teacher messaging another teacher (same school check)
    SELECT jsonb_build_object(
      'can_message', t1.school_id = t2.school_id,
      'reason', CASE
        WHEN t1.school_id = t2.school_id THEN 'Both teachers are in the same school'
        ELSE 'Teachers are in different schools'
      END,
      'direction', 'teacher_to_teacher'
    ) INTO v_result
    FROM public.teacher_profiles t1, public.teacher_profiles t2
    WHERE t1.id = v_from_teacher_id AND t2.id = v_to_teacher_id;

  ELSE
    -- Unknown or invalid combination
    v_result := jsonb_build_object(
      'can_message', false,
      'reason', 'Invalid sender or recipient',
      'direction', 'unknown'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION validate_messaging_permission IS 'Validate if one user can message another based on their roles and relationships';

-- Get messageable users for a given user
CREATE OR REPLACE FUNCTION get_messageable_users(p_profile_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  relationship TEXT
) AS $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
BEGIN
  -- Check if user is teacher or student
  SELECT id INTO v_teacher_id FROM public.teacher_profiles WHERE profile_id = p_profile_id;
  SELECT id INTO v_student_id FROM public.students WHERE profile_id = p_profile_id;

  IF v_teacher_id IS NOT NULL THEN
    -- Teacher: return all students in their courses
    RETURN QUERY
    SELECT DISTINCT
      sp.id AS profile_id,
      sp.full_name,
      sp.avatar_url,
      'student'::TEXT AS role,
      STRING_AGG(DISTINCT c.name, ', ') AS relationship
    FROM public.teacher_assignments ta
    JOIN public.enrollments e ON e.course_id = ta.course_id
    JOIN public.students s ON s.id = e.student_id
    JOIN public.school_profiles sp ON sp.id = s.profile_id
    JOIN public.courses c ON c.id = ta.course_id
    WHERE ta.teacher_profile_id = v_teacher_id
    GROUP BY sp.id, sp.full_name, sp.avatar_url
    ORDER BY sp.full_name;

  ELSIF v_student_id IS NOT NULL THEN
    -- Student: return all teachers of their enrolled courses
    RETURN QUERY
    SELECT DISTINCT
      sp.id AS profile_id,
      sp.full_name,
      sp.avatar_url,
      'teacher'::TEXT AS role,
      STRING_AGG(DISTINCT c.name, ', ') AS relationship
    FROM public.enrollments e
    JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
    JOIN public.teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN public.school_profiles sp ON sp.id = tp.profile_id
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = v_student_id
    GROUP BY sp.id, sp.full_name, sp.avatar_url
    ORDER BY sp.full_name;

  ELSE
    -- Unknown user type - return empty
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_messageable_users IS 'Get list of users that the given user can message';

-- ============================================================================
-- STEP 5: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

ALTER TABLE teacher_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_message_quotas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read their own messages" ON teacher_direct_messages;
DROP POLICY IF EXISTS "Users can insert messages they send" ON teacher_direct_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON teacher_direct_messages;
DROP POLICY IF EXISTS "Students can view their quotas" ON student_message_quotas;

-- Create policies
CREATE POLICY "Users can read their own messages"
ON public.teacher_direct_messages FOR SELECT
TO authenticated
USING (
  from_profile_id IN (
    SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid()
  )
  OR to_profile_id IN (
    SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages they send"
ON public.teacher_direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  from_profile_id IN (
    SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their received messages"
ON public.teacher_direct_messages FOR UPDATE
TO authenticated
USING (
  to_profile_id IN (
    SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Students can view their quotas"
ON public.student_message_quotas FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_delivered(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_student_message_quota(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_student_message(UUID, UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_teacher_message(UUID, UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_profile_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_teacher_message_student(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_student_message_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_messaging_permission(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messageable_users(UUID) TO authenticated;

-- ============================================================================
-- STEP 7: VERIFY FUNCTIONS ARE CREATED
-- ============================================================================

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
  'get_student_profile_by_id',
  'can_teacher_message_student',
  'can_student_message_teacher',
  'validate_messaging_permission',
  'get_messageable_users'
)
ORDER BY routine_name;

-- ============================================================================
-- DONE! You should see 13 functions listed above if successful.
-- ============================================================================

-- ============================================================================
-- STEP 8: ENABLE REALTIME FOR MESSAGING TABLE
-- This is required for SSE/realtime to work
-- ============================================================================

-- Set replica identity to FULL so realtime filters work correctly
-- This is CRITICAL for postgres_changes filters to work
ALTER TABLE public.teacher_direct_messages REPLICA IDENTITY FULL;

-- Enable realtime for teacher_direct_messages
-- Note: This might error if already added, which is fine
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_direct_messages;
  RAISE NOTICE 'Realtime enabled for teacher_direct_messages';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Realtime already enabled for teacher_direct_messages';
END $$;

-- Verify realtime is enabled
SELECT 'REALTIME STATUS:' as info;
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'teacher_direct_messages';

-- Verify replica identity
SELECT 'REPLICA IDENTITY:' as info;
SELECT c.relname as table_name,
       CASE c.relreplident
         WHEN 'd' THEN 'default'
         WHEN 'n' THEN 'nothing'
         WHEN 'f' THEN 'full'
         WHEN 'i' THEN 'index'
       END as replica_identity
FROM pg_class c
WHERE c.relname = 'teacher_direct_messages';

-- ============================================================================
-- STEP 9: ENABLE REALTIME FOR ANNOUNCEMENTS TABLES
-- This is required for SSE/realtime announcements to work
-- ============================================================================

-- Set replica identity to FULL for announcements tables
ALTER TABLE public.teacher_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.announcement_reads REPLICA IDENTITY FULL;

-- Enable realtime for teacher_announcements
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_announcements;
  RAISE NOTICE 'Realtime enabled for teacher_announcements';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Realtime already enabled for teacher_announcements';
END $$;

-- Enable realtime for announcement_reads
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
  RAISE NOTICE 'Realtime enabled for announcement_reads';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Realtime already enabled for announcement_reads';
END $$;

-- Verify realtime is enabled for announcement tables
SELECT 'ANNOUNCEMENTS REALTIME STATUS:' as info;
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('teacher_announcements', 'announcement_reads');

-- Verify replica identity for announcement tables
SELECT 'ANNOUNCEMENTS REPLICA IDENTITY:' as info;
SELECT c.relname as table_name,
       CASE c.relreplident
         WHEN 'd' THEN 'default'
         WHEN 'n' THEN 'nothing'
         WHEN 'f' THEN 'full'
         WHEN 'i' THEN 'index'
       END as replica_identity
FROM pg_class c
WHERE c.relname IN ('teacher_announcements', 'announcement_reads');

-- ============================================================================
-- ALL DONE! Messaging and Announcements systems are now fully configured.
-- ============================================================================
