-- ============================================
-- ADMIN SCRIPT: Fix Authentication for Existing User
-- ============================================
-- Use this when a user exists but can't log in or see data
-- This script auto-fixes the complete auth chain
-- ============================================

-- REPLACE THIS:
DO $$
DECLARE
  -- USER TO FIX:
  p_email TEXT := 'student@msu.edu.ph';  -- CHANGE THIS

  -- CONFIGURATION:
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';
  p_section_id UUID := '0d5cb1b5-3c3c-4a09-83b5-a9ea1acef167';  -- For students
  p_grade_level TEXT := '10';  -- For students

  -- VARIABLES:
  v_auth_user_id UUID;
  v_profile_id UUID;
  v_student_id UUID;
  v_enrolled_count INT := 0;
  v_action_taken TEXT := '';
BEGIN
  -- Get auth user ID
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found: %. Create user in Supabase Dashboard first!', p_email;
  END IF;

  RAISE NOTICE 'Found auth user: %', v_auth_user_id;

  -- ========================================
  -- FIX 1: Create school_profile if missing
  -- ========================================
  SELECT id INTO v_profile_id
  FROM school_profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO school_profiles (id, auth_user_id, full_name, phone)
    VALUES (
      gen_random_uuid(),
      v_auth_user_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_auth_user_id),
        p_email
      ),
      NULL
    )
    RETURNING id INTO v_profile_id;

    v_action_taken := v_action_taken || '✅ Created school_profile; ';
    RAISE NOTICE 'Created school_profile: %', v_profile_id;
  ELSE
    RAISE NOTICE 'School profile exists: %', v_profile_id;
  END IF;

  -- ========================================
  -- FIX 2: Create student record if missing
  -- ========================================
  SELECT id INTO v_student_id
  FROM students
  WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    INSERT INTO students (id, profile_id, school_id, section_id, grade_level)
    VALUES (
      gen_random_uuid(),
      v_profile_id,
      p_school_id,
      p_section_id,
      p_grade_level
    )
    RETURNING id INTO v_student_id;

    v_action_taken := v_action_taken || '✅ Created student record; ';
    RAISE NOTICE 'Created student: %', v_student_id;
  ELSE
    RAISE NOTICE 'Student exists: %', v_student_id;

    -- Update section if it's NULL
    UPDATE students
    SET section_id = p_section_id
    WHERE id = v_student_id
    AND section_id IS NULL;
  END IF;

  -- ========================================
  -- FIX 3: Auto-enroll in section courses if no enrollments
  -- ========================================
  SELECT COUNT(*) INTO v_enrolled_count
  FROM enrollments
  WHERE student_id = v_student_id;

  IF v_enrolled_count = 0 THEN
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

    v_action_taken := v_action_taken || format('✅ Enrolled in %s courses; ', v_enrolled_count);
    RAISE NOTICE 'Enrolled student in % courses', v_enrolled_count;
  ELSE
    RAISE NOTICE 'Student already has % enrollments', v_enrolled_count;
  END IF;

  -- ========================================
  -- FIX 4: Reload schema cache
  -- ========================================
  PERFORM reload_postgrest_schema();

  -- ========================================
  -- SUMMARY
  -- ========================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTHENTICATION FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User: %', p_email;
  RAISE NOTICE 'Auth ID: %', v_auth_user_id;
  RAISE NOTICE 'Profile ID: %', v_profile_id;
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Enrollments: %', v_enrolled_count;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Actions taken: %', v_action_taken;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User should now be able to login and see data!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error fixing auth for %: %', p_email, SQLERRM;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the complete auth chain
SELECT
  '1. Auth User' as step,
  au.id::text as id,
  au.email as data
FROM auth.users au
WHERE au.email = :'user_email'

UNION ALL

SELECT
  '2. School Profile',
  sp.id::text,
  sp.full_name
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
WHERE au.email = :'user_email'

UNION ALL

SELECT
  '3. Student Record',
  s.id::text,
  'LRN: ' || COALESCE(s.lrn, 'none') || ', Grade: ' || COALESCE(s.grade_level, 'none')
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
JOIN students s ON s.profile_id = sp.id
WHERE au.email = :'user_email'

UNION ALL

SELECT
  '4. Enrollments',
  e.id::text,
  c.name
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
JOIN students s ON s.profile_id = sp.id
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
WHERE au.email = :'user_email'
LIMIT 1;

-- If all 4 steps show results: Authentication is working! ✅
-- If any step is missing: Run this script again or check the fix section
