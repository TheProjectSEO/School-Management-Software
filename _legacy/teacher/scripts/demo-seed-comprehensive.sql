-- ============================================================================
-- MSU School OS - COMPREHENSIVE DEMO DATA SEED
-- Purpose: Create a complete demo dataset for pitching/demonstrations
-- All data flows: Admin App → Teacher App → Student App
-- ============================================================================
-- Schema: "school software"
-- Main Demo School: Mindanao State University - Main Campus
-- School ID: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd
-- ============================================================================

-- First, let's clean up partial test data and start fresh
-- (Keep existing teacher Dr. Juan Dela Cruz and his setup)

-- ============================================================================
-- PART 1: CREATE ADDITIONAL TEACHERS (3 more teachers)
-- ============================================================================

-- Create teacher profile entries
INSERT INTO "school software".profiles (id, auth_user_id, full_name, phone, avatar_url)
VALUES
  -- Science Teacher
  ('22222222-aaaa-bbbb-cccc-000000000001'::uuid,
   '22222222-aaaa-bbbb-cccc-100000000001'::uuid,
   'Dr. Maria Santos-Cruz',
   '+63-917-555-0101',
   null),
  -- English Teacher
  ('22222222-aaaa-bbbb-cccc-000000000002'::uuid,
   '22222222-aaaa-bbbb-cccc-100000000002'::uuid,
   'Prof. Antonio Reyes',
   '+63-917-555-0102',
   null),
  -- Filipino Teacher
  ('22222222-aaaa-bbbb-cccc-000000000003'::uuid,
   '22222222-aaaa-bbbb-cccc-100000000003'::uuid,
   'Gng. Elena Magbanua',
   '+63-917-555-0103',
   null)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Create teacher profiles
INSERT INTO "school software".teacher_profiles (id, profile_id, school_id, employee_id, department, specialization, is_active)
VALUES
  ('33333333-aaaa-bbbb-cccc-000000000001'::uuid,
   '22222222-aaaa-bbbb-cccc-000000000001'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'EMP-2024-003',
   'Science',
   'Physics & Chemistry',
   true),
  ('33333333-aaaa-bbbb-cccc-000000000002'::uuid,
   '22222222-aaaa-bbbb-cccc-000000000002'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'EMP-2024-004',
   'English',
   'Literature & Communication Arts',
   true),
  ('33333333-aaaa-bbbb-cccc-000000000003'::uuid,
   '22222222-aaaa-bbbb-cccc-000000000003'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'EMP-2024-005',
   'Filipino',
   'Panitikan at Wika',
   true)
ON CONFLICT (id) DO UPDATE SET department = EXCLUDED.department;

-- ============================================================================
-- PART 2: CREATE ADDITIONAL SECTIONS (2 sections per grade level)
-- ============================================================================

INSERT INTO "school software".sections (id, school_id, name, grade_level, adviser_teacher_id)
VALUES
  -- Grade 10 sections
  ('44444444-aaaa-bbbb-cccc-100000000001'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'Grade 10 - Galileo',
   '10',
   'bc3ff5d2-dd85-46c9-9ae3-c60f7885ff53'::uuid),
  -- Grade 11 sections
  ('44444444-aaaa-bbbb-cccc-110000000001'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'Grade 11 - Darwin',
   '11',
   '33333333-aaaa-bbbb-cccc-000000000001'::uuid),
  -- Grade 12 sections
  ('44444444-aaaa-bbbb-cccc-120000000001'::uuid,
   '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
   'Grade 12 - Hawking',
   '12',
   '33333333-aaaa-bbbb-cccc-000000000002'::uuid)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- PART 3: CREATE ADDITIONAL STUDENTS (4 per section = 24 total)
-- ============================================================================

