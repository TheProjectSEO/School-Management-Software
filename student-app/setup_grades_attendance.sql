-- ============================================
-- COMPLETE GRADES AND ATTENDANCE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CREATE TABLES
-- ============================================

-- 1. GRADING PERIODS TABLE
CREATE TABLE IF NOT EXISTS grading_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grading_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grading periods are publicly viewable" ON grading_periods;
CREATE POLICY "Grading periods are publicly viewable" ON grading_periods
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_grading_periods_school_id ON grading_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_grading_periods_active ON grading_periods(is_active);

-- 2. COURSE GRADES TABLE
CREATE TABLE IF NOT EXISTS course_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  grading_period_id UUID NOT NULL REFERENCES grading_periods(id) ON DELETE CASCADE,
  letter_grade TEXT,
  numeric_score DECIMAL(5, 2),
  percentage DECIMAL(5, 2),
  credits DECIMAL(4, 2),
  grade_points DECIMAL(5, 2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'finalized', 'released')),
  is_released BOOLEAN DEFAULT false,
  teacher_comments TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id, grading_period_id)
);

ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own released grades" ON course_grades;
CREATE POLICY "Students can view own released grades" ON course_grades
  FOR SELECT USING (
    is_released = true AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_grades_student_id ON course_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_course_grades_course_id ON course_grades(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grades_period_id ON course_grades(grading_period_id);
CREATE INDEX IF NOT EXISTS idx_course_grades_released ON course_grades(is_released);

-- 3. SEMESTER GPA TABLE
CREATE TABLE IF NOT EXISTS semester_gpa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  grading_period_id UUID NOT NULL REFERENCES grading_periods(id) ON DELETE CASCADE,
  term_gpa DECIMAL(3, 2),
  cumulative_gpa DECIMAL(3, 2),
  term_credits_attempted DECIMAL(5, 2),
  term_credits_earned DECIMAL(5, 2),
  total_credits_earned DECIMAL(6, 2),
  academic_standing TEXT CHECK (academic_standing IN ('good_standing', 'probation', 'deans_list', 'presidents_list')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, grading_period_id)
);

ALTER TABLE semester_gpa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own GPA" ON semester_gpa;
CREATE POLICY "Students can view own GPA" ON semester_gpa
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_semester_gpa_student_id ON semester_gpa(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_gpa_period_id ON semester_gpa(grading_period_id);

-- 4. REPORT CARDS TABLE
CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  grading_period_id UUID NOT NULL REFERENCES grading_periods(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'released')),
  adviser_comments TEXT,
  principal_comments TEXT,
  released_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, grading_period_id)
);

ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own released report cards" ON report_cards;
CREATE POLICY "Students can view own released report cards" ON report_cards
  FOR SELECT USING (
    status = 'released' AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_period_id ON report_cards(grading_period_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_status ON report_cards(status);

-- 5. TEACHER ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  teacher_id UUID,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id, attendance_date)
);

ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON teacher_attendance;
CREATE POLICY "Students can view own attendance" ON teacher_attendance
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON teacher_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON teacher_attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON teacher_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON teacher_attendance(status);

