-- Create Demo Users for Testing MSU Live Classroom
-- Run this script to create Admin, Teacher, and Student test accounts

-- =================================================================
-- INSTRUCTIONS:
-- =================================================================
-- 1. First create auth accounts via Supabase Auth Dashboard:
--    - admin.demo@msu.edu.ph (password: demo123)
--    - teacher.demo@msu.edu.ph (password: demo123)
--    - student.demo@msu.edu.ph (password: demo123)
--
-- 2. Get the auth user IDs from the dashboard
--
-- 3. Replace 'YOUR-ADMIN-AUTH-UUID', 'YOUR-TEACHER-AUTH-UUID', etc. below
--
-- 4. Run this script
-- =================================================================

BEGIN;

-- MSU School ID
DO $$
DECLARE
  msu_id UUID := '11111111-1111-1111-1111-111111111111';

  -- Replace these with actual auth.users IDs after creating accounts
  admin_auth_id UUID := 'YOUR-ADMIN-AUTH-UUID';  -- admin.demo@msu.edu.ph
  teacher_auth_id UUID := 'YOUR-TEACHER-AUTH-UUID';  -- teacher.demo@msu.edu.ph
  student_auth_id UUID := 'YOUR-STUDENT-AUTH-UUID';  -- student.demo@msu.edu.ph

  admin_profile_id UUID;
  teacher_profile_id UUID;
  teacher_teacher_id UUID;
  student_profile_id UUID;
  student_student_id UUID;

  math_course_id UUID;
BEGIN

  -- =================================================================
  -- 1. CREATE DEMO ADMIN
  -- =================================================================

  -- Create school profile
  INSERT INTO school_profiles (auth_user_id, full_name, phone)
  VALUES (admin_auth_id, 'Demo Admin', '+639123456789')
  RETURNING id INTO admin_profile_id;

  -- Add as school member with admin role
  INSERT INTO school_members (school_id, profile_id, role, status)
  VALUES (msu_id, admin_profile_id, 'school_admin', 'active');

  RAISE NOTICE 'Created Demo Admin with profile_id: %', admin_profile_id;

  -- =================================================================
  -- 2. CREATE DEMO TEACHER
  -- =================================================================

  -- Create school profile
  INSERT INTO school_profiles (auth_user_id, full_name, phone)
  VALUES (teacher_auth_id, 'Demo Teacher', '+639123456790')
  RETURNING id INTO teacher_profile_id;

  -- Create teacher profile
  INSERT INTO teacher_profiles (
    profile_id,
    school_id,
    employee_id,
    department,
    specialization,
    is_active
  )
  VALUES (
    teacher_profile_id,
    msu_id,
    'EMP-DEMO-100',
    'Demo Department',
    'Live Classroom Testing',
    true
  )
  RETURNING id INTO teacher_teacher_id;

  -- Assign teacher to Mathematics 10 course (if exists)
  SELECT id INTO math_course_id
  FROM courses
  WHERE subject_code = 'MATH-10'
    AND school_id = msu_id
  LIMIT 1;

  IF math_course_id IS NOT NULL THEN
    UPDATE courses
    SET teacher_id = teacher_teacher_id
    WHERE id = math_course_id;

    RAISE NOTICE 'Assigned Demo Teacher to Mathematics 10';
  ELSE
    RAISE NOTICE 'No MATH-10 course found to assign';
  END IF;

  RAISE NOTICE 'Created Demo Teacher with teacher_id: %', teacher_teacher_id;

  -- =================================================================
  -- 3. CREATE DEMO STUDENT
  -- =================================================================

  -- Create school profile
  INSERT INTO school_profiles (auth_user_id, full_name, phone)
  VALUES (student_auth_id, 'Demo Student', '+639123456791')
  RETURNING id INTO student_profile_id;

  -- Create student record
  INSERT INTO students (
    profile_id,
    school_id,
    lrn,
    grade_level,
    section_id
  )
  VALUES (
    student_profile_id,
    msu_id,
    '2026-DEMO-TEST',
    '10',
    (SELECT id FROM sections WHERE name = 'Grade 10-A' AND school_id = msu_id LIMIT 1)
  )
  RETURNING id INTO student_student_id;

  -- Enroll in all Grade 10-A courses
  INSERT INTO enrollments (student_id, course_id, school_id)
  SELECT
    student_student_id,
    c.id,
    msu_id
  FROM courses c
  WHERE c.section_id = (
    SELECT section_id FROM students WHERE id = student_student_id
  );

  RAISE NOTICE 'Created Demo Student with student_id: % and enrolled in % courses',
    student_student_id,
    (SELECT COUNT(*) FROM enrollments WHERE student_id = student_student_id);

  -- =================================================================
  -- SUMMARY
  -- =================================================================

  RAISE NOTICE '';
  RAISE NOTICE '✅ DEMO USERS CREATED SUCCESSFULLY';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Admin:   admin.demo@msu.edu.ph';
  RAISE NOTICE 'Teacher: teacher.demo@msu.edu.ph (assigned to % course)',
    CASE WHEN math_course_id IS NOT NULL THEN '1' ELSE '0' END;
  RAISE NOTICE 'Student: student.demo@msu.edu.ph (% enrollments)',
    (SELECT COUNT(*) FROM enrollments WHERE student_id = student_student_id);
  RAISE NOTICE '';
  RAISE NOTICE 'Test messaging:';
  RAISE NOTICE '- Admin ID: %', admin_profile_id;
  RAISE NOTICE '- Teacher ID: %', teacher_teacher_id;
  RAISE NOTICE '- Student ID: %', student_student_id;

END $$;

COMMIT;

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify admin
SELECT
  'ADMIN' as user_type,
  u.email,
  sp.full_name,
  sm.role,
  sm.status
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN school_members sm ON sm.profile_id = sp.id
WHERE u.email = 'admin.demo@msu.edu.ph';

-- Verify teacher
SELECT
  'TEACHER' as user_type,
  u.email,
  sp.full_name,
  tp.employee_id,
  tp.department,
  COUNT(c.id) as assigned_courses
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN teacher_profiles tp ON tp.profile_id = sp.id
LEFT JOIN courses c ON c.teacher_id = tp.id
WHERE u.email = 'teacher.demo@msu.edu.ph'
GROUP BY u.email, sp.full_name, tp.employee_id, tp.department;

-- Verify student
SELECT
  'STUDENT' as user_type,
  u.email,
  sp.full_name,
  s.lrn,
  s.grade_level,
  sec.name as section,
  COUNT(e.id) as enrolled_courses
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN students s ON s.profile_id = sp.id
LEFT JOIN sections sec ON sec.id = s.section_id
LEFT JOIN enrollments e ON e.student_id = s.id
WHERE u.email = 'student.demo@msu.edu.ph'
GROUP BY u.email, sp.full_name, s.lrn, s.grade_level, sec.name;
