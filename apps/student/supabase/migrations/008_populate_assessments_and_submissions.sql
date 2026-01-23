-- ============================================
-- COMPREHENSIVE ASSESSMENT & SUBMISSION POPULATION
-- Creates 5 additional courses with all assignments, quizzes, and submissions
-- Total: 10 courses with realistic workload for students
-- ============================================

-- ============================================
-- 1. CREATE 5 ADDITIONAL COURSES
-- ============================================
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, cover_image_url) VALUES
-- Course 6: Database Systems
(
  'c6666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Database Systems',
  'CS 203',
  'Learn relational databases, SQL, normalization, and database design principles.',
  'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800'
),
-- Course 7: Software Engineering
(
  'c7777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Software Engineering Principles',
  'CS 204',
  'Software development lifecycle, agile methodologies, testing, and project management.',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800'
),
-- Course 8: Filipino Literature
(
  'c8888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Panitikan ng Pilipinas',
  'FIL 201',
  'Pag-aaral ng mga akda ng mga kilalang manunulat sa Pilipinas mula panahon ng Espanyol hanggang kasalukuyan.',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800'
),
-- Course 9: Physics I
(
  'c9999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Physics I: Mechanics',
  'PHYS 101',
  'Classical mechanics covering motion, forces, energy, momentum, and rotational dynamics.',
  'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800'
),
-- Course 10: Ethics and Philosophy
(
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Ethics and Moral Philosophy',
  'PHIL 101',
  'Explore ethical theories, moral reasoning, and contemporary ethical issues in technology and society.',
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. ENROLL DEMO STUDENT IN NEW COURSES
-- ============================================
-- This will be handled by the create_demo_student_data function
-- But we add a helper to enroll existing students
DO $$
DECLARE
  v_student_record RECORD;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Enroll all existing students in the new courses
  FOR v_student_record IN SELECT id FROM students WHERE school_id = v_school_id LOOP
    INSERT INTO enrollments (school_id, student_id, course_id) VALUES
    (v_school_id, v_student_record.id, 'c6666666-6666-6666-6666-666666666666'),
    (v_school_id, v_student_record.id, 'c7777777-7777-7777-7777-777777777777'),
    (v_school_id, v_student_record.id, 'c8888888-8888-8888-8888-888888888888'),
    (v_school_id, v_student_record.id, 'c9999999-9999-9999-9999-999999999999'),
    (v_school_id, v_student_record.id, 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 3. CREATE COMPREHENSIVE ASSIGNMENTS FOR ALL COURSES
-- ============================================
INSERT INTO assessments (id, school_id, course_id, title, description, type, due_date, total_points, time_limit_minutes, instructions, max_attempts) VALUES

-- ==== WEB DEVELOPMENT (c1111111) - Already has 2, add 1 more ====
('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
 'JavaScript Calculator Project', 'Build a functional calculator using vanilla JavaScript', 'project', NOW() + INTERVAL '21 days', 100, NULL,
 'Create a calculator that can perform basic arithmetic operations. Must include: Add, Subtract, Multiply, Divide, Clear button, Display screen.', 1),

-- ==== DATA STRUCTURES (c2222222) - Already has 2, add 1 more ====
('a2222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
 'Binary Tree Implementation', 'Code a binary search tree with insert, search, and traversal methods', 'assignment', NOW() + INTERVAL '14 days', 80, NULL,
 'Implement a BST class with the following methods: insert(), search(), inOrderTraversal(), preOrderTraversal(), postOrderTraversal().', 2),

-- ==== PHILIPPINE HISTORY (c3333333) - Already has 1, add 2 more ====
('a3333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333',
 'Spanish Colonial Period Quiz', 'Test on Spanish colonization of the Philippines', 'quiz', NOW() + INTERVAL '6 days', 50, 30,
 'This quiz covers the Spanish colonial period from 1565 to 1898. You have 30 minutes to complete 25 questions.', 2),
('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333',
 'Revolution Analysis Paper', 'Analyze the factors that led to the Philippine Revolution', 'assignment', NOW() + INTERVAL '18 days', 100, NULL,
 'Write a 1500-word analysis paper discussing the political, social, and economic factors that sparked the Philippine Revolution.', 1),

-- ==== CALCULUS (c4444444) - Already has 2, add 1 more ====
('a4444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444',
 'Applications of Derivatives Quiz', 'Quiz on real-world derivative applications', 'quiz', NOW() + INTERVAL '8 days', 60, 45,
 'This quiz covers optimization problems, related rates, and curve sketching. Show all work for partial credit.', 2),

-- ==== TECHNICAL WRITING (c5555555) - Already has 1, add 2 more ====
('a5555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555',
 'API Documentation Assignment', 'Create comprehensive API documentation for a REST API', 'assignment', NOW() + INTERVAL '15 days', 80, NULL,
 'Document a hypothetical REST API with at least 5 endpoints. Include: endpoint descriptions, request/response formats, parameters, examples.', 1),
('a5555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555',
 'Technical Writing Quiz', 'Test on technical writing principles', 'quiz', NOW() + INTERVAL '5 days', 40, 20,
 'Multiple choice quiz covering clarity, conciseness, audience analysis, and documentation standards.', 1),

-- ==== DATABASE SYSTEMS (c6666666) - 3 new ====
('a6666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666',
 'SQL Fundamentals Quiz', 'Test your SQL query writing skills', 'quiz', NOW() + INTERVAL '4 days', 50, 40,
 'Write SQL queries to solve 15 problems. Topics: SELECT, JOIN, GROUP BY, subqueries, and aggregate functions.', 2),
('a6666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666',
 'Database Design Project', 'Design a normalized database for a library system', 'project', NOW() + INTERVAL '20 days', 100, NULL,
 'Design a complete database schema for a library management system. Include: ERD, table definitions, normalization to 3NF, sample queries.', 1),
('a6666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666',
 'Normalization Assignment', 'Practice database normalization', 'assignment', NOW() + INTERVAL '9 days', 60, NULL,
 'Given an unnormalized table, convert it to 1NF, 2NF, and 3NF. Explain each step and show all functional dependencies.', 2),

-- ==== SOFTWARE ENGINEERING (c7777777) - 3 new ====
('a7777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777',
 'SDLC Quiz', 'Software Development Lifecycle concepts', 'quiz', NOW() + INTERVAL '3 days', 40, 25,
 'Quiz covering Waterfall, Agile, Scrum, and DevOps methodologies. 20 multiple choice questions.', 1),
('a7777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777',
 'Requirements Document', 'Create a Software Requirements Specification (SRS)', 'assignment', NOW() + INTERVAL '16 days', 90, NULL,
 'Write an SRS document for a mobile app of your choice. Include: functional requirements, non-functional requirements, use cases, user stories.', 1),
('a7777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777',
 'Software Testing Midterm', 'Comprehensive exam on testing strategies', 'exam', NOW() + INTERVAL '25 days', 100, 90,
 'Covers unit testing, integration testing, system testing, test-driven development, and quality assurance.', 1),

-- ==== FILIPINO LITERATURE (c8888888) - 3 new ====
('a8888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888',
 'Noli Me Tangere Analysis', 'Pagsusuri ng Noli Me Tangere ni Jose Rizal', 'assignment', NOW() + INTERVAL '13 days', 80, NULL,
 'Sumulat ng 1000-salita na pagsusuri ng Noli Me Tangere. Talakayin ang mga pangunahing tauhan, tema, at kahalagahan sa kasaysayan.', 1),
('a8888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888',
 'Filipino Poetry Quiz', 'Pagsusulit sa Tula at Tulaan', 'quiz', NOW() + INTERVAL '7 days', 50, 30,
 'Pagsusulit tungkol sa mga tanyag na makata at kanilang mga akda. May kasamang pagsusuri ng tula.', 2),
('a8888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888',
 'Original Short Story', 'Sumulat ng orihinal na maikling kuwento', 'project', NOW() + INTERVAL '22 days', 100, NULL,
 'Lumikha ng isang orihinal na maikling kuwento (1500-2000 salita) na sumasalamin sa kasalukuyang lipunan ng Pilipinas.', 1),

-- ==== PHYSICS (c9999999) - 3 new ====
('a9999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', 'c9999999-9999-9999-9999-999999999999',
 'Kinematics Problem Set', 'Solve motion and velocity problems', 'assignment', NOW() + INTERVAL '6 days', 60, NULL,
 'Complete 15 kinematics problems involving displacement, velocity, acceleration, and projectile motion. Show all work.', 2),
('a9999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', 'c9999999-9999-9999-9999-999999999999',
 'Newton''s Laws Quiz', 'Test on forces and motion', 'quiz', NOW() + INTERVAL '5 days', 50, 35,
 'Quiz on Newton''s three laws of motion, friction, normal force, and free body diagrams.', 2),
('a9999999-9999-9999-9999-999999999993', '11111111-1111-1111-1111-111111111111', 'c9999999-9999-9999-9999-999999999999',
 'Lab Report: Pendulum Motion', 'Write a formal physics lab report', 'assignment', NOW() + INTERVAL '11 days', 70, NULL,
 'Analyze pendulum motion data. Report must include: hypothesis, methodology, data analysis, graphs, error analysis, conclusion.', 1),

-- ==== ETHICS & PHILOSOPHY (caaaaaaa) - 3 new ====
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Ethical Theories Quiz', 'Test on major ethical frameworks', 'quiz', NOW() + INTERVAL '4 days', 45, 30,
 'Quiz covering utilitarianism, deontology, virtue ethics, and social contract theory.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'AI Ethics Case Study', 'Analyze an ethical dilemma in artificial intelligence', 'assignment', NOW() + INTERVAL '17 days', 85, NULL,
 'Choose an AI ethics case study (bias, privacy, automation). Analyze using at least two ethical frameworks. 1200-1500 words.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Philosophy Midterm Exam', 'Comprehensive philosophy exam', 'exam', NOW() + INTERVAL '28 days', 100, 120,
 'Essay-based exam on major philosophers, ethical theories, and applied ethics. Bring a blue book.', 1)

ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CREATE QUIZ QUESTIONS FOR QUIZ ASSESSMENTS
-- ============================================

-- Spanish Colonial Period Quiz (a3333333-3333-3333-3333-333333333332)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q3332001-0000-0000-0000-000000000001', 'a3333333-3333-3333-3333-333333333332',
 'When did the Spanish colonization of the Philippines officially begin?', 'multiple_choice', 2,
 'opt33320-1111-1111-1111-111111111111', 'The Spanish colonization began in 1565 when Miguel López de Legazpi established the first permanent Spanish settlement in Cebu.', 1),
