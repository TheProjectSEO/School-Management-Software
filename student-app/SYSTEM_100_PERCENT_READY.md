-- Quick Verification Queries After Approval

-- 1. Check student was created
SELECT
  'STUDENT CREATED' as check_type,
  s.id,
  s.lrn,
  s.grade_level,
  sec.name as section_name,
  sp.full_name
FROM students s
JOIN school_profiles sp ON sp.id = s.profile_id
JOIN auth.users u ON u.id = sp.auth_user_id
LEFT JOIN sections sec ON sec.id = s.section_id
WHERE u.email = 'teststudent@example.com';

-- Expected: 1 row with student record

-- 2. Check enrollments created
SELECT
  'ENROLLMENTS CREATED' as check_type,
  c.name as course_name,
  c.subject_code,
  e.created_at
FROM enrollments e
JOIN courses c ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
JOIN auth.users u ON u.id = sp.auth_user_id
WHERE u.email = 'teststudent@example.com'
ORDER BY c.name;

-- Expected: 5-8 courses enrolled automatically

-- 3. Check application was updated
SELECT
  'APPLICATION UPDATED' as check_type,
  status,
  reviewed_at,
  student_id
FROM student_applications
WHERE email = 'teststudent@example.com';

-- Expected: status = 'approved', student_id populated

-- 4. Check audit log
SELECT
  'AUDIT LOG' as check_type,
  status,
  note,
  created_at
FROM application_status_log
WHERE application_id IN (
  SELECT id FROM student_applications WHERE email = 'teststudent@example.com'
)
ORDER BY created_at;

-- Expected: Multiple status changes logged
