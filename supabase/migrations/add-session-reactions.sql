-- ============================================================
-- Session Reactions for Live Sessions
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS session_reactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reaction_type TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 seconds',
  CONSTRAINT valid_reaction_type CHECK (
    reaction_type IN ('raise_hand', 'thumbs_up', 'clap', 'confused', 'speed_up', 'slow_down')
  )
);

CREATE INDEX IF NOT EXISTS idx_session_reactions_session
  ON session_reactions(session_id, expires_at);

-- Required so Supabase Realtime can emit full row on INSERT
ALTER TABLE session_reactions REPLICA IDENTITY FULL;
