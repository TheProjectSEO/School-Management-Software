-- ============================================================================
-- COMPLETE RLS POLICIES FOR "school software" SCHEMA
-- This fixes: Teacher sees 0 for everything despite data existing
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on all tables
-- ============================================================================
ALTER TABLE "school software".profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".students ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school software".submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Grant basic permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".teacher_profiles TO authenticated;
GRANT SELECT ON TABLE "school software".schools TO anon, authenticated;
GRANT SELECT ON TABLE "school software".sections TO authenticated;
GRANT SELECT ON TABLE "school software".students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".courses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".teacher_assignments TO authenticated;
GRANT SELECT ON TABLE "school software".enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".modules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".assessments TO authenticated;
GRANT SELECT ON TABLE "school software".submissions TO authenticated;

-- ============================================================================
-- STEP 3: Create helper functions
-- ============================================================================

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION "school software".current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM "school software".profiles
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current teacher's profile ID
CREATE OR REPLACE FUNCTION "school software".current_teacher_profile_id()
RETURNS UUID AS $$
  SELECT id FROM "school software".teacher_profiles
  WHERE profile_id = "school software".current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current teacher's school ID
CREATE OR REPLACE FUNCTION "school software".current_teacher_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM "school software".teacher_profiles
  WHERE profile_id = "school software".current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Profiles policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON "school software".profiles;
CREATE POLICY "Users can view own profile"
ON "school software".profiles
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON "school software".profiles;
CREATE POLICY "Users can insert own profile"
ON "school software".profiles
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON "school software".profiles;
CREATE POLICY "Users can update own profile"
ON "school software".profiles
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid());

-- ============================================================================
-- STEP 5: Teacher profiles policies
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can view own profile"
ON "school software".teacher_profiles
FOR SELECT TO authenticated
USING (profile_id = "school software".current_profile_id());

DROP POLICY IF EXISTS "Teachers can insert own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can insert own profile"
ON "school software".teacher_profiles
FOR INSERT TO authenticated
WITH CHECK (profile_id = "school software".current_profile_id());

DROP POLICY IF EXISTS "Teachers can update own profile" ON "school software".teacher_profiles;
CREATE POLICY "Teachers can update own profile"
ON "school software".teacher_profiles
FOR UPDATE TO authenticated
USING (profile_id = "school software".current_profile_id());

-- ============================================================================
-- STEP 6: Schools policies (public read)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view schools" ON "school software".schools;
CREATE POLICY "Anyone can view schools"
ON "school software".schools
FOR SELECT USING (true);

-- ============================================================================
-- STEP 7: Sections policies (teachers see their school)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view sections in their school" ON "school software".sections;
CREATE POLICY "Teachers can view sections in their school"
ON "school software".sections
FOR SELECT TO authenticated
USING (school_id = "school software".current_teacher_school_id());

-- ============================================================================
-- STEP 8: Students policies (teachers see students in their school)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view students in their school" ON "school software".students;
CREATE POLICY "Teachers can view students in their school"
ON "school software".students
FOR SELECT TO authenticated
USING (school_id = "school software".current_teacher_school_id());

-- ============================================================================
-- STEP 9: Courses policies (teachers see their courses)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view their courses" ON "school software".courses;
CREATE POLICY "Teachers can view their courses"
ON "school software".courses
FOR SELECT TO authenticated
USING (
  teacher_id = "school software".current_teacher_profile_id()
  OR school_id = "school software".current_teacher_school_id()
);

DROP POLICY IF EXISTS "Teachers can manage their courses" ON "school software".courses;
CREATE POLICY "Teachers can manage their courses"
ON "school software".courses
FOR ALL TO authenticated
USING (teacher_id = "school software".current_teacher_profile_id());

-- ============================================================================
-- STEP 10: Teacher assignments policies
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view own assignments" ON "school software".teacher_assignments;
CREATE POLICY "Teachers can view own assignments"
ON "school software".teacher_assignments
FOR SELECT TO authenticated
USING (teacher_profile_id = "school software".current_teacher_profile_id());

-- ============================================================================
-- STEP 11: Enrollments policies (teachers see enrollments in their courses)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view enrollments in their courses" ON "school software".enrollments;
CREATE POLICY "Teachers can view enrollments in their courses"
ON "school software".enrollments
FOR SELECT TO authenticated
USING (
  course_id IN (
    SELECT id FROM "school software".courses
    WHERE teacher_id = "school software".current_teacher_profile_id()
  )
  OR school_id = "school software".current_teacher_school_id()
);

-- ============================================================================
-- STEP 12: Modules policies (teachers manage their course modules)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view modules in their courses" ON "school software".modules;
CREATE POLICY "Teachers can view modules in their courses"
ON "school software".modules
FOR SELECT TO authenticated
USING (
  course_id IN (
    SELECT id FROM "school software".courses
    WHERE teacher_id = "school software".current_teacher_profile_id()
  )
);

DROP POLICY IF EXISTS "Teachers can manage modules in their courses" ON "school software".modules;
CREATE POLICY "Teachers can manage modules in their courses"
ON "school software".modules
FOR ALL TO authenticated
USING (
  course_id IN (
    SELECT id FROM "school software".courses
    WHERE teacher_id = "school software".current_teacher_profile_id()
  )
);

-- ============================================================================
-- STEP 13: Lessons policies
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view lessons in their modules" ON "school software".lessons;
CREATE POLICY "Teachers can view lessons in their modules"
ON "school software".lessons
FOR SELECT TO authenticated
USING (
  module_id IN (
    SELECT id FROM "school software".modules
    WHERE course_id IN (
      SELECT id FROM "school software".courses
      WHERE teacher_id = "school software".current_teacher_profile_id()
    )
  )
);

DROP POLICY IF EXISTS "Teachers can manage lessons in their modules" ON "school software".lessons;
CREATE POLICY "Teachers can manage lessons in their modules"
ON "school software".lessons
FOR ALL TO authenticated
USING (
  module_id IN (
    SELECT id FROM "school software".modules
    WHERE course_id IN (
      SELECT id FROM "school software".courses
      WHERE teacher_id = "school software".current_teacher_profile_id()
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Policies created successfully!' as status;
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'school software'
GROUP BY schemaname, tablename
ORDER BY tablename;
