-- Migration 008: Student-Teacher Messaging with Student Limits
-- Description: Adds student message quota tracking (3 messages per day per teacher)
-- Schema: n8n_content_creation

-- ============================================================================
-- STUDENT MESSAGE QUOTAS TABLE
-- Purpose: Track daily message counts per student-teacher pair
-- Enforces 3 message/day limit for students
-- ============================================================================
CREATE TABLE n8n_content_creation.student_message_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES n8n_content_creation.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES n8n_content_creation.schools(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  max_messages INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one quota record per student-teacher-day combination
  CONSTRAINT unique_daily_quota UNIQUE (student_id, teacher_id, quota_date),

  -- Ensure messages_sent doesn't exceed max
  CONSTRAINT quota_not_exceeded CHECK (messages_sent <= max_messages)
);

-- Indexes for performance
CREATE INDEX idx_student_message_quotas_student ON n8n_content_creation.student_message_quotas(student_id, quota_date);
CREATE INDEX idx_student_message_quotas_teacher ON n8n_content_creation.student_message_quotas(teacher_id, quota_date);
CREATE INDEX idx_student_message_quotas_date ON n8n_content_creation.student_message_quotas(quota_date);

-- Comments
COMMENT ON TABLE n8n_content_creation.student_message_quotas IS 'Tracks daily message quotas for students (3 messages/day per teacher)';
COMMENT ON COLUMN n8n_content_creation.student_message_quotas.max_messages IS 'Maximum messages allowed per day (default 3, can be adjusted per student)';

-- ============================================================================
-- ADD SENDER TYPE TO DIRECT MESSAGES
-- Purpose: Quickly identify if message is from teacher or student
-- ============================================================================
ALTER TABLE n8n_content_creation.teacher_direct_messages
ADD COLUMN IF NOT EXISTS sender_type TEXT CHECK (sender_type IN ('teacher', 'student'));

-- Update existing messages (assume all were from teachers)
UPDATE n8n_content_creation.teacher_direct_messages
SET sender_type = 'teacher'
WHERE sender_type IS NULL;

-- Make sender_type NOT NULL after backfill
ALTER TABLE n8n_content_creation.teacher_direct_messages
ALTER COLUMN sender_type SET NOT NULL;

-- Index for sender type filtering
CREATE INDEX IF NOT EXISTS idx_teacher_direct_messages_sender_type
ON n8n_content_creation.teacher_direct_messages(sender_type);

