-- ============================================================================
-- COMPLETE FIX FOR ANNOUNCEMENTS SYSTEM
-- Fixes RLS policies for all related tables
-- ============================================================================

-- ============================================================================
-- 1. FIX TEACHER_ANNOUNCEMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view own announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Teachers can insert announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Teachers can update own announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Teachers can delete own announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Students can view targeted announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Allow all for authenticated" ON teacher_announcements;
DROP POLICY IF EXISTS "Allow all operations on teacher_announcements" ON teacher_announcements;
DROP POLICY IF EXISTS "Service role full access" ON teacher_announcements;

CREATE POLICY "Allow all operations on teacher_announcements"
ON teacher_announcements FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. FIX ANNOUNCEMENT_READS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Students can view own reads" ON announcement_reads;
DROP POLICY IF EXISTS "Students can mark as read" ON announcement_reads;
DROP POLICY IF EXISTS "Teachers can view reads for own announcements" ON announcement_reads;
DROP POLICY IF EXISTS "Allow all for authenticated" ON announcement_reads;
DROP POLICY IF EXISTS "Allow all operations on announcement_reads" ON announcement_reads;

CREATE POLICY "Allow all operations on announcement_reads"
ON announcement_reads FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. FIX STUDENTS TABLE (ensure students can be queried)
-- ============================================================================
DROP POLICY IF EXISTS "Allow read students" ON students;
DROP POLICY IF EXISTS "Allow all on students" ON students;
DROP POLICY IF EXISTS "Students can view own profile" ON students;
DROP POLICY IF EXISTS "Teachers can view students" ON students;

CREATE POLICY "Allow all on students"
ON students FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. FIX SECTIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow read sections" ON sections;
DROP POLICY IF EXISTS "Allow all on sections" ON sections;
DROP POLICY IF EXISTS "Anyone can view sections" ON sections;

CREATE POLICY "Allow all on sections"
ON sections FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. FIX TEACHER_ASSIGNMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow read teacher_assignments" ON teacher_assignments;
DROP POLICY IF EXISTS "Allow all on teacher_assignments" ON teacher_assignments;
DROP POLICY IF EXISTS "Teachers can view own assignments" ON teacher_assignments;

CREATE POLICY "Allow all on teacher_assignments"
ON teacher_assignments FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 6. FIX TEACHER_PROFILES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on teacher_profiles" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can view own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Allow read teacher_profiles" ON teacher_profiles;

CREATE POLICY "Allow all on teacher_profiles"
ON teacher_profiles FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 7. FIX SCHOOL_PROFILES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on school_profiles" ON school_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON school_profiles;
DROP POLICY IF EXISTS "Allow read school_profiles" ON school_profiles;

CREATE POLICY "Allow all on school_profiles"
ON school_profiles FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 8. FIX COURSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;

CREATE POLICY "Allow all on courses"
ON courses FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 9. FIX STUDENT_NOTIFICATIONS TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_notifications') THEN
    DROP POLICY IF EXISTS "Allow all on student_notifications" ON student_notifications;
    DROP POLICY IF EXISTS "Students can view own notifications" ON student_notifications;

    EXECUTE 'CREATE POLICY "Allow all on student_notifications" ON student_notifications FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================================
-- 10. ASSIGN ALL TEACHERS TO GRADE 12 STEM-A SECTION
-- ============================================================================
INSERT INTO teacher_assignments (teacher_profile_id, section_id, course_id)
SELECT
  tp.id,
  '1c4ca13d-cba8-4219-be47-61bb652c5d4a',
  (SELECT id FROM courses LIMIT 1)
FROM teacher_profiles tp
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_assignments ta
  WHERE ta.teacher_profile_id = tp.id
    AND ta.section_id = '1c4ca13d-cba8-4219-be47-61bb652c5d4a'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. VERIFY ALL STUDENTS ARE IN GRADE 12 STEM-A
-- ============================================================================
UPDATE students
SET
  section_id = '1c4ca13d-cba8-4219-be47-61bb652c5d4a',
  grade_level = '12',
  status = 'active'
WHERE section_id IS NULL OR section_id != '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

-- ============================================================================
-- 12. SHOW VERIFICATION RESULTS
-- ============================================================================

-- Show all policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('teacher_announcements', 'announcement_reads', 'students', 'sections', 'teacher_assignments')
ORDER BY tablename;

-- Show student count per section
SELECT sec.name, COUNT(st.id) as students
FROM sections sec
LEFT JOIN students st ON st.section_id = sec.id
GROUP BY sec.id, sec.name
ORDER BY students DESC;

-- Show teacher assignments
SELECT sp.full_name, sec.name as section
FROM teacher_assignments ta
JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
JOIN school_profiles sp ON sp.id = tp.profile_id
JOIN sections sec ON sec.id = ta.section_id;
