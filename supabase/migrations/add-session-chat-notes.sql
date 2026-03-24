-- ============================================================
-- Session Chat & Notes for Live Sessions
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Group chat messages (visible to all participants)
CREATE TABLE IF NOT EXISTS session_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  profile_id  UUID        NOT NULL,   -- school_profiles.id of sender
  sender_name TEXT        NOT NULL,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session
  ON session_messages(session_id, created_at ASC);

-- Required so Supabase Realtime can emit full row on INSERT
ALTER TABLE session_messages REPLICA IDENTITY FULL;

-- 2. Personal notes (private per user per session, auto-saved)
CREATE TABLE IF NOT EXISTS session_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  profile_id  UUID        NOT NULL,   -- school_profiles.id of note author
  content     TEXT        DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, profile_id)
);
