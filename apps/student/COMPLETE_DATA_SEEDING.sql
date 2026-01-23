-- ============================================
-- COMPLETE DATA SEEDING FOR STUDENT APP
-- ============================================
-- This script seeds comprehensive, realistic data for testing
-- Student ID: cc0c8b60-5736-4299-8015-e0a649119b8f
-- Profile ID: 44d7c894-d749-4e15-be1b-f42afe6f8c27
-- School ID: 11111111-1111-1111-1111-111111111111
-- ============================================

-- ============================================
-- 1. ENROLLMENTS - Enroll student in all courses
-- ============================================
-- Student should be enrolled in 8 courses (all Grade 11 courses)
INSERT INTO enrollments (school_id, student_id, course_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333331-3333-3333-3333-333333333331', NOW() - INTERVAL '90 days'),  -- Advanced Mathematics
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '90 days'),  -- Physics
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333334-3333-3333-3333-333333333334', NOW() - INTERVAL '90 days'),  -- Chemistry
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333336-3333-3333-3333-333333333336', NOW() - INTERVAL '90 days'),  -- English Literature
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333337-3333-3333-3333-333333333337', NOW() - INTERVAL '90 days'),  -- Filipino
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333338-3333-3333-3333-333333333338', NOW() - INTERVAL '90 days'),  -- Philippine History
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333339-3333-3333-3333-333333333339', NOW() - INTERVAL '90 days'),  -- World History
  ('11111111-1111-1111-1111-111111111111', 'cc0c8b60-5736-4299-8015-e0a649119b8f', '33333340-3333-3333-3333-333333333340', NOW() - INTERVAL '90 days')   -- Computer Programming
ON CONFLICT (student_id, course_id) DO NOTHING;

-- ============================================
-- 2. STUDENT PROGRESS - Add varied progress for lessons
-- ============================================
-- Get some lesson IDs and create realistic progress
INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  l.module_id,
  l.id,
  100,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
FROM lessons l
JOIN modules m ON m.id = l.module_id
WHERE m.course_id = '33333331-3333-3333-3333-333333333331' AND l."order" = 1
LIMIT 1
ON CONFLICT (student_id, lesson_id) DO NOTHING;

INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  l.module_id,
  l.id,
  50,
  NULL,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days'
FROM lessons l
JOIN modules m ON m.id = l.module_id
WHERE m.course_id = '33333331-3333-3333-3333-333333333331' AND l."order" = 2
LIMIT 1
ON CONFLICT (student_id, lesson_id) DO NOTHING;

INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  l.module_id,
  l.id,
  100,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
FROM lessons l
JOIN modules m ON m.id = l.module_id
WHERE m.course_id = '33333333-3333-3333-3333-333333333333' AND l."order" = 1
LIMIT 1
ON CONFLICT (student_id, lesson_id) DO NOTHING;

INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  l.module_id,
  l.id,
  25,
  NULL,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
FROM lessons l
JOIN modules m ON m.id = l.module_id
WHERE m.course_id = '33333340-3333-3333-3333-333333333340' AND l."order" = 1
LIMIT 1
ON CONFLICT (student_id, lesson_id) DO NOTHING;

