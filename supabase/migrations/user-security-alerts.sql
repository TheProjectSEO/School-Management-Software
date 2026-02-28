-- Migration: user_security_alerts
-- Tracks blocked login attempts from unknown devices so the active user can be notified in real-time.

CREATE TABLE IF NOT EXISTS user_security_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attacker_ip   TEXT,
  attacker_ua   TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_user_security_alerts_user_id
  ON user_security_alerts (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_security_alerts ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read their own alerts (anon key used by Realtime client)
CREATE POLICY "Users can read own security alerts"
  ON user_security_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (via server-side login route)
-- No INSERT policy needed for anon/authenticated — service role bypasses RLS

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE user_security_alerts;