('q3332002-0000-0000-0000-000000000002', 'a3333333-3333-3333-3333-333333333332',
 'What was the primary motivation for Spanish colonization?', 'multiple_choice', 2,
 'opt33320-2222-2222-2222-222222222222', 'The Spanish colonization was driven by the "3 Gs": God (spread Christianity), Gold (economic gain), and Glory (prestige).', 2),
('q3332003-0000-0000-0000-000000000003', 'a3333333-3333-3333-3333-333333333332',
 'The Manila-Acapulco galleon trade lasted for how many years?', 'multiple_choice', 2,
 'opt33320-3333-3333-3333-333333333333', 'The Manila-Acapulco galleon trade operated for 250 years from 1565 to 1815.', 3),
('q3332004-0000-0000-0000-000000000004', 'a3333333-3333-3333-3333-333333333332',
 'Polo y servicio was a form of forced labor imposed by the Spanish.', 'true_false', 2,
 'true', 'Polo y servicio required Filipino men aged 16-60 to work for 40 days per year on government projects.', 4),
('q3332005-0000-0000-0000-000000000005', 'a3333333-3333-3333-3333-333333333332',
 'The Spanish colonial period ended in 1898.', 'true_false', 2,
 'true', 'Spanish rule ended in 1898 after the Spanish-American War and the Treaty of Paris.', 5);

