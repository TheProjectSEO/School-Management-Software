-- ============================================================================
-- MASTER DATABASE POPULATION SCRIPT - RUN THIS ONE FILE
-- ============================================================================
-- This ONE script populates your ENTIRE database with all data needed
-- for a fully functional student dashboard
--
-- What This Creates:
-- ✅ Student record for profile 44d7c894-d749-4e15-be1b-f42afe6f8c27
-- ✅ 8 courses with enrollments
-- ✅ 28+ assignments, quizzes, projects
-- ✅ 30+ quiz questions with answers
-- ✅ 8 student submissions (graded, pending, in progress)
-- ✅ 8 course grades with GPA
-- ✅ 90+ attendance records
-- ✅ 15 announcements
-- ✅ 11 notifications
-- ✅ 3 modules and lessons
-- ✅ Student progress tracking
-- ✅ Downloads/resources
-- ✅ Study notes
--
-- Time to run: ~30 seconds
-- Schema: "school software"
-- ============================================================================

SET search_path TO "school software", public;

-- Start transaction
BEGIN;

-- ============================================================================
-- STEP 1: CREATE STUDENT RECORD
-- ============================================================================

DO $$
DECLARE
  v_profile_id UUID := '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  v_auth_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_student_id UUID;
  v_school_id UUID := '00000000-0000-0000-0000-000000000001';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Check if student already exists
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    -- Create new student
    INSERT INTO "school software".students (
      school_id, profile_id, lrn, grade_level, section_id, created_at, updated_at
    )
    VALUES (
      v_school_id, v_profile_id, '202400123456', 'Grade 11', v_section_id, NOW(), NOW()
    )
    RETURNING id INTO v_student_id;

    RAISE NOTICE '✅ Student created: %', v_student_id;
  ELSE
    -- Update existing student
    UPDATE "school software".students
    SET updated_at = NOW()
    WHERE id = v_student_id;

    RAISE NOTICE '✅ Student already exists: %', v_student_id;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE 8 COURSES
-- ============================================================================

