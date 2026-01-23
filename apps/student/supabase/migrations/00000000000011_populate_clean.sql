-- ============================================
-- COMPLETE SCHOOL DATABASE POPULATION (Clean Version)
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. CREATE SCHOOL
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
  division = EXCLUDED.division;

-- 2. CREATE SECTIONS
INSERT INTO sections (id, school_id, name, grade_level) VALUES
  ('22222221-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Section A - Einstein', 'Grade 7'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Section B - Newton', 'Grade 8'),
  ('22222223-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Section A - Galileo', 'Grade 9'),
  ('22222224-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Section B - Curie', 'Grade 10'),
  ('22222225-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Section A - Darwin', 'Grade 11'),
  ('22222226-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'Section B - Tesla', 'Grade 12')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. CREATE COURSES
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, teacher_id) VALUES
  ('33333331-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Advanced Mathematics', 'MATH-401', 'Calculus, Trigonometry, and Advanced Algebra for Grade 11', 'teacher-math'),
  ('33333332-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '22222224-2222-2222-2222-222222222224', 'Geometry & Statistics', 'MATH-301', 'Advanced Geometry and Introduction to Statistics', 'teacher-math'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Physics', 'SCI-401', 'Classical Mechanics, Electricity, and Magnetism', 'teacher-science'),
  ('33333334-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Chemistry', 'SCI-402', 'Organic Chemistry, Chemical Reactions, and Laboratory Techniques', 'teacher-science'),
  ('33333335-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111', '22222224-2222-2222-2222-222222222224', 'Biology', 'SCI-301', 'Cell Biology, Genetics, and Human Anatomy', 'teacher-science'),
  ('33333336-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'English Literature', 'ENG-401', 'World Literature, Literary Analysis, and Creative Writing', 'teacher-english'),
  ('33333337-3333-3333-3333-333333333337', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Filipino', 'FIL-401', 'Panitikan ng Pilipinas at Sining ng Pagsulat', 'teacher-filipino'),
  ('33333338-3333-3333-3333-333333333338', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Philippine History', 'HIST-401', 'From Pre-Colonial Era to Modern Philippines', 'teacher-history'),
  ('33333339-3333-3333-3333-333333333339', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'World History', 'HIST-402', 'Ancient Civilizations to Contemporary Global Issues', 'teacher-history'),
  ('33333340-3333-3333-3333-333333333340', '11111111-1111-1111-1111-111111111111', '22222225-2222-2222-2222-222222222225', 'Computer Programming', 'CS-401', 'Introduction to Python, Web Development, and Algorithms', 'teacher-cs')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. CREATE STUDENT RECORD
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
  lrn = EXCLUDED.lrn;

-- 5. ENROLL STUDENT IN COURSES
INSERT INTO enrollments (school_id, student_id, course_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333331-3333-3333-3333-333333333331', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333334-3333-3333-3333-333333333334', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333336-3333-3333-3333-333333333336', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333337-3333-3333-3333-333333333337', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333338-3333-3333-3333-333333333338', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333339-3333-3333-3333-333333333339', NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333340-3333-3333-3333-333333333340', NOW() - INTERVAL '30 days')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- 6. CREATE MODULES
INSERT INTO modules (course_id, title, description, "order", duration_minutes, is_published) VALUES
  -- Advanced Math
  ('33333331-3333-3333-3333-333333333331', 'Introduction to Calculus', 'Limits, Derivatives, and Basic Integration', 1, 120, true),
  ('33333331-3333-3333-3333-333333333331', 'Advanced Trigonometry', 'Trigonometric Identities and Applications', 2, 90, true),
  -- Physics
  ('33333333-3333-3333-3333-333333333333', 'Mechanics Fundamentals', 'Newton''s Laws, Forces, and Motion', 1, 110, true),
  ('33333333-3333-3333-3333-333333333333', 'Energy and Work', 'Kinetic Energy, Potential Energy, and Conservation Laws', 2, 95, true),
  -- Chemistry
  ('33333334-3333-3333-3333-333333333334', 'Organic Chemistry Introduction', 'Hydrocarbons and Functional Groups', 1, 100, true),
  ('33333334-3333-3333-3333-333333333334', 'Chemical Reactions', 'Types of Reactions and Balancing Equations', 2, 90, true),
  -- English
  ('33333336-3333-3333-3333-333333333336', 'Introduction to Literary Analysis', 'Understanding Themes, Symbols, and Character Development', 1, 85, true),
  -- Filipino
  ('33333337-3333-3333-3333-333333333337', 'Panitikang Pilipino', 'Alamat, Tula, at Maikling Kwento', 1, 80, true),
  -- Philippine History
  ('33333338-3333-3333-3333-333333333338', 'Pre-Colonial Philippines', 'Ancient Civilizations and Trade', 1, 90, true),
  ('33333338-3333-3333-3333-333333333338', 'Spanish Colonial Period', 'Spanish Rule and the Philippine Revolution', 2, 100, true),
  -- World History
  ('33333339-3333-3333-3333-333333333339', 'Ancient Civilizations', 'Egypt, Greece, and Rome', 1, 95, true),
  -- Computer Programming
  ('33333340-3333-3333-3333-333333333340', 'Python Basics', 'Variables, Data Types, and Control Structures', 1, 100, true),
  ('33333340-3333-3333-3333-333333333340', 'Web Development Fundamentals', 'HTML, CSS, and JavaScript Introduction', 2, 110, true);

-- 7. CREATE LESSONS (Sample lessons for first few modules)
INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Understanding Limits', 'Learn the fundamental concept of limits and how they form the foundation of calculus.', 'reading', 1, 30, true
FROM modules m WHERE m.course_id = '33333331-3333-3333-3333-333333333331' AND m."order" = 1;

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Introduction to Derivatives', 'Discover how derivatives measure rates of change and slopes of curves.', 'video', 2, 40, true
FROM modules m WHERE m.course_id = '33333331-3333-3333-3333-333333333331' AND m."order" = 1;

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Newton''s First Law', 'Explore the law of inertia and its applications.', 'reading', 1, 25, true
FROM modules m WHERE m.course_id = '33333333-3333-3333-3333-333333333333' AND m."order" = 1;

INSERT INTO lessons (module_id, title, content, content_type, "order", duration_minutes, is_published)
SELECT m.id, 'Python Variables and Data Types', 'Introduction to variables, strings, numbers, and booleans.', 'reading', 1, 30, true
FROM modules m WHERE m.course_id = '33333340-3333-3333-3333-333333333340' AND m."order" = 1;

-- 8. CREATE ASSESSMENTS
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Calculus Quiz 1', 'Test your understanding of limits and derivatives', 'quiz', NOW() + INTERVAL '7 days', 50),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Newton''s Laws Quiz', 'Short quiz on the three laws of motion', 'quiz', NOW() + INTERVAL '5 days', 30),
  ('11111111-1111-1111-1111-111111111111', '33333334-3333-3333-3333-333333333334', 'Organic Chemistry Quiz', 'Test on hydrocarbons and functional groups', 'quiz', NOW() + INTERVAL '6 days', 40),
  ('11111111-1111-1111-1111-111111111111', '33333336-3333-3333-3333-333333333336', 'Literary Analysis Essay', 'Write an essay analyzing themes in your chosen novel', 'assignment', NOW() + INTERVAL '14 days', 100),
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', 'Python Basics Quiz', 'Test your knowledge of Python fundamentals', 'quiz', NOW() + INTERVAL '4 days', 45);

-- 9. CREATE NOTIFICATIONS
INSERT INTO notifications (student_id, type, title, message, is_read, created_at) VALUES
  ('44444444-4444-4444-4444-444444444444', 'info', 'Welcome to Manila Central High School', 'Welcome to the student portal! Start exploring your courses.', true, NOW() - INTERVAL '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'assignment', 'New Assignment Posted', 'Your teacher has posted a new assignment in Physics', false, NOW() - INTERVAL '2 hours'),
  ('44444444-4444-4444-4444-444444444444', 'warning', 'Assignment Due Soon', 'Reminder: Calculus Quiz 1 is due in 7 days', false, NOW() - INTERVAL '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'success', 'Lesson Completed', 'Great job! You completed "Understanding Limits" in Advanced Mathematics', true, NOW() - INTERVAL '3 days'),
  ('44444444-4444-4444-4444-444444444444', 'announcement', 'School Event', 'Science Fair next week! Showcase your projects.', false, NOW() - INTERVAL '5 hours');

-- 10. CREATE NOTES
INSERT INTO notes (student_id, course_id, title, content, type, is_favorite) VALUES
  ('44444444-4444-4444-4444-444444444444', '33333331-3333-3333-3333-333333333331', 'Math Study Notes', 'Remember: The derivative of x^2 is 2x. Practice more problems!', 'note', true),
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Physics Formulas', 'F=ma, KE=1/2mv², PE=mgh - Remember these key formulas!', 'note', true),
  ('44444444-4444-4444-4444-444444444444', '33333340-3333-3333-3333-333333333340', 'Python Syntax Tips', 'Python uses indentation for code blocks, use # for comments', 'note', true);

-- Done! Database should now be fully populated.
