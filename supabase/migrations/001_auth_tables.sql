-- =====================================================
-- JWT + RBAC Authentication Tables Migration
-- =====================================================

-- 1. Refresh tokens table (for token revocation and rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT,

  -- Index for fast lookups
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
);

-- Index for finding user's tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 2. Role permissions table (for custom permission overrides per school)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'teacher', 'student')),
  permission TEXT NOT NULL,
  school_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per role/permission/school combination
  CONSTRAINT role_permissions_unique UNIQUE (role, permission, school_id)
);

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- 3. User permissions table (for individual user permission overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),

  -- Unique constraint per user/permission combination
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- 4. Auth audit log table (for security monitoring)
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login',
    'logout',
    'token_refresh',
    'permission_denied',
    'login_failed',
    'password_reset',
    'password_changed'
  )),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user activity lookups
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Refresh tokens: Users can only see their own tokens
CREATE POLICY "Users can view own refresh tokens"
  ON refresh_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Refresh tokens: Service role can do everything (for API operations)
CREATE POLICY "Service role manages refresh tokens"
  ON refresh_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Role permissions: Service role can manage
CREATE POLICY "Service role manages role permissions"
  ON role_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Role permissions: Authenticated users can view
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- User permissions: Users can see their own
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- User permissions: Service role can manage
CREATE POLICY "Service role manages user permissions"
  ON user_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auth audit log: Users can see their own logs
CREATE POLICY "Users can view own audit logs"
  ON auth_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Auth audit log: Service role can do everything
CREATE POLICY "Service role manages audit logs"
  ON auth_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Cleanup function for expired tokens
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day'
     OR revoked_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Optional: Create a cron job to run cleanup daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-refresh-tokens', '0 0 * * *', 'SELECT cleanup_expired_refresh_tokens()');