-- Create student profiles first
INSERT INTO "school software".profiles (id, auth_user_id, full_name, phone)
VALUES
  -- Grade 10 - Einstein (existing section, add 2 more)
  ('55555555-aaaa-1001-0001-000000000001'::uuid, '55555555-auth-1001-0001-000000000001'::uuid, 'Pedro Garcia', '+63-917-101-0001'),
  ('55555555-aaaa-1001-0002-000000000001'::uuid, '55555555-auth-1001-0002-000000000001'::uuid, 'Sofia Reyes', '+63-917-101-0002'),

  -- Grade 10 - Galileo (new section)
  ('55555555-aaaa-1002-0001-000000000001'::uuid, '55555555-auth-1002-0001-000000000001'::uuid, 'Jose Rizal Jr.', '+63-917-102-0001'),
  ('55555555-aaaa-1002-0002-000000000001'::uuid, '55555555-auth-1002-0002-000000000001'::uuid, 'Gabriela Santos', '+63-917-102-0002'),
  ('55555555-aaaa-1002-0003-000000000001'::uuid, '55555555-auth-1002-0003-000000000001'::uuid, 'Miguel Aquino', '+63-917-102-0003'),
  ('55555555-aaaa-1002-0004-000000000001'::uuid, '55555555-auth-1002-0004-000000000001'::uuid, 'Isabella Cruz', '+63-917-102-0004'),

  -- Grade 11 - Newton (existing section, add 2 more)
  ('55555555-aaaa-1101-0001-000000000001'::uuid, '55555555-auth-1101-0001-000000000001'::uuid, 'Antonio Bonifacio', '+63-917-111-0001'),
  ('55555555-aaaa-1101-0002-000000000001'::uuid, '55555555-auth-1101-0002-000000000001'::uuid, 'Catalina Mabini', '+63-917-111-0002'),

  -- Grade 11 - Darwin (new section)
  ('55555555-aaaa-1102-0001-000000000001'::uuid, '55555555-auth-1102-0001-000000000001'::uuid, 'Ramon Magsaysay Jr.', '+63-917-112-0001'),
  ('55555555-aaaa-1102-0002-000000000001'::uuid, '55555555-auth-1102-0002-000000000001'::uuid, 'Teresa Aquino', '+63-917-112-0002'),
  ('55555555-aaaa-1102-0003-000000000001'::uuid, '55555555-auth-1102-0003-000000000001'::uuid, 'Manuel Quezon III', '+63-917-112-0003'),
  ('55555555-aaaa-1102-0004-000000000001'::uuid, '55555555-auth-1102-0004-000000000001'::uuid, 'Corazon Diaz', '+63-917-112-0004'),

  -- Grade 12 - Curie (existing section, add 2 more)
  ('55555555-aaaa-1201-0001-000000000001'::uuid, '55555555-auth-1201-0001-000000000001'::uuid, 'Francisco Luna', '+63-917-121-0001'),
  ('55555555-aaaa-1201-0002-000000000001'::uuid, '55555555-auth-1201-0002-000000000001'::uuid, 'Remedios Jacinto', '+63-917-121-0002'),

  -- Grade 12 - Hawking (new section)
  ('55555555-aaaa-1202-0001-000000000001'::uuid, '55555555-auth-1202-0001-000000000001'::uuid, 'Emilio Aguinaldo Jr.', '+63-917-122-0001'),
  ('55555555-aaaa-1202-0002-000000000001'::uuid, '55555555-auth-1202-0002-000000000001'::uuid, 'Melchora del Pilar', '+63-917-122-0002'),
  ('55555555-aaaa-1202-0003-000000000001'::uuid, '55555555-auth-1202-0003-000000000001'::uuid, 'Andres Luna', '+63-917-122-0003'),
  ('55555555-aaaa-1202-0004-000000000001'::uuid, '55555555-auth-1202-0004-000000000001'::uuid, 'Gregoria Montoya', '+63-917-122-0004')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Get existing section IDs
DO $$
DECLARE
  v_einstein_id uuid;
  v_galileo_id uuid;
  v_newton_id uuid;
  v_darwin_id uuid;
  v_curie_id uuid;
  v_hawking_id uuid;