-- Answer options for Spanish Colonial Quiz
INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
-- Q1 options
('opt33320-1111-1111-1111-111111111111', 'q3332001-0000-0000-0000-000000000001', '1565', true, 1),
('opt33320-1111-2222-2222-222222222222', 'q3332001-0000-0000-0000-000000000001', '1521', false, 2),
('opt33320-1111-3333-3333-333333333333', 'q3332001-0000-0000-0000-000000000001', '1898', false, 3),
('opt33320-1111-4444-4444-444444444444', 'q3332001-0000-0000-0000-000000000001', '1762', false, 4),
-- Q2 options
('opt33320-2222-2222-2222-222222222222', 'q3332002-0000-0000-0000-000000000002', 'God, Gold, and Glory', true, 1),
('opt33320-2222-3333-3333-333333333333', 'q3332002-0000-0000-0000-000000000002', 'Trade routes only', false, 2),
('opt33320-2222-4444-4444-444444444444', 'q3332002-0000-0000-0000-000000000002', 'Military conquest', false, 3),
('opt33320-2222-5555-5555-555555555555', 'q3332002-0000-0000-0000-000000000002', 'Scientific exploration', false, 4),
-- Q3 options
('opt33320-3333-3333-3333-333333333333', 'q3332003-0000-0000-0000-000000000003', '250 years', true, 1),
('opt33320-3333-4444-4444-444444444444', 'q3332003-0000-0000-0000-000000000003', '100 years', false, 2),
('opt33320-3333-5555-5555-555555555555', 'q3332003-0000-0000-0000-000000000003', '333 years', false, 3),
('opt33320-3333-6666-6666-666666666666', 'q3332003-0000-0000-0000-000000000003', '150 years', false, 4);

