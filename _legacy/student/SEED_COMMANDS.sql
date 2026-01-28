-- ============================================
-- QUICK SEED AND VERIFY COMMANDS
-- ============================================
-- Copy these commands for quick execution
-- ============================================

-- ============================================
-- STEP 1: EXECUTE MAIN SEED SCRIPT
-- ============================================
-- Open COMPLETE_DATA_SEEDING.sql and run it in Supabase SQL Editor


-- ============================================
-- STEP 2: VERIFY DATA WAS INSERTED
-- ============================================

-- Quick verification (all counts)
SELECT
  'Enrollments' as category, COUNT(*) as count
FROM enrollments
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Progress', COUNT(*)
FROM student_progress
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Submissions', COUNT(*)
FROM submissions
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Notifications', COUNT(*)
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Unread Notifications', COUNT(*)
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f' AND is_read = false
UNION ALL
SELECT 'Notes', COUNT(*)
FROM notes
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Downloads', COUNT(*)
FROM downloads
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Attendance', COUNT(*)
FROM teacher_attendance
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Assessments', COUNT(*)
FROM assessments
UNION ALL
SELECT 'Announcements', COUNT(*)
FROM announcements;


-- ============================================
-- STEP 3: VIEW SAMPLE DATA
-- ============================================

-- View enrolled courses
SELECT c.name, c.subject_code, e.created_at as enrolled_at
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE e.student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
ORDER BY c.name;

-- View student progress
SELECT c.name as course, l.title as lesson, sp.progress_percent, sp.completed_at
FROM student_progress sp
JOIN lessons l ON l.id = sp.lesson_id
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
WHERE sp.student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
ORDER BY c.name, l.title;

-- View assessments with due dates
SELECT
  c.name as course,
  a.title,
  a.type,
  a.due_date,
  CASE
    WHEN a.due_date < NOW() THEN 'OVERDUE'
    WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 'DUE SOON'
    ELSE 'DUE LATER'
  END as status
FROM assessments a
JOIN courses c ON c.id = a.course_id
ORDER BY a.due_date;

-- View graded submissions
SELECT
  c.name as course,
  a.title as assessment,
  s.score,
  a.total_points,
  ROUND((s.score::numeric / a.total_points::numeric) * 100, 1) as percentage,
  s.feedback,
  s.graded_at
FROM submissions s
JOIN assessments a ON a.id = s.assessment_id
JOIN courses c ON c.id = a.course_id
WHERE s.student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
  AND s.status = 'graded'
ORDER BY s.graded_at DESC;

-- View unread notifications
SELECT type, title, message, created_at
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
  AND is_read = false
ORDER BY created_at DESC;

-- View announcements
SELECT
  CASE
    WHEN course_id IS NOT NULL THEN c.name
    WHEN section_id IS NOT NULL THEN 'Section-specific'
    ELSE 'School-wide'
  END as scope,
  a.title,
  a.type,
  a.priority,
  a.is_pinned,
  a.published_at
FROM announcements a
LEFT JOIN courses c ON c.id = a.course_id
ORDER BY a.is_pinned DESC, a.published_at DESC;

-- View student notes
SELECT title, type, is_favorite, created_at
FROM notes
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
ORDER BY is_favorite DESC, created_at DESC;

-- View downloads
SELECT title, file_type, file_size_bytes, status, created_at
FROM downloads
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
ORDER BY created_at DESC;

-- Attendance summary
SELECT
  c.name as course,
  COUNT(*) as total_days,
  COUNT(*) FILTER (WHERE ta.status = 'present') as present,
  COUNT(*) FILTER (WHERE ta.status = 'late') as late,
  COUNT(*) FILTER (WHERE ta.status = 'absent') as absent,
  COUNT(*) FILTER (WHERE ta.status = 'excused') as excused,
  ROUND(
    (COUNT(*) FILTER (WHERE ta.status = 'present')::numeric / COUNT(*)::numeric) * 100,
    1
  ) as attendance_percentage
FROM teacher_attendance ta
JOIN courses c ON c.id = ta.course_id
WHERE ta.student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
GROUP BY c.name
ORDER BY c.name;


-- ============================================
-- STEP 4: TEST RLS POLICIES
-- ============================================

-- These queries should work when executed as the student user
-- Test by impersonating student in Supabase or running from app

-- Test enrollments access
SELECT COUNT(*) FROM enrollments WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test progress access
SELECT COUNT(*) FROM student_progress WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test submissions access
SELECT COUNT(*) FROM submissions WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test notifications access
SELECT COUNT(*) FROM notifications WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test notes access
SELECT COUNT(*) FROM notes WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test downloads access
SELECT COUNT(*) FROM downloads WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Test attendance access
SELECT COUNT(*) FROM teacher_attendance WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';


-- ============================================
-- CLEANUP (USE WITH CAUTION!)
-- ============================================
-- Only run these if you need to remove all seeded data

/*
-- Remove all data for this student
DELETE FROM teacher_attendance WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM downloads WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM notes WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM notifications WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM student_progress WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM submissions WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM enrollments WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- Note: Assessments and announcements are shared, so don't delete unless needed
-- DELETE FROM assessments WHERE school_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM announcements WHERE school_id = '11111111-1111-1111-1111-111111111111';
*/


-- ============================================
-- EXPECTED RESULTS
-- ============================================
/*
After running COMPLETE_DATA_SEEDING.sql, you should see:

✓ Enrollments: 8
✓ Progress: 4
✓ Submissions: 9
✓ Notifications: 12 (4 unread)
✓ Notes: 5
✓ Downloads: 8
✓ Attendance: ~80
✓ Assessments: 16
✓ Announcements: 8

If any count is 0, check:
1. RLS policies are correct
2. Student ID exists in database
3. Foreign key relationships are valid
4. No errors in SQL execution log
*/
