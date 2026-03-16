-- ============================================================
-- Section Group Chat System
-- File: 20260128_section_group_chats.sql
-- Purpose: Create tables and functions for section-based group chats
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- One group chat per section
CREATE TABLE IF NOT EXISTS section_group_chats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID        NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  school_id   UUID        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT section_group_chats_section_unique UNIQUE (section_id)
);

CREATE INDEX IF NOT EXISTS idx_section_group_chats_section ON section_group_chats(section_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chats_school  ON section_group_chats(school_id);

-- Members (students + teachers in the group)
CREATE TABLE IF NOT EXISTS section_group_chat_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID        NOT NULL REFERENCES section_group_chats(id) ON DELETE CASCADE,
  profile_id    UUID        NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  member_role   TEXT        NOT NULL CHECK (member_role IN ('teacher', 'student')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT section_group_chat_members_unique UNIQUE (group_chat_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_section_group_chat_members_group   ON section_group_chat_members(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_members_profile ON section_group_chat_members(profile_id);

-- Messages in a group chat
CREATE TABLE IF NOT EXISTS section_group_chat_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id     UUID        NOT NULL REFERENCES section_group_chats(id) ON DELETE CASCADE,
  sender_profile_id UUID        NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  sender_role       TEXT        NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  body              TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_group_chat_messages_group   ON section_group_chat_messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_section_group_chat_messages_created ON section_group_chat_messages(group_chat_id, created_at DESC);

-- ============================================================
-- 2. REALTIME
-- ============================================================

ALTER TABLE section_group_chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'section_group_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE section_group_chat_messages;
  END IF;
END $$;

-- ============================================================
-- 3. FUNCTION: create_or_update_section_group_chat
-- Creates the group chat for a section and syncs all members.
-- Called by teacher POST /api/teacher/messages/groups.
-- ============================================================

CREATE OR REPLACE FUNCTION create_or_update_section_group_chat(
  p_section_id UUID,
  p_school_id  UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_chat_id UUID;
  v_section_name  TEXT;
  v_rec           RECORD;
BEGIN
  -- Get section name
  SELECT name INTO v_section_name
  FROM sections
  WHERE id = p_section_id;

  IF v_section_name IS NULL THEN
    RAISE EXCEPTION 'Section not found: %', p_section_id;
  END IF;

  -- Upsert the group chat record
  INSERT INTO section_group_chats (section_id, school_id, name)
  VALUES (p_section_id, p_school_id, v_section_name)
  ON CONFLICT (section_id) DO UPDATE
    SET name       = EXCLUDED.name,
        updated_at = NOW()
  RETURNING id INTO v_group_chat_id;

  -- Sync students: everyone whose students.section_id = p_section_id
  FOR v_rec IN
    SELECT s.profile_id
    FROM students s
    WHERE s.section_id = p_section_id
      AND s.profile_id IS NOT NULL
  LOOP
    INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
    VALUES (v_group_chat_id, v_rec.profile_id, 'student')
    ON CONFLICT (group_chat_id, profile_id) DO NOTHING;
  END LOOP;

  -- Sync teachers: everyone assigned to this section via teacher_assignments
  -- teacher_assignments.teacher_profile_id → teacher_profiles.id
  -- teacher_profiles.profile_id → school_profiles.id
  FOR v_rec IN
    SELECT DISTINCT tp.profile_id
    FROM teacher_assignments ta
    JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
    WHERE ta.section_id = p_section_id
      AND tp.profile_id IS NOT NULL
  LOOP
    INSERT INTO section_group_chat_members (group_chat_id, profile_id, member_role)
    VALUES (v_group_chat_id, v_rec.profile_id, 'teacher')
    ON CONFLICT (group_chat_id, profile_id) DO NOTHING;
  END LOOP;

  RETURN v_group_chat_id;
END;
$$;

-- ============================================================
-- 4. FUNCTION: get_user_group_chats
-- Returns all group chats that a profile is a member of,
-- with section name, member count, and last message preview.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_group_chats(
  p_profile_id UUID
)
RETURNS TABLE (
  id                  UUID,
  section_id          UUID,
  name                TEXT,
  description         TEXT,
  section_name        TEXT,
  member_count        BIGINT,
  last_message_body   TEXT,
  last_message_at     TIMESTAMPTZ,
  last_message_sender TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.section_id,
    gc.name,
    gc.description,
    s.name                AS section_name,
    (
      SELECT COUNT(*)
      FROM   section_group_chat_members m
      WHERE  m.group_chat_id = gc.id
    )::BIGINT             AS member_count,
    lm.body               AS last_message_body,
    lm.created_at         AS last_message_at,
    sp.full_name          AS last_message_sender
  FROM section_group_chats gc
  JOIN section_group_chat_members mem
       ON mem.group_chat_id = gc.id AND mem.profile_id = p_profile_id
  JOIN sections s ON s.id = gc.section_id
  LEFT JOIN LATERAL (
    SELECT msg.body, msg.created_at, msg.sender_profile_id
    FROM   section_group_chat_messages msg
    WHERE  msg.group_chat_id = gc.id
    ORDER  BY msg.created_at DESC
    LIMIT  1
  ) lm ON true
  LEFT JOIN school_profiles sp ON sp.id = lm.sender_profile_id
  ORDER BY COALESCE(lm.created_at, gc.created_at) DESC;
END;
$$;

-- ============================================================
-- 5. FUNCTION: get_group_chat_messages
-- Returns the latest messages for a group chat.
-- Verifies that p_profile_id is a member before returning.
-- ============================================================

CREATE OR REPLACE FUNCTION get_group_chat_messages(
  p_group_chat_id UUID,
  p_profile_id    UUID,
  p_limit         INT DEFAULT 100
)
RETURNS TABLE (
  id                UUID,
  sender_profile_id UUID,
  sender_name       TEXT,
  sender_avatar_url TEXT,
  sender_role       TEXT,
  body              TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only members may read messages
  IF NOT EXISTS (
    SELECT 1
    FROM   section_group_chat_members
    WHERE  group_chat_id = p_group_chat_id
      AND  profile_id    = p_profile_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this group chat';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.sender_profile_id,
    sp.full_name  AS sender_name,
    sp.avatar_url AS sender_avatar_url,
    m.sender_role,
    m.body,
    m.created_at
  FROM section_group_chat_messages m
  JOIN school_profiles sp ON sp.id = m.sender_profile_id
  WHERE m.group_chat_id = p_group_chat_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 6. VERIFICATION
-- ============================================================

SELECT 'Tables created:' AS info;
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN (
    'section_group_chats',
    'section_group_chat_members',
    'section_group_chat_messages'
  );

SELECT 'Functions created:' AS info;
SELECT routine_name
FROM   information_schema.routines
WHERE  routine_schema = 'public'
  AND  routine_name IN (
    'create_or_update_section_group_chat',
    'get_user_group_chats',
    'get_group_chat_messages'
  );