-- Applications of Derivatives Quiz (a4444444-4444-4444-4444-444444444443)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q4443001-0000-0000-0000-000000000001', 'a4444444-4444-4444-4444-444444444443',
 'What does the derivative represent in terms of a graph?', 'multiple_choice', 3,
 'opt44430-1111-1111-1111-111111111111', 'The derivative represents the slope of the tangent line at any point on the function.', 1),
('q4443002-0000-0000-0000-000000000002', 'a4444444-4444-4444-4444-444444444443',
 'To find maximum and minimum values of a function, we set the derivative equal to what?', 'multiple_choice', 3,
 'opt44430-2222-2222-2222-222222222222', 'Critical points occur where f''(x) = 0 or where f''(x) is undefined.', 2),
('q4443003-0000-0000-0000-000000000003', 'a4444444-4444-4444-4444-444444444443',
 'The second derivative test helps determine if a critical point is a maximum or minimum.', 'true_false', 2,
 'true', 'If f''''(x) > 0, it''s a minimum. If f''''(x) < 0, it''s a maximum.', 3);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
-- Q1 options
('opt44430-1111-1111-1111-111111111111', 'q4443001-0000-0000-0000-000000000001', 'The slope of the tangent line', true, 1),
('opt44430-1111-2222-2222-222222222222', 'q4443001-0000-0000-0000-000000000001', 'The area under the curve', false, 2),
('opt44430-1111-3333-3333-333333333333', 'q4443001-0000-0000-0000-000000000001', 'The y-intercept', false, 3),
('opt44430-1111-4444-4444-444444444444', 'q4443001-0000-0000-0000-000000000001', 'The x-coordinate', false, 4),
-- Q2 options
('opt44430-2222-2222-2222-222222222222', 'q4443002-0000-0000-0000-000000000002', 'Zero', true, 1),
('opt44430-2222-3333-3333-333333333333', 'q4443002-0000-0000-0000-000000000002', 'One', false, 2),
('opt44430-2222-4444-4444-444444444444', 'q4443002-0000-0000-0000-000000000002', 'Infinity', false, 3),
('opt44430-2222-5555-5555-555555555555', 'q4443002-0000-0000-0000-000000000002', 'Negative one', false, 4);

-- Technical Writing Quiz (a5555555-5555-5555-5555-555555555553)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q5553001-0000-0000-0000-000000000001', 'a5555555-5555-5555-5555-555555555553',
 'What is the primary goal of technical writing?', 'multiple_choice', 2,
 'opt55530-1111-1111-1111-111111111111', 'Technical writing aims to communicate complex information clearly and concisely to a specific audience.', 1),
('q5553002-0000-0000-0000-000000000002', 'a5555555-5555-5555-5555-555555555553',
 'Active voice is generally preferred over passive voice in technical writing.', 'true_false', 2,
 'true', 'Active voice is more direct, clear, and easier to understand: "The system generates a report" vs "A report is generated by the system".', 2);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('opt55530-1111-1111-1111-111111111111', 'q5553001-0000-0000-0000-000000000001', 'To communicate clearly and concisely', true, 1),
('opt55530-1111-2222-2222-222222222222', 'q5553001-0000-0000-0000-000000000001', 'To use complex vocabulary', false, 2),
('opt55530-1111-3333-3333-333333333333', 'q5553001-0000-0000-0000-000000000001', 'To impress readers with jargon', false, 3),
('opt55530-1111-4444-4444-444444444444', 'q5553001-0000-0000-0000-000000000001', 'To write as much as possible', false, 4);

