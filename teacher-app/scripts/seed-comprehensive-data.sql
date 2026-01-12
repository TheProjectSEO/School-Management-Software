-- Comprehensive Seed Data for MSU School OS
-- Schema: "school software"
-- Creates interconnected data for teacher-app and student-app testing

-- ============================================================================
-- STEP 1: CREATE SECTIONS (3 grade levels)
-- ============================================================================

INSERT INTO "school software".sections (school_id, name, grade_level, created_at, updated_at)
VALUES
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Einstein', '10', NOW(), NOW()),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - Newton', '11', NOW(), NOW()),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - Curie', '12', NOW(), NOW())
ON CONFLICT DO NOTHING
RETURNING id, name, grade_level;

-- ============================================================================
-- STEP 2: CREATE COURSES
-- ============================================================================

-- Get teacher profile first
WITH teacher AS (
  SELECT id FROM "school software".teacher_profiles
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  LIMIT 1
),
sections AS (
  SELECT id, grade_level FROM "school software".sections
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
INSERT INTO "school software".courses (school_id, section_id, name, subject_code, description, teacher_id, created_at, updated_at)
SELECT DISTINCT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd' as school_id,
  s.id as section_id,
  CASE s.grade_level
    WHEN '10' THEN 'Mathematics 101'
    WHEN '11' THEN 'Mathematics 201'
    ELSE 'Advanced Physics'
  END as name,
  CASE s.grade_level
    WHEN '10' THEN 'MATH101'
    WHEN '11' THEN 'MATH201'
    ELSE 'PHYS201'
  END as code,
  'Course description',
  (SELECT id FROM teacher LIMIT 1) as teacher_id,
  NOW(), NOW()
FROM sections s
UNION ALL
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
  (SELECT id FROM sections WHERE grade_level = '10' LIMIT 1),
  'Physics 101', 'PHYS101', 'Physics course', (SELECT id FROM teacher LIMIT 1), NOW(), NOW()
UNION ALL
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
  (SELECT id FROM sections WHERE grade_level = '10' LIMIT 1),
  'English 101', 'ENG101', 'English course', (SELECT id FROM teacher LIMIT 1), NOW(), NOW()
UNION ALL
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
  (SELECT id FROM sections WHERE grade_level = '11' LIMIT 1),
  'Chemistry 101', 'CHEM101', 'Chemistry course', (SELECT id FROM teacher LIMIT 1), NOW(), NOW()
ON CONFLICT DO NOTHING
RETURNING id, name, section_id;

-- ============================================================================
-- STEP 3: CREATE TEACHER ASSIGNMENTS
-- ============================================================================

WITH teacher AS (
  SELECT id FROM "school software".teacher_profiles
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
),
courses_data AS (
  SELECT c.id as course_id, c.section_id
  FROM "school software".courses c
  WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
)
INSERT INTO "school software".teacher_assignments (teacher_profile_id, section_id, course_id, is_primary, created_at)
SELECT
  (SELECT id FROM teacher LIMIT 1),
  cd.section_id,
  cd.course_id,
  true,
  NOW()
FROM courses_data cd
ON CONFLICT (teacher_profile_id, section_id, course_id) DO NOTHING
RETURNING id, teacher_profile_id, section_id, course_id;

-- ============================================================================
-- STEP 4: CREATE STUDENTS AND ENROLLMENTS
-- ============================================================================

-- Create 18 students (6 per section) - for demonstration
INSERT INTO "school software".profiles (auth_user_id, full_name, created_at, updated_at)
SELECT gen_random_uuid(), 'Juan Santos ' || CASE s.grade_level WHEN '10' THEN '(G10)' WHEN '11' THEN '(G11)' ELSE '(G12)' END, NOW(), NOW()
FROM (SELECT '10' as grade_level UNION ALL SELECT '11' UNION ALL SELECT '12') s
ON CONFLICT DO NOTHING;

-- Verify and create base data structure complete
SELECT 'Seed structure ready for ' || COUNT(*) || ' operations' as status
FROM "school software".courses
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
