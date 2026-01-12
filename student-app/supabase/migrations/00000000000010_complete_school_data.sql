-- ============================================
-- COMPLETE SCHOOL DATABASE POPULATION
-- This script populates the entire school database with realistic data
-- ============================================

-- Clean up existing test data (if any)
-- BE CAREFUL: This will delete existing data. Comment out if you want to keep existing records.
-- DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27');
-- DELETE FROM students WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';

-- ============================================
-- 1. CREATE SCHOOL
-- ============================================
INSERT INTO schools (id, slug, name, region, division, accent_color)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'manila-central-high',
  'Manila Central High School',
  'National Capital Region',
  'Manila Division',
  '#7B1113'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  division = EXCLUDED.division,
  accent_color = EXCLUDED.accent_color;

-- ============================================
-- 2. CREATE SECTIONS (Grade 7-12)
-- ============================================
INSERT INTO sections (id, school_id, name, grade_level) VALUES
  ('22222221-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Section A - Einstein', 'Grade 7'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Section B - Newton', 'Grade 8'),
  ('22222223-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Section A - Galileo', 'Grade 9'),
  ('22222224-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Section B - Curie', 'Grade 10'),
  ('22222225-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Section A - Darwin', 'Grade 11'),
  ('22222226-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'Section B - Tesla', 'Grade 12')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  grade_level = EXCLUDED.grade_level;

-- ============================================
-- 3. CREATE TEACHERS (5 teachers)
-- ============================================
-- Note: Teachers reference profiles table. We'll create placeholder teacher IDs.
-- In production, these would be actual user profiles with auth_user_id

-- Teacher profiles would be in the profiles table, but for now we'll just reference their IDs
-- and link them to courses. We'll use UUIDs that could be linked to actual teacher profiles later.

-- ============================================
-- 4. CREATE COURSES (10 courses across different subjects)
-- ============================================
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, teacher_id) VALUES
  -- Math Courses
  (
    '33333331-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Advanced Mathematics',
    'MATH-401',
    'Calculus, Trigonometry, and Advanced Algebra for Grade 11',
    'teacher-1111-1111-1111-111111111111'
  ),
  (
    '33333332-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    '22222224-2222-2222-2222-222222222224',
    'Geometry & Statistics',
    'MATH-301',
    'Advanced Geometry and Introduction to Statistics',
    'teacher-1111-1111-1111-111111111111'
  ),

  -- Science Courses
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Physics',
    'SCI-401',
    'Classical Mechanics, Electricity, and Magnetism',
    'teacher-2222-2222-2222-222222222222'
  ),
  (
    '33333334-3333-3333-3333-333333333334',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Chemistry',
    'SCI-402',
    'Organic Chemistry, Chemical Reactions, and Laboratory Techniques',
    'teacher-2222-2222-2222-222222222222'
  ),
  (
    '33333335-3333-3333-3333-333333333335',
    '11111111-1111-1111-1111-111111111111',
    '22222224-2222-2222-2222-222222222224',
    'Biology',
    'SCI-301',
    'Cell Biology, Genetics, and Human Anatomy',
    'teacher-2222-2222-2222-222222222222'
  ),

  -- Language Courses
  (
    '33333336-3333-3333-3333-333333333336',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'English Literature',
    'ENG-401',
    'World Literature, Literary Analysis, and Creative Writing',
    'teacher-3333-3333-3333-333333333333'
  ),
  (
    '33333337-3333-3333-3333-333333333337',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Filipino',
    'FIL-401',
    'Panitikan ng Pilipinas at Sining ng Pagsulat',
    'teacher-3333-3333-3333-333333333333'
  ),

  -- Social Studies
  (
    '33333338-3333-3333-3333-333333333338',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Philippine History',
    'HIST-401',
    'From Pre-Colonial Era to Modern Philippines',
    'teacher-4444-4444-4444-444444444444'
  ),
  (
    '33333339-3333-3333-3333-333333333339',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'World History',
    'HIST-402',
    'Ancient Civilizations to Contemporary Global Issues',
    'teacher-4444-4444-4444-444444444444'
  ),

  -- Computer Science
  (
    '33333340-3333-3333-3333-333333333340',
    '11111111-1111-1111-1111-111111111111',
    '22222225-2222-2222-2222-222222222225',
    'Computer Programming',
    'CS-401',
    'Introduction to Python, Web Development, and Algorithms',
    'teacher-5555-5555-5555-555555555555'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject_code = EXCLUDED.subject_code;

-- ============================================
-- 5. CREATE STUDENT RECORD
-- Profile ID: 44d7c894-d749-4e15-be1b-f42afe6f8c27
-- ============================================
INSERT INTO students (id, school_id, profile_id, lrn, grade_level, section_id)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '44d7c894-d749-4e15-be1b-f42afe6f8c27',
  'LRN-2024-001234',
  'Grade 11',
  '22222225-2222-2222-2222-222222222225'
)
ON CONFLICT (id) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  profile_id = EXCLUDED.profile_id,
  lrn = EXCLUDED.lrn,
  grade_level = EXCLUDED.grade_level,
  section_id = EXCLUDED.section_id;