-- SQL Fundamentals Quiz (a6666666-6666-6666-6666-666666666661)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q6661001-0000-0000-0000-000000000001', 'a6666666-6666-6666-6666-666666666661',
 'Which SQL clause is used to filter rows?', 'multiple_choice', 2,
 'opt66610-1111-1111-1111-111111111111', 'WHERE clause filters rows based on conditions before grouping.', 1),
('q6661002-0000-0000-0000-000000000002', 'a6666666-6666-6666-6666-666666666661',
 'What does INNER JOIN return?', 'multiple_choice', 3,
 'opt66610-2222-2222-2222-222222222222', 'INNER JOIN returns only rows that have matching values in both tables.', 2),
('q6661003-0000-0000-0000-000000000003', 'a6666666-6666-6666-6666-666666666661',
 'The COUNT() function is an aggregate function.', 'true_false', 2,
 'true', 'COUNT(), SUM(), AVG(), MIN(), and MAX() are all aggregate functions.', 3);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
-- Q1 options
('opt66610-1111-1111-1111-111111111111', 'q6661001-0000-0000-0000-000000000001', 'WHERE', true, 1),
('opt66610-1111-2222-2222-222222222222', 'q6661001-0000-0000-0000-000000000001', 'SELECT', false, 2),
('opt66610-1111-3333-3333-333333333333', 'q6661001-0000-0000-0000-000000000001', 'FROM', false, 3),
('opt66610-1111-4444-4444-444444444444', 'q6661001-0000-0000-0000-000000000001', 'ORDER BY', false, 4),
-- Q2 options
('opt66610-2222-2222-2222-222222222222', 'q6661002-0000-0000-0000-000000000002', 'Only matching rows from both tables', true, 1),
('opt66610-2222-3333-3333-333333333333', 'q6661002-0000-0000-0000-000000000002', 'All rows from the left table', false, 2),
('opt66610-2222-4444-4444-444444444444', 'q6661002-0000-0000-0000-000000000002', 'All rows from both tables', false, 3),
('opt66610-2222-5555-5555-555555555555', 'q6661002-0000-0000-0000-000000000002', 'Only rows from the right table', false, 4);

-- SDLC Quiz (a7777777-7777-7777-7777-777777777771)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q7771001-0000-0000-0000-000000000001', 'a7777777-7777-7777-7777-777777777771',
 'Which methodology emphasizes iterative development and customer collaboration?', 'multiple_choice', 2,
 'opt77710-1111-1111-1111-111111111111', 'Agile methodology focuses on iterative development, frequent delivery, and customer collaboration.', 1),
('q7771002-0000-0000-0000-000000000002', 'a7777777-7777-7777-7777-777777777771',
 'In Scrum, a sprint typically lasts 2-4 weeks.', 'true_false', 2,
 'true', 'Sprints are time-boxed iterations, typically lasting 2-4 weeks, where a potentially shippable product increment is created.', 2);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('opt77710-1111-1111-1111-111111111111', 'q7771001-0000-0000-0000-000000000001', 'Agile', true, 1),
('opt77710-1111-2222-2222-222222222222', 'q7771001-0000-0000-0000-000000000001', 'Waterfall', false, 2),
('opt77710-1111-3333-3333-333333333333', 'q7771001-0000-0000-0000-000000000001', 'V-Model', false, 3),
('opt77710-1111-4444-4444-444444444444', 'q7771001-0000-0000-0000-000000000001', 'Spiral', false, 4);

-- Filipino Poetry Quiz (a8888888-8888-8888-8888-888888888882)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q8882001-0000-0000-0000-000000000001', 'a8888888-8888-8888-8888-888888888882',
 'Sino ang kilala bilang "Ama ng Wikang Pambansa"?', 'multiple_choice', 2,
 'opt88820-1111-1111-1111-111111111111', 'Si Manuel L. Quezon ay kilala bilang "Ama ng Wikang Pambansa" dahil sa kanyang pagsisikap na gawing opisyal na wika ang Filipino.', 1),
('q8882002-0000-0000-0000-000000000002', 'a8888888-8888-8888-8888-888888888882',
 'Ang "Florante at Laura" ay isinulat ni Francisco Balagtas.', 'true_false', 2,
 'true', 'Ang "Florante at Laura" ay isang korido na isinulat ni Francisco Balagtas noong 1838.', 2);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('opt88820-1111-1111-1111-111111111111', 'q8882001-0000-0000-0000-000000000001', 'Manuel L. Quezon', true, 1),
