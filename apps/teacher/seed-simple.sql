-- ============================================================================
-- SIMPLE Seed Data (No ON CONFLICT - Run Once Only)
-- Schema: "school software"
-- ============================================================================

-- STEP 1: Create sections
INSERT INTO "school software".sections (school_id, name, grade_level)
VALUES
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Einstein', '10'),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - Newton', '11'),
  ('4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - Curie', '12');

-- STEP 2: Create courses (get teacher_id and section_id)
INSERT INTO "school software".courses (school_id, section_id, name, subject_code, teacher_id)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  s.id,
  'Mathematics ' || s.grade_level || '01',
  'MATH' || s.grade_level || '01',
  tp.id
FROM "school software".sections s
CROSS JOIN "school software".teacher_profiles tp
JOIN "school software".profiles p ON tp.profile_id = p.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND p.full_name = 'Dr. Juan Dela Cruz';

-- STEP 3: Create teacher assignments
INSERT INTO "school software".teacher_assignments (teacher_profile_id, section_id, course_id, is_primary)
SELECT
  tp.id,
  c.section_id,
  c.id,
  true
FROM "school software".courses c
JOIN "school software".teacher_profiles tp ON c.teacher_id = tp.id
JOIN "school software".profiles p ON tp.profile_id = p.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  AND p.full_name = 'Dr. Juan Dela Cruz';

-- STEP 4: Create student profiles
INSERT INTO "school software".profiles (auth_user_id, full_name, phone)
VALUES
  ('11111111-0000-0000-0000-000000000001'::uuid, 'Maria Santos', '+63-917-1111111'),
  ('11111111-0000-0000-0000-000000000002'::uuid, 'Juan Reyes', '+63-917-2222222'),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'Rosa Garcia', '+63-917-3333333'),
  ('11111111-0000-0000-0000-000000000004'::uuid, 'Miguel Lopez', '+63-917-4444444'),
  ('11111111-0000-0000-0000-000000000005'::uuid, 'Anna Martinez', '+63-917-5555555'),
  ('11111111-0000-0000-0000-000000000006'::uuid, 'Carlos Fernandez', '+63-917-6666666');

-- STEP 5: Create students (2 per section)
INSERT INTO "school software".students (school_id, profile_id, lrn, grade_level, section_id)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  p.id,
  '123456789001',
  '10',
  s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Maria Santos'
  AND s.name = 'Grade 10 - Einstein'
  AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, p.id, '123456789002', '10', s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Juan Reyes' AND s.name = 'Grade 10 - Einstein' AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, p.id, '123456789003', '11', s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Rosa Garcia' AND s.name = 'Grade 11 - Newton' AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, p.id, '123456789004', '11', s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Miguel Lopez' AND s.name = 'Grade 11 - Newton' AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, p.id, '123456789005', '12', s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Anna Martinez' AND s.name = 'Grade 12 - Curie' AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid, p.id, '123456789006', '12', s.id
FROM "school software".profiles p
CROSS JOIN "school software".sections s
WHERE p.full_name = 'Carlos Fernandez' AND s.name = 'Grade 12 - Curie' AND s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- STEP 6: Enroll students in courses
INSERT INTO "school software".enrollments (school_id, student_id, course_id)
SELECT
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
  st.id,
  c.id
FROM "school software".students st
JOIN "school software".courses c ON st.section_id = c.section_id
WHERE st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- STEP 7: Create modules
INSERT INTO "school software".modules (course_id, title, "order", duration_minutes, is_published)
SELECT
  c.id,
  'Introduction Module',
  1,
  60,
  true
FROM "school software".courses c
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL
SELECT
  c.id,
  'Advanced Topics',
  2,
  90,
  true
FROM "school software".courses c
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- STEP 8: Create lessons
INSERT INTO "school software".lessons (module_id, title, content_type, "order", duration_minutes, is_published)
SELECT
  m.id,
  'Lesson 1: Introduction',
  'video',
  1,
  20,
  true
FROM "school software".modules m
WHERE m.course_id IN (
  SELECT id FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Sections created:' as info, COUNT(*) as count FROM "school software".sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT 'Courses created:' as info, COUNT(*) as count FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT 'Students created:' as info, COUNT(*) as count FROM "school software".students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT 'Enrollments:' as info, COUNT(*) as count FROM "school software".enrollments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT 'Teacher assignments:' as info, COUNT(*) as count FROM "school software".teacher_assignments ta JOIN "school software".teacher_profiles tp ON ta.teacher_profile_id = tp.id WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
