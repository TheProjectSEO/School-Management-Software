-- ============================================================================
-- MSU School OS - Comprehensive Test Data Seed
-- Schema: n8n_content_creation (PRIMARY)
-- Purpose: Full workflow testing between teacher-app and student-app
-- ============================================================================
--
-- IMPORTANT SETUP INSTRUCTIONS:
-- 1. Run this entire file in Supabase SQL Editor
-- 2. The file creates or reuses existing data
-- 3. All IDs are self-contained or fetched dynamically
-- 4. At the end, verification queries show what was created
--
-- WORKFLOW COVERAGE:
-- - Teacher Dr. Juan Dela Cruz registers and can login
-- - 3 Sections created (Grade 10, 11, 12)
-- - 6 Student profiles created (2 per section)
-- - 3 Courses created (Math 101, Math 201, Physics 101)
-- - Teacher assignments linked
-- - Student enrollments created
-- - Sample published modules with lessons
-- - Sample assessments with question banks
-- - Sample transcripts and notes
-- ============================================================================

-- ============================================================================
-- STEP 0: GET SCHOOL ID (MSU - Main Campus)
-- ============================================================================
-- School ID should be: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd
-- Verify it exists before proceeding

DO $$
DECLARE
  school_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM n8n_content_creation.schools
    WHERE id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  ) INTO school_exists;

  IF NOT school_exists THEN
    RAISE NOTICE 'WARNING: School ID 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd not found. Creating test school.';
    INSERT INTO n8n_content_creation.schools (id, slug, name, region, division)
    VALUES ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'msu-main', 'MSU - Main Campus', 'Misamis Oriental', 'Cagayan de Oro')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'School MSU - Main Campus verified.';
  END IF;
END $$;

-- ============================================================================
-- STEP 1: CREATE TEACHER PROFILE & AUTH
-- ============================================================================
-- Teacher: Dr. Juan Dela Cruz
-- Email: juan.delacruz@msu.edu.ph
-- Employee ID: EMP001

-- First, create or get the auth user and profile
-- NOTE: In production, auth user is created via Supabase Auth UI
-- For testing, we'll create a profile entry
INSERT INTO n8n_content_creation.profiles (auth_user_id, full_name, phone, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- Test auth_user_id (placeholder)
  'Dr. Juan Dela Cruz',
  '+63-912-3456789',
  NOW(),
  NOW()
)
ON CONFLICT (auth_user_id) DO NOTHING;

-- Get the profile ID we just created (or fetch existing)
WITH teacher_profile_data AS (
  SELECT id FROM n8n_content_creation.profiles
  WHERE full_name = 'Dr. Juan Dela Cruz'
  LIMIT 1
)
INSERT INTO n8n_content_creation.teacher_profiles (
  profile_id,
  school_id,
  employee_id,
  department,
  specialization,
  is_active,
  created_at,
  updated_at
)
SELECT
  tp.id,
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  'EMP001',
  'Mathematics & Science',
  'Mathematics Education',
  true,
  NOW(),
  NOW()
