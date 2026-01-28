-- ============================================================================
-- MSU School OS - Test Data Seed (CORRECT SCHEMA)
-- Schema: "school software" ⚠️ CRITICAL
-- Purpose: Connect teacher-app and student-app for testing
-- ============================================================================

-- STEP 1: Create 3 class sections
-- ============================================================================
INSERT INTO "school software".sections (school_id, name, grade_level)
VALUES
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Einstein', '10'),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - Newton', '11'),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - Curie', '12')
ON CONFLICT DO NOTHING
RETURNING id, name, grade_level;

-- STEP 2: Create 3 courses (need to get section IDs first)
-- ============================================================================
-- Get section IDs
WITH section_ids AS (
  SELECT s.id, s.grade_level FROM "school software".sections s
  WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
),
teacher_id_lookup AS (
  SELECT tp.id as teacher_profile_id FROM "school software".teacher_profiles tp
  JOIN "school software".profiles p ON tp.profile_id = p.id
  WHERE p.full_name = 'Dr. Juan Dela Cruz'
  LIMIT 1
)
INSERT INTO "school software".courses (school_id, section_id, name, subject_code, teacher_id)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  s.id,
  'Mathematics ' || s.grade_level || '01',
  'MATH' || s.grade_level || '01',
  t.teacher_profile_id
FROM section_ids s, teacher_id_lookup t
UNION ALL
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  s.id,
  'Science ' || s.grade_level || '01',
  'SCI' || s.grade_level || '01',
  t.teacher_profile_id
FROM section_ids s, teacher_id_lookup t
WHERE s.grade_level IN ('10', '11')
ON CONFLICT DO NOTHING
RETURNING id, name, subject_code;

-- STEP 3: Create teacher assignments
-- ============================================================================
WITH teacher_id_lookup AS (
  SELECT tp.id FROM "school software".teacher_profiles tp
  JOIN "school software".profiles p ON tp.profile_id = p.id
  WHERE p.full_name = 'Dr. Juan Dela Cruz'
  LIMIT 1
),
course_data AS (
  SELECT c.id as course_id, c.section_id
  FROM "school software".courses c
  WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
INSERT INTO "school software".teacher_assignments (teacher_profile_id, section_id, course_id, is_primary)
SELECT
  t.id,
  c.section_id,
  c.course_id,
  true
FROM teacher_id_lookup t, course_data c
ON CONFLICT (teacher_profile_id, section_id, course_id) DO NOTHING;

-- STEP 4: Create 6 student profiles (2 per section)
-- ============================================================================
-- Note: In production, auth users are created via Supabase Auth
-- For testing, we create profiles with placeholder auth_user_ids

INSERT INTO "school software".profiles (auth_user_id, full_name, phone)
VALUES
  ('11111111-0000-0000-0000-000000000001'::uuid, 'Maria Santos', '+63-917-1111111'),
  ('11111111-0000-0000-0000-000000000002'::uuid, 'Juan Reyes', '+63-917-2222222'),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'Rosa Garcia', '+63-917-3333333'),
  ('11111111-0000-0000-0000-000000000004'::uuid, 'Miguel Lopez', '+63-917-4444444'),
  ('11111111-0000-0000-0000-000000000005'::uuid, 'Anna Martinez', '+63-917-5555555'),
  ('11111111-0000-0000-0000-000000000006'::uuid, 'Carlos Fernandez', '+63-917-6666666')
ON CONFLICT (auth_user_id) DO NOTHING;

-- STEP 5: Create students (link to sections)
-- ============================================================================
WITH section_grade10 AS (
  SELECT sec.id FROM "school software".sections sec
  WHERE sec.name = 'Grade 10 - Einstein' AND sec.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  LIMIT 1
),
section_grade11 AS (
  SELECT sec.id FROM "school software".sections sec
  WHERE sec.name = 'Grade 11 - Newton' AND sec.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  LIMIT 1
),
section_grade12 AS (
  SELECT sec.id FROM "school software".sections sec
  WHERE sec.name = 'Grade 12 - Curie' AND sec.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  LIMIT 1
),
student_profiles AS (
  SELECT p.id, p.full_name FROM "school software".profiles p
  WHERE p.auth_user_id IN (
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000002'::uuid,
    '11111111-0000-0000-0000-000000000003'::uuid,
    '11111111-0000-0000-0000-000000000004'::uuid,
    '11111111-0000-0000-0000-000000000005'::uuid,
    '11111111-0000-0000-0000-000000000006'::uuid
  )
)
INSERT INTO "school software".students (school_id, profile_id, lrn, grade_level, section_id)
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789001', '10', s10.id
FROM student_profiles sp, section_grade10 s10
WHERE sp.full_name = 'Maria Santos'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789002', '10', s10.id
FROM student_profiles sp, section_grade10 s10
WHERE sp.full_name = 'Juan Reyes'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789003', '11', s11.id
FROM student_profiles sp, section_grade11 s11
WHERE sp.full_name = 'Rosa Garcia'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789004', '11', s11.id
FROM student_profiles sp, section_grade11 s11
WHERE sp.full_name = 'Miguel Lopez'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789005', '12', s12.id
FROM student_profiles sp, section_grade12 s12
WHERE sp.full_name = 'Anna Martinez'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, sp.id, '123456789006', '12', s12.id
FROM student_profiles sp, section_grade12 s12
WHERE sp.full_name = 'Carlos Fernandez'
ON CONFLICT (lrn) DO NOTHING;

