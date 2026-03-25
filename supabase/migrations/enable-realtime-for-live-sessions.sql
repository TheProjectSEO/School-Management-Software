-- ============================================================
-- Enable Supabase Realtime for Live Session tables
-- Run in Supabase SQL Editor
--
-- Required for:
--   - useLiveSessionChat  → postgres_changes on session_messages
--   - useLiveReactions    → postgres_changes on session_reactions
--
-- REPLICA IDENTITY FULL lets Realtime include the full row in events.
-- ALTER PUBLICATION adds the table to the supabase_realtime publication
-- so the Realtime server actually emits change events for it.
-- ============================================================

-- Ensure REPLICA IDENTITY FULL (idempotent)
ALTER TABLE session_messages  REPLICA IDENTITY FULL;
ALTER TABLE session_reactions REPLICA IDENTITY FULL;

-- Add tables to the Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- session_messages
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'session_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
    END IF;

    -- session_reactions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'session_reactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE session_reactions;
    END IF;
  END IF;
END $$;