FROM teacher_profile_data tp
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- STEP 2: CREATE SECTIONS (3 grade levels)
-- ============================================================================
INSERT INTO n8n_content_creation.sections (
  school_id,
  name,
  grade_level,
  adviser_teacher_id,
  created_at,
  updated_at
)
VALUES
  (
    '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
    'Grade 10 - Einstein Section',
    '10',
    (SELECT profile_id FROM n8n_content_creation.teacher_profiles WHERE employee_id = 'EMP001' LIMIT 1),
    NOW(),
    NOW()
  ),
  (
    '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
    'Grade 11 - Newton Section',
    '11',
    (SELECT profile_id FROM n8n_content_creation.teacher_profiles WHERE employee_id = 'EMP001' LIMIT 1),
    NOW(),
    NOW()
  ),
  (
    '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
    'Grade 12 - Curie Section',
    '12',
    (SELECT profile_id FROM n8n_content_creation.teacher_profiles WHERE employee_id = 'EMP001' LIMIT 1),
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE STUDENT PROFILES (6 students, 2 per section)
-- ============================================================================
-- Grade 10 Students
INSERT INTO n8n_content_creation.profiles (auth_user_id, full_name, phone, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Maria Santos', '+63-912-1110001', NOW(), NOW()),
  (gen_random_uuid(), 'Juan Reyes', '+63-912-1110002', NOW(), NOW()),
  (gen_random_uuid(), 'Rosa Garcia', '+63-912-1110003', NOW(), NOW()),
  (gen_random_uuid(), 'Miguel Lopez', '+63-912-1110004', NOW(), NOW()),
  (gen_random_uuid(), 'Anna Martinez', '+63-912-1110005', NOW(), NOW()),
  (gen_random_uuid(), 'Carlos Fernandez', '+63-912-1110006', NOW(), NOW())
ON CONFLICT (auth_user_id) DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE STUDENT RECORDS (linked to sections)
-- ============================================================================
WITH student_profiles AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY created_at) as row_num,
    id,
    full_name
  FROM n8n_content_creation.profiles
  WHERE full_name IN (
    'Maria Santos', 'Juan Reyes', 'Rosa Garcia',
    'Miguel Lopez', 'Anna Martinez', 'Carlos Fernandez'
  )
)
INSERT INTO n8n_content_creation.students (
  school_id,
  profile_id,
  lrn,
  grade_level,
  section_id,
  created_at,
  updated_at
)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  sp.id,
  '1000000' || LPAD(sp.row_num::text, 3, '0'),  -- LRN: 1000000001, 1000000002, etc.
  CASE
    WHEN sp.row_num <= 2 THEN '10'
    WHEN sp.row_num <= 4 THEN '11'
    ELSE '12'
  END,
  (
    SELECT s.id FROM n8n_content_creation.sections s
    WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    ORDER BY s.grade_level
    LIMIT 1 OFFSET CASE
      WHEN sp.row_num <= 2 THEN 0
      WHEN sp.row_num <= 4 THEN 1
      ELSE 2
    END
  ),
  NOW(),
  NOW()
FROM student_profiles sp
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE COURSES (3 courses across 3 sections)
-- ============================================================================
WITH sections_data AS (
  SELECT id, grade_level FROM n8n_content_creation.sections
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
),
teacher_data AS (
  SELECT id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
  LIMIT 1
)
INSERT INTO n8n_content_creation.courses (
  school_id,
  section_id,
  name,
  subject_code,
  description,
  teacher_id,
  created_at,
  updated_at
)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  sd.id,
  CASE sd.grade_level
    WHEN '10' THEN 'Mathematics 101: Introduction to Algebra'
    WHEN '11' THEN 'Mathematics 201: Advanced Algebra & Geometry'
    ELSE 'Physics 101: Mechanics & Waves'
  END,
  CASE sd.grade_level
    WHEN '10' THEN 'MATH101'
    WHEN '11' THEN 'MATH201'
    ELSE 'PHYS101'
  END,
  CASE sd.grade_level
    WHEN '10' THEN 'Learn the fundamentals of algebraic expressions and equations'
    WHEN '11' THEN 'Master advanced algebraic concepts and geometric principles'
    ELSE 'Explore physics fundamentals including motion, forces, and waves'
  END,
  (SELECT id FROM teacher_data),
  NOW(),
  NOW()
FROM sections_data sd
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: CREATE TEACHER ASSIGNMENTS
-- ============================================================================
WITH teacher_data AS (
  SELECT id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
),
assignment_data AS (
  SELECT ta.id as teacher_id, s.id as section_id, c.id as course_id
  FROM n8n_content_creation.sections s
  CROSS JOIN (SELECT id FROM teacher_data) ta
  LEFT JOIN n8n_content_creation.courses c ON c.section_id = s.id
  WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
)
INSERT INTO n8n_content_creation.teacher_assignments (
  teacher_profile_id,
  section_id,
  course_id,
  is_primary,
  created_at
)
SELECT
  teacher_id,
  section_id,
  course_id,
  true,
  NOW()
FROM assignment_data
WHERE course_id IS NOT NULL
ON CONFLICT (teacher_profile_id, section_id, course_id) DO NOTHING;

-- ============================================================================
-- STEP 7: CREATE STUDENT ENROLLMENTS
-- ============================================================================
WITH enrollment_data AS (
  SELECT
    st.id as student_id,
    st.section_id,
    c.id as course_id
  FROM n8n_content_creation.students st
  LEFT JOIN n8n_content_creation.courses c ON c.section_id = st.section_id
  WHERE st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
)
INSERT INTO n8n_content_creation.enrollments (
  school_id,
  student_id,
  course_id,
  created_at,
  updated_at
)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  student_id,
  course_id,
  NOW(),
  NOW()