('opt88820-1111-2222-2222-222222222222', 'q8882001-0000-0000-0000-000000000001', 'Jose Rizal', false, 2),
('opt88820-1111-3333-3333-333333333333', 'q8882001-0000-0000-0000-000000000001', 'Emilio Aguinaldo', false, 3),
('opt88820-1111-4444-4444-444444444444', 'q8882001-0000-0000-0000-000000000001', 'Andres Bonifacio', false, 4);

-- Newton's Laws Quiz (a9999999-9999-9999-9999-999999999992)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('q9992001-0000-0000-0000-000000000001', 'a9999999-9999-9999-9999-999999999992',
 'What is Newton''s First Law of Motion?', 'multiple_choice', 2,
 'opt99920-1111-1111-1111-111111111111', 'Newton''s First Law states that an object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.', 1),
('q9992002-0000-0000-0000-000000000002', 'a9999999-9999-9999-9999-999999999992',
 'Force equals mass times acceleration (F = ma).', 'true_false', 2,
 'true', 'This is Newton''s Second Law of Motion, which quantifies the relationship between force, mass, and acceleration.', 2);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('opt99920-1111-1111-1111-111111111111', 'q9992001-0000-0000-0000-000000000001', 'Law of Inertia', true, 1),
('opt99920-1111-2222-2222-222222222222', 'q9992001-0000-0000-0000-000000000001', 'F = ma', false, 2),
('opt99920-1111-3333-3333-333333333333', 'q9992001-0000-0000-0000-000000000001', 'Action-Reaction', false, 3),
('opt99920-1111-4444-4444-444444444444', 'q9992001-0000-0000-0000-000000000001', 'Conservation of Energy', false, 4);

-- Ethical Theories Quiz (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1)
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index) VALUES
('qaaa1001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 'Which ethical theory focuses on the greatest good for the greatest number?', 'multiple_choice', 3,
 'optaaa10-1111-1111-1111-111111111111', 'Utilitarianism, developed by Jeremy Bentham and John Stuart Mill, judges actions based on their consequences and overall utility.', 1),
('qaaa1002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 'Deontology focuses on duty and rules rather than consequences.', 'true_false', 2,
 'true', 'Deontological ethics, associated with Kant, emphasizes moral duties and rules regardless of consequences.', 2);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('optaaa10-1111-1111-1111-111111111111', 'qaaa1001-0000-0000-0000-000000000001', 'Utilitarianism', true, 1),
('optaaa10-1111-2222-2222-222222222222', 'qaaa1001-0000-0000-0000-000000000001', 'Deontology', false, 2),
('optaaa10-1111-3333-3333-333333333333', 'qaaa1001-0000-0000-0000-000000000001', 'Virtue Ethics', false, 3),
('optaaa10-1111-4444-4444-444444444444', 'qaaa1001-0000-0000-0000-000000000001', 'Relativism', false, 4);

