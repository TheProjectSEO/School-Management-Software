-- Fix infinite recursion in admin_profiles RLS policy
-- Run this in Supabase SQL Editor

SET search_path TO "school software";

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles are viewable by authenticated users" ON admin_profiles;

-- Create simple policy that checks profiles table (not admin_profiles itself)
CREATE POLICY "Admin profiles viewable by profile owners"
ON admin_profiles
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Allow service role to do anything (for admin operations)
CREATE POLICY "Service role full access"
ON admin_profiles
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'school software' AND tablename = 'admin_profiles';
