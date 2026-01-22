-- ============================================================================
-- MESSAGING VALIDATION FUNCTIONS
-- These functions check if users can message each other based on their relationship
-- ============================================================================

-- Drop existing if any
DROP FUNCTION IF EXISTS can_teacher_message_student(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS can_student_message_teacher(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_messaging_permission(UUID, UUID) CASCADE;

-- ============================================================================
-- 1. Check if a teacher can message a student
-- Teachers can message students who are enrolled in their courses
-- ============================================================================
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
  FROM teacher_assignments ta
  JOIN enrollments e ON e.course_id = ta.course_id
  JOIN courses c ON c.id = ta.course_id
  WHERE ta.teacher_profile_id = p_teacher_id
    AND e.student_id = p_student_id
    AND e.status = 'active';

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

-- ============================================================================
-- 2. Check if a student can message a teacher
-- Students can message teachers who teach courses they're enrolled in
-- ============================================================================
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
  FROM enrollments e
  JOIN teacher_assignments ta ON ta.course_id = e.course_id
  JOIN courses c ON c.id = e.course_id
  WHERE e.student_id = p_student_id
    AND ta.teacher_profile_id = p_teacher_id
    AND e.status = 'active';

  IF v_can_message IS NULL THEN
    v_can_message := false;
    v_reason := 'You are not enrolled in any courses taught by this teacher';
    v_quota := NULL;
  ELSE
    -- Also check quota if they can message
    v_quota := check_student_message_quota(p_student_id, p_teacher_id);

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

-- ============================================================================
-- 3. Generic validation function (determines user types automatically)
-- Uses auth.uid() to get the current user
-- ============================================================================
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
  SELECT id INTO v_from_teacher_id FROM teacher_profiles WHERE profile_id = p_from_profile_id;
  SELECT id INTO v_from_student_id FROM students WHERE profile_id = p_from_profile_id;

  -- Get recipient's role
  SELECT id INTO v_to_teacher_id FROM teacher_profiles WHERE profile_id = p_to_profile_id;
  SELECT id INTO v_to_student_id FROM students WHERE profile_id = p_to_profile_id;

  -- Validate based on sender/recipient types
  IF v_from_teacher_id IS NOT NULL AND v_to_student_id IS NOT NULL THEN
    -- Teacher messaging a student
    v_result := can_teacher_message_student(v_from_teacher_id, v_to_student_id);
    v_result := v_result || jsonb_build_object('direction', 'teacher_to_student');

  ELSIF v_from_student_id IS NOT NULL AND v_to_teacher_id IS NOT NULL THEN
    -- Student messaging a teacher
    v_result := can_student_message_teacher(v_from_student_id, v_to_teacher_id);
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
    FROM teacher_profiles t1, teacher_profiles t2
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

-- ============================================================================
-- 4. Get messageable users for current user
-- Returns list of users the current user can message
-- ============================================================================
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
  SELECT id INTO v_teacher_id FROM teacher_profiles WHERE profile_id = p_profile_id;
  SELECT id INTO v_student_id FROM students WHERE profile_id = p_profile_id;

  IF v_teacher_id IS NOT NULL THEN
    -- Teacher: return all students in their courses
    RETURN QUERY
    SELECT DISTINCT
      sp.id AS profile_id,
      sp.full_name,
      sp.avatar_url,
      'student'::TEXT AS role,
      STRING_AGG(DISTINCT c.name, ', ') AS relationship
    FROM teacher_assignments ta
    JOIN enrollments e ON e.course_id = ta.course_id     JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    JOIN courses c ON c.id = ta.course_id
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
    FROM enrollments e
    JOIN teacher_assignments ta ON ta.course_id = e.course_id
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = v_student_id     GROUP BY sp.id, sp.full_name, sp.avatar_url
    ORDER BY sp.full_name;

  ELSE
    -- Unknown user type - return empty
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_messageable_users IS 'Get list of users that the given user can message';

-- ============================================================================
-- Verify functions are created
-- ============================================================================
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'can_teacher_message_student',
  'can_student_message_teacher',
  'validate_messaging_permission',
  'get_messageable_users'
)
ORDER BY routine_name;
