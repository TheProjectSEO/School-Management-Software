-- MSU Student Portal - Realistic Seed Data
-- This creates a demo student with real courses, lessons, and video content

-- ============================================
-- 1. CREATE MSU SCHOOL
-- ============================================
INSERT INTO schools (id, slug, name, region, division, logo_url, accent_color)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'msu-main',
  'Mindanao State University - Main Campus',
  'Region X',
  'Marawi City',
  '/brand/logo.png',
  '#7B1113'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE SECTION
-- ============================================
INSERT INTO sections (id, school_id, name, grade_level)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'BSCS 2-A',
  'College - 2nd Year'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CREATE COURSES (5 realistic subjects)
-- ============================================
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, cover_image_url) VALUES
-- Course 1: Web Development
(
  'c1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Web Development Fundamentals',
  'CS 201',
  'Learn the basics of HTML, CSS, and JavaScript to build modern websites and web applications.',
  'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800'
),
-- Course 2: Data Structures
(
  'c2222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Data Structures and Algorithms',
  'CS 202',
  'Master fundamental data structures like arrays, linked lists, trees, and graphs with algorithm analysis.',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800'
),
-- Course 3: Philippine History
(
  'c3333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Philippine History and Government',
  'GE 103',
  'Explore Philippine history from pre-colonial times to the present, understanding our national identity.',
  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800'
),
-- Course 4: Mathematics
(
  'c4444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Calculus I',
  'MATH 101',
  'Introduction to differential calculus covering limits, derivatives, and their applications.',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800'
),
-- Course 5: English Communication
(
  'c5555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Technical Writing and Communication',
  'ENG 201',
  'Develop professional communication skills for technical documentation and presentations.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CREATE MODULES FOR WEB DEVELOPMENT
-- ============================================
INSERT INTO modules (id, course_id, title, description, "order", duration_minutes, is_published) VALUES
-- Web Dev Modules
('m1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Introduction to HTML', 'Learn the building blocks of web pages', 1, 60, true),
('m1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'CSS Styling Basics', 'Style your HTML with CSS', 2, 90, true),
('m1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'JavaScript Fundamentals', 'Add interactivity with JavaScript', 3, 120, true),
('m1111111-1111-1111-1111-111111111114', 'c1111111-1111-1111-1111-111111111111', 'Responsive Web Design', 'Make websites work on all devices', 4, 90, true),

-- Data Structures Modules
('m2222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222222', 'Arrays and Linked Lists', 'Linear data structures fundamentals', 1, 90, true),
('m2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Stacks and Queues', 'LIFO and FIFO data structures', 2, 75, true),
('m2222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222222', 'Trees and Graphs', 'Hierarchical and network structures', 3, 120, true),

-- Philippine History Modules
('m3333333-3333-3333-3333-333333333331', 'c3333333-3333-3333-3333-333333333333', 'Pre-Colonial Philippines', 'Life before Spanish colonization', 1, 60, true),
('m3333333-3333-3333-3333-333333333332', 'c3333333-3333-3333-3333-333333333333', 'Spanish Colonial Period', '333 years of Spanish rule', 2, 90, true),
('m3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Philippine Revolution', 'The fight for independence', 3, 75, true),

-- Calculus Modules
('m4444444-4444-4444-4444-444444444441', 'c4444444-4444-4444-4444-444444444444', 'Limits and Continuity', 'Foundation of calculus', 1, 90, true),
('m4444444-4444-4444-4444-444444444442', 'c4444444-4444-4444-4444-444444444444', 'Derivatives', 'Rates of change and slopes', 2, 120, true),

-- English Modules
('m5555555-5555-5555-5555-555555555551', 'c5555555-5555-5555-5555-555555555555', 'Technical Writing Basics', 'Principles of clear technical writing', 1, 60, true),
('m5555555-5555-5555-5555-555555555552', 'c5555555-5555-5555-5555-555555555555', 'Documentation Standards', 'Industry documentation practices', 2, 75, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. CREATE LESSONS WITH REAL YOUTUBE VIDEOS
-- ============================================
INSERT INTO lessons (id, module_id, title, content, content_type, video_url, duration_minutes, "order", is_published) VALUES

-- Web Dev Module 1: HTML Lessons (Real YouTube educational videos)
('l1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 'What is HTML?',
 '<p>HTML (HyperText Markup Language) is the standard markup language for creating web pages. In this lesson, you will learn:</p><ul><li>What HTML is and why its important</li><li>Basic HTML document structure</li><li>How browsers interpret HTML</li></ul>',
 'video', 'https://www.youtube.com/watch?v=UB1O30fR-EE', 20, 1, true),

('l1111111-1111-1111-1111-111111111112', 'm1111111-1111-1111-1111-111111111111', 'HTML Tags and Elements',
 '<p>Learn about the most common HTML tags and how to use them to structure your content.</p>',
 'video', 'https://www.youtube.com/watch?v=salY_Sm6mv4', 15, 2, true),

('l1111111-1111-1111-1111-111111111113', 'm1111111-1111-1111-1111-111111111111', 'HTML Forms and Inputs',
 '<p>Create interactive forms to collect user data with various input types.</p>',
 'video', 'https://www.youtube.com/watch?v=fNcJuPIZ2WE', 25, 3, true),

-- Web Dev Module 2: CSS Lessons
('l1111111-1111-1111-1111-111111111121', 'm1111111-1111-1111-1111-111111111112', 'Introduction to CSS',
 '<p>CSS (Cascading Style Sheets) controls the visual presentation of HTML elements.</p>',
 'video', 'https://www.youtube.com/watch?v=yfoY53QXEnI', 60, 1, true),

('l1111111-1111-1111-1111-111111111122', 'm1111111-1111-1111-1111-111111111112', 'CSS Box Model',
 '<p>Understand how margin, border, padding, and content work together.</p>',
 'video', 'https://www.youtube.com/watch?v=rIO5326FgPE', 20, 2, true),

('l1111111-1111-1111-1111-111111111123', 'm1111111-1111-1111-1111-111111111112', 'CSS Flexbox',
 '<p>Master the powerful Flexbox layout system for responsive designs.</p>',
 'video', 'https://www.youtube.com/watch?v=JJSoEo8JSnc', 30, 3, true),

-- Web Dev Module 3: JavaScript Lessons
('l1111111-1111-1111-1111-111111111131', 'm1111111-1111-1111-1111-111111111113', 'JavaScript Basics',
 '<p>Learn the fundamentals of JavaScript programming including variables, data types, and operators.</p>',
 'video', 'https://www.youtube.com/watch?v=W6NZfCO5SIk', 60, 1, true),

('l1111111-1111-1111-1111-111111111132', 'm1111111-1111-1111-1111-111111111113', 'DOM Manipulation',
 '<p>Learn how to interact with and modify HTML elements using JavaScript.</p>',
 'video', 'https://www.youtube.com/watch?v=5fb2aPlgoys', 45, 2, true),

('l1111111-1111-1111-1111-111111111133', 'm1111111-1111-1111-1111-111111111113', 'JavaScript Events',
 '<p>Handle user interactions with event listeners and callbacks.</p>',
 'video', 'https://www.youtube.com/watch?v=YiOlaiscqDY', 30, 3, true),

-- Web Dev Module 4: Responsive Design
('l1111111-1111-1111-1111-111111111141', 'm1111111-1111-1111-1111-111111111114', 'Media Queries',
 '<p>Create responsive layouts that adapt to different screen sizes.</p>',
 'video', 'https://www.youtube.com/watch?v=2KL-z9A56SQ', 25, 1, true),

-- Data Structures Lessons
('l2222222-2222-2222-2222-222222222211', 'm2222222-2222-2222-2222-222222222221', 'Introduction to Arrays',
 '<p>Arrays are the most fundamental data structure. Learn how they work in memory.</p>',
 'video', 'https://www.youtube.com/watch?v=QJNwK2uJyGs', 30, 1, true),

('l2222222-2222-2222-2222-222222222212', 'm2222222-2222-2222-2222-222222222221', 'Linked Lists Explained',
 '<p>Understand dynamic data structures with linked lists.</p>',
 'video', 'https://www.youtube.com/watch?v=WwfhLC16bis', 35, 2, true),

('l2222222-2222-2222-2222-222222222221', 'm2222222-2222-2222-2222-222222222222', 'Stack Data Structure',
 '<p>LIFO (Last In, First Out) - Learn stacks and their applications.</p>',
 'video', 'https://www.youtube.com/watch?v=A3ZUpyrnCbM', 25, 1, true),

('l2222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', 'Queue Data Structure',
 '<p>FIFO (First In, First Out) - Queues in programming.</p>',
 'video', 'https://www.youtube.com/watch?v=D6gu-_tmEpQ', 25, 2, true),

('l2222222-2222-2222-2222-222222222231', 'm2222222-2222-2222-2222-222222222223', 'Binary Trees',
 '<p>Hierarchical data structures and tree traversals.</p>',
 'video', 'https://www.youtube.com/watch?v=oSWTXtMglKE', 40, 1, true),

-- Philippine History Lessons
('l3333333-3333-3333-3333-333333333311', 'm3333333-3333-3333-3333-333333333331', 'Early Filipino Societies',
 '<p>Learn about barangays, datus, and early Filipino civilization.</p>',
 'video', 'https://www.youtube.com/watch?v=0mEGefvJLHA', 30, 1, true),

('l3333333-3333-3333-3333-333333333321', 'm3333333-3333-3333-3333-333333333332', 'The Galleon Trade',
 '<p>The Manila-Acapulco trade route and its impact on the Philippines.</p>',
 'video', 'https://www.youtube.com/watch?v=0vZkTQQJ5Vs', 25, 1, true),

('l3333333-3333-3333-3333-333333333331', 'm3333333-3333-3333-3333-333333333333', 'Jose Rizal and the Propaganda Movement',
 '<p>How Philippine national heroes sparked the revolution.</p>',
 'video', 'https://www.youtube.com/watch?v=5TZfKRZvjH8', 35, 1, true),

-- Calculus Lessons
('l4444444-4444-4444-4444-444444444411', 'm4444444-4444-4444-4444-444444444441', 'Understanding Limits',
 '<p>The foundation of calculus - what happens as we approach a value.</p>',
 'video', 'https://www.youtube.com/watch?v=riXcZT2ICjA', 45, 1, true),

('l4444444-4444-4444-4444-444444444421', 'm4444444-4444-4444-4444-444444444442', 'Derivative Rules',
 '<p>Power rule, product rule, quotient rule, and chain rule.</p>',
 'video', 'https://www.youtube.com/watch?v=5yfh5cf4-0w', 50, 1, true),

-- English Lessons
('l5555555-5555-5555-5555-555555555511', 'm5555555-5555-5555-5555-555555555551', 'Principles of Technical Writing',
 '<p>Clarity, accuracy, and precision in technical documentation.</p>',
 'video', 'https://www.youtube.com/watch?v=tMdFk-07kXE', 30, 1, true),

('l5555555-5555-5555-5555-555555555521', 'm5555555-5555-5555-5555-555555555552', 'Writing User Documentation',
 '<p>Create effective user manuals and help documentation.</p>',
 'video', 'https://www.youtube.com/watch?v=r6-E-e-P_xI', 35, 1, true)

ON CONFLICT DO NOTHING;

-- ============================================
-- 6. CREATE ASSESSMENTS
-- ============================================
INSERT INTO assessments (id, school_id, course_id, title, description, type, due_date, total_points) VALUES
-- Web Dev Assessments
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
 'HTML Fundamentals Quiz', 'Test your understanding of HTML basics', 'quiz', NOW() + INTERVAL '3 days', 50),
('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
 'Build a Personal Portfolio', 'Create a responsive portfolio website', 'project', NOW() + INTERVAL '14 days', 100),

-- Data Structures Assessments
('a2222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
 'Arrays and Lists Quiz', 'Test on linear data structures', 'quiz', NOW() + INTERVAL '5 days', 40),
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
 'Implement a Stack', 'Code a stack with push, pop, peek operations', 'assignment', NOW() + INTERVAL '7 days', 60),

-- Philippine History Assessments
('a3333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333',
 'Pre-Colonial Era Essay', 'Write about pre-colonial Filipino society', 'assignment', NOW() + INTERVAL '10 days', 80),

-- Calculus Assessments
('a4444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444',
 'Limits Practice Problems', 'Solve 20 limit problems', 'assignment', NOW() + INTERVAL '4 days', 50),
('a4444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444',
 'Midterm Exam - Derivatives', 'Comprehensive exam on derivatives', 'exam', NOW() + INTERVAL '21 days', 100),

-- English Assessments
('a5555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555',
 'Technical Report Draft', 'Write a technical report on a chosen topic', 'assignment', NOW() + INTERVAL '12 days', 75)

ON CONFLICT DO NOTHING;