-- ============================================
-- 3. ASSESSMENTS - Create 15+ assessments across all courses
-- ============================================
INSERT INTO assessments (school_id, course_id, title, description, type, due_date, total_points, created_at) VALUES
  -- Advanced Mathematics
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Limits and Continuity Quiz', 'Short quiz covering limits, continuity, and intermediate value theorem', 'quiz', NOW() + INTERVAL '3 days', 50, NOW() - INTERVAL '10 days'),
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Derivative Applications Assignment', 'Solve real-world problems using derivatives', 'assignment', NOW() + INTERVAL '10 days', 100, NOW() - INTERVAL '5 days'),
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', 'Midterm Exam - Calculus', 'Comprehensive exam covering all topics from first quarter', 'exam', NOW() + INTERVAL '20 days', 150, NOW() - INTERVAL '2 days'),

  -- Physics
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Newton''s Laws Quiz', 'Multiple choice and problem-solving questions on the three laws of motion', 'quiz', NOW() - INTERVAL '2 days', 40, NOW() - INTERVAL '15 days'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Forces and Motion Lab Report', 'Submit your lab report on the friction experiment', 'assignment', NOW() + INTERVAL '7 days', 80, NOW() - INTERVAL '8 days'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Energy Conservation Project', 'Design and present a project demonstrating energy conservation', 'project', NOW() + INTERVAL '30 days', 120, NOW() - INTERVAL '1 day'),

  -- Chemistry
  ('11111111-1111-1111-1111-111111111111', '33333334-3333-3333-3333-333333333334', 'Organic Chemistry Quiz 1', 'Hydrocarbons, functional groups, and nomenclature', 'quiz', NOW() + INTERVAL '5 days', 45, NOW() - INTERVAL '6 days'),
  ('11111111-1111-1111-1111-111111111111', '33333334-3333-3333-3333-333333333334', 'Chemical Reactions Lab', 'Complete the chemical reactions lab and submit your findings', 'assignment', NOW() - INTERVAL '1 day', 75, NOW() - INTERVAL '14 days'),

  -- English Literature
  ('11111111-1111-1111-1111-111111111111', '33333336-3333-3333-3333-333333333336', 'Character Analysis Essay', 'Analyze the main character from the novel we are reading', 'assignment', NOW() + INTERVAL '12 days', 100, NOW() - INTERVAL '7 days'),
  ('11111111-1111-1111-1111-111111111111', '33333336-3333-3333-3333-333333333336', 'Poetry Interpretation Quiz', 'Interpret and analyze selected poems', 'quiz', NOW() + INTERVAL '4 days', 50, NOW() - INTERVAL '3 days'),

  -- Filipino
  ('11111111-1111-1111-1111-111111111111', '33333337-3333-3333-3333-333333333337', 'Pagsusuri ng Tula', 'Suriin ang mga tula mula sa ating mga pag-aaral', 'assignment', NOW() + INTERVAL '8 days', 80, NOW() - INTERVAL '5 days'),

  -- Philippine History
  ('11111111-1111-1111-1111-111111111111', '33333338-3333-3333-3333-333333333338', 'Pre-Colonial Era Quiz', 'Test on ancient Filipino civilizations and trade systems', 'quiz', NOW() - INTERVAL '5 days', 40, NOW() - INTERVAL '20 days'),
  ('11111111-1111-1111-1111-111111111111', '33333338-3333-3333-3333-333333333338', 'Spanish Colonial Period Essay', 'Write an essay on the impact of Spanish colonization', 'assignment', NOW() + INTERVAL '14 days', 100, NOW() - INTERVAL '4 days'),

  -- World History
  ('11111111-1111-1111-1111-111111111111', '33333339-3333-3333-3333-333333333339', 'Ancient Civilizations Quiz', 'Quiz on Egypt, Greece, and Rome', 'quiz', NOW() + INTERVAL '6 days', 50, NOW() - INTERVAL '2 days'),

  -- Computer Programming
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', 'Python Basics Quiz', 'Variables, data types, and control structures', 'quiz', NOW() + INTERVAL '2 days', 60, NOW() - INTERVAL '4 days'),
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', 'Web Development Project', 'Create a personal portfolio website using HTML, CSS, and JavaScript', 'project', NOW() + INTERVAL '25 days', 150, NOW() - INTERVAL '1 day');

-- ============================================
-- 4. SUBMISSIONS - Create varied submissions (completed, pending, graded)
-- ============================================
-- Graded submissions (past due)
INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  38,
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '3 days',
  'Good understanding of Newton''s laws. Watch your calculations on problem 5.',
  'graded',
  1
FROM assessments a
WHERE a.title = 'Newton''s Laws Quiz'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  35,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '4 days',
  'Excellent work! You demonstrated a strong grasp of pre-colonial trade systems.',
  'graded',
  1
FROM assessments a
WHERE a.title = 'Pre-Colonial Era Quiz'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  68,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  'Good lab report. Next time, include more detailed observations in your methodology section.',
  'graded',
  1
FROM assessments a
WHERE a.title = 'Chemical Reactions Lab'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

-- Submitted but not graded yet (pending)
INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  NULL,
  NOW() - INTERVAL '3 hours',
  NULL,
  NULL,
  'submitted',
  1
