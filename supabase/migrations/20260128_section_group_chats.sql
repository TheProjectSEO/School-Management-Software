-- ============================================================================
-- SECTION GROUP CHATS MIGRATION
-- Automatically creates group chats per section with teacher and students
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE GROUP CHATS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id) -- One group chat per section
);

-- ============================================================================
-- STEP 2: CREATE GROUP CHAT MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_group_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES section_group_chats(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('teacher', 'student')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_chat_id, profile_id) -- Each member can only be in a group once
);

-- ============================================================================
-- STEP 3: CREATE GROUP CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES section_group_chats(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_section_group_chats_section ON section_group_chats(section_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chats_school ON section_group_chats(school_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_members_group ON section_group_chat_members(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_members_profile ON section_group_chat_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_messages_group ON section_group_chat_messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_messages_created ON section_group_chat_messages(created_at DESC);

-- ============================================================================
-- STEP 5: ENABLE REALTIME FOR GROUP MESSAGES
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE section_group_chat_messages;

-- ============================================================================
-- STEP 6: RLS POLICIES
-- ============================================================================
ALTER TABLE section_group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Group chats: Members can view
CREATE POLICY "Members can view group chats" ON section_group_chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM section_group_chat_members m
      WHERE m.group_chat_id = id AND m.profile_id = auth.uid()
    )
  );

-- Group members: Can view members of groups they're in
CREATE POLICY "Members can view group members" ON section_group_chat_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM section_group_chat_members m
      WHERE m.group_chat_id = group_chat_id AND m.profile_id = auth.uid()
    )
  );

-- Group messages: Members can view and insert
CREATE POLICY "Members can view group messages" ON section_group_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM section_group_chat_members m
      WHERE m.group_chat_id = group_chat_id AND m.profile_id = auth.uid()
    )
  );

CREATE POLICY "Members can send group messages" ON section_group_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM section_group_chat_members m
      WHERE m.group_chat_id = group_chat_id AND m.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: FUNCTION TO CREATE/UPDATE GROUP CHAT FOR A SECTION
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

  -- Add all students in the section as members
  INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
  SELECT v_group_chat_id, s.profile_id, 'student'
  FROM students s
  WHERE s.section_id = p_section_id
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

-- ============================================================================
-- STEP 8: FUNCTION TO GET USER'S GROUP CHATS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_group_chats(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  section_id UUID,
  name TEXT,
  description TEXT,
  section_name TEXT,
  member_count BIGINT,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.section_id,
    gc.name,
    gc.description,
    s.name as section_name,
    (SELECT COUNT(*) FROM section_group_chat_members WHERE group_chat_id = gc.id) as member_count,
    (
      SELECT m.body FROM section_group_chat_messages m
      WHERE m.group_chat_id = gc.id
      ORDER BY m.created_at DESC LIMIT 1
    ) as last_message_body,
    (
      SELECT m.created_at FROM section_group_chat_messages m
      WHERE m.group_chat_id = gc.id
      ORDER BY m.created_at DESC LIMIT 1
    ) as last_message_at,
    (
      SELECT sp.full_name FROM section_group_chat_messages m
      JOIN school_profiles sp ON m.sender_profile_id = sp.id
      WHERE m.group_chat_id = gc.id
      ORDER BY m.created_at DESC LIMIT 1
    ) as last_message_sender
  FROM section_group_chats gc
  JOIN sections s ON gc.section_id = s.id
  JOIN section_group_chat_members gcm ON gc.id = gcm.group_chat_id
  WHERE gcm.profile_id = p_profile_id
  ORDER BY last_message_at DESC NULLS LAST, gc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: FUNCTION TO GET GROUP CHAT MESSAGES
-- ============================================================================
CREATE OR REPLACE FUNCTION get_group_chat_messages(
  p_group_chat_id UUID,
  p_profile_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  sender_profile_id UUID,
  sender_name TEXT,
  sender_avatar_url TEXT,
  sender_role TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify user is a member
  IF NOT EXISTS (
    SELECT 1 FROM section_group_chat_members
    WHERE group_chat_id = p_group_chat_id AND profile_id = p_profile_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.sender_profile_id,
    sp.full_name as sender_name,
    sp.avatar_url as sender_avatar_url,
    m.sender_role,
    m.body,
    m.created_at
  FROM section_group_chat_messages m
  JOIN school_profiles sp ON m.sender_profile_id = sp.id
  WHERE m.group_chat_id = p_group_chat_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
