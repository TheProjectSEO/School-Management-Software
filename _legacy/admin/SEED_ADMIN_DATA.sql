-- ============================================
-- ADMIN APP - COMPLETE DATA SEEDING SCRIPT
-- ============================================
-- This script populates all data needed for admin functionality
-- including schools, profiles, students, teachers, courses, and enrollments
-- ============================================

-- Set schema
SET search_path TO "school software";

-- ============================================
-- 1. CREATE SCHOOLS
-- ============================================
INSERT INTO schools (id, slug, name, region, division, logo_url, accent_color) VALUES
('11111111-1111-1111-1111-111111111111', 'msu-main', 'Mindanao State University - Main Campus', 'Region X', 'Marawi City', '/brand/logo.png', '#7B1113'),
('00000000-0000-0000-0000-000000000001', 'demo-high', 'Demo High School', 'Region XII', 'General Santos City', '/brand/demo-logo.png', '#1E40AF')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CREATE SECTIONS
-- ============================================
INSERT INTO sections (id, school_id, name, grade_level) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'BSCS 2-A', 'College - 2nd Year'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'BSIT 3-B', 'College - 3rd Year'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Grade 10-A', 'Grade 10'),
('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'Grade 11-Science', 'Grade 11')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. CREATE TEACHER PROFILES
-- ============================================
-- Teacher 1: Juan Cruz (Web Development)
DO $$
BEGIN
  -- Check if auth user exists first
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'juan.cruz@msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('t1111111-1111-1111-1111-111111111111',
     (SELECT id FROM auth.users WHERE email = 'juan.cruz@msu.edu.ph'),
     'Prof. Juan Cruz',
     '+63 917 123 4567')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

-- Teacher 2: Maria Santos (Data Structures)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'maria.santos@msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('t2222222-2222-2222-2222-222222222222',
     (SELECT id FROM auth.users WHERE email = 'maria.santos@msu.edu.ph'),
     'Dr. Maria Santos',
     '+63 917 234 5678')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

-- Teacher 3: Ricardo Gomez (Philippine History)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'ricardo.gomez@msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('t3333333-3333-3333-3333-333333333333',
     (SELECT id FROM auth.users WHERE email = 'ricardo.gomez@msu.edu.ph'),
     'Prof. Ricardo Gomez',
     '+63 917 345 6789')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 4. CREATE STUDENT PROFILES
-- ============================================
-- Demo Student (already exists from student-app)
INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
('cc0c8b60-5736-4299-8015-e0a649119b8f',
 (SELECT id FROM auth.users WHERE email = 'demo@msu.edu.ph' LIMIT 1),
 'Demo Student',
 '+63 917 111 1111')
ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Additional Students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'alice.johnson@student.msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('s1111111-1111-1111-1111-111111111111',
     (SELECT id FROM auth.users WHERE email = 'alice.johnson@student.msu.edu.ph'),
     'Alice Johnson',
     '+63 917 222 2222')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'bob.smith@student.msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('s2222222-2222-2222-2222-222222222222',
     (SELECT id FROM auth.users WHERE email = 'bob.smith@student.msu.edu.ph'),
     'Bob Smith',
     '+63 917 333 3333')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'carol.white@student.msu.edu.ph') THEN
    INSERT INTO profiles (id, auth_user_id, full_name, phone) VALUES
    ('s3333333-3333-3333-3333-333333333333',
     (SELECT id FROM auth.users WHERE email = 'carol.white@student.msu.edu.ph'),
     'Carol White',
     '+63 917 444 4444')
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 5. CREATE STUDENTS RECORDS
-- ============================================
INSERT INTO students (id, school_id, profile_id, lrn, grade_level, section_id) VALUES
('cc0c8b60-5736-4299-8015-e0a649119b8f', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '123456789012', 'College - 2nd Year', '22222222-2222-2222-2222-222222222222'),
('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', '123456789013', 'College - 2nd Year', '22222222-2222-2222-2222-222222222222'),
('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', '123456789014', 'College - 3rd Year', '33333333-3333-3333-3333-333333333333'),
('s3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 's3333333-3333-3333-3333-333333333333', '123456789015', 'Grade 10', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  lrn = EXCLUDED.lrn,
  grade_level = EXCLUDED.grade_level,
  section_id = EXCLUDED.section_id;

-- ============================================
-- 6. CREATE COURSES (5 realistic subjects)
-- ============================================
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, cover_image_url, teacher_id) VALUES
-- Course 1: Web Development
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'Web Development Fundamentals', 'CS 201',
  'Learn the basics of HTML, CSS, and JavaScript to build modern websites and web applications.',
  'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
  't1111111-1111-1111-1111-111111111111'),
