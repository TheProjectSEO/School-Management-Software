-- ============================================
-- ADMIN SCRIPT: Add a New Teacher
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

  -- TEACHER INFORMATION:
  p_full_name TEXT := 'Dr. Teacher Name';
  p_phone TEXT := '+639171234567';
  p_employee_id TEXT := 'EMP-2024-NEW';
  p_department TEXT := 'Mathematics Department';
  p_specialization TEXT := 'Algebra and Calculus';

  -- SCHOOL (get this from your database):
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';

  -- VARIABLES (don't change):
  v_profile_id UUID;
  v_teacher_id UUID;
BEGIN
  -- Step 1: Create school profile
  INSERT INTO school_profiles (id, auth_user_id, full_name, phone)
  VALUES (gen_random_uuid(), p_auth_user_id, p_full_name, p_phone)
  RETURNING id INTO v_profile_id;

  RAISE NOTICE 'Created school_profile: %', v_profile_id;

  -- Step 2: Create teacher profile
  INSERT INTO teacher_profiles (
    id,
    profile_id,
    school_id,
    employee_id,
    department,
    specialization,
    is_active
  )
  VALUES (
    gen_random_uuid(),
    v_profile_id,
    p_school_id,
    p_employee_id,
    p_department,
    p_specialization,
    true
  )
  RETURNING id INTO v_teacher_id;

  RAISE NOTICE 'Created teacher_profile: %', v_teacher_id;

  -- Step 3: Reload schema cache
  PERFORM reload_postgrest_schema();

  -- Step 4: Summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUCCESS! Teacher added:';
  RAISE NOTICE 'Profile ID: %', v_profile_id;
  RAISE NOTICE 'Teacher ID: %', v_teacher_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next: Assign teacher to courses using admin-assign-teacher.sql';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding teacher: %', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the teacher was added correctly:

-- SELECT
--   au.email,
--   sp.full_name,
--   tp.employee_id,
--   tp.department,
--   tp.specialization,
--   tp.is_active,
--   s.name as school
-- FROM auth.users au
-- JOIN school_profiles sp ON sp.auth_user_id = au.id
-- JOIN teacher_profiles tp ON tp.profile_id = sp.id
-- JOIN schools s ON s.id = tp.school_id
-- WHERE au.id = 'PASTE_AUTH_USER_ID_HERE';