BEGIN
  -- Get section IDs
  SELECT id INTO v_einstein_id FROM "school software".sections WHERE name = 'Grade 10 - Einstein' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
  SELECT id INTO v_galileo_id FROM "school software".sections WHERE name = 'Grade 10 - Galileo' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
  SELECT id INTO v_newton_id FROM "school software".sections WHERE name = 'Grade 11 - Newton' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
  SELECT id INTO v_darwin_id FROM "school software".sections WHERE name = 'Grade 11 - Darwin' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
  SELECT id INTO v_curie_id FROM "school software".sections WHERE name = 'Grade 12 - Curie' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
  SELECT id INTO v_hawking_id FROM "school software".sections WHERE name = 'Grade 12 - Hawking' AND school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

  -- If section doesn't exist, use the new ones we just created
  IF v_galileo_id IS NULL THEN v_galileo_id := '44444444-aaaa-bbbb-cccc-100000000001'::uuid; END IF;
  IF v_darwin_id IS NULL THEN v_darwin_id := '44444444-aaaa-bbbb-cccc-110000000001'::uuid; END IF;
  IF v_hawking_id IS NULL THEN v_hawking_id := '44444444-aaaa-bbbb-cccc-120000000001'::uuid; END IF;
END $$;

-- Create student records
INSERT INTO "school software".students (id, school_id, profile_id, lrn, grade_level, section_id)
SELECT
  gen_random_uuid(),
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  p.id,
  'LRN-' || LPAD((ROW_NUMBER() OVER (ORDER BY p.full_name))::text, 12, '0'),
  CASE
    WHEN p.id IN ('55555555-aaaa-1001-0001-000000000001'::uuid, '55555555-aaaa-1001-0002-000000000001'::uuid,
                  '55555555-aaaa-1002-0001-000000000001'::uuid, '55555555-aaaa-1002-0002-000000000001'::uuid,
                  '55555555-aaaa-1002-0003-000000000001'::uuid, '55555555-aaaa-1002-0004-000000000001'::uuid) THEN '10'
    WHEN p.id IN ('55555555-aaaa-1101-0001-000000000001'::uuid, '55555555-aaaa-1101-0002-000000000001'::uuid,
                  '55555555-aaaa-1102-0001-000000000001'::uuid, '55555555-aaaa-1102-0002-000000000001'::uuid,
                  '55555555-aaaa-1102-0003-000000000001'::uuid, '55555555-aaaa-1102-0004-000000000001'::uuid) THEN '11'
    ELSE '12'
  END,
  CASE
    -- Grade 10 - Einstein
    WHEN p.id IN ('55555555-aaaa-1001-0001-000000000001'::uuid, '55555555-aaaa-1001-0002-000000000001'::uuid)
      THEN (SELECT id FROM "school software".sections WHERE name = 'Grade 10 - Einstein' LIMIT 1)
    -- Grade 10 - Galileo
    WHEN p.id IN ('55555555-aaaa-1002-0001-000000000001'::uuid, '55555555-aaaa-1002-0002-000000000001'::uuid,
                  '55555555-aaaa-1002-0003-000000000001'::uuid, '55555555-aaaa-1002-0004-000000000001'::uuid)
      THEN '44444444-aaaa-bbbb-cccc-100000000001'::uuid
    -- Grade 11 - Newton
    WHEN p.id IN ('55555555-aaaa-1101-0001-000000000001'::uuid, '55555555-aaaa-1101-0002-000000000001'::uuid)
      THEN (SELECT id FROM "school software".sections WHERE name = 'Grade 11 - Newton' LIMIT 1)
    -- Grade 11 - Darwin
    WHEN p.id IN ('55555555-aaaa-1102-0001-000000000001'::uuid, '55555555-aaaa-1102-0002-000000000001'::uuid,
                  '55555555-aaaa-1102-0003-000000000001'::uuid, '55555555-aaaa-1102-0004-000000000001'::uuid)
      THEN '44444444-aaaa-bbbb-cccc-110000000001'::uuid
    -- Grade 12 - Curie
    WHEN p.id IN ('55555555-aaaa-1201-0001-000000000001'::uuid, '55555555-aaaa-1201-0002-000000000001'::uuid)
      THEN (SELECT id FROM "school software".sections WHERE name = 'Grade 12 - Curie' LIMIT 1)
    -- Grade 12 - Hawking
    ELSE '44444444-aaaa-bbbb-cccc-120000000001'::uuid
  END