-- ============================================================================
-- FUNCTION: Check if student can send message
-- Returns: { can_send: boolean, remaining: integer, resets_at: timestamp }
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.check_student_message_quota(
  p_student_id UUID,
  p_teacher_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_quota_record RECORD;
  v_remaining INTEGER;
  v_resets_at TIMESTAMPTZ;
BEGIN
  -- Get or create today's quota record
  SELECT * INTO v_quota_record
  FROM n8n_content_creation.student_message_quotas
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND quota_date = CURRENT_DATE;

  IF NOT FOUND THEN
    -- No record for today = full quota available
    v_remaining := 3;
  ELSE
    v_remaining := v_quota_record.max_messages - v_quota_record.messages_sent;
  END IF;

  -- Calculate when quota resets (next midnight in school timezone, default to UTC)
  v_resets_at := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;

  RETURN jsonb_build_object(
    'can_send', v_remaining > 0,
    'remaining', v_remaining,
    'used', COALESCE(v_quota_record.messages_sent, 0),
    'max', 3,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION n8n_content_creation.check_student_message_quota IS
'Checks if a student can send a message to a specific teacher (3/day limit)';

-- ============================================================================
-- FUNCTION: Increment student message quota
-- Called after successfully sending a message
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.increment_student_quota(
  p_student_id UUID,
  p_teacher_id UUID,
  p_school_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
BEGIN
  -- Upsert quota record and increment
  INSERT INTO n8n_content_creation.student_message_quotas
    (student_id, teacher_id, school_id, quota_date, messages_sent)
  VALUES
    (p_student_id, p_teacher_id, p_school_id, CURRENT_DATE, 1)
  ON CONFLICT (student_id, teacher_id, quota_date)
  DO UPDATE SET
    messages_sent = student_message_quotas.messages_sent + 1,
    updated_at = NOW()
  WHERE student_message_quotas.messages_sent < student_message_quotas.max_messages
  RETURNING messages_sent INTO v_current_count;

  -- Return true if increment was successful
  RETURN v_current_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.increment_student_quota IS
'Increments student message quota, returns false if quota exceeded';

-- ============================================================================
-- FUNCTION: Send message with quota enforcement (for students)
-- Atomic operation: checks quota, sends message, increments quota
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.send_student_message(
  p_student_id UUID,
  p_teacher_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_quota_check JSONB;
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Check quota first
  v_quota_check := n8n_content_creation.check_student_message_quota(p_student_id, p_teacher_id);

  IF NOT (v_quota_check->>'can_send')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MESSAGE_LIMIT_REACHED',
      'message', 'You have reached your daily message limit for this teacher',
      'quota', v_quota_check
    );
  END IF;

  -- Get profile IDs
  SELECT profile_id INTO v_student_profile_id
  FROM n8n_content_creation.students
  WHERE id = p_student_id;

  SELECT profile_id INTO v_teacher_profile_id
  FROM n8n_content_creation.teachers
  WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PARTICIPANTS',
      'message', 'Could not find student or teacher profile'
    );
  END IF;

  -- Insert the message
  INSERT INTO n8n_content_creation.teacher_direct_messages (
    school_id,
    from_profile_id,
    to_profile_id,
    body,
    attachments_json,
    sender_type
  ) VALUES (
    p_school_id,
    v_student_profile_id,
    v_teacher_profile_id,
    p_body,
    p_attachments,
    'student'
  ) RETURNING id INTO v_message_id;

  -- Increment quota
  PERFORM n8n_content_creation.increment_student_quota(p_student_id, p_teacher_id, p_school_id);

  -- Get updated quota
  v_quota_check := n8n_content_creation.check_student_message_quota(p_student_id, p_teacher_id);

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'quota', v_quota_check
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.send_student_message IS
'Sends a message from student to teacher with quota enforcement';

-- ============================================================================
-- FUNCTION: Send message (for teachers - no limit)
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.send_teacher_message(
  p_teacher_id UUID,
  p_student_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Get profile IDs
  SELECT profile_id INTO v_student_profile_id
  FROM n8n_content_creation.students
  WHERE id = p_student_id;

  SELECT profile_id INTO v_teacher_profile_id
  FROM n8n_content_creation.teachers
  WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PARTICIPANTS',
      'message', 'Could not find student or teacher profile'
    );
  END IF;

  -- Insert the message (no quota check for teachers)
  INSERT INTO n8n_content_creation.teacher_direct_messages (
    school_id,
    from_profile_id,
    to_profile_id,
    body,
    attachments_json,
    sender_type
  ) VALUES (
    p_school_id,
    v_teacher_profile_id,
    v_student_profile_id,
    p_body,
    p_attachments,
    'teacher'
  ) RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.send_teacher_message IS
'Sends a message from teacher to student (no quota limit)';

-- ============================================================================
-- FUNCTION: Get conversations for a user
-- Returns list of conversations with latest message and unread count
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_user_conversations(
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
    FROM n8n_content_creation.teacher_direct_messages
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
      COUNT(*) AS msg_count,
      COUNT(*) FILTER (WHERE NOT is_read AND to_profile_id = p_profile_id) AS unread
    FROM conversations
    GROUP BY partner_id
  )
  SELECT
    l.partner_id,
    p.full_name,
    p.avatar_url,
    COALESCE(
      (SELECT 'teacher' FROM n8n_content_creation.teachers WHERE profile_id = l.partner_id LIMIT 1),
      (SELECT 'student' FROM n8n_content_creation.students WHERE profile_id = l.partner_id LIMIT 1),
      'unknown'
    )::TEXT,
    l.last_body,
    l.last_at,
    l.last_sender,
    COALESCE(s.unread, 0),
    COALESCE(s.msg_count, 0)
  FROM latest_per_partner l
  JOIN n8n_content_creation.profiles p ON p.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_user_conversations IS
'Returns all conversations for a user with latest message and stats';

-- ============================================================================
-- RLS POLICIES FOR STUDENT MESSAGE QUOTAS
-- ============================================================================
ALTER TABLE n8n_content_creation.student_message_quotas ENABLE ROW LEVEL SECURITY;

-- Students can view their own quotas
CREATE POLICY student_view_own_quotas ON n8n_content_creation.student_message_quotas
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM n8n_content_creation.students
      WHERE profile_id = auth.uid()
    )
  );

-- Teachers can view quotas for their students
CREATE POLICY teacher_view_student_quotas ON n8n_content_creation.student_message_quotas
  FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM n8n_content_creation.teachers
      WHERE profile_id = auth.uid()
    )
  );

-- System can insert/update quotas (via functions with SECURITY DEFINER if needed)
CREATE POLICY system_manage_quotas ON n8n_content_creation.student_message_quotas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CLEANUP: Old quota records (run periodically via cron)
-- Keeps only last 30 days of quota records
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.cleanup_old_quotas()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM n8n_content_creation.student_message_quotas
  WHERE quota_date < CURRENT_DATE - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.cleanup_old_quotas IS
'Removes quota records older than 30 days';

-- ============================================================================
-- END OF MIGRATION 008
-- ============================================================================