FROM assessments a
WHERE a.title = 'Poetry Interpretation Quiz'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  NULL,
  NOW() - INTERVAL '1 day',
  NULL,
  NULL,
  'submitted',
  1
FROM assessments a
WHERE a.title = 'Pagsusuri ng Tula'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

-- Pending (not submitted yet)
INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  NULL,
  NOW(),
  NULL,
  NULL,
  'pending',
  1
FROM assessments a
WHERE a.title = 'Limits and Continuity Quiz'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  NULL,
  NOW(),
  NULL,
  NULL,
  'pending',
  1
FROM assessments a
WHERE a.title = 'Organic Chemistry Quiz 1'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

INSERT INTO submissions (assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number)
SELECT
  a.id,
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  NULL,
  NOW(),
  NULL,
  NULL,
  'pending',
  1
FROM assessments a
WHERE a.title = 'Python Basics Quiz'
LIMIT 1
ON CONFLICT (assessment_id, student_id, attempt_number) DO NOTHING;

-- ============================================
-- 5. NOTIFICATIONS - Create 10+ notifications (mix of read/unread)
-- ============================================
INSERT INTO notifications (student_id, type, title, message, is_read, action_url, created_at) VALUES
  -- Unread notifications (recent)
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'assignment', 'New Assignment Posted', 'Your Physics teacher posted a new assignment: Energy Conservation Project', false, '/courses/33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '4 hours'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'warning', 'Assignment Due Soon', 'Reminder: Python Basics Quiz is due in 2 days', false, '/courses/33333340-3333-3333-3333-333333333340', NOW() - INTERVAL '6 hours'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'grade', 'New Grade Posted', 'Your grade for Chemical Reactions Lab has been posted: 68/75', false, '/grades', NOW() - INTERVAL '1 day'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'announcement', 'School Assembly Next Week', 'All Grade 11 students are required to attend the assembly on Friday', false, NULL, NOW() - INTERVAL '2 days'),

  -- Read notifications (older)
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'success', 'Lesson Completed', 'Congratulations! You completed "Understanding Limits" in Advanced Mathematics', true, '/courses/33333331-3333-3333-3333-333333333331', NOW() - INTERVAL '5 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'grade', 'Quiz Graded', 'Your Newton''s Laws Quiz has been graded: 38/40 (95%)', true, '/grades', NOW() - INTERVAL '3 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'info', 'Welcome to the New Semester', 'Welcome back! Your courses for this semester are now available.', true, '/dashboard', NOW() - INTERVAL '90 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'warning', 'Assignment Overdue', 'Chemical Reactions Lab was due yesterday. Please submit as soon as possible.', true, '/courses/33333334-3333-3333-3333-333333333334', NOW() - INTERVAL '2 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'announcement', 'Library Hours Extended', 'The school library will now be open until 8 PM on weekdays', true, NULL, NOW() - INTERVAL '15 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'success', 'Perfect Score!', 'Amazing work on the Pre-Colonial Era Quiz! You got 35/40', true, '/grades', NOW() - INTERVAL '4 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'info', 'Study Group Meeting', 'Math study group meets every Wednesday at 4 PM in Room 301', true, NULL, NOW() - INTERVAL '8 days'),
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', 'assignment', 'New Resource Available', 'New study materials for Chemistry have been uploaded', true, '/courses/33333334-3333-3333-3333-333333333334', NOW() - INTERVAL '12 days');