-- ============================================
-- 6. ENROLL STUDENT IN COURSES (8 courses)
-- ============================================
INSERT INTO enrollments (school_id, student_id, course_id, created_at) VALUES
  -- Math
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333331-3333-3333-3333-333333333331', NOW() - INTERVAL '30 days'),

  -- Sciences
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333334-3333-3333-3333-333333333334', NOW() - INTERVAL '30 days'),

  -- Languages
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333336-3333-3333-3333-333333333336', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333337-3333-3333-3333-333333333337', NOW() - INTERVAL '30 days'),

  -- Social Studies
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333338-3333-3333-3333-333333333338', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333339-3333-3333-3333-333333333339', NOW() - INTERVAL '30 days'),

  -- Computer Science
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333340-3333-3333-3333-333333333340', NOW() - INTERVAL '30 days')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- ============================================
-- 7. CREATE MODULES FOR EACH COURSE
-- ============================================

-- Advanced Mathematics Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333331-3333-3333-3333-333333333331', 'Introduction to Calculus', 'Limits, Derivatives, and Basic Integration', 1, 120, true),
  ('33333331-3333-3333-3333-333333333331', 'Advanced Trigonometry', 'Trigonometric Identities and Applications', 2, 90, true),
  ('33333331-3333-3333-3333-333333333331', 'Algebraic Concepts', 'Polynomials, Rational Expressions, and Functions', 3, 100, true);

-- Physics Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Mechanics Fundamentals', 'Newton''s Laws, Forces, and Motion', 1, 110, true),
  ('33333333-3333-3333-3333-333333333333', 'Energy and Work', 'Kinetic Energy, Potential Energy, and Conservation Laws', 2, 95, true),
  ('33333333-3333-3333-3333-333333333333', 'Electricity Basics', 'Electric Charge, Current, and Circuits', 3, 105, true);

-- Chemistry Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333334-3333-3333-3333-333333333334', 'Organic Chemistry Introduction', 'Hydrocarbons and Functional Groups', 1, 100, true),
  ('33333334-3333-3333-3333-333333333334', 'Chemical Reactions', 'Types of Reactions and Balancing Equations', 2, 90, true);

-- English Literature Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333336-3333-3333-3333-333333333336', 'Introduction to Literary Analysis', 'Understanding Themes, Symbols, and Character Development', 1, 85, true),
  ('33333336-3333-3333-3333-333333333336', 'World Literature Classics', 'Exploring Great Works from Different Cultures', 2, 95, true);

-- Filipino Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333337-3333-3333-3333-333333333337', 'Panitikang Pilipino', 'Alamat, Tula, at Maikling Kwento', 1, 80, true),
  ('33333337-3333-3333-3333-333333333337', 'Sining ng Pagsulat', 'Teknik sa Pagsulat ng Sanaysay at Liham', 2, 75, true);

