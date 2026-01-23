-- ============================================
-- QUICK APPLY: Assessments & Submissions
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- This script creates comprehensive assessment data including:
-- - 5 new courses (total 10)
-- - 28 assessments (quizzes, assignments, projects, exams)
-- - 30+ quiz questions with multiple choice
-- - Student submissions (completed, pending, graded)
-- - Notifications for upcoming work

-- ============================================
-- 1. CREATE 5 ADDITIONAL COURSES
-- ============================================
INSERT INTO courses (id, school_id, section_id, name, subject_code, description, cover_image_url) VALUES
('c6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'Database Systems', 'CS 203', 'Learn relational databases, SQL, normalization, and database design principles.',
 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800'),
('c7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'Software Engineering Principles', 'CS 204', 'Software development lifecycle, agile methodologies, testing, and project management.',
 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800'),
('c8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'Panitikan ng Pilipinas', 'FIL 201', 'Pag-aaral ng mga akda ng mga kilalang manunulat sa Pilipinas mula panahon ng Espanyol hanggang kasalukuyan.',
 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800'),
('c9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'Physics I: Mechanics', 'PHYS 101', 'Classical mechanics covering motion, forces, energy, momentum, and rotational dynamics.',
 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800'),
('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'Ethics and Moral Philosophy', 'PHIL 101', 'Explore ethical theories, moral reasoning, and contemporary ethical issues in technology and society.',
 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. ENROLL EXISTING STUDENTS IN NEW COURSES
-- ============================================
DO $$
DECLARE
  v_student_record RECORD;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 1 Complete: 5 new courses created and students enrolled';
END $$;