FROM enrollment_data
WHERE course_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 8: CREATE SAMPLE MODULES (Published)
-- ============================================================================
-- Create 2 modules per course
WITH course_data AS (
  SELECT id, name, subject_code
  FROM n8n_content_creation.courses
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
)
INSERT INTO n8n_content_creation.modules (
  course_id,
  title,
  description,
  order,
  duration_minutes,
  is_published,
  created_at,
  updated_at
)
SELECT
  cd.id,
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY cd.id) = 1
    THEN 'Module 1: ' || SUBSTRING(cd.name, 1, 30) || ' - Part A'
    ELSE 'Module 2: ' || SUBSTRING(cd.name, 1, 30) || ' - Part B'
  END,
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY cd.id) = 1
    THEN 'Introduction and foundational concepts for ' || cd.name
    ELSE 'Advanced topics and applications for ' || cd.name
  END,
  ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY cd.id),
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY cd.id) = 1 THEN 60 ELSE 90 END,
  true,  -- is_published
  NOW(),
  NOW()
FROM course_data cd, (SELECT 1 UNION SELECT 2) numbers
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 9: CREATE SAMPLE LESSONS (Published)
-- ============================================================================
-- Create 3 lessons per module
WITH module_data AS (
  SELECT id, course_id
  FROM n8n_content_creation.modules
  WHERE is_published = true
)
INSERT INTO n8n_content_creation.lessons (
  module_id,
  title,
  content,
  content_type,
  duration_minutes,
  order,
  is_published,
  created_at,
  updated_at
)
SELECT
  md.id,
  'Lesson ' || ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) || ': ' ||
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 1 THEN 'Concepts & Introduction'
       WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 2 THEN 'Worked Examples'
       ELSE 'Practice Problems' END,
  'This lesson covers essential content on the topic. Students should understand the core concepts before proceeding.',
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 1 THEN 'video'
       WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 2 THEN 'reading'
       ELSE 'interactive' END,
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 1 THEN 20
       WHEN ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id) = 2 THEN 30
       ELSE 25 END,
  ROW_NUMBER() OVER (PARTITION BY md.id ORDER BY md.id),
  true,  -- is_published
  NOW(),
  NOW()
FROM module_data md, (SELECT 1 UNION SELECT 2 UNION SELECT 3) numbers
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 10: CREATE TEACHER TRANSCRIPTS (for modules)
-- ============================================================================
WITH module_data AS (
  SELECT id FROM n8n_content_creation.modules
  WHERE is_published = true
),
teacher_prof AS (
  SELECT profile_id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
)
INSERT INTO n8n_content_creation.teacher_transcripts (
  module_id,
  source_type,
  content,
  timestamps_json,
  version,
  is_published,
  published_at,
  published_by,
  created_at,
  updated_at
)
SELECT
  md.id,
  'ai_generated',
  'This is an AI-generated transcript of the lecture. [00:00] Introduction to the topic [02:15] Key concepts [05:30] First example [08:45] Important note: Remember to focus on the fundamentals. [12:00] Second example and discussion [15:30] Common mistakes students make [18:00] Summary and next steps',
  '[{"time": "00:00", "text": "Introduction"}, {"time": "02:15", "text": "Key concepts"}, {"time": "05:30", "text": "Example 1"}, {"time": "12:00", "text": "Example 2"}, {"time": "18:00", "text": "Summary"}]'::jsonb,
  1,
  true,  -- is_published
  NOW(),
  (SELECT profile_id FROM teacher_prof LIMIT 1),
  NOW(),
  NOW()
FROM module_data md
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 11: CREATE TEACHER NOTES (for modules)
-- ============================================================================
WITH module_data AS (
  SELECT id FROM n8n_content_creation.modules
  WHERE is_published = true
),
teacher_prof AS (
  SELECT profile_id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
)
INSERT INTO n8n_content_creation.teacher_notes (
  module_id,
  title,
  rich_text,
  version,
  is_published,
  published_at,
  published_by,
  created_at,
  updated_at
)
SELECT
  md.id,
  'Lecture Notes - Module Overview',
  '<h2>Key Takeaways</h2><ul><li>First fundamental concept explained</li><li>Second important principle</li><li>Connection to previous material</li></ul><h2>Important Points</h2><p>Students should focus on understanding the underlying principles before memorizing formulas.</p><h2>Resources</h2><ul><li>Textbook Chapter 3-4</li><li>Online supplementary materials</li><li>Practice problem set A</li></ul>',
  1,
  true,  -- is_published
  NOW(),
  (SELECT profile_id FROM teacher_prof LIMIT 1),
  NOW(),
  NOW()
