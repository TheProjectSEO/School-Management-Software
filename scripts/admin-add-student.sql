-- ============================================
-- ADMIN SCRIPT: Add a New Student
-- ============================================
-- How to use:
-- 1. Create auth user in Supabase Dashboard first
-- 2. Copy the auth_user_id
-- 3. Replace the variables below
-- 4. Run this script
-- ============================================

-- REPLACE THESE VALUES:
DO $$
DECLARE
  -- FROM SUPABASE DASHBOARD (after creating user):
  p_auth_user_id UUID := 'PASTE_AUTH_USER_ID_HERE';

  -- STUDENT INFORMATION:
  p_full_name TEXT := 'Student Full Name';
  p_phone TEXT := '+639171234567';
  p_lrn TEXT := '2024-123456';
  p_grade_level TEXT := '10';

  -- SCHOOL & SECTION (get these from your database):
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';
  p_section_id UUID := '0d5cb1b5-3c3c-4a09-83b5-a9ea1acef167';

  -- VARIABLES (don't change):
  v_profile_id UUID;
  v_student_id UUID;
  v_enrolled_count INT;
BEGIN
  -- Step 1: Create school profile
  INSERT INTO school_profiles (id, auth_user_id, full_name, phone)
  VALUES (gen_random_uuid(), p_auth_user_id, p_full_name, p_phone)
  RETURNING id INTO v_profile_id;

  RAISE NOTICE 'Created school_profile: %', v_profile_id;

  -- Step 2: Create student record
  INSERT INTO students (id, profile_id, school_id, section_id, lrn, grade_level)
  VALUES (gen_random_uuid(), v_profile_id, p_school_id, p_section_id, p_lrn, p_grade_level)
  RETURNING id INTO v_student_id;

  RAISE NOTICE 'Created student: %', v_student_id;

  -- Step 3: Auto-enroll in all section courses
  INSERT INTO enrollments (id, student_id, course_id, school_id)
  SELECT
    gen_random_uuid(),
    v_student_id,
    c.id,
    c.school_id
  FROM courses c
  WHERE c.section_id = p_section_id
  AND c.school_id = p_school_id;

  GET DIAGNOSTICS v_enrolled_count = ROW_COUNT;

  RAISE NOTICE 'Enrolled student in % courses', v_enrolled_count;

  -- Step 4: Reload schema cache
  PERFORM reload_postgrest_schema();

  -- Step 5: Verify
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUCCESS! Student added:';
  RAISE NOTICE 'Profile ID: %', v_profile_id;
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Enrolled in: % courses', v_enrolled_count;
  RAISE NOTICE '========================================';

  -- Return summary
  RAISE NOTICE 'Student can now login and see their courses!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding student: %', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the student was added correctly:

-- SELECT
--   au.email,
--   sp.full_name,
--   s.lrn,
--   s.grade_level,
--   sec.name as section,
--   COUNT(e.id) as enrolled_courses
-- FROM auth.users au
-- JOIN school_profiles sp ON sp.auth_user_id = au.id
-- JOIN students s ON s.profile_id = sp.id
-- LEFT JOIN sections sec ON sec.id = s.section_id
-- LEFT JOIN enrollments e ON e.student_id = s.id
-- WHERE au.id = 'PASTE_AUTH_USER_ID_HERE'
-- GROUP BY au.email, sp.full_name, s.lrn, s.grade_level, sec.name;
