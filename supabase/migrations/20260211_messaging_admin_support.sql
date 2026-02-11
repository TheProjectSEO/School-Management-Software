-- ============================================================================
-- Migration: Add admin support to messaging RPCs
-- ============================================================================

-- 1. Update get_user_conversations to detect admin partners
-- Previously only detected 'teacher' and 'student' roles
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_profile_id UUID,
  p_limit INTEGER DEFAULT 50
)
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
      CASE
        WHEN from_profile_id = p_profile_id THEN to_profile_id
        ELSE from_profile_id
      END AS partner_id,
      body,
      created_at,
      sender_type,
      is_read,
      to_profile_id
    FROM teacher_direct_messages
    WHERE from_profile_id = p_profile_id OR to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (partner_id)
      partner_id,
      body AS last_body,
      created_at AS last_at,
      sender_type AS last_sender
    FROM conversations
    ORDER BY partner_id, created_at DESC
  ),
  stats AS (
    SELECT
      partner_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE to_profile_id = p_profile_id AND is_read = false) AS unread
    FROM conversations
    GROUP BY partner_id
  )
  SELECT
    l.partner_id,
    sp.full_name,
    sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM teacher_profiles WHERE profile_id = l.partner_id) THEN 'teacher'
      WHEN EXISTS (SELECT 1 FROM students WHERE profile_id = l.partner_id) THEN 'student'
      WHEN EXISTS (SELECT 1 FROM admins WHERE profile_id = l.partner_id) THEN 'admin'
      ELSE 'unknown'
    END,
    l.last_body,
    l.last_at,
    l.last_sender,
    COALESCE(s.unread, 0),
    COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update sender_type CHECK constraint to also allow 'admin'
ALTER TABLE teacher_direct_messages
  DROP CONSTRAINT IF EXISTS teacher_direct_messages_sender_type_check;

ALTER TABLE teacher_direct_messages
  ADD CONSTRAINT teacher_direct_messages_sender_type_check
  CHECK (sender_type IN ('teacher', 'student', 'admin'));