-- Philippine History Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333338-3333-3333-3333-333333333338', 'Pre-Colonial Philippines', 'Ancient Civilizations and Trade', 1, 90, true),
  ('33333338-3333-3333-3333-333333333338', 'Spanish Colonial Period', 'Spanish Rule and the Philippine Revolution', 2, 100, true);

-- World History Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333339-3333-3333-3333-333333333339', 'Ancient Civilizations', 'Egypt, Greece, and Rome', 1, 95, true),
  ('33333339-3333-3333-3333-333333333339', 'Modern World History', 'World Wars and Contemporary Issues', 2, 105, true);

-- Computer Programming Modules
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  ('33333340-3333-3333-3333-333333333340', 'Python Basics', 'Variables, Data Types, and Control Structures', 1, 100, true),
  ('33333340-3333-3333-3333-333333333340', 'Web Development Fundamentals', 'HTML, CSS, and JavaScript Introduction', 2, 110, true);

-- ============================================
-- 8. CREATE LESSONS FOR MODULES
-- ============================================

-- Let's create 3-5 lessons per module for the first few modules
-- Advanced Math - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Understanding Limits', 'Learn the fundamental concept of limits and how they form the foundation of calculus.', 'reading', 1, 30, true
FROM modules m WHERE m.title = 'Introduction to Calculus';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Introduction to Derivatives', 'Discover how derivatives measure rates of change and slopes of curves.', 'video', 2, 40, true
FROM modules m WHERE m.title = 'Introduction to Calculus';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Basic Integration', 'Learn the inverse process of differentiation and find areas under curves.', 'reading', 3, 35, true
FROM modules m WHERE m.title = 'Introduction to Calculus';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Practice Problems', 'Apply your knowledge of calculus to solve real-world problems.', 'activity', 4, 45, true
FROM modules m WHERE m.title = 'Introduction to Calculus';

-- Physics - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Newton''s First Law', 'Explore the law of inertia and its applications.', 'reading', 1, 25, true
FROM modules m WHERE m.title = 'Mechanics Fundamentals';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Newton''s Second Law (F=ma)', 'Understand force, mass, and acceleration relationships.', 'video', 2, 35, true
FROM modules m WHERE m.title = 'Mechanics Fundamentals';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Newton''s Third Law', 'Learn about action and reaction forces.', 'reading', 3, 25, true
FROM modules m WHERE m.title = 'Mechanics Fundamentals';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Motion Analysis Lab', 'Hands-on experiment analyzing motion with real data.', 'activity', 4, 50, true
FROM modules m WHERE m.title = 'Mechanics Fundamentals';

-- Chemistry - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Introduction to Hydrocarbons', 'Learn about alkanes, alkenes, and alkynes.', 'reading', 1, 30, true
FROM modules m WHERE m.title = 'Organic Chemistry Introduction';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Functional Groups Overview', 'Explore alcohols, ketones, aldehydes, and more.', 'video', 2, 40, true
FROM modules m WHERE m.title = 'Organic Chemistry Introduction';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Naming Organic Compounds', 'Master IUPAC nomenclature for organic molecules.', 'reading', 3, 35, true
FROM modules m WHERE m.title = 'Organic Chemistry Introduction';

-- English Literature - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Understanding Themes', 'Identify and analyze central themes in literature.', 'reading', 1, 25, true
FROM modules m WHERE m.title = 'Introduction to Literary Analysis';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Symbolism in Literature', 'Decode symbolic meanings and their significance.', 'video', 2, 30, true
FROM modules m WHERE m.title = 'Introduction to Literary Analysis';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Character Development Analysis', 'Study how characters evolve throughout narratives.', 'reading', 3, 28, true
FROM modules m WHERE m.title = 'Introduction to Literary Analysis';

