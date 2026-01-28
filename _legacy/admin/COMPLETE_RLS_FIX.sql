-- ============================================
-- COMPLETE RLS FIX FOR ADMIN_PROFILES
-- ============================================
-- This will completely rebuild the RLS setup
-- ============================================

-- Set schema
SET search_path TO "school software";

-- ============================================
-- STEP 1: Check existing policies
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'school software' AND tablename = 'admin_profiles';

-- ============================================
-- STEP 2: Disable RLS temporarily to see if that's the issue
-- ============================================
ALTER TABLE admin_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop ALL policies
-- ============================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'school software' AND tablename = 'admin_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_profiles', pol.policyname);
  END LOOP;
END $$;

-- ============================================
-- STEP 4: Re-enable RLS with simple policy
-- ============================================
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create single, simple policy
CREATE POLICY "simple_admin_access"
ON admin_profiles
FOR ALL
TO authenticated
USING (true)  -- Allow all authenticated users to see all admin profiles
WITH CHECK (true);  -- Allow all authenticated users to modify

-- ============================================
-- STEP 5: Verify the fix
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'school software' AND tablename = 'admin_profiles';

-- Test query
SELECT
  id,
  role,
  is_active
FROM admin_profiles
LIMIT 1;
