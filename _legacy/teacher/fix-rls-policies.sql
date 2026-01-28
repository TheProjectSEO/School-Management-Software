-- ============================================================================
-- RLS Policies for "school software" Schema
-- Fix: Teacher profile query returns 0 rows
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "school software".profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".schools ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".teacher_profiles TO authenticated;
GRANT SELECT ON TABLE "school software".schools TO anon, authenticated;

-- Profiles: Users can view/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON "school software".profiles;
CREATE POLICY "Users can view own profile"
ON "school software".profiles
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON "school software".profiles;
CREATE POLICY "Users can update own profile"
ON "school software".profiles
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own profile" ON "school software".profiles;
CREATE POLICY "Users can create own profile"
ON "school software".profiles
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Teacher Profiles: Teachers can view/update their own teacher profile
DROP POLICY IF EXISTS "Teachers can view own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can view own profile"
ON "school software".teacher_profiles
FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM "school software".profiles WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can update own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can update own profile"
ON "school software".teacher_profiles
FOR UPDATE
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM "school software".profiles WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can create own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can create own profile"
ON "school software".teacher_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IN (
    SELECT id FROM "school software".profiles WHERE auth_user_id = auth.uid()
  )
);

-- Schools: Public read access (for registration dropdown)
DROP POLICY IF EXISTS "Public can view schools" ON "school software".schools;
CREATE POLICY "Public can view schools"
ON "school software".schools
FOR SELECT
USING (true);

-- Verify policies created
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'school software'
  AND tablename IN ('profiles', 'teacher_profiles', 'schools')
ORDER BY tablename, policyname;
