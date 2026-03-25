-- ============================================================
-- Fix Live Session Permissions for Supabase Realtime + anon reads
-- Run in Supabase SQL Editor
--
-- WHY THIS IS NEEDED:
--   useLiveSessionChat and useLiveReactions hooks use the browser
--   Supabase client (anon key) to:
--     1. Fetch initial data directly from the table
--     2. Subscribe to postgres_changes via Supabase Realtime
--
--   For both to work, the anon role needs SELECT on these tables
--   AND the tables must be in the supabase_realtime publication.
--
--   Without this, the teacher sees no reactions and chat Realtime
--   is silent even though inserts are succeeding server-side.
-- ============================================================

-- ── session_reactions ─────────────────────────────────────
ALTER TABLE session_reactions REPLICA IDENTITY FULL;
ALTER TABLE session_reactions DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON session_reactions TO anon, authenticated;

-- ── session_messages ──────────────────────────────────────
ALTER TABLE session_messages REPLICA IDENTITY FULL;
ALTER TABLE session_messages DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON session_messages TO anon, authenticated;

-- ── session_notes (no Realtime needed, service-client only) ─
-- No anon access required — notes are loaded via API routes

-- ── Add to Realtime publication (idempotent) ───────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'session_reactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE session_reactions;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'session_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
    END IF;

  END IF;
END $$;