-- Filipino - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Mga Alamat ng Pilipinas', 'Pag-aralan ang mga sikat na alamat mula sa iba''t ibang rehiyon.', 'reading', 1, 30, true
FROM modules m WHERE m.title = 'Panitikang Pilipino';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Tula at Talinghaga', 'Suriin ang mga elemento ng tula at kahulugan ng talinghaga.', 'video', 2, 35, true
FROM modules m WHERE m.title = 'Panitikang Pilipino';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Maikling Kwento', 'Basahin at unawain ang mga tanyag na maikling kwento.', 'reading', 3, 40, true
FROM modules m WHERE m.title = 'Panitikang Pilipino';

-- Philippine History - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Early Filipino Civilizations', 'Discover the ancient kingdoms and trading communities.', 'reading', 1, 30, true
FROM modules m WHERE m.title = 'Pre-Colonial Philippines';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'The Barter System', 'Learn about pre-colonial trade and economy.', 'video', 2, 25, true
FROM modules m WHERE m.title = 'Pre-Colonial Philippines';

-- Computer Programming - Module 1 Lessons
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Python Variables and Data Types', 'Introduction to variables, strings, numbers, and booleans.', 'reading', 1, 30, true
FROM modules m WHERE m.title = 'Python Basics';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Control Structures: If-Else', 'Learn conditional statements and decision making.', 'video', 2, 35, true
FROM modules m WHERE m.title = 'Python Basics';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Loops in Python', 'Master for loops and while loops for iteration.', 'reading', 3, 40, true
FROM modules m WHERE m.title = 'Python Basics';

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Coding Challenge: Calculator', 'Build a simple calculator using Python basics.', 'activity', 4, 50, true
FROM modules m WHERE m.title = 'Python Basics';

-- ============================================
-- 9. CREATE ASSESSMENTS FOR COURSES
-- ============================================

-- Math Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Calculus Quiz 1', 'Test your understanding of limits and derivatives', 'quiz', NOW() + INTERVAL '7 days', 50),
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Midterm Exam', 'Comprehensive midterm covering all topics', 'exam', NOW() + INTERVAL '14 days', 100);

-- Physics Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Newton''s Laws Quiz', 'Short quiz on the three laws of motion', 'quiz', NOW() + INTERVAL '5 days', 30),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Lab Report: Motion Analysis', 'Submit your lab findings and analysis', 'assignment', NOW() + INTERVAL '10 days', 75);

-- Chemistry Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333334-3333-3333-3333-333333333334', 'Organic Chemistry Quiz', 'Test on hydrocarbons and functional groups', 'quiz', NOW() + INTERVAL '6 days', 40);

-- English Literature Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333336-3333-3333-3333-333333333336', 'Literary Analysis Essay', 'Write an essay analyzing themes in your chosen novel', 'assignment', NOW() + INTERVAL '14 days', 100);

-- Filipino Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333337-3333-3333-3333-333333333337', 'Pagsusuri ng Tula', 'Sumulat ng pagsusuri ng isang tula', 'assignment', NOW() + INTERVAL '8 days', 60);

-- Philippine History Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333338-3333-3333-3333-333333333338', 'Pre-Colonial Era Quiz', 'Quiz on ancient Filipino civilizations', 'quiz', NOW() + INTERVAL '5 days', 35);

-- World History Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333339-3333-3333-3333-333333333339', 'Ancient Civilizations Project', 'Research and present on an ancient civilization', 'project', NOW() + INTERVAL '21 days', 150);

-- Computer Programming Assessment
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', 'Python Basics Quiz', 'Test your knowledge of Python fundamentals', 'quiz', NOW() + INTERVAL '4 days', 45),
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', 'Build a Calculator Project', 'Create a working calculator application', 'project', NOW() + INTERVAL '12 days', 80);

-- ============================================
-- 10. CREATE SOME STUDENT PROGRESS RECORDS
-- ============================================

-- Show student has started some lessons
INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, last_accessed_at)
SELECT
  '44444444-4444-4444-4444-444444444444',
  c.id,
  l.id,
  CASE
    WHEN l."order" = 1 THEN 100
    WHEN l."order" = 2 THEN 75
    WHEN l."order" = 3 THEN 25
    ELSE 0
  END,
  NOW() - INTERVAL '1 day' * l."order"