-- ============================================
-- 5. CREATE SUBMISSIONS (Mix of completed, pending, graded)
-- ============================================
-- We'll create submissions for the demo student based on existing student records
DO $$
DECLARE
  v_student_record RECORD;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  FOR v_student_record IN SELECT id FROM students WHERE school_id = v_school_id LOOP

    -- COMPLETED & GRADED submissions (past assignments)
    -- Web Dev: HTML Quiz (submitted 2 days ago, graded)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a1111111-1111-1111-1111-111111111111',
      v_student_record.id,
      45, -- 45/50
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '1 day',
      'Great job! You showed strong understanding of HTML basics. Remember to always close your tags properly.',
      'graded',
      1,
      NOW() - INTERVAL '2 days' - INTERVAL '25 minutes',
      1500 -- 25 minutes
    ) ON CONFLICT DO NOTHING;

    -- Data Structures: Arrays Quiz (submitted 5 days ago, graded)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a2222222-2222-2222-2222-222222222221',
      v_student_record.id,
      38, -- 38/40
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '4 days',
      'Excellent work on linear data structures! Your explanations were clear and accurate.',
      'graded',
      1,
      NOW() - INTERVAL '5 days' - INTERVAL '30 minutes',
      1800
    ) ON CONFLICT DO NOTHING;

    -- Calculus: Limits Practice (submitted 3 days ago, graded)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a4444444-4444-4444-4444-444444444441',
      v_student_record.id,
      42, -- 42/50
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '2 days',
      'Good work! You understand the concept but be careful with limit notation. Practice more with indeterminate forms.',
      'graded',
      1,
      NOW() - INTERVAL '3 days' - INTERVAL '2 hours',
      7200
    ) ON CONFLICT DO NOTHING;

    -- SUBMITTED but NOT YET GRADED (pending grading)
    -- Data Structures: Stack Implementation (submitted 1 day ago, awaiting grading)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a2222222-2222-2222-2222-222222222222',
      v_student_record.id,
      NULL,
      NOW() - INTERVAL '1 day',
      NULL,
      NULL,
      'submitted',
      1,
      NOW() - INTERVAL '1 day' - INTERVAL '3 hours',
      10800
    ) ON CONFLICT DO NOTHING;

    -- Technical Writing: Report Draft (submitted 12 hours ago, awaiting grading)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a5555555-5555-5555-5555-555555555551',
      v_student_record.id,
      NULL,
      NOW() - INTERVAL '12 hours',
      NULL,
      NULL,
      'submitted',
      1,
      NOW() - INTERVAL '5 days',
      14400
    ) ON CONFLICT DO NOTHING;

    -- PENDING submissions (started but not submitted)
    -- Web Dev: Portfolio Project (in progress)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a1111111-1111-1111-1111-111111111112',
      v_student_record.id,
      NULL,
      NULL,
      NULL,
      NULL,
      'pending',
      1,
      NOW() - INTERVAL '2 days',
      5400
    ) ON CONFLICT DO NOTHING;

    -- Database: SQL Quiz (started 1 hour ago)
    INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
    VALUES (
      gen_random_uuid(),
      'a6666666-6666-6666-6666-666666666661',
      v_student_record.id,
      NULL,
      NULL,
      NULL,
      NULL,
      'pending',
      1,
      NOW() - INTERVAL '1 hour',
      600
    ) ON CONFLICT DO NOTHING;

    -- COMPLETED QUIZZES with student answers
    -- Spanish Colonial Quiz (completed and graded)
    DECLARE
      v_submission_id UUID := gen_random_uuid();
    BEGIN
      INSERT INTO submissions (id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number, started_at, time_spent_seconds)
      VALUES (
        v_submission_id,
        'a3333333-3333-3333-3333-333333333332',
        v_student_record.id,
        48, -- 48/50
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days' + INTERVAL '2 hours',
        'Well done! You have a strong grasp of the Spanish colonial period.',
        'graded',
        1,
        NOW() - INTERVAL '4 days' - INTERVAL '25 minutes',
        1500
      ) ON CONFLICT DO NOTHING;

      -- Add student answers for this quiz
      INSERT INTO student_answers (submission_id, question_id, selected_option_id, is_correct, points_earned) VALUES
      (v_submission_id, 'q3332001-0000-0000-0000-000000000001', 'opt33320-1111-1111-1111-111111111111', true, 2),  -- Correct
      (v_submission_id, 'q3332002-0000-0000-0000-000000000002', 'opt33320-2222-2222-2222-222222222222', true, 2),  -- Correct
      (v_submission_id, 'q3332003-0000-0000-0000-000000000003', 'opt33320-3333-3333-3333-333333333333', true, 2),  -- Correct
      (v_submission_id, 'q3332004-0000-0000-0000-000000000004', NULL, true, 2),  -- True/False - Correct (true)
      (v_submission_id, 'q3332005-0000-0000-0000-000000000005', NULL, true, 2)   -- True/False - Correct (true)
      ON CONFLICT DO NOTHING;
    END;

  END LOOP;
END $$;

-- ============================================
-- 6. CREATE NOTIFICATIONS FOR UPCOMING ASSIGNMENTS
-- ============================================
DO $$
DECLARE
  v_student_record RECORD;