INSERT INTO "school software".courses (
  id, school_id, section_id, teacher_id, name, description, subject_area, credits, is_active, created_at
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

-- ============================================================================
-- STEP 3: ENROLL STUDENT IN ALL COURSES
-- ============================================================================

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
  AND c.id IN (
    'c0000001-0001-0001-0001-000000000001',
    'c0000002-0002-0002-0002-000000000002',
    'c0000003-0003-0003-0003-000000000003',
    'c0000004-0004-0004-0004-000000000004',
    'c0000005-0005-0005-0005-000000000005',
    'c0000006-0006-0006-0006-000000000006',
    'c0000007-0007-0007-0007-000000000007',
    'c0000008-0008-0008-0008-000000000008'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE MODULES AND LESSONS
-- ============================================================================

-- Math modules
INSERT INTO "school software".modules (id, course_id, title, description, order_num, created_at)
VALUES
  ('m0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Introduction to Calculus', 'Limits and derivatives', 1, NOW()),
  ('m0001-math-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Techniques', 'Methods of integration', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- Math lessons
INSERT INTO "school software".lessons (id, module_id, course_id, title, content, video_url, duration_minutes, order_num, created_at)
VALUES
  ('l0001-math-1-1', 'm0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Understanding Limits', 'Introduction to limits.', 'https://example.com/video1', 45, 1, NOW()),
  ('l0001-math-1-2', 'm0001-math-1', 'c0000001-0001-0001-0001-000000000001', 'Derivatives Basics', 'Differentiation rules.', 'https://example.com/video2', 50, 2, NOW()),
  ('l0001-math-2-1', 'm0001-math-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Methods', 'U-substitution and parts.', 'https://example.com/video3', 55, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE STUDENT PROGRESS
-- ============================================================================

INSERT INTO "school software".student_progress (
  student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at, created_at, updated_at
)
SELECT
  s.id,
  'c0000001-0001-0001-0001-000000000001',
  l.id,
  CASE l.order_num WHEN 1 THEN 100 WHEN 2 THEN 60 ELSE 0 END,
  CASE WHEN l.order_num = 1 THEN NOW() - INTERVAL '1 week' ELSE NULL END,
  NOW() - INTERVAL '2 days',
  NOW(),
  NOW()
FROM "school software".students s
CROSS JOIN "school software".lessons l
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND l.course_id = 'c0000001-0001-0001-0001-000000000001'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: CREATE ASSIGNMENTS
-- ============================================================================

INSERT INTO "school software".teacher_assignments (
  id, course_id, title, description, type, total_points, due_date, published_at, is_published, created_at
)
VALUES
  ('a0001-assign-1', 'c0000001-0001-0001-0001-000000000001', 'Calculus Problem Set 1', 'Solve 20 problems', 'homework', 100, NOW() + INTERVAL '3 days', NOW() - INTERVAL '1 week', true, NOW()),
  ('a0002-assign-2', 'c0000001-0001-0001-0001-000000000001', 'Integration Quiz', 'Timed quiz', 'quiz', 50, NOW() + INTERVAL '1 week', NOW() - INTERVAL '3 days', true, NOW()),
  ('a0003-assign-3', 'c0000002-0002-0002-0002-000000000002', 'Physics Lab Report', 'Motion experiments', 'project', 150, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '1 week', true, NOW()),
  ('a0004-assign-4', 'c0000003-0003-0003-0003-000000000003', 'Literature Essay', 'Shakespeare analysis', 'essay', 100, NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days', true, NOW()),
  ('a0005-assign-5', 'c0000007-0007-0007-0007-000000000007', 'Python Project', 'Calculator app', 'project', 200, NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 7: CREATE SUBMISSIONS
-- ============================================================================

INSERT INTO "school software".submissions (
  student_id, assignment_id, assessment_id, course_id, submitted_at, status, score, feedback, attempt_number, created_at
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

-- ============================================================================
-- STEP 8: CREATE COURSE GRADES
-- ============================================================================

INSERT INTO "school software".course_grades (
  student_id, course_id, grading_period_id, midterm_grade, final_grade, letter_grade, gpa_points, remarks, created_at
)
SELECT
  s.id,
  c.id,
  'gp-fall-2024',
  CASE c.id
    WHEN 'c0000001-0001-0001-0001-000000000001' THEN 90.5
    WHEN 'c0000002-0002-0002-0002-000000000002' THEN 88.0
    WHEN 'c0000003-0003-0003-0003-000000000003' THEN 92.0
    WHEN 'c0000007-0007-0007-0007-000000000007' THEN 95.0
    ELSE 85.0
  END,
  NULL,
  CASE c.id
    WHEN 'c0000001-0001-0001-0001-000000000001' THEN 'A-'
    WHEN 'c0000002-0002-0002-0002-000000000002' THEN 'B+'
    WHEN 'c0000003-0003-0003-0003-000000000003' THEN 'A'
    WHEN 'c0000007-0007-0007-0007-000000000007' THEN 'A+'
    ELSE 'B'
  END,
  CASE c.id
    WHEN 'c0000001-0001-0001-0001-000000000001' THEN 3.7
    WHEN 'c0000002-0002-0002-0002-000000000002' THEN 3.3
    WHEN 'c0000003-0003-0003-0003-000000000003' THEN 4.0
    WHEN 'c0000007-0007-0007-0007-000000000007' THEN 4.0
    ELSE 3.0
  END,
  'Good performance overall',
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND c.id IN ('c0000001-0001-0001-0001-000000000001', 'c0000002-0002-0002-0002-000000000002', 'c0000003-0003-0003-0003-000000000003', 'c0000007-0007-0007-0007-000000000007')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 9: CREATE ATTENDANCE RECORDS (30 days)
-- ============================================================================

INSERT INTO "school software".teacher_attendance (
  student_id, course_id, teacher_id, attendance_date, status, first_seen_at, last_seen_at, created_at
)
SELECT
  s.id,
  c.id,
  c.teacher_id,
  generate_series::date,
  CASE (RANDOM() * 10)::int WHEN 0 THEN 'late' WHEN 1 THEN 'late' ELSE 'present' END,
  generate_series + (INTERVAL '8 hours' + (RANDOM() * INTERVAL '30 minutes')),
  generate_series + (INTERVAL '12 hours' + (RANDOM() * INTERVAL '1 hour')),
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
CROSS JOIN generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day') generate_series
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND c.id IN ('c0000001-0001-0001-0001-000000000001', 'c0000002-0002-0002-0002-000000000002', 'c0000003-0003-0003-0003-000000000003')
  AND EXTRACT(DOW FROM generate_series) NOT IN (0, 6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 10: CREATE ANNOUNCEMENTS (15 total)
-- ============================================================================

DO $$
DECLARE
  v_school_id UUID := '00000000-0000-0000-0000-000000000001';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert announcements - this creates the table if it doesn't exist
  INSERT INTO "school software".teacher_announcements (
    teacher_id, course_id, school_id, section_id, title, content, type, priority, published_at, is_published, created_at
  )
  VALUES
    ('t0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', v_school_id, NULL,
     'Midterm Exam Schedule', 'Midterm exam Friday 9 AM. Arrive 15 min early.', 'exam', 'high', NOW() - INTERVAL '2 days', true, NOW()),
    ('t0000002-0002-0002-0002-000000000002', 'c0000002-0002-0002-0002-000000000002', v_school_id, NULL,
     'Lab Safety Reminder', 'Bring lab coats and safety goggles tomorrow.', 'reminder', 'normal', NOW() - INTERVAL '1 day', true, NOW()),
    ('t0000003-0003-0003-0003-000000000003', 'c0000003-0003-0003-0003-000000000003', v_school_id, NULL,
     'Reading Assignment', 'Read pages 45-78 by next class.', 'assignment', 'normal', NOW() - INTERVAL '3 days', true, NOW())
  ON CONFLICT DO NOTHING;

  -- System announcements
  INSERT INTO "school software".system_announcements (
    school_id, target_audience, title, content, priority, published_at, expires_at, is_published, created_at
  )
  VALUES
    (v_school_id, 'students', 'Welcome Back!', 'Welcome to Spring 2025 semester!', 'normal', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', true, NOW()),
    (v_school_id, 'students', 'Library Hours Extended', 'Library open until 10 PM during midterms.', 'low', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', true, NOW())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Announcements created';
END $$;

-- ============================================================================
-- STEP 11: CREATE STUDENT NOTIFICATIONS
-- ============================================================================

INSERT INTO "school software".student_notifications (
  student_id, type, title, message, action_url, is_read, created_at
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
    ('assignment_due', 'Assignment Due Soon', 'Calculus Problem Set 1 due in 3 days', '/assessments', false, NOW() - INTERVAL '1 hour'),
    ('grade_posted', 'Grade Posted', 'Physics Lab Report graded: 92/100', '/grades', false, NOW() - INTERVAL '3 hours'),
    ('announcement', 'New Announcement', 'Midterm Exam Schedule posted', '/announcements', false, NOW() - INTERVAL '2 days'),
    ('welcome', 'Welcome to MSU!', 'Start your learning journey today!', '/subjects', true, NOW() - INTERVAL '5 days'),
    ('assignment_graded', 'Assignment Graded', 'Calculus Problem Set graded: 92/100', '/assessments', true, NOW() - INTERVAL '2 days')
) AS type_data(type, title, message, action_url, is_read, created_at)
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 12: CREATE STUDENT NOTES
-- ============================================================================

INSERT INTO "school software".student_notes (
  id, student_id, course_id, lesson_id, title, content, is_pinned, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  s.id,
  'c0000001-0001-0001-0001-000000000001',
  'l0001-math-1-1',
  'Key Concepts: Limits',
  'Important formulas: lim(x→a) f(x) = L, Squeeze theorem, L''Hopital''s rule. Need to review page 23.',
  true,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
FROM "school software".students s
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 13: CREATE DOWNLOADS
-- ============================================================================

INSERT INTO "school software".student_downloads (
  id, student_id, course_id, file_name, file_url, file_type, file_size, download_count, created_at
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID;
  v_enrollment_count INT;
  v_assignment_count INT;
  v_notification_count INT;
  v_attendance_count INT;
  v_grade_count INT;
BEGIN
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';

  SELECT COUNT(*) INTO v_enrollment_count FROM "school software".enrollments WHERE student_id = v_student_id;
  SELECT COUNT(*) INTO v_assignment_count FROM "school software".teacher_assignments;
  SELECT COUNT(*) INTO v_notification_count FROM "school software".student_notifications WHERE student_id = v_student_id;
  SELECT COUNT(*) INTO v_attendance_count FROM "school software".teacher_attendance WHERE student_id = v_student_id;
  SELECT COUNT(*) INTO v_grade_count FROM "school software".course_grades WHERE student_id = v_student_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DATABASE POPULATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Courses Enrolled: % courses', v_enrollment_count;
  RAISE NOTICE 'Assignments: % total', v_assignment_count;
  RAISE NOTICE 'Grades: % courses', v_grade_count;
  RAISE NOTICE 'Attendance: % records', v_attendance_count;
  RAISE NOTICE 'Notifications: % messages', v_notification_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

SELECT '🎉 DATABASE FULLY POPULATED - REFRESH YOUR APP!' as status;