FROM module_data md
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 12: CREATE QUESTION BANKS (for courses)
-- ============================================================================
WITH course_data AS (
  SELECT id FROM n8n_content_creation.courses
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
),
teacher_prof AS (
  SELECT profile_id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
)
INSERT INTO n8n_content_creation.teacher_question_banks (
  course_id,
  name,
  description,
  created_by,
  created_at,
  updated_at
)
SELECT
  cd.id,
  'Question Bank 1: Basic Concepts',
  'Collection of fundamental questions covering core concepts',
  (SELECT profile_id FROM teacher_prof LIMIT 1),
  NOW(),
  NOW()
FROM course_data cd
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 13: CREATE SAMPLE QUESTIONS IN BANKS
-- ============================================================================
WITH bank_data AS (
  SELECT id, course_id FROM n8n_content_creation.teacher_question_banks
  LIMIT 1  -- Use first bank for demonstration
),
questions_list AS (
  SELECT 1 as q_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
)
INSERT INTO n8n_content_creation.teacher_bank_questions (
  bank_id,
  question_text,
  question_type,
  choices_json,
  answer_key_json,
  points,
  difficulty,
  tags,
  explanation,
  created_at,
  updated_at
)
SELECT
  bd.id,
  'Question ' || ql.q_num || ': What is the correct answer to this fundamental concept?',
  CASE WHEN ql.q_num = 1 THEN 'multiple_choice'
       WHEN ql.q_num = 2 THEN 'true_false'
       WHEN ql.q_num = 3 THEN 'multiple_choice'
       WHEN ql.q_num = 4 THEN 'true_false'
       ELSE 'multiple_choice' END,
  CASE WHEN ql.q_num IN (1, 3, 5) THEN '[
    {"id": "a", "text": "Answer A - Correct response"},
    {"id": "b", "text": "Answer B - Plausible distractor"},
    {"id": "c", "text": "Answer C - Common misconception"},
    {"id": "d", "text": "Answer D - Another plausible distractor"}
  ]'::jsonb
  ELSE '[
    {"id": "true", "text": "True"},
    {"id": "false", "text": "False"}
  ]'::jsonb END,
  CASE WHEN ql.q_num IN (1, 3, 5) THEN '{"correct_ids": ["a"]}'::jsonb
       ELSE '{"correct_ids": ["true"]}'::jsonb END,
  CASE WHEN ql.q_num IN (1, 3) THEN 2 WHEN ql.q_num IN (2, 4) THEN 1 ELSE 3 END,
  CASE WHEN ql.q_num <= 2 THEN 'easy' WHEN ql.q_num <= 4 THEN 'medium' ELSE 'hard' END,
  CASE WHEN ql.q_num = 1 THEN ARRAY['basics', 'chapter-1']
       WHEN ql.q_num = 2 THEN ARRAY['concepts', 'foundations']
       WHEN ql.q_num = 3 THEN ARRAY['applications', 'chapter-2']
       WHEN ql.q_num = 4 THEN ARRAY['theory', 'review']
       ELSE ARRAY['synthesis', 'advanced'] END,
  'This explanation helps students understand why this is the correct answer and addresses common misconceptions.',
  NOW(),
  NOW()
FROM bank_data bd, questions_list ql
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 14: CREATE SAMPLE ASSESSMENTS
-- ============================================================================
WITH course_data AS (
  SELECT id FROM n8n_content_creation.courses
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
),
teacher_prof AS (
  SELECT profile_id FROM n8n_content_creation.teacher_profiles
  WHERE employee_id = 'EMP001'
)
INSERT INTO n8n_content_creation.assessments (
  school_id,
  course_id,
  title,
  description,
  type,
  due_date,
  total_points,
  time_limit_minutes,
  max_attempts,
  instructions,
  created_at,
  updated_at
)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  cd.id,
  'Quiz 1: ' || SUBSTRING((SELECT name FROM n8n_content_creation.courses WHERE id = cd.id), 1, 30),
  'Assessment to evaluate understanding of fundamental concepts',
  'quiz',
  NOW() + INTERVAL '7 days',
  20,
  30,
  2,
  'Answer all questions. You have 30 minutes to complete this quiz. No external resources allowed.',
  NOW(),
  NOW()
