-- Quick verification queries
-- Run these after executing setup_grades_attendance.sql

-- Check if tables exist
SELECT
  tablename,
  CASE
    WHEN tablename IN ('grading_periods', 'course_grades', 'semester_gpa', 'report_cards', 'teacher_attendance') THEN '✓ Created'
    ELSE '✗ Missing'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('grading_periods', 'course_grades', 'semester_gpa', 'report_cards', 'teacher_attendance')
ORDER BY tablename;

-- Count records in each table
SELECT 'grading_periods' as table_name, COUNT(*) as record_count FROM grading_periods
UNION ALL
SELECT 'course_grades', COUNT(*) FROM course_grades
UNION ALL
SELECT 'semester_gpa', COUNT(*) FROM semester_gpa
UNION ALL
SELECT 'report_cards', COUNT(*) FROM report_cards
UNION ALL
SELECT 'teacher_attendance', COUNT(*) FROM teacher_attendance;

-- Show sample grade data
SELECT
  s.id as student_id,
  p.full_name as student_name,
  c.name as course,
  cg.letter_grade,
  cg.percentage,
  gp.name as grading_period
FROM course_grades cg
JOIN students s ON s.id = cg.student_id
JOIN profiles p ON p.id = s.profile_id
JOIN courses c ON c.id = cg.course_id
JOIN grading_periods gp ON gp.id = cg.grading_period_id
WHERE cg.is_released = true
ORDER BY s.id, c.name
LIMIT 10;

-- Show attendance summary
SELECT
  s.id as student_id,
  p.full_name as student_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN ta.status = 'present' THEN 1 ELSE 0 END) as present_count,
  SUM(CASE WHEN ta.status = 'late' THEN 1 ELSE 0 END) as late_count,
  SUM(CASE WHEN ta.status = 'absent' THEN 1 ELSE 0 END) as absent_count
FROM teacher_attendance ta
JOIN students s ON s.id = ta.student_id
JOIN profiles p ON p.id = s.profile_id
GROUP BY s.id, p.full_name
LIMIT 5;