-- ============================================
-- 6. ANNOUNCEMENTS - Create teacher announcements
-- ============================================
INSERT INTO announcements (school_id, course_id, section_id, type, priority, title, message, is_pinned, published_at, expires_at, created_at) VALUES
  -- School-wide announcements
  ('11111111-1111-1111-1111-111111111111', NULL, NULL, 'general', 'urgent', 'School Assembly - All Students', 'There will be a mandatory school assembly next Friday at 9:00 AM in the auditorium. All students are required to attend. Please be on time.', true, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days'),
  ('11111111-1111-1111-1111-111111111111', NULL, NULL, 'reminder', 'normal', 'Library Extended Hours', 'Starting this week, the library will be open until 8 PM on weekdays to support your studies during exam season.', false, NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days', NOW() - INTERVAL '7 days'),

  -- Section-specific announcements
  ('11111111-1111-1111-1111-111111111111', NULL, '22222225-2222-2222-2222-222222222225', 'general', 'normal', 'Class Picture Day - Grade 11 Section A', 'Our class picture will be taken next Tuesday. Please wear your complete uniform.', false, NOW() - INTERVAL '3 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '3 days'),

  -- Course-specific announcements
  ('11111111-1111-1111-1111-111111111111', '33333331-3333-3333-3333-333333333331', NULL, 'exam', 'urgent', 'Midterm Exam Schedule - Advanced Mathematics', 'The midterm exam will cover all topics from Chapter 1-5. Bring your calculator and extra batteries. No make-up exams will be given except for medical emergencies.', true, NOW() - INTERVAL '5 days', NOW() + INTERVAL '20 days', NOW() - INTERVAL '5 days'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NULL, 'assignment', 'normal', 'Lab Safety Reminder - Physics', 'Please review the lab safety guidelines before our next lab session. Safety goggles are mandatory.', false, NOW() - INTERVAL '10 days', NOW() + INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('11111111-1111-1111-1111-111111111111', '33333334-3333-3333-3333-333333333334', NULL, 'general', 'normal', 'Chemistry Lab Schedule Change', 'Our Friday lab session has been moved to Thursday this week due to equipment maintenance.', false, NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  ('11111111-1111-1111-1111-111111111111', '33333336-3333-3333-3333-333333333336', NULL, 'assignment', 'normal', 'Book Club Meeting', 'Optional book club meeting to discuss the current novel. Join us after class on Wednesday!', false, NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days'),
  ('11111111-1111-1111-1111-111111111111', '33333340-3333-3333-3333-333333333340', NULL, 'general', 'urgent', 'Computer Lab Access', 'The computer lab will be available for self-study every Monday and Thursday from 3-5 PM. First come, first served.', true, NOW() - INTERVAL '6 days', NOW() + INTERVAL '60 days', NOW() - INTERVAL '6 days');

-- ============================================
-- 7. STUDENT NOTES - Create study notes
-- ============================================
INSERT INTO notes (student_id, course_id, lesson_id, title, content, type, tags, is_favorite, created_at) VALUES
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', '33333331-3333-3333-3333-333333333331', NULL, 'Calculus Study Guide',
   'Key concepts to remember:

   1. Limit Definition: lim(x→a) f(x) = L
   2. Derivative Definition: f''(x) = lim(h→0) [f(x+h) - f(x)]/h
   3. Common derivatives:
      - d/dx(x^n) = nx^(n-1)
      - d/dx(sin x) = cos x
      - d/dx(cos x) = -sin x
      - d/dx(e^x) = e^x

   Remember: Practice makes perfect!',
   'note', ARRAY['calculus', 'formulas', 'exam-prep'], true, NOW() - INTERVAL '5 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', '33333333-3333-3333-3333-333333333333', NULL, 'Physics Formulas Cheat Sheet',
   'Important Physics Formulas:

   Mechanics:
   - F = ma (Newton''s 2nd Law)
   - v = u + at (velocity)
   - s = ut + ½at² (displacement)
   - v² = u² + 2as

   Energy:
   - KE = ½mv²
   - PE = mgh
   - Work = Fd cos θ

   Power:
   - P = W/t
   - P = Fv',
   'note', ARRAY['physics', 'formulas', 'mechanics'], true, NOW() - INTERVAL '8 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', '33333334-3333-3333-3333-333333333334', NULL, 'Organic Chemistry Notes',
   'Functional Groups to Memorize:

   1. Alkanes: C-C single bonds (saturated)
   2. Alkenes: C=C double bonds
   3. Alkynes: C≡C triple bonds
   4. Alcohols: -OH group
   5. Aldehydes: -CHO group
   6. Ketones: C=O (carbonyl)
   7. Carboxylic acids: -COOH

   Nomenclature tips:
   - Count the longest carbon chain
   - Number from the end closest to functional group
   - Name substituents alphabetically',
   'note', ARRAY['chemistry', 'organic', 'functional-groups'], true, NOW() - INTERVAL '3 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', '33333340-3333-3333-3333-333333333340', NULL, 'Python Quick Reference',
   'Python Basics:

   Data Types:
   - int: whole numbers (e.g., 42)
   - float: decimals (e.g., 3.14)
   - str: strings (e.g., "hello")
   - bool: True/False

   Control Structures:
   - if/elif/else
   - for loop: for i in range(10):
   - while loop: while condition:

   Functions:
   def function_name(parameters):
       # code here
       return value

   Lists:
   my_list = [1, 2, 3]
   my_list.append(4)
   my_list[0]  # first element',
   'note', ARRAY['python', 'programming', 'syntax'], true, NOW() - INTERVAL '6 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', '33333338-3333-3333-3333-333333333338', NULL, 'Philippine History Timeline',
   'Important Dates:

   Pre-Colonial Era (Before 1521)
   - Barangay system of governance
   - Trade with China, India, Arabia

   Spanish Period (1521-1898)
   - 1521: Magellan arrives
   - 1565: Legazpi expedition
   - 1896: Philippine Revolution begins
   - 1898: Independence declared

   American Period (1898-1946)
   - 1898: Treaty of Paris
   - 1935: Commonwealth established
   - 1946: Full independence',
   'note', ARRAY['history', 'timeline', 'philippines'], false, NOW() - INTERVAL '10 days');

-- ============================================
-- 8. DOWNLOADS - Create downloadable resources
-- ============================================
INSERT INTO downloads (student_id, lesson_id, module_id, title, file_url, file_size_bytes, file_type, status, created_at) VALUES
  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333331-3333-3333-3333-333333333331' LIMIT 1),
   'Calculus Practice Problems.pdf',
   'https://example.com/files/calculus-practice.pdf',
   2457600, 'application/pdf', 'ready', NOW() - INTERVAL '5 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
   'Physics Lab Manual - Chapter 3.pdf',
   'https://example.com/files/physics-lab-manual.pdf',
   3145728, 'application/pdf', 'ready', NOW() - INTERVAL '8 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333334-3333-3333-3333-333333333334' LIMIT 1),
   'Organic Chemistry Lecture Slides.pptx',
   'https://example.com/files/organic-chem-slides.pptx',
   5242880, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'ready', NOW() - INTERVAL '3 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333336-3333-3333-3333-333333333336' LIMIT 1),
   'Literary Analysis Guide.pdf',
   'https://example.com/files/literary-analysis.pdf',
   1572864, 'application/pdf', 'ready', NOW() - INTERVAL '7 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333340-3333-3333-3333-333333333340' LIMIT 1),
   'Python Tutorial - Variables and Data Types.mp4',
   'https://example.com/files/python-tutorial-1.mp4',
   15728640, 'video/mp4', 'syncing', NOW() - INTERVAL '1 day'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333340-3333-3333-3333-333333333340' LIMIT 1),
   'HTML & CSS Reference Sheet.pdf',
   'https://example.com/files/html-css-reference.pdf',
   1048576, 'application/pdf', 'ready', NOW() - INTERVAL '2 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333338-3333-3333-3333-333333333338' LIMIT 1),
   'Philippine History Timeline Infographic.jpg',
   'https://example.com/files/ph-history-timeline.jpg',
   3670016, 'image/jpeg', 'ready', NOW() - INTERVAL '10 days'),

  ('cc0c8b60-5736-4299-8015-e0a649119b8f', NULL,
   (SELECT id FROM modules WHERE course_id = '33333331-3333-3333-3333-333333333331' LIMIT 1),
   'Trigonometry Formula Sheet.pdf',
   'https://example.com/files/trig-formulas.pdf',
   524288, 'application/pdf', 'queued', NOW() - INTERVAL '4 hours');