-- STEP 6: Enroll students in courses
-- ============================================================================
WITH student_data AS (
  SELECT s.id as student_id, s.section_id, s.grade_level
  FROM "school software".students s
  WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
),
course_data AS (
  SELECT c.id as course_id, c.section_id
  FROM "school software".courses c
  WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
INSERT INTO "school software".enrollments (school_id, student_id, course_id)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  sd.student_id,
  cd.course_id
FROM student_data sd
JOIN course_data cd ON sd.section_id = cd.section_id
ON CONFLICT DO NOTHING;

-- STEP 7: Create sample modules (2 per course, published)
-- ============================================================================
WITH course_ids AS (
  SELECT c.id FROM "school software".courses c
  WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
INSERT INTO "school software".modules (course_id, title, description, "order", duration_minutes, is_published)
SELECT
  ci.id,
  'Introduction to Mathematics',
  'Learn the fundamentals of mathematical thinking',
  1,
  60,
  true
FROM course_ids ci
WHERE ci.id IN (SELECT cix.id FROM course_ids cix LIMIT 3)
UNION ALL
SELECT
  ci.id,
  'Advanced Problem Solving',
  'Apply mathematical concepts to real-world problems',
  2,
  90,
  true
FROM course_ids ci
WHERE ci.id IN (SELECT cix.id FROM course_ids cix LIMIT 3)
ON CONFLICT DO NOTHING;

-- STEP 8: Create sample lessons (3 per module)
-- ============================================================================
WITH module_ids AS (
  SELECT m.id FROM "school software".modules m
  WHERE m.course_id IN (
    SELECT c.id FROM "school software".courses c
    WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  )
)
INSERT INTO "school software".lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT
  mi.id,
  'Video Lecture: Introduction',
  '{"video_url": "https://example.com/video1.mp4", "description": "Introduction to the topic"}',
  'video',
  1,
  20,
  true
FROM module_ids mi
UNION ALL
SELECT
  mi.id,
  'Reading: Core Concepts',
  '{"markdown": "# Core Concepts\n\nThis lesson covers the fundamental concepts..."}',
  'reading',
  2,
  30,
  true
FROM module_ids mi
UNION ALL
SELECT
  mi.id,
  'Practice Quiz',
  '{"quiz_id": null, "instructions": "Test your understanding"}',
  'quiz',
  3,
  15,
  true
FROM module_ids mi
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show created sections
SELECT '=== SECTIONS ===' as info;
SELECT id, name, grade_level
FROM "school software".sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Show created courses
SELECT '=== COURSES ===' as info;
SELECT c.id, c.name, c.subject_code, c.section_id
FROM "school software".courses c
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Show students per section
SELECT '=== STUDENTS ===' as info;
SELECT s.lrn, p.full_name, sec.name as section, s.grade_level
FROM "school software".students s
JOIN "school software".profiles p ON s.profile_id = p.id
JOIN "school software".sections sec ON s.section_id = sec.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY s.grade_level, p.full_name;

-- Show enrollments
SELECT '=== ENROLLMENTS ===' as info;
SELECT COUNT(*) as total_enrollments
FROM "school software".enrollments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Show teacher assignments
SELECT '=== TEACHER ASSIGNMENTS ===' as info;
SELECT
  p.full_name as teacher,
  sec.name as section,
  c.name as course
FROM "school software".teacher_assignments ta
JOIN "school software".teacher_profiles tp ON ta.teacher_profile_id = tp.id
JOIN "school software".profiles p ON tp.profile_id = p.id
JOIN "school software".sections sec ON ta.section_id = sec.id
JOIN "school software".courses c ON ta.course_id = c.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Show modules and lessons
SELECT '=== MODULES & LESSONS ===' as info;
SELECT
  c.name as course,
  COUNT(DISTINCT m.id) as module_count,
  COUNT(l.id) as lesson_count
FROM "school software".courses c
LEFT JOIN "school software".modules m ON c.id = m.course_id
LEFT JOIN "school software".lessons l ON m.id = l.module_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY c.id, c.name;

-- Summary
SELECT '=== SUMMARY ===' as info;
SELECT
  (SELECT COUNT(*) FROM "school software".sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as sections,
  (SELECT COUNT(*) FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as courses,
  (SELECT COUNT(*) FROM "school software".students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as students,
  (SELECT COUNT(*) FROM "school software".enrollments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as enrollments,
  (SELECT COUNT(*) FROM "school software".teacher_assignments ta JOIN "school software".teacher_profiles tp ON ta.teacher_profile_id = tp.id WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as teacher_assignments;