-- Course 2: Data Structures
('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'Data Structures and Algorithms', 'CS 202',
  'Master fundamental data structures like arrays, linked lists, trees, and graphs with algorithm analysis.',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
  't2222222-2222-2222-2222-222222222222'),
-- Course 3: Philippine History
('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'Philippine History and Government', 'GE 103',
  'Explore Philippine history from pre-colonial times to the present, understanding our national identity.',
  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800',
  't3333333-3333-3333-3333-333333333333'),
-- Course 4: Mathematics
('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'Calculus I', 'MATH 101',
  'Introduction to differential calculus covering limits, derivatives, and their applications.',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
  NULL),
-- Course 5: English Communication
('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'Technical Writing and Communication', 'ENG 201',
  'Develop professional communication skills for technical documentation and presentations.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
  NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject_code = EXCLUDED.subject_code,
  description = EXCLUDED.description,
  teacher_id = EXCLUDED.teacher_id;

-- ============================================
-- 7. CREATE ENROLLMENTS
-- ============================================
-- Demo student enrollments (5 courses)
INSERT INTO enrollments (id, school_id, student_id, course_id) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', 'c1111111-1111-1111-1111-111111111111'),
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', 'c2222222-2222-2222-2222-222222222222'),
('e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', 'c3333333-3333-3333-3333-333333333333'),
('e4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', 'c4444444-4444-4444-4444-444444444444'),
('e5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', 'c5555555-5555-5555-5555-555555555555'),
-- Alice Johnson enrollments (3 courses)
('e1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
('e2222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222'),
('e3333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333'),
-- Bob Smith enrollments (2 courses)
('e1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111'),
('e2222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'c4444444-4444-4444-4444-444444444444')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- ============================================
-- 8. CREATE ADMIN PROFILE (existing admin user)
-- ============================================
INSERT INTO admin_profiles (id, profile_id, school_id, role, is_active) VALUES
('8c5570ef-b0c7-4534-b5f8-2eb4681ac0e7', '34b140da-2423-4519-a365-55d757a68e87', '00000000-0000-0000-0000-000000000001', 'school_admin', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. CREATE MODULES FOR COURSES
-- ============================================
INSERT INTO modules (id, course_id, title, description, "order", duration_minutes, is_published) VALUES
-- Web Dev Modules
('m1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Introduction to HTML', 'Learn the building blocks of web pages', 1, 60, true),
('m1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'CSS Styling Basics', 'Style your HTML with CSS', 2, 90, true),
('m1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'JavaScript Fundamentals', 'Add interactivity with JavaScript', 3, 120, true),
-- Data Structures Modules
('m2222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222222', 'Arrays and Linked Lists', 'Linear data structures fundamentals', 1, 90, true),
('m2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Stacks and Queues', 'LIFO and FIFO data structures', 2, 75, true),
-- Philippine History Modules
('m3333333-3333-3333-3333-333333333331', 'c3333333-3333-3333-3333-333333333333', 'Pre-Colonial Philippines', 'Life before Spanish colonization', 1, 60, true),
('m3333333-3333-3333-3333-333333333332', 'c3333333-3333-3333-3333-333333333333', 'Spanish Colonial Period', '333 years of Spanish rule', 2, 90, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. CREATE LESSONS WITH VIDEO CONTENT
-- ============================================
INSERT INTO lessons (id, module_id, title, content, content_type, video_url, duration_minutes, "order", is_published) VALUES
-- Web Dev Module 1: HTML Lessons
('l1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 'What is HTML?',
 '<p>HTML (HyperText Markup Language) is the standard markup language for creating web pages.</p>',
 'video', 'https://www.youtube.com/watch?v=UB1O30fR-EE', 20, 1, true),
('l1111111-1111-1111-1111-111111111112', 'm1111111-1111-1111-1111-111111111111', 'HTML Tags and Elements',
 '<p>Learn about the most common HTML tags and how to use them to structure your content.</p>',
 'video', 'https://www.youtube.com/watch?v=salY_Sm6mv4', 15, 2, true),
-- Web Dev Module 2: CSS Lessons
('l1111111-1111-1111-1111-111111111121', 'm1111111-1111-1111-1111-111111111112', 'Introduction to CSS',
 '<p>CSS (Cascading Style Sheets) controls the visual presentation of HTML elements.</p>',
 'video', 'https://www.youtube.com/watch?v=yfoY53QXEnI', 60, 1, true),
('l1111111-1111-1111-1111-111111111122', 'm1111111-1111-1111-1111-111111111112', 'CSS Box Model',
 '<p>Understand how margin, border, padding, and content work together.</p>',
 'video', 'https://www.youtube.com/watch?v=rIO5326FgPE', 20, 2, true),
-- Data Structures Lessons
('l2222222-2222-2222-2222-222222222211', 'm2222222-2222-2222-2222-222222222221', 'Introduction to Arrays',
 '<p>Arrays are the most fundamental data structure.</p>',
 'video', 'https://www.youtube.com/watch?v=QJNwK2uJyGs', 30, 1, true),
('l2222222-2222-2222-2222-222222222212', 'm2222222-2222-2222-2222-222222222221', 'Linked Lists Explained',
 '<p>Understand dynamic data structures with linked lists.</p>',
 'video', 'https://www.youtube.com/watch?v=WwfhLC16bis', 35, 2, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. CREATE ASSESSMENTS
-- ============================================
INSERT INTO assessments (id, school_id, course_id, title, description, type, due_date, total_points) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
  'HTML Basics Quiz', 'Test your knowledge of HTML fundamentals', 'quiz',
  NOW() + INTERVAL '7 days', 100),
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
  'Build a Personal Website', 'Create a responsive personal portfolio website', 'project',
  NOW() + INTERVAL '14 days', 200),
('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
  'Array Operations Quiz', 'Assessment on array manipulation and algorithms', 'quiz',
  NOW() + INTERVAL '5 days', 100),
('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333',
  'Philippine History Midterm', 'Comprehensive exam covering pre-colonial to Spanish period', 'exam',
  NOW() + INTERVAL '10 days', 150)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was inserted correctly
-- ============================================

-- Check schools
SELECT 'Schools' as table_name, COUNT(*) as count FROM schools;

-- Check profiles
SELECT 'Profiles' as table_name, COUNT(*) as count FROM profiles;

-- Check students
SELECT 'Students' as table_name, COUNT(*) as count FROM students;

-- Check courses
SELECT 'Courses' as table_name, COUNT(*) as count FROM courses;

-- Check enrollments
SELECT 'Enrollments' as table_name, COUNT(*) as count FROM enrollments;

-- Check modules
SELECT 'Modules' as table_name, COUNT(*) as count FROM modules;

-- Check lessons
SELECT 'Lessons' as table_name, COUNT(*) as count FROM lessons;

-- Check assessments
SELECT 'Assessments' as table_name, COUNT(*) as count FROM assessments;

-- Check admin profiles
SELECT 'Admin Profiles' as table_name, COUNT(*) as count FROM admin_profiles;

-- View enrolled students with details
SELECT
  s.id,
  p.full_name,
  s.lrn,
  s.grade_level,
  sec.name as section,
  sch.name as school,
  COUNT(e.id) as enrollment_count
FROM students s
JOIN profiles p ON p.id = s.profile_id
LEFT JOIN sections sec ON sec.id = s.section_id
LEFT JOIN schools sch ON sch.id = s.school_id
LEFT JOIN enrollments e ON e.student_id = s.id
GROUP BY s.id, p.full_name, s.lrn, s.grade_level, sec.name, sch.name
ORDER BY p.full_name;
