-- ============================================================================
-- Migration: Fix group chat student sync to include enrolled students
-- Previously only added students with students.section_id = section,
-- but some students are linked to sections only via the enrollments table.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_or_update_section_group_chat(
  p_section_id UUID,
  p_school_id UUID
) RETURNS UUID AS $$
DECLARE
  v_group_chat_id UUID;
  v_section_name TEXT;
BEGIN
  -- Get section name
  SELECT name INTO v_section_name FROM sections WHERE id = p_section_id;

  -- Create or get existing group chat
  INSERT INTO section_group_chats (section_id, school_id, name, description)
  VALUES (
    p_section_id,
    p_school_id,
    v_section_name || ' Group Chat',
    'Section group chat for ' || v_section_name
  )
  ON CONFLICT (section_id) DO UPDATE SET
    name = v_section_name || ' Group Chat',
    updated_at = NOW()
  RETURNING id INTO v_group_chat_id;

  -- Add students whose home section matches (students.section_id)
  INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
  SELECT v_group_chat_id, s.profile_id, 'student'
  FROM students s
  WHERE s.section_id = p_section_id
  ON CONFLICT (group_chat_id, profile_id) DO NOTHING;

  -- Also add students enrolled in any course under this section (via enrollments table)
  -- This catches students whose students.section_id may not be set but who are
  -- enrolled in courses for this section
  INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
  SELECT DISTINCT v_group_chat_id, s.profile_id, 'student'
  FROM enrollments e
  JOIN students s ON s.id = e.student_id
  WHERE e.section_id = p_section_id
    AND e.status IN ('active', 'approved', 'pending')
  ON CONFLICT (group_chat_id, profile_id) DO NOTHING;

  -- Add all teachers assigned to the section as members
  INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
  SELECT DISTINCT v_group_chat_id, tp.profile_id, 'teacher'
  FROM teacher_assignments ta
  JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
  WHERE ta.section_id = p_section_id
  ON CONFLICT (group_chat_id, profile_id) DO NOTHING;

  RETURN v_group_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