-- ============================================
-- 9. ATTENDANCE - Create attendance records for past month
-- ============================================
-- Generate attendance for the past 30 days (weekdays only)
-- We'll create records for 4 main courses over the past month

-- Advanced Mathematics - Mostly present with a few late days
INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at, notes, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  '33333331-3333-3333-3333-333333333331',
  '22222225-2222-2222-2222-222222222225',
  d::date,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '15 days' THEN 'late'
    WHEN d::date = CURRENT_DATE - INTERVAL '8 days' THEN 'absent'
    ELSE 'present'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '15 days' THEN d::timestamp + INTERVAL '15 minutes'
    WHEN d::date = CURRENT_DATE - INTERVAL '8 days' THEN NULL
    ELSE d::timestamp + INTERVAL '8 hours'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '15 days' THEN d::timestamp + INTERVAL '8 hours 50 minutes'
    WHEN d::date = CURRENT_DATE - INTERVAL '8 days' THEN NULL
    ELSE d::timestamp + INTERVAL '8 hours 50 minutes'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '15 days' THEN 'Arrived 15 minutes late'
    WHEN d::date = CURRENT_DATE - INTERVAL '8 days' THEN 'Medical appointment'
    ELSE NULL
  END,
  d::timestamp
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day',
  '1 day'::interval
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;