FROM "school software".profiles p
WHERE p.id IN (
  '55555555-aaaa-1001-0001-000000000001'::uuid, '55555555-aaaa-1001-0002-000000000001'::uuid,
  '55555555-aaaa-1002-0001-000000000001'::uuid, '55555555-aaaa-1002-0002-000000000001'::uuid,
  '55555555-aaaa-1002-0003-000000000001'::uuid, '55555555-aaaa-1002-0004-000000000001'::uuid,
  '55555555-aaaa-1101-0001-000000000001'::uuid, '55555555-aaaa-1101-0002-000000000001'::uuid,
  '55555555-aaaa-1102-0001-000000000001'::uuid, '55555555-aaaa-1102-0002-000000000001'::uuid,
  '55555555-aaaa-1102-0003-000000000001'::uuid, '55555555-aaaa-1102-0004-000000000001'::uuid,
  '55555555-aaaa-1201-0001-000000000001'::uuid, '55555555-aaaa-1201-0002-000000000001'::uuid,
  '55555555-aaaa-1202-0001-000000000001'::uuid, '55555555-aaaa-1202-0002-000000000001'::uuid,
  '55555555-aaaa-1202-0003-000000000001'::uuid, '55555555-aaaa-1202-0004-000000000001'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM "school software".students s WHERE s.profile_id = p.id
);

-- ============================================================================
-- PART 4: CREATE ADDITIONAL COURSES (Science, English, Filipino per grade)
-- ============================================================================

-- Get Dr. Juan Dela Cruz's teacher_profile_id (Math teacher)
-- Science: Dr. Maria Santos-Cruz (33333333-aaaa-bbbb-cccc-000000000001)
-- English: Prof. Antonio Reyes (33333333-aaaa-bbbb-cccc-000000000002)
-- Filipino: Gng. Elena Magbanua (33333333-aaaa-bbbb-cccc-000000000003)

-- Create courses for all sections
INSERT INTO "school software".courses (id, school_id, section_id, name, subject_code, description, teacher_id)
SELECT
  gen_random_uuid(),
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  s.id,
  subject.name || ' ' || s.grade_level,
  subject.code || s.grade_level,
  subject.description,
  subject.teacher_id
FROM "school software".sections s
CROSS JOIN (
  VALUES
    ('Science', 'SCI', 'General Science curriculum', '33333333-aaaa-bbbb-cccc-000000000001'::uuid),
    ('English', 'ENG', 'English Language and Literature', '33333333-aaaa-bbbb-cccc-000000000002'::uuid),
    ('Filipino', 'FIL', 'Wika at Panitikang Filipino', '33333333-aaaa-bbbb-cccc-000000000003'::uuid)
) AS subject(name, code, description, teacher_id)
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND s.name LIKE 'Grade%'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 5: CREATE TEACHER ASSIGNMENTS FOR NEW COURSES
-- ============================================================================

INSERT INTO "school software".teacher_assignments (teacher_profile_id, section_id, course_id, is_primary)
SELECT DISTINCT
  c.teacher_id,
  c.section_id,
  c.id,
  true
FROM "school software".courses c
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND c.teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "school software".teacher_assignments ta
    WHERE ta.teacher_profile_id = c.teacher_id
      AND ta.section_id = c.section_id
      AND ta.course_id = c.id
  );

-- ============================================================================
-- PART 6: ENROLL ALL STUDENTS IN THEIR SECTION'S COURSES
-- ============================================================================

INSERT INTO "school software".enrollments (school_id, student_id, course_id)
SELECT DISTINCT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  st.id,
  c.id
FROM "school software".students st
JOIN "school software".courses c ON c.section_id = st.section_id
WHERE st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".enrollments e
    WHERE e.student_id = st.id AND e.course_id = c.id
  );

-- ============================================================================
-- PART 7: CREATE MODULES FOR ALL COURSES
-- ============================================================================