FROM course_data cd
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 15: CREATE ASSESSMENT BANK RULES (for randomization)
-- ============================================================================
WITH assessment_data AS (
  SELECT id, course_id FROM n8n_content_creation.assessments
  WHERE type = 'quiz'
  LIMIT 1
),
bank_data AS (
  SELECT id, course_id FROM n8n_content_creation.teacher_question_banks
  LIMIT 1
)
INSERT INTO n8n_content_creation.teacher_assessment_bank_rules (
  assessment_id,
  bank_id,
  pick_count,
  tag_filter,
  difficulty_filter,
  shuffle_questions,
  shuffle_choices,
  seed_mode,
  created_at
)
SELECT
  ad.id,
  bd.id,
  5,  -- Pick 5 questions
  NULL,  -- No tag filter
  ARRAY['easy', 'medium'],  -- Include easy and medium difficulty
  true,  -- Shuffle questions
  true,  -- Shuffle answer choices
  'per_student',  -- Each student gets different randomized quiz
  NOW()
FROM assessment_data ad, bank_data bd
WHERE ad.course_id = bd.course_id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 16: VERIFICATION QUERIES
-- ============================================================================

-- Summary statistics
RAISE NOTICE '============ TEST DATA SEED SUMMARY ============';

DO $$
DECLARE
  v_teacher_count INT;
  v_section_count INT;
  v_student_count INT;
  v_course_count INT;
  v_assignment_count INT;
  v_enrollment_count INT;
  v_module_count INT;
  v_lesson_count INT;
  v_transcript_count INT;
  v_notes_count INT;
  v_bank_count INT;
  v_question_count INT;
  v_assessment_count INT;
  v_bank_rule_count INT;
