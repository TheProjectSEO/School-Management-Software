-- ============================================
-- TEMPORARY FIX: Disable RLS on admin_profiles
-- ============================================
-- This will allow the app to work while we figure out
-- the proper RLS policy
-- ============================================

SET search_path TO "school software";

-- Simply disable RLS on admin_profiles table
ALTER TABLE admin_profiles DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'school software' AND tablename = 'admin_profiles';

-- Test query
SELECT
  id,
  profile_id,
  role,
  is_active
FROM admin_profiles
LIMIT 5;
