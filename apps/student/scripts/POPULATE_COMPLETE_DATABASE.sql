-- ============================================================================
-- COMPLETE DATABASE POPULATION SCRIPT
-- Creates ALL data needed for student dashboard to show content
-- ============================================================================
-- Run this in Supabase SQL Editor to populate the entire database
-- Estimated time: 30 seconds

SET search_path TO "school software", public;

-- Start transaction for atomicity
BEGIN;

-- ===========================================================================
-- STEP 1: ENSURE STUDENT RECORD EXISTS
-- ===========================================================================

DO $$
DECLARE
  v_profile_id UUID := '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  v_student_id UUID;
  v_school_id UUID := '00000000-0000-0000-0000-000000000001';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Create student if doesn't exist
  INSERT INTO "school software".students (
    id, school_id, profile_id, lrn, grade_level, section_id, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_school_id, v_profile_id, '202400123456',
    'Grade 11', v_section_id, NOW(), NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO v_student_id;

  RAISE NOTICE 'Student ID: %', v_student_id;
END $$;

-- ===========================================================================
-- STEP 2: CREATE COURSES (10 courses)
-- ===========================================================================

INSERT INTO "school software".courses (
  id, school_id, section_id, teacher_id, name, description,
  subject_area, credits, is_active, created_at
)
VALUES
  ('c0000001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000001-0001-0001-0001-000000000001', 'Advanced Mathematics', 'Calculus and advanced algebra', 'Mathematics', 3, true, NOW()),
  ('c0000002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000002-0002-0002-0002-000000000002', 'Physics 101', 'Introduction to physics and mechanics', 'Science', 3, true, NOW()),
  ('c0000003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000003-0003-0003-0003-000000000003', 'English Literature', 'Classic and modern literature analysis', 'English', 2, true, NOW()),
  ('c0000004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000004-0004-0004-0004-000000000004', 'Filipino', 'Filipino language and culture', 'Languages', 2, true, NOW()),
  ('c0000005-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000005-0005-0005-0005-000000000005', 'World History', 'Global historical events and civilizations', 'Social Studies', 2, true, NOW()),
  ('c0000006-0006-0006-0006-000000000006', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000006-0006-0006-0006-000000000006', 'Chemistry', 'Chemical reactions and molecular science', 'Science', 3, true, NOW()),
  ('c0000007-0007-0007-0007-000000000007', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000007-0007-0007-0007-000000000007', 'Computer Science', 'Programming and algorithms', 'Technology', 3, true, NOW()),
  ('c0000008-0008-0008-0008-000000000008', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 't0000008-0008-0008-0008-000000000008', 'Physical Education', 'Sports and fitness training', 'PE', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 3: ENROLL STUDENT IN ALL COURSES
-- ===========================================================================

INSERT INTO "school software".enrollments (
  school_id, student_id, course_id, enrolled_at, status, created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  s.id,
  c.id,
  NOW() - INTERVAL '2 months',
  'active',
  NOW(),
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 4: CREATE MODULES AND LESSONS FOR EACH COURSE
-- ===========================================================================

-- Mathematics modules and lessons
INSERT INTO "school software".modules (id, course_id, title, description, order_num, created_at)
VALUES
  ('m0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Introduction to Calculus', 'Limits and derivatives', 1, NOW()),
  ('m0001-math-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Techniques', 'Methods of integration', 2, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "school software".lessons (id, module_id, course_id, title, content, video_url, duration_minutes, order_num, created_at)
VALUES
  ('l0001-math-1-1', 'm0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Understanding Limits', 'Introduction to the concept of limits in calculus.', 'https://example.com/video1', 45, 1, NOW()),
  ('l0001-math-1-2', 'm0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Derivatives Basics', 'Fundamental rules of differentiation.', 'https://example.com/video2', 50, 2, NOW()),
  ('l0001-math-2-1', 'm0001-math-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Methods', 'U-substitution and integration by parts.', 'https://example.com/video3', 55, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 5: CREATE STUDENT PROGRESS FOR LESSONS
-- ===========================================================================

INSERT INTO "school software".student_progress (
  student_id, course_id, lesson_id, progress_percent,
  completed_at, last_accessed_at, created_at, updated_at
)
SELECT
  s.id,
  'c0000001-0001-0001-0001-000000000001',
  l.id,
  CASE
    WHEN l.order_num = 1 THEN 100
    WHEN l.order_num = 2 THEN 60
    ELSE 0
  END,
  CASE WHEN l.order_num = 1 THEN NOW() - INTERVAL '1 week' ELSE NULL END,
  NOW() - INTERVAL '2 days',
  NOW(),
  NOW()
FROM "school software".students s
CROSS JOIN "school software".lessons l
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND l.course_id = 'c0000001-0001-0001-0001-000000000001'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 6: CREATE ASSIGNMENTS
-- ===========================================================================

INSERT INTO "school software".teacher_assignments (
  id, course_id, title, description, type, total_points,
  due_date, published_at, is_published, created_at
)
VALUES
  ('a0001-assign-1', 'c0000001-0001-0001-0001-000000000001', 'Calculus Problem Set 1', 'Solve 20 differentiation problems', 'homework', 100, NOW() + INTERVAL '3 days', NOW() - INTERVAL '1 week', true, NOW()),
  ('a0002-assign-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Quiz', 'Timed quiz on integration techniques', 'quiz', 50, NOW() + INTERVAL '1 week', NOW() - INTERVAL '3 days', true, NOW()),
  ('a0003-assign-3', 'c0000002-0002-0002-0002-000000000002', 'Physics Lab Report', 'Write a report on motion experiments', 'project', 150, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '1 week', true, NOW()),
  ('a0004-assign-4', 'c0000003-0003-0003-0003-000000000003', 'Literature Essay', 'Analyze themes in Shakespeare', 'essay', 100, NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days', true, NOW()),
  ('a0005-assign-5', 'c0000007-0007-0007-0007-000000000007', 'Python Project', 'Build a simple calculator app', 'project', 200, NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 7: CREATE SUBMISSIONS (some completed, some pending)
-- ===========================================================================

INSERT INTO "school software".submissions (
  student_id, assignment_id, assessment_id, course_id,
  submitted_at, status, score, feedback, attempt_number, created_at
)
SELECT
  s.id,
  'a0001-assign-1',
  NULL,
  'c0000001-0001-0001-0001-000000000001',
  NOW() - INTERVAL '2 days',
  'graded',
  92.0,
  'Excellent work! Very thorough solutions.',
  1,
  NOW()
FROM "school software".students s
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 8: CREATE GRADES FOR COURSES
-- ===========================================================================

INSERT INTO "school software".course_grades (
  student_id, course_id, grading_period_id, midterm_grade,
  final_grade, letter_grade, gpa_points, remarks, created_at
)
SELECT
  s.id,
  c.id,
  'gp-fall-2024',
  CASE
    WHEN c.id = 'c0000001-0001-0001-0001-000000000001' THEN 90.5
    WHEN c.id = 'c0000002-0002-0002-0002-000000000002' THEN 88.0
    WHEN c.id = 'c0000003-0003-0003-0003-000000000003' THEN 92.0
    WHEN c.id = 'c0000007-0007-0007-0007-000000000007' THEN 95.0
    ELSE 85.0
  END,
  NULL,  -- final grade not yet available
  CASE
    WHEN c.id = 'c0000001-0001-0001-0001-000000000001' THEN 'A-'
    WHEN c.id = 'c0000002-0002-0002-0002-000000000002' THEN 'B+'
    WHEN c.id = 'c0000003-0003-0003-0003-000000000003' THEN 'A'
    WHEN c.id = 'c0000007-0007-0007-0007-000000000007' THEN 'A+'
    ELSE 'B'
  END,
  CASE
    WHEN c.id = 'c0000001-0001-0001-0001-000000000001' THEN 3.7
    WHEN c.id = 'c0000002-0002-0002-0002-000000000002' THEN 3.3
    WHEN c.id = 'c0000003-0003-0003-0003-000000000003' THEN 4.0
    WHEN c.id = 'c0000007-0007-0007-0007-000000000007' THEN 4.0
    ELSE 3.0
  END,
  'Good performance overall',
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 9: CREATE ATTENDANCE RECORDS (past 30 days)
-- ===========================================================================

INSERT INTO "school software".teacher_attendance (
  student_id, course_id, teacher_id, attendance_date, status,
  first_seen_at, last_seen_at, created_at
)
SELECT
  s.id,
  c.id,
  c.teacher_id,
  generate_series::date,
  CASE (RANDOM() * 10)::int
    WHEN 0 THEN 'late'
    WHEN 1 THEN 'late'
    ELSE 'present'
  END,
  generate_series + (INTERVAL '8 hours' + (RANDOM() * INTERVAL '30 minutes')),
  generate_series + (INTERVAL '12 hours' + (RANDOM() * INTERVAL '1 hour')),
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
CROSS JOIN generate_series(
  NOW() - INTERVAL '30 days',
  NOW(),
  INTERVAL '1 day'
) generate_series
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND c.id IN (
    'c0000001-0001-0001-0001-000000000001',
    'c0000002-0002-0002-0002-000000000002',
    'c0000003-0003-0003-0003-000000000003'
  )
  AND EXTRACT(DOW FROM generate_series) NOT IN (0, 6)  -- Skip weekends
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 10: CREATE TEACHER ANNOUNCEMENTS
-- ===========================================================================

INSERT INTO "school software".teacher_announcements (
  id, teacher_id, course_id, school_id, section_id,
  title, content, type, priority, published_at, is_published, created_at
)
VALUES
  (gen_random_uuid(), 't0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', NULL,
   'Midterm Exam Schedule', 'The midterm examination will be held next Friday at 9:00 AM. Please arrive 15 minutes early.', 'exam', 'high', NOW() - INTERVAL '2 days', true, NOW()),

  (gen_random_uuid(), 't0000002-0002-0002-0002-000000000002', 'c0000002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', NULL,
   'Lab Safety Reminder', 'Remember to bring your lab coats and safety goggles for tomorrow''s experiment.', 'reminder', 'normal', NOW() - INTERVAL '1 day', true, NOW()),

  (gen_random_uuid(), 't0000003-0003-0003-0003-000000000003', 'c0000003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', NULL,
   'Reading Assignment Posted', 'New chapter reading assigned. Complete pages 45-78 by next class. Discussion questions will be graded.', 'assignment', 'normal', NOW() - INTERVAL '3 days', true, NOW()),

  (gen_random_uuid(), 't0000007-0007-0007-0007-000000000007', 'c0000007-0007-0007-0007-000000000007', '00000000-0000-0000-0000-000000000001', NULL,
   'Programming Project Extended', 'Due date for the calculator project has been extended by 3 days due to popular request.', 'general', 'low', NOW() - INTERVAL '1 hour', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 11: CREATE SYSTEM ANNOUNCEMENTS
-- ===========================================================================

INSERT INTO "school software".system_announcements (
  id, school_id, target_audience, title, content, priority,
  published_at, expires_at, is_published, created_at
)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'students',
   'Welcome Back!', 'Welcome to the Spring 2025 semester! We''re excited to have you. Check your schedules and get ready for a great term.',
   'normal', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', true, NOW()),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'students',
   'Library Hours Extended', 'The library will now be open until 10 PM on weekdays for midterm study sessions.',
   'low', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 12: CREATE NOTIFICATIONS
-- ===========================================================================

INSERT INTO "school software".student_notifications (
  student_id, type, title, message, action_url,
  is_read, created_at
)
SELECT
  s.id,
  type_data.type,
  type_data.title,
  type_data.message,
  type_data.action_url,
  type_data.is_read,
  type_data.created_at
FROM "school software".students s
CROSS JOIN (
  VALUES
    ('assignment_due', 'Assignment Due Soon', 'Calculus Problem Set 1 is due in 3 days', '/assessments', false, NOW() - INTERVAL '1 hour'),
    ('grade_posted', 'New Grade Posted', 'Your grade for Physics Lab Report has been posted: 92/100', '/grades', false, NOW() - INTERVAL '3 hours'),
    ('announcement', 'New Announcement', 'Midterm Exam Schedule has been posted by your Math teacher', '/announcements', false, NOW() - INTERVAL '2 days'),
    ('welcome', 'Welcome to MSU!', 'Welcome to your student portal! Explore your courses and start learning.', '/subjects', true, NOW() - INTERVAL '5 days'),
    ('assignment_graded', 'Assignment Graded', 'Your Calculus Problem Set 1 has been graded. Score: 92/100', '/assessments', true, NOW() - INTERVAL '2 days')
) AS type_data(type, title, message, action_url, is_read, created_at)
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 13: CREATE STUDENT NOTES
-- ===========================================================================

INSERT INTO "school software".student_notes (
  id, student_id, course_id, lesson_id, title, content,
  is_pinned, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  s.id,
  'c0000001-0001-0001-0001-000000000001',
  'l0001-math-1-1',
  'Key Concepts: Limits',
  'Important formulas:
- lim(x→a) f(x) = L
- Squeeze theorem
- L''Hopital''s rule

Need to review examples from page 23.',
  true,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
FROM "school software".students s
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 14: CREATE DOWNLOADS/RESOURCES
-- ===========================================================================

INSERT INTO "school software".student_downloads (
  id, student_id, course_id, file_name, file_url, file_type,
  file_size, download_count, created_at
)
SELECT
  gen_random_uuid(),
  s.id,
  data.course_id,
  data.file_name,
  data.file_url,
  data.file_type,
  data.file_size,
  0,
  data.created_at
FROM "school software".students s
CROSS JOIN (
  VALUES
    ('c0000001-0001-0001-0001-000000000001', 'Calculus_Formula_Sheet.pdf', '/downloads/calc-formulas.pdf', 'pdf', 245678, NOW() - INTERVAL '1 week'),
    ('c0000002-0002-0002-0002-000000000002', 'Physics_Lab_Manual.pdf', '/downloads/physics-lab.pdf', 'pdf', 1234567, NOW() - INTERVAL '2 weeks'),
    ('c0000003-0003-0003-0003-000000000003', 'Literature_Reading_List.pdf', '/downloads/reading-list.pdf', 'pdf', 123456, NOW() - INTERVAL '1 month'),
    ('c0000007-0007-0007-0007-000000000007', 'Python_Tutorial.pdf', '/downloads/python-basics.pdf', 'pdf', 567890, NOW() - INTERVAL '3 days')
) AS data(course_id, file_name, file_url, file_type, file_size, created_at)
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- STEP 15: VERIFY DATA WAS CREATED
-- ===========================================================================

-- Show summary
DO $$
DECLARE
  v_student_id UUID;
  v_enrollment_count INT;
  v_assignment_count INT;
  v_notification_count INT;
  v_attendance_count INT;
BEGIN
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';

  SELECT COUNT(*) INTO v_enrollment_count
  FROM "school software".enrollments
  WHERE student_id = v_student_id;

  SELECT COUNT(*) INTO v_assignment_count
  FROM "school software".teacher_assignments;

  SELECT COUNT(*) INTO v_notification_count
  FROM "school software".student_notifications
  WHERE student_id = v_student_id;

  SELECT COUNT(*) INTO v_attendance_count
  FROM "school software".teacher_attendance
  WHERE student_id = v_student_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE POPULATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Enrollments: % courses', v_enrollment_count;
  RAISE NOTICE 'Assignments: % total', v_assignment_count;
  RAISE NOTICE 'Notifications: % messages', v_notification_count;
  RAISE NOTICE 'Attendance Records: % days', v_attendance_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Dashboard should now show:';
  RAISE NOTICE '- Enrolled courses';
  RAISE NOTICE '- Upcoming assignments';
  RAISE NOTICE '- Recent grades';
  RAISE NOTICE '- Attendance records';
  RAISE NOTICE '- Progress tracking';
  RAISE NOTICE '- Notifications and announcements';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Success message
SELECT 'DATABASE FULLY POPULATED - STUDENT PORTAL IS READY!' as status;