-- Physics - Good attendance
INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at, notes, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  '33333333-3333-3333-3333-333333333333',
  '22222225-2222-2222-2222-222222222225',
  d::date,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '20 days' THEN 'late'
    ELSE 'present'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '20 days' THEN d::timestamp + INTERVAL '10 hours 10 minutes'
    ELSE d::timestamp + INTERVAL '10 hours'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '20 days' THEN d::timestamp + INTERVAL '10 hours 50 minutes'
    ELSE d::timestamp + INTERVAL '10 hours 50 minutes'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '20 days' THEN 'Traffic delay'
    ELSE NULL
  END,
  d::timestamp
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day',
  '1 day'::interval
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;

-- Chemistry - Perfect attendance
INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at, notes, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  '33333334-3333-3333-3333-333333333334',
  '22222225-2222-2222-2222-222222222225',
  d::date,
  'present',
  d::timestamp + INTERVAL '13 hours',
  d::timestamp + INTERVAL '13 hours 50 minutes',
  NULL,
  d::timestamp
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day',
  '1 day'::interval
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;

-- Computer Programming - Mix of attendance
INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at, notes, created_at)
SELECT
  'cc0c8b60-5736-4299-8015-e0a649119b8f',
  '33333340-3333-3333-3333-333333333340',
  '22222225-2222-2222-2222-222222222225',
  d::date,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '25 days' THEN 'excused'
    WHEN d::date = CURRENT_DATE - INTERVAL '12 days' THEN 'late'
    ELSE 'present'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '25 days' THEN NULL
    WHEN d::date = CURRENT_DATE - INTERVAL '12 days' THEN d::timestamp + INTERVAL '14 hours 20 minutes'
    ELSE d::timestamp + INTERVAL '14 hours'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '25 days' THEN NULL
    WHEN d::date = CURRENT_DATE - INTERVAL '12 days' THEN d::timestamp + INTERVAL '14 hours 50 minutes'
    ELSE d::timestamp + INTERVAL '14 hours 50 minutes'
  END,
  CASE
    WHEN d::date = CURRENT_DATE - INTERVAL '25 days' THEN 'Family emergency - excused absence'
    WHEN d::date = CURRENT_DATE - INTERVAL '12 days' THEN 'Arrived 20 minutes late'
    ELSE NULL
  END,
  d::timestamp
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day',
  '1 day'::interval
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;

-- ============================================
-- 10. GRADING PERIODS - Create grading periods
-- ============================================
INSERT INTO grading_periods (school_id, name, academic_year, start_date, end_date, is_active, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '1st Quarter', '2025-2026', '2025-08-15', '2025-10-31', false, NOW() - INTERVAL '120 days'),
  ('11111111-1111-1111-1111-111111111111', '2nd Quarter', '2025-2026', '2025-11-01', '2026-01-15', true, NOW() - INTERVAL '60 days'),
  ('11111111-1111-1111-1111-111111111111', '3rd Quarter', '2025-2026', '2026-01-16', '2026-03-31', false, NOW() - INTERVAL '60 days'),
  ('11111111-1111-1111-1111-111111111111', '4th Quarter', '2025-2026', '2026-04-01', '2026-06-15', false, NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was inserted correctly:

-- SELECT COUNT(*) as enrollment_count FROM enrollments WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as progress_count FROM student_progress WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as assessment_count FROM assessments;
-- SELECT COUNT(*) as submission_count FROM submissions WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as notification_count FROM notifications WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as announcement_count FROM announcements;
-- SELECT COUNT(*) as note_count FROM notes WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as download_count FROM downloads WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- SELECT COUNT(*) as attendance_count FROM teacher_attendance WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';

-- ============================================
-- END OF COMPLETE DATA SEEDING
-- ============================================