BEGIN
  SELECT COUNT(*) INTO v_teacher_count FROM n8n_content_creation.teacher_profiles
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_section_count FROM n8n_content_creation.sections
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_student_count FROM n8n_content_creation.students
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_course_count FROM n8n_content_creation.courses
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_assignment_count FROM n8n_content_creation.teacher_assignments
    WHERE teacher_profile_id IN (
      SELECT id FROM n8n_content_creation.teacher_profiles
      WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_enrollment_count FROM n8n_content_creation.enrollments
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_module_count FROM n8n_content_creation.modules
    WHERE course_id IN (
      SELECT id FROM n8n_content_creation.courses
      WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_lesson_count FROM n8n_content_creation.lessons
    WHERE module_id IN (
      SELECT m.id FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.courses c ON m.course_id = c.id
      WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_transcript_count FROM n8n_content_creation.teacher_transcripts
    WHERE module_id IN (
      SELECT m.id FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.courses c ON m.course_id = c.id
      WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_notes_count FROM n8n_content_creation.teacher_notes
    WHERE module_id IN (
      SELECT m.id FROM n8n_content_creation.modules m
      JOIN n8n_content_creation.courses c ON m.course_id = c.id
      WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_bank_count FROM n8n_content_creation.teacher_question_banks
    WHERE course_id IN (
      SELECT id FROM n8n_content_creation.courses
      WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  SELECT COUNT(*) INTO v_question_count FROM n8n_content_creation.teacher_bank_questions
    WHERE bank_id IN (
      SELECT id FROM n8n_content_creation.teacher_question_banks
      WHERE course_id IN (
        SELECT id FROM n8n_content_creation.courses
        WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
      )
    );

  SELECT COUNT(*) INTO v_assessment_count FROM n8n_content_creation.assessments
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

  SELECT COUNT(*) INTO v_bank_rule_count FROM n8n_content_creation.teacher_assessment_bank_rules
    WHERE assessment_id IN (
      SELECT id FROM n8n_content_creation.assessments
      WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
    );

  RAISE NOTICE '';
  RAISE NOTICE 'School: MSU - Main Campus (4fa1be18-ebf6-41e7-a8ee-800ac3815ecd)';
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE 'Teachers Created: %', v_teacher_count;
  RAISE NOTICE 'Sections Created: %', v_section_count;
  RAISE NOTICE 'Students Created: %', v_student_count;
  RAISE NOTICE 'Courses Created: %', v_course_count;
  RAISE NOTICE 'Teacher Assignments: %', v_assignment_count;
  RAISE NOTICE 'Student Enrollments: %', v_enrollment_count;
  RAISE NOTICE 'Modules Created: %', v_module_count;
  RAISE NOTICE 'Lessons Created: %', v_lesson_count;
  RAISE NOTICE 'Transcripts Created: %', v_transcript_count;
  RAISE NOTICE 'Notes Created: %', v_notes_count;
  RAISE NOTICE 'Question Banks: %', v_bank_count;
  RAISE NOTICE 'Questions in Banks: %', v_question_count;
  RAISE NOTICE 'Assessments Created: %', v_assessment_count;
  RAISE NOTICE 'Assessment Bank Rules: %', v_bank_rule_count;
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION RESULTS - Run these individually to see results
-- ============================================================================

-- View Teacher Profile
RAISE NOTICE '=== TEACHER PROFILE ===';
SELECT
  p.full_name,
  tp.employee_id,
  tp.department,
  tp.specialization,
  tp.is_active
FROM n8n_content_creation.teacher_profiles tp
JOIN n8n_content_creation.profiles p ON tp.profile_id = p.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

-- View All Sections
RAISE NOTICE '=== SECTIONS CREATED ===';
SELECT
  name,
  grade_level,
  created_at
FROM n8n_content_creation.sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

-- View All Students
RAISE NOTICE '=== STUDENTS CREATED ===';
SELECT
  p.full_name,
  s.lrn,
  s.grade_level,
  sec.name as section_name
FROM n8n_content_creation.students s
JOIN n8n_content_creation.profiles p ON s.profile_id = p.id
JOIN n8n_content_creation.sections sec ON s.section_id = sec.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY p.full_name;

-- View All Courses
RAISE NOTICE '=== COURSES CREATED ===';
SELECT
  c.name,
  c.subject_code,
  s.name as section_name,
  s.grade_level
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY s.grade_level, c.name;

-- View Modules with Lessons
RAISE NOTICE '=== MODULES & LESSONS ===';
SELECT
  m.title,
  m.is_published,
  COUNT(l.id) as lesson_count,
  c.name as course_name
FROM n8n_content_creation.modules m
LEFT JOIN n8n_content_creation.lessons l ON m.id = l.module_id
JOIN n8n_content_creation.courses c ON m.course_id = c.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY m.id, m.title, m.is_published, c.name
ORDER BY c.name, m.order;

-- View Assessments
RAISE NOTICE '=== ASSESSMENTS CREATED ===';
SELECT
  a.title,
  a.type,
  a.total_points,
  a.time_limit_minutes,
  a.due_date,
  c.name as course_name
FROM n8n_content_creation.assessments a
JOIN n8n_content_creation.courses c ON a.course_id = c.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

-- View Question Banks
RAISE NOTICE '=== QUESTION BANKS & QUESTIONS ===';
SELECT
  qb.name,
  c.name as course_name,
  COUNT(bq.id) as question_count
FROM n8n_content_creation.teacher_question_banks qb
JOIN n8n_content_creation.courses c ON qb.course_id = c.id
LEFT JOIN n8n_content_creation.teacher_bank_questions bq ON qb.id = bq.bank_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY qb.id, qb.name, c.name;

-- ============================================================================
-- NEXT STEPS FOR TESTING
-- ============================================================================
--
-- 1. TEACHER LOGIN TEST:
--    - Go to teacher-app login page
--    - Email: juan.delacruz@msu.edu.ph (or use auth ID: 00000000-0000-0000-0000-000000000001)
--    - Should see Dashboard with 3 sections
--
-- 2. MODULE PUBLISHING TEST:
--    - Navigate to /teacher/subjects
--    - Should see 3 courses across 3 sections
--    - All modules are already published
--    - Modules contain lessons, transcripts, and notes
--
-- 3. STUDENT ENROLLMENT TEST:
--    - In student-app, login as one of the 6 students
--    - Should see enrolled courses
--    - Should see published modules and lessons
--
-- 4. ASSESSMENT TEST:
--    - View assessment in student-app
--    - Should render quiz from question bank with randomization
--    - Submit answers and teacher should see in grading inbox
--
-- 5. TEACHER GRADING TEST:
--    - In teacher-app, go to /teacher/submissions
--    - Should see student submissions
--    - Grade with rubric, add feedback, release grades
--    - Student should see released grades in student-app
--
-- ============================================================================
-- END OF SEED SCRIPT
-- ============================================================================
