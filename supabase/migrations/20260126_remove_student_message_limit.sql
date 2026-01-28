-- ============================================================================
-- REMOVE STUDENT MESSAGE LIMIT
-- Description: Removes the 3 messages per day limit for students
-- ============================================================================

-- Update check_student_message_quota to always return unlimited
CREATE OR REPLACE FUNCTION check_student_message_quota(p_student_id UUID, p_teacher_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Always allow unlimited messages
  RETURN jsonb_build_object(
    'can_send', true,
    'remaining', 999999,
    'used', 0,
    'max', 999999,
    'resets_at', NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update send_student_message to not check quota (send directly like teacher)
CREATE OR REPLACE FUNCTION send_student_message(
  p_student_id UUID, p_teacher_id UUID, p_school_id UUID, p_body TEXT, p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Get profile IDs
  SELECT profile_id INTO v_student_profile_id FROM students WHERE id = p_student_id;
  SELECT profile_id INTO v_teacher_profile_id FROM teacher_profiles WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid student or teacher');
  END IF;

  -- Insert message directly (no quota check)
  INSERT INTO teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_student_profile_id, v_teacher_profile_id, 'student', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'quota', jsonb_build_object('can_send', true, 'remaining', 999999, 'used', 0, 'max', 999999, 'resets_at', NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify functions are updated
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_student_message_quota', 'send_student_message');