INSERT INTO "school software".modules (id, course_id, title, description, "order", duration_minutes, is_published)
SELECT
  gen_random_uuid(),
  c.id,
  module_data.title,
  module_data.description,
  module_data.order_num,
  module_data.duration,
  true
FROM "school software".courses c
CROSS JOIN (
  VALUES
    ('Introduction and Fundamentals', 'Learn the basic concepts and foundations', 1, 60),
    ('Core Concepts', 'Dive deeper into essential topics', 2, 90),
    ('Practical Applications', 'Apply what you learned in real-world scenarios', 3, 75),
    ('Assessment and Review', 'Test your knowledge and review key points', 4, 45)
) AS module_data(title, description, order_num, duration)
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".modules m
    WHERE m.course_id = c.id AND m.title = module_data.title
  );

-- ============================================================================
-- PART 8: CREATE LESSONS FOR ALL MODULES
-- ============================================================================

INSERT INTO "school software".lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT
  m.id,
  lesson_data.title,
  lesson_data.content,
  lesson_data.content_type,
  lesson_data.order_num,
  lesson_data.duration,
  true
FROM "school software".modules m
CROSS JOIN (
  VALUES
    ('Video Lecture', '{"type": "video", "url": "https://example.com/lecture.mp4"}', 'video', 1, 20),
    ('Reading Material', '{"type": "reading", "content": "Detailed reading material for this lesson..."}', 'reading', 2, 30),
    ('Interactive Exercise', '{"type": "interactive", "questions": []}', 'interactive', 3, 15)
) AS lesson_data(title, content, content_type, order_num, duration)
WHERE NOT EXISTS (
  SELECT 1 FROM "school software".lessons l
  WHERE l.module_id = m.id AND l.title = lesson_data.title
);

-- ============================================================================
-- PART 9: CREATE ASSESSMENTS WITH QUESTIONS
-- ============================================================================

-- Create assessments for each course
INSERT INTO "school software".assessments (id, school_id, course_id, title, description, type, due_date, total_points, time_limit_minutes, max_attempts, instructions)
SELECT
  gen_random_uuid(),
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  c.id,
  assessment_data.title || ' - ' || c.name,
  assessment_data.description,
  assessment_data.type,
  NOW() + (assessment_data.due_days || ' days')::interval,
  assessment_data.points,
  assessment_data.time_limit,
  assessment_data.attempts,
  assessment_data.instructions
FROM "school software".courses c
CROSS JOIN (
  VALUES
    ('Midterm Quiz', 'Test your understanding of the first half of the course', 'quiz', 14, 50, 30, 2, 'Answer all questions. You have 30 minutes.'),
    ('Final Exam', 'Comprehensive exam covering all topics', 'exam', 30, 100, 60, 1, 'This is your final exam. No retakes allowed.'),
    ('Research Project', 'Write a 500-word essay on the main topic', 'assignment', 21, 30, null, 1, 'Submit your research paper in PDF format.')
) AS assessment_data(title, description, type, due_days, points, time_limit, attempts, instructions)
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".assessments a
    WHERE a.course_id = c.id AND a.title LIKE assessment_data.title || '%'
  );

-- ============================================================================
-- PART 10: CREATE SAMPLE TEACHER ANNOUNCEMENTS
-- ============================================================================

INSERT INTO "school software".teacher_announcements (id, scope_type, scope_id, title, body, is_pinned, publish_at, created_by)
SELECT
  gen_random_uuid(),
  'section',
  s.id,
  'Welcome to ' || s.name || '!',
  'Dear students, welcome to the new semester! Please review the syllabus and course materials. Feel free to reach out if you have any questions. Let''s have a great learning experience together!',
  true,
  NOW(),
  (SELECT profile_id FROM "school software".teacher_profiles WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd' LIMIT 1)
FROM "school software".sections s
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".teacher_announcements ta
    WHERE ta.scope_id = s.id AND ta.title LIKE 'Welcome%'
  );