-- ============================================
-- PART 2: CREATE GRADING PERIODS
-- ============================================
INSERT INTO grading_periods (id, school_id, name, academic_year, start_date, end_date, is_active) VALUES
('gp111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'First Semester 2024-2025', '2024-2025', '2024-08-15', '2024-12-20', true),
('gp111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'Midterm - First Semester 2024-2025', '2024-2025', '2024-08-15', '2024-10-15', false),
('gp111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111',
 'Second Semester 2023-2024', '2023-2024', '2024-01-08', '2024-05-25', false),
('gp111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111',
 'First Semester 2023-2024', '2023-2024', '2023-08-20', '2023-12-18', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: POPULATE DATA FOR EXISTING STUDENTS
-- ============================================

-- Get all existing students and create their data
DO $$
DECLARE
  v_student RECORD;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  v_date DATE;
  v_days_back INTEGER;
BEGIN
  -- Loop through each student
  FOR v_student IN SELECT id FROM students WHERE school_id = v_school_id
  LOOP
    -- Create course grades for Fall 2024 Midterm
    INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
    VALUES
    (v_student.id, 'c1111111-1111-1111-1111-111111111111', 'gp111111-1111-1111-1111-111111111112', 'A', 92.00, 92.00, 3.00, 12.00, 'released', true, 'Excellent work on HTML/CSS projects.', NOW() - INTERVAL '5 days'),
    (v_student.id, 'c2222222-2222-2222-2222-222222222222', 'gp111111-1111-1111-1111-111111111112', 'B+', 88.00, 88.00, 3.00, 10.50, 'released', true, 'Good grasp of arrays and linked lists.', NOW() - INTERVAL '5 days'),
    (v_student.id, 'c3333333-3333-3333-3333-333333333333', 'gp111111-1111-1111-1111-111111111112', 'A-', 90.00, 90.00, 3.00, 11.25, 'released', true, 'Thoughtful essays and participation.', NOW() - INTERVAL '5 days'),
    (v_student.id, 'c4444444-4444-4444-4444-444444444444', 'gp111111-1111-1111-1111-111111111112', 'B', 85.00, 85.00, 3.00, 9.00, 'released', true, 'Solid understanding of calculus.', NOW() - INTERVAL '5 days'),
    (v_student.id, 'c5555555-5555-5555-5555-555555555555', 'gp111111-1111-1111-1111-111111111112', 'A', 94.00, 94.00, 3.00, 12.00, 'released', true, 'Excellent technical writing.', NOW() - INTERVAL '5 days')
    ON CONFLICT (student_id, course_id, grading_period_id) DO NOTHING;

    -- Create semester GPA
    INSERT INTO semester_gpa (student_id, grading_period_id, term_gpa, cumulative_gpa, term_credits_attempted, term_credits_earned, total_credits_earned, academic_standing)
    VALUES (v_student.id, 'gp111111-1111-1111-1111-111111111112', 3.65, 3.63, 15.00, 15.00, 45.00, 'deans_list')
    ON CONFLICT (student_id, grading_period_id) DO NOTHING;

    -- Create report card
    INSERT INTO report_cards (student_id, grading_period_id, status, adviser_comments, principal_comments, released_at)
    VALUES (v_student.id, 'gp111111-1111-1111-1111-111111111112', 'released', 'Excellent academic performance this midterm.', 'Congratulations on making the Dean''s List.', NOW() - INTERVAL '5 days')
    ON CONFLICT (student_id, grading_period_id) DO NOTHING;

    -- Create attendance records for past 60 days
    FOR v_days_back IN 1..60 LOOP
      v_date := CURRENT_DATE - v_days_back;

      -- Skip weekends
      IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN

        -- Web Development (Mon, Wed, Fri)
        IF EXTRACT(DOW FROM v_date) IN (1, 3, 5) THEN
          INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
          VALUES (v_student.id, 'c1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', v_date,
            CASE WHEN RANDOM() < 0.85 THEN 'present' WHEN RANDOM() < 0.93 THEN 'late' WHEN RANDOM() < 0.97 THEN 'absent' ELSE 'excused' END,
            v_date + TIME '08:00:00', v_date + TIME '09:30:00')
          ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;
        END IF;

        -- Data Structures (Tue, Thu)
        IF EXTRACT(DOW FROM v_date) IN (2, 4) THEN
          INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
          VALUES (v_student.id, 'c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', v_date,
            CASE WHEN RANDOM() < 0.87 THEN 'present' WHEN RANDOM() < 0.95 THEN 'late' WHEN RANDOM() < 0.98 THEN 'absent' ELSE 'excused' END,
            v_date + TIME '10:00:00', v_date + TIME '11:30:00')
          ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;
        END IF;

        -- Philippine History (Mon, Wed)
        IF EXTRACT(DOW FROM v_date) IN (1, 3) THEN
          INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
          VALUES (v_student.id, 'c3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', v_date,
            CASE WHEN RANDOM() < 0.90 THEN 'present' WHEN RANDOM() < 0.96 THEN 'late' WHEN RANDOM() < 0.99 THEN 'absent' ELSE 'excused' END,
            v_date + TIME '13:00:00', v_date + TIME '14:30:00')
          ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;
        END IF;

        -- Calculus (Mon, Wed, Fri)
        IF EXTRACT(DOW FROM v_date) IN (1, 3, 5) THEN
          INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
          VALUES (v_student.id, 'c4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', v_date,
            CASE WHEN RANDOM() < 0.82 THEN 'present' WHEN RANDOM() < 0.92 THEN 'late' WHEN RANDOM() < 0.96 THEN 'absent' ELSE 'excused' END,
            v_date + TIME '15:00:00', v_date + TIME '16:30:00')
          ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;
        END IF;

        -- Technical Writing (Tue, Thu)
        IF EXTRACT(DOW FROM v_date) IN (2, 4) THEN
          INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
          VALUES (v_student.id, 'c5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', v_date,
            CASE WHEN RANDOM() < 0.88 THEN 'present' WHEN RANDOM() < 0.95 THEN 'late' WHEN RANDOM() < 0.98 THEN 'absent' ELSE 'excused' END,
            v_date + TIME '13:30:00', v_date + TIME '15:00:00')
          ON CONFLICT (student_id, course_id, attendance_date) DO NOTHING;
        END IF;

      END IF;
    END LOOP;

  END LOOP;
END $$;