BEGIN
  FOR v_student_record IN SELECT id FROM students LOOP

    -- Notifications for upcoming assignments
    INSERT INTO notifications (student_id, type, title, message, action_url, is_read) VALUES
    (v_student_record.id, 'assignment', 'New Assignment: JavaScript Calculator',
     'Due in 21 days. Build a functional calculator using vanilla JavaScript.',
     '/assessments/a1111111-1111-1111-1111-111111111113', false),

    (v_student_record.id, 'assignment', 'Quiz Tomorrow: Technical Writing',
     'Don''t forget! Your Technical Writing quiz is due tomorrow. Review documentation standards and writing principles.',
     '/assessments/a5555555-5555-5555-5555-555555555553', false),

    (v_student_record.id, 'grade', 'Graded: HTML Fundamentals Quiz',
     'Your quiz has been graded. Score: 45/50 (90%). Great work!',
     '/grades', true),

    (v_student_record.id, 'assignment', 'Reminder: Database Design Project',
     'Your Database Design Project is due in 20 days. Start working on your ERD and normalization.',
     '/assessments/a6666666-6666-6666-6666-666666666662', false),

    (v_student_record.id, 'warning', 'Late Submission: Pre-Colonial Essay',
     'Your essay submission is overdue. Please submit as soon as possible to minimize grade penalty.',
     '/assessments/a3333333-3333-3333-3333-333333333331', false),

    (v_student_record.id, 'info', 'Study Tip: Upcoming Midterm Exams',
     'Three midterm exams are coming up in the next 3-4 weeks. Start reviewing now for best results!',
     '/assessments', false)
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;

-- ============================================
-- 7. UPDATE DEMO STUDENT CREATION FUNCTION
-- ============================================
-- Update the demo student function to include new courses
CREATE OR REPLACE FUNCTION create_demo_student_data(p_profile_id UUID)
RETURNS void AS $$
DECLARE
  v_student_id UUID;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Create student record
  INSERT INTO students (id, school_id, profile_id, lrn, grade_level, section_id)
  VALUES (
    gen_random_uuid(),
    v_school_id,
    p_profile_id,
    '123456789012',
    'College - 2nd Year',
    '22222222-2222-2222-2222-222222222222'
  )
  RETURNING id INTO v_student_id;

  -- Enroll in ALL 10 courses
  INSERT INTO enrollments (school_id, student_id, course_id) VALUES
  (v_school_id, v_student_id, 'c1111111-1111-1111-1111-111111111111'), -- Web Dev
  (v_school_id, v_student_id, 'c2222222-2222-2222-2222-222222222222'), -- Data Structures
  (v_school_id, v_student_id, 'c3333333-3333-3333-3333-333333333333'), -- Philippine History
  (v_school_id, v_student_id, 'c4444444-4444-4444-4444-444444444444'), -- Calculus
  (v_school_id, v_student_id, 'c5555555-5555-5555-5555-555555555555'), -- Technical Writing
  (v_school_id, v_student_id, 'c6666666-6666-6666-6666-666666666666'), -- Database Systems
  (v_school_id, v_student_id, 'c7777777-7777-7777-7777-777777777777'), -- Software Engineering
  (v_school_id, v_student_id, 'c8888888-8888-8888-8888-888888888888'), -- Filipino Literature
  (v_school_id, v_student_id, 'c9999999-9999-9999-9999-999999999999'), -- Physics
  (v_school_id, v_student_id, 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); -- Ethics

  -- Create some initial progress
  INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, last_accessed_at) VALUES
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111111', 100, NOW() - INTERVAL '2 hours'),
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111112', 100, NOW() - INTERVAL '1 day'),
  (v_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222211', 100, NOW() - INTERVAL '1 day'),
  (v_student_id, 'c3333333-3333-3333-3333-333333333333', 'l3333333-3333-3333-3333-333333333311', 100, NOW() - INTERVAL '3 days');

  -- Create welcome notifications
  INSERT INTO notifications (student_id, type, title, message, action_url) VALUES
  (v_student_id, 'announcement', 'Welcome to MSU Student Portal!',
   'Start your learning journey today. You are enrolled in 10 subjects!', '/subjects'),
  (v_student_id, 'assignment', 'Multiple Assignments Due Soon',
   'You have several upcoming assignments and quizzes. Check your dashboard!', '/assessments'),
  (v_student_id, 'info', 'Pro tip: Stay organized',
   'Use the Notes feature to keep track of important concepts from each lesson.', '/notes');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUMMARY OF CREATED DATA
-- ============================================
-- Total Courses: 10
-- Total Assessments per course: 2-3 each = ~28 total assessments
-- Total Quiz Questions: ~30 questions across multiple quizzes
-- Total Submissions: Multiple states (pending, submitted, graded)
-- Total Notifications: 6 per student
--
-- ASSESSMENT TYPES:
-- - Quizzes: 10 (with multiple choice questions)
-- - Assignments: 12
-- - Projects: 4
-- - Exams: 2
--
-- DUE DATES:
-- - Past due: 1
-- - Due soon (1-7 days): 8
-- - Due later (8-28 days): 19