-- Add course-level announcements
INSERT INTO "school software".teacher_announcements (id, scope_type, scope_id, title, body, is_pinned, publish_at, created_by)
SELECT
  gen_random_uuid(),
  'course',
  c.id,
  'Important: Upcoming Assessment',
  'Reminder: You have an upcoming assessment due soon. Please review all modules and complete your preparation. Good luck!',
  false,
  NOW(),
  c.teacher_id
FROM "school software".courses c
JOIN "school software".teacher_profiles tp ON c.teacher_id = tp.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".teacher_announcements ta
    WHERE ta.scope_id = c.id AND ta.title = 'Important: Upcoming Assessment'
  )
LIMIT 10;

-- ============================================================================
-- PART 11: CREATE SAMPLE ATTENDANCE RECORDS
-- ============================================================================

-- Create some daily attendance records for the past week
INSERT INTO "school software".teacher_daily_attendance (student_id, date, status, first_seen_at, last_seen_at, detected_from_login)
SELECT
  st.id,
  d.date,
  CASE
    WHEN random() < 0.85 THEN 'present'
    WHEN random() < 0.95 THEN 'late'
    ELSE 'absent'
  END,
  d.date + interval '8 hours' + (random() * interval '30 minutes'),
  d.date + interval '15 hours' + (random() * interval '2 hours'),
  true
FROM "school software".students st
CROSS JOIN generate_series(
  CURRENT_DATE - interval '7 days',
  CURRENT_DATE,
  interval '1 day'
) AS d(date)
WHERE st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".teacher_daily_attendance tda
    WHERE tda.student_id = st.id AND tda.date = d.date
  );

-- ============================================================================
-- PART 12: CREATE SAMPLE STUDENT PROGRESS
-- ============================================================================

INSERT INTO "school software".student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at)
SELECT
  e.student_id,
  e.course_id,
  l.id,
  CASE
    WHEN random() < 0.3 THEN 100
    WHEN random() < 0.6 THEN floor(random() * 50 + 50)::int
    ELSE floor(random() * 50)::int
  END,
  CASE WHEN random() < 0.3 THEN NOW() - (random() * interval '7 days') ELSE NULL END,
  NOW() - (random() * interval '14 days')
FROM "school software".enrollments e
JOIN "school software".modules m ON m.course_id = e.course_id
JOIN "school software".lessons l ON l.module_id = m.id
WHERE e.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND NOT EXISTS (
    SELECT 1 FROM "school software".student_progress sp
    WHERE sp.student_id = e.student_id AND sp.lesson_id = l.id
  )
LIMIT 500;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== DEMO DATA SUMMARY ===' as info;

SELECT
  'Teachers' as category,
  COUNT(*) as count
FROM "school software".teacher_profiles
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Sections' as category,
  COUNT(*) as count
FROM "school software".sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Students' as category,
  COUNT(*) as count
FROM "school software".students
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Courses' as category,
  COUNT(*) as count
FROM "school software".courses
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Enrollments' as category,
  COUNT(*) as count
FROM "school software".enrollments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Modules' as category,
  COUNT(*) as count
FROM "school software".modules m
JOIN "school software".courses c ON m.course_id = c.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Lessons' as category,
  COUNT(*) as count
FROM "school software".lessons l
JOIN "school software".modules m ON l.module_id = m.id
JOIN "school software".courses c ON m.course_id = c.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Assessments' as category,
  COUNT(*) as count
FROM "school software".assessments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  'Announcements' as category,
  COUNT(*) as count
FROM "school software".teacher_announcements
WHERE scope_id IN (
  SELECT id FROM "school software".sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  UNION
  SELECT id FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
ORDER BY category;

-- Show teachers
SELECT '=== TEACHERS ===' as info;
SELECT p.full_name, tp.department, tp.employee_id
FROM "school software".teacher_profiles tp
JOIN "school software".profiles p ON tp.profile_id = p.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY p.full_name;

-- Show sections with student counts
SELECT '=== SECTIONS ===' as info;
SELECT
  s.name,
  s.grade_level,
  COUNT(st.id) as student_count
FROM "school software".sections s
LEFT JOIN "school software".students st ON st.section_id = s.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY s.id, s.name, s.grade_level
ORDER BY s.grade_level, s.name;
