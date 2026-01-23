-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the database was populated correctly
-- ============================================

-- 1. Check School
SELECT
  'SCHOOL' as entity_type,
  id,
  name,
  region,
  division
FROM schools
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 2. Check Sections
SELECT
  'SECTIONS' as entity_type,
  COUNT(*) as total_count,
  string_agg(name, ', ' ORDER BY grade_level) as section_names
FROM sections
WHERE school_id = '11111111-1111-1111-1111-111111111111';

-- 3. Check Courses
SELECT
  'COURSES' as entity_type,
  COUNT(*) as total_count,
  string_agg(name || ' (' || subject_code || ')', ', ' ORDER BY subject_code) as course_list
FROM courses
WHERE school_id = '11111111-1111-1111-1111-111111111111';

-- 4. Check Student
SELECT
  'STUDENT' as entity_type,
  s.id as student_id,
  s.lrn,
  s.grade_level,
  sec.name as section_name,
  p.full_name
FROM students s
LEFT JOIN profiles p ON p.id = s.profile_id
LEFT JOIN sections sec ON sec.id = s.section_id
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';

-- 5. Check Enrollments
SELECT
  'ENROLLMENTS' as entity_type,
  COUNT(*) as total_enrolled_courses,
  string_agg(c.name, ', ' ORDER BY c.subject_code) as enrolled_courses
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE e.student_id = '44444444-4444-4444-4444-444444444444';

-- 6. Check Modules
SELECT
  'MODULES' as entity_type,
  c.name as course_name,
  COUNT(m.id) as module_count,
  string_agg(m.title, ' | ' ORDER BY m."order") as modules
FROM modules m
JOIN courses c ON c.id = m.course_id
WHERE c.school_id = '11111111-1111-1111-1111-111111111111'
GROUP BY c.name, c.subject_code
ORDER BY c.subject_code;

-- 7. Check Lessons
SELECT
  'LESSONS' as entity_type,
  COUNT(*) as total_lessons,
  COUNT(DISTINCT module_id) as modules_with_lessons
FROM lessons l
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
WHERE c.school_id = '11111111-1111-1111-1111-111111111111';

-- 8. Check Assessments
SELECT
  'ASSESSMENTS' as entity_type,
  COUNT(*) as total_assessments,
  string_agg(DISTINCT type, ', ') as assessment_types
FROM assessments
WHERE school_id = '11111111-1111-1111-1111-111111111111';

-- 9. Check Notifications
SELECT
  'NOTIFICATIONS' as entity_type,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_count
FROM notifications
WHERE student_id = '44444444-4444-4444-4444-444444444444';

-- 10. Check Notes
SELECT
  'NOTES' as entity_type,
  COUNT(*) as total_notes,
  COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_count
FROM notes
WHERE student_id = '44444444-4444-4444-4444-444444444444';

-- ============================================
-- SUMMARY REPORT
-- ============================================
SELECT
  '=== DATABASE POPULATION SUMMARY ===' as report_section
UNION ALL
SELECT
  'Schools: ' || COUNT(*)::text
FROM schools
WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Sections: ' || COUNT(*)::text
FROM sections
WHERE school_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Courses: ' || COUNT(*)::text
FROM courses
WHERE school_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Students: ' || COUNT(*)::text
FROM students
WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
UNION ALL
SELECT
  'Enrollments: ' || COUNT(*)::text
FROM enrollments
WHERE student_id = '44444444-4444-4444-4444-444444444444'
UNION ALL
SELECT
  'Modules: ' || COUNT(*)::text
FROM modules m
JOIN courses c ON c.id = m.course_id
WHERE c.school_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Lessons: ' || COUNT(*)::text
FROM lessons l
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
WHERE c.school_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Assessments: ' || COUNT(*)::text
FROM assessments
WHERE school_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT
  'Notifications: ' || COUNT(*)::text
FROM notifications
WHERE student_id = '44444444-4444-4444-4444-444444444444'
UNION ALL
SELECT
  'Notes: ' || COUNT(*)::text
FROM notes
WHERE student_id = '44444444-4444-4444-4444-444444444444';