FROM lessons l
JOIN modules m ON l.module_id = m.id
JOIN courses c ON m.course_id = c.id
WHERE c.id IN (
  '33333331-3333-3333-3333-333333333331',  -- Math
  '33333333-3333-3333-3333-333333333333',  -- Physics
  '33333340-3333-3333-3333-333333333340'   -- Computer Programming
)
AND l."order" <= 3
ON CONFLICT (student_id, lesson_id) DO NOTHING;

-- ============================================
-- 11. CREATE SOME NOTIFICATIONS FOR THE STUDENT
-- ============================================

INSERT INTO notifications (student_id, type, title, message, is_read, created_at) VALUES
  ('44444444-4444-4444-4444-444444444444', 'assignment', 'New Assignment Posted', 'Your teacher has posted a new assignment in Physics: Lab Report: Motion Analysis', false, NOW() - INTERVAL '2 hours'),
  ('44444444-4444-4444-4444-444444444444', 'info', 'Welcome to Manila Central High School', 'Welcome to the student portal! Start exploring your courses.', true, NOW() - INTERVAL '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'warning', 'Assignment Due Soon', 'Reminder: Calculus Quiz 1 is due in 7 days', false, NOW() - INTERVAL '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'success', 'Lesson Completed', 'Great job! You completed "Understanding Limits" in Advanced Mathematics', true, NOW() - INTERVAL '3 days'),
  ('44444444-4444-4444-4444-444444444444', 'announcement', 'School Event', 'Science Fair next week! Showcase your projects.', false, NOW() - INTERVAL '5 hours');

-- ============================================
-- 12. CREATE SAMPLE NOTES FOR THE STUDENT
-- ============================================

INSERT INTO notes (student_id, course_id, lesson_id, title, content, type, is_favorite)
SELECT
  '44444444-4444-4444-4444-444444444444',
  c.id,
  l.id,
  'Notes on ' || l.title,
  'Key takeaways from this lesson: Remember to review the main concepts and practice the examples.',
  'note',
  false
FROM lessons l
JOIN modules m ON l.module_id = m.id
JOIN courses c ON m.course_id = c.id
WHERE c.id = '33333331-3333-3333-3333-333333333331'  -- Math course
AND l."order" = 1
LIMIT 1;

INSERT INTO notes (student_id, course_id, title, content, type, is_favorite) VALUES
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Physics Formulas', 'F=ma, KE=1/2mv², PE=mgh - Remember these key formulas!', 'note', true),
  ('44444444-4444-4444-4444-444444444444', '33333340-3333-3333-3333-333333333340', 'Python Syntax Tips', 'Don''t forget: Python uses indentation for code blocks, use # for comments', 'note', true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- You can run these to verify the data was inserted correctly:
-- SELECT * FROM schools WHERE id = '11111111-1111-1111-1111-111111111111';
-- SELECT * FROM sections WHERE school_id = '11111111-1111-1111-1111-111111111111';
-- SELECT * FROM courses WHERE school_id = '11111111-1111-1111-1111-111111111111';
-- SELECT * FROM students WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';
-- SELECT * FROM enrollments WHERE student_id = '44444444-4444-4444-4444-444444444444';
-- SELECT COUNT(*) as total_modules FROM modules WHERE course_id IN (SELECT id FROM courses WHERE school_id = '11111111-1111-1111-1111-111111111111');
-- SELECT COUNT(*) as total_lessons FROM lessons;
-- SELECT COUNT(*) as total_assessments FROM assessments WHERE school_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ DATABASE POPULATION COMPLETE!';
  RAISE NOTICE '📚 Created: 1 School, 6 Sections, 10 Courses';
  RAISE NOTICE '👨‍🎓 Student enrolled in 8 courses';
  RAISE NOTICE '📖 Modules and lessons created for all courses';
  RAISE NOTICE '📝 Assessments, notifications, and notes added';
  RAISE NOTICE '🎯 Student dashboard is now fully populated!';
END $$;
