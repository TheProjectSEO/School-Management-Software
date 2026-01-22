-- ============================================================================
-- MESSAGING RPC FUNCTIONS ONLY
-- Run this if the main script fails - it creates just the RPC functions
-- assuming the tables already exist.
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_unread_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_delivered(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS send_teacher_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_student_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS check_student_message_quota(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_conversation(UUID, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_student_profile_by_id(UUID) CASCADE;

-- Get unread count
CREATE OR REPLACE FUNCTION get_unread_count(p_profile_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM teacher_direct_messages WHERE to_profile_id = p_profile_id AND is_read = false;
$$ LANGUAGE sql STABLE;

-- Mark messages as delivered (when user opens conversation)
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE teacher_direct_messages
  SET delivered_at = COALESCE(delivered_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND delivered_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE teacher_direct_messages
  SET is_read = true, read_at = COALESCE(read_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check student message quota
CREATE OR REPLACE FUNCTION check_student_message_quota(p_student_id UUID, p_teacher_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
BEGIN
  SELECT * INTO v_quota FROM student_message_quotas
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id AND quota_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_send', true, 'remaining', 3, 'used', 0, 'max', 3, 'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz);
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

-- Send student message (with quota)
CREATE OR REPLACE FUNCTION send_student_message(
  p_student_id UUID, p_teacher_id UUID, p_school_id UUID, p_body TEXT, p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_quota JSONB;
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  v_quota := check_student_message_quota(p_student_id, p_teacher_id);
  IF NOT (v_quota->>'can_send')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily message limit reached', 'quota', v_quota);
  END IF;

  SELECT profile_id INTO v_student_profile_id FROM students WHERE id = p_student_id;
  SELECT profile_id INTO v_teacher_profile_id FROM teacher_profiles WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid student or teacher');
  END IF;

  INSERT INTO teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_student_profile_id, v_teacher_profile_id, 'student', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  INSERT INTO student_message_quotas (student_id, teacher_id, school_id, quota_date, messages_sent)
  VALUES (p_student_id, p_teacher_id, p_school_id, CURRENT_DATE, 1)
  ON CONFLICT (student_id, teacher_id, quota_date) DO UPDATE SET messages_sent = student_message_quotas.messages_sent + 1;

  v_quota := check_student_message_quota(p_student_id, p_teacher_id);
  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'quota', v_quota);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send teacher message (no quota)
CREATE OR REPLACE FUNCTION send_teacher_message(
  p_teacher_id UUID, p_student_id UUID, p_school_id UUID, p_body TEXT, p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_profile_id UUID;
  v_student_profile_id UUID;
  v_message_id UUID;
BEGIN
  SELECT profile_id INTO v_teacher_profile_id FROM teacher_profiles WHERE id = p_teacher_id;
  SELECT profile_id INTO v_student_profile_id FROM students WHERE id = p_student_id;

  IF v_teacher_profile_id IS NULL OR v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid teacher or student');
  END IF;

  INSERT INTO teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_teacher_profile_id, v_student_profile_id, 'teacher', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user conversations
CREATE OR REPLACE FUNCTION get_user_conversations(p_profile_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  partner_profile_id UUID, partner_name TEXT, partner_avatar_url TEXT, partner_role TEXT,
  last_message_body TEXT, last_message_at TIMESTAMPTZ, last_message_sender_type TEXT,
  unread_count BIGINT, total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CASE WHEN tdm.from_profile_id = p_profile_id THEN tdm.to_profile_id ELSE tdm.from_profile_id END AS partner_id,
      tdm.body, tdm.created_at, tdm.sender_type, tdm.is_read, tdm.to_profile_id
    FROM teacher_direct_messages tdm
    WHERE tdm.from_profile_id = p_profile_id OR tdm.to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (c.partner_id) c.partner_id, c.body AS last_body, c.created_at AS last_at, c.sender_type AS last_sender
    FROM conversations c ORDER BY c.partner_id, c.created_at DESC
  ),
  stats AS (
    SELECT c.partner_id, COUNT(*) AS total,
      COUNT(*) FILTER (WHERE c.to_profile_id = p_profile_id AND c.is_read = false) AS unread
    FROM conversations c GROUP BY c.partner_id
  )
  SELECT l.partner_id, sp.full_name, sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM teacher_profiles tp WHERE tp.profile_id = l.partner_id) THEN 'teacher'::TEXT
      WHEN EXISTS (SELECT 1 FROM students st WHERE st.profile_id = l.partner_id) THEN 'student'::TEXT
      ELSE 'unknown'::TEXT
    END,
    l.last_body, l.last_at, l.last_sender, COALESCE(s.unread, 0), COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get conversation messages
CREATE OR REPLACE FUNCTION get_conversation(p_profile_1 UUID, p_profile_2 UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS SETOF teacher_direct_messages AS $$
  SELECT * FROM teacher_direct_messages
  WHERE (from_profile_id = p_profile_1 AND to_profile_id = p_profile_2)
     OR (from_profile_id = p_profile_2 AND to_profile_id = p_profile_1)
  ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- Get student profile by ID
CREATE OR REPLACE FUNCTION get_student_profile_by_id(p_student_id UUID)
RETURNS TABLE (id UUID, profile_id UUID, school_id UUID, section_id UUID, grade_level TEXT, full_name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.profile_id, s.school_id, s.section_id, s.grade_level, sp.full_name, sp.avatar_url
  FROM students s JOIN school_profiles sp ON sp.id = s.profile_id WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Verify functions are created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_unread_count',
  'mark_messages_delivered',
  'mark_messages_read',
  'send_teacher_message',
  'send_student_message',
  'get_user_conversations',
  'get_conversation',
  'get_student_profile_by_id'
)
ORDER BY routine_name;
