-- Helper function: look up auth.users.id by email
-- Used by the application approval flow to find existing Supabase Auth accounts
-- SECURITY DEFINER runs as the function owner (postgres) so it can read auth.users
-- Safe: returns NULL if not found, no side effects

CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Verify: should return 'function_created_ok'
SELECT 'function_created_ok' AS status
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_id_by_email'
);
