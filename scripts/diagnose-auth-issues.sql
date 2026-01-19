-- ============================================
-- DIAGNOSTIC SCRIPT: Check Authentication Issues
-- ============================================
-- Use this to debug why a user can't log in or see data
-- ============================================

-- REPLACE THIS:
\set user_email 'student@msu.edu.ph'

-- ============================================
-- CHECK 1: Does auth user exist?
-- ============================================
SELECT
  '✅ Auth User Exists' as check_status,
  id as auth_user_id,
  email,
  created_at,
  email_confirmed_at,
  CASE
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '✅ Email confirmed'
  END as email_status
FROM auth.users
WHERE email = :'user_email';

-- If no results: User doesn't exist in auth.users
-- Action: Create user in Supabase Dashboard → Authentication → Users

-- ============================================
-- CHECK 2: Does school_profile exist and link to auth?
-- ============================================
SELECT
  '✅ School Profile Exists' as check_status,
  sp.id as school_profile_id,
  sp.auth_user_id,
  sp.full_name,
  sp.phone,
  sp.created_at,
  CASE
    WHEN sp.auth_user_id = au.id THEN '✅ Correctly linked to auth user'
    ELSE '❌ auth_user_id mismatch!'
  END as link_status
FROM auth.users au
LEFT JOIN school_profiles sp ON sp.auth_user_id = au.id
WHERE au.email = :'user_email';

-- If school_profile is NULL:
-- Action: Run admin-add-student.sql or admin-add-teacher.sql

-- ============================================
-- CHECK 3: Does student/teacher record exist?
-- ============================================
SELECT
  '✅ Role Record Exists' as check_status,
  s.id as student_id,
  s.lrn,
  s.grade_level,
  s.section_id,
  tp.id as teacher_id,
  tp.employee_id,
  tp.department,
  ap.id as admin_id,
  ap.role as admin_role,
  CASE
    WHEN s.id IS NOT NULL THEN '✅ Is Student'
    WHEN tp.id IS NOT NULL THEN '✅ Is Teacher'
    WHEN ap.id IS NOT NULL THEN '✅ Is Admin'
    ELSE '❌ No role assigned!'
  END as role_status
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
LEFT JOIN students s ON s.profile_id = sp.id
LEFT JOIN teacher_profiles tp ON tp.profile_id = sp.id
LEFT JOIN admin_profiles ap ON ap.profile_id = sp.id
WHERE au.email = :'user_email';

-- If all role IDs are NULL:
-- Action: User has profile but no role - add student or teacher record

-- ============================================
-- CHECK 4: Student enrollments
-- ============================================
SELECT
  '✅ Student Enrollments' as check_status,
  e.id as enrollment_id,
  c.name as course_name,
  c.subject_code,
  sec.name as section_name,
  e.created_at as enrolled_at
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
JOIN students s ON s.profile_id = sp.id
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
LEFT JOIN sections sec ON sec.id = c.section_id
WHERE au.email = :'user_email'
ORDER BY c.name;

-- If no results:
-- Action: Student has no course enrollments - run enrollment script

-- ============================================
-- CHECK 5: Teacher assignments
-- ============================================
SELECT
  '✅ Teacher Assignments' as check_status,
  ta.id as assignment_id,
  c.name as course_name,
  c.subject_code,
  sec.name as section_name,
  COUNT(e.id) as enrolled_students,
  ta.created_at as assigned_at
FROM auth.users au
JOIN school_profiles sp ON sp.auth_user_id = au.id
JOIN teacher_profiles tp ON tp.profile_id = sp.id
JOIN teacher_assignments ta ON ta.teacher_profile_id = tp.id
JOIN courses c ON c.id = ta.course_id
LEFT JOIN sections sec ON sec.id = c.section_id
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE au.email = :'user_email'
GROUP BY ta.id, c.name, c.subject_code, sec.name, ta.created_at
ORDER BY c.name;

-- If no results:
-- Action: Teacher has no course assignments - run admin-assign-teacher.sql

-- ============================================
-- CHECK 6: RLS Policy Test
-- ============================================

-- Test if RLS allows student to see their enrollments
-- This simulates what the app does

SET LOCAL role TO 'authenticated';
SET LOCAL "request.jwt.claim.sub" TO (
  SELECT au.id::text
  FROM auth.users au
  WHERE au.email = :'user_email'
);

SELECT
  '✅ RLS Test: Can See Enrollments' as check_status,
  e.id,
  c.name as course_name
FROM enrollments e
JOIN courses c ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
WHERE sp.auth_user_id = (
  SELECT au.id FROM auth.users au WHERE au.email = :'user_email'
)
LIMIT 5;

RESET role;
RESET "request.jwt.claim.sub";

-- If this fails with "infinite recursion" or no results:
-- Action: RLS policies are blocking access - contact developer

-- ============================================
-- CHECK 7: Missing Data Summary
-- ============================================

WITH user_check AS (
  SELECT
    au.id as auth_id,
    au.email,
    sp.id as profile_id,
    s.id as student_id,
    tp.id as teacher_id,
    ap.id as admin_id
  FROM auth.users au
  LEFT JOIN school_profiles sp ON sp.auth_user_id = au.id
  LEFT JOIN students s ON s.profile_id = sp.id
  LEFT JOIN teacher_profiles tp ON tp.profile_id = sp.id
  LEFT JOIN admin_profiles ap ON ap.profile_id = sp.id
  WHERE au.email = :'user_email'
)
SELECT
  email,
  CASE WHEN auth_id IS NULL THEN '❌' ELSE '✅' END || ' Auth User' as check_1,
  CASE WHEN profile_id IS NULL THEN '❌' ELSE '✅' END || ' School Profile' as check_2,
  CASE
    WHEN student_id IS NOT NULL THEN '✅ Student Record'
    WHEN teacher_id IS NOT NULL THEN '✅ Teacher Record'
    WHEN admin_id IS NOT NULL THEN '✅ Admin Record'
    ELSE '❌ No Role Record'
  END as check_3,
  CASE
    WHEN student_id IS NOT NULL THEN (
      SELECT COUNT(*)::text || ' enrollments'
      FROM enrollments WHERE student_id = user_check.student_id
    )
    WHEN teacher_id IS NOT NULL THEN (
      SELECT COUNT(*)::text || ' course assignments'
      FROM teacher_assignments WHERE teacher_profile_id = user_check.teacher_id
    )
    ELSE 'N/A'
  END as check_4
FROM user_check;

-- ============================================
-- COMMON ISSUES & FIXES
-- ============================================

-- ISSUE 1: "Profile not found" error
-- FIX: Create school_profile linked to auth_user_id

-- ISSUE 2: "No courses showing"
-- FIX: Create enrollments for student

-- ISSUE 3: "Infinite recursion detected"
-- FIX: RLS policies have circular dependencies - already fixed in latest update

-- ISSUE 4: "Teacher profile not found"
-- FIX: Create teacher_profiles record linked to school_profile

-- ISSUE 5: Student can login but sees empty dashboard
-- FIX: Student has no enrollments - run enrollment script
