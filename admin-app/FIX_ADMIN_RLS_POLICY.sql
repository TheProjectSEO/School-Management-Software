-- ============================================
-- FIX ADMIN_PROFILES RLS INFINITE RECURSION
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Set schema
SET search_path TO "school software";

-- Drop all existing policies on admin_profiles
DROP POLICY IF EXISTS "Users can view own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles are viewable by authenticated users" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles viewable by all authenticated" ON admin_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_profiles;

-- Create NEW simple policy WITHOUT recursion
-- This policy checks the profiles table (NOT admin_profiles itself)
CREATE POLICY "Authenticated users can view their admin profile"
ON admin_profiles
FOR SELECT
TO authenticated
USING (
  -- Check if the current user owns this profile
  profile_id IN (
    SELECT p.id
    FROM profiles p
    WHERE p.auth_user_id = auth.uid()
  )
);

-- ============================================
-- VERIFY THE FIX
-- ============================================

-- Check what policies now exist
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'school software'
  AND tablename = 'admin_profiles';

-- Test query (should work without recursion)
SELECT
  ap.id,
  ap.role,
  ap.is_active,
  p.full_name
FROM admin_profiles ap
JOIN profiles p ON p.id = ap.profile_id
WHERE ap.profile_id IN (
  SELECT id FROM profiles WHERE auth_user_id = auth.uid()
);

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- The query should return the admin profile for the logged-in user
-- without any infinite recursion error
