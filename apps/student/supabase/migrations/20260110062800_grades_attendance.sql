-- ============================================
-- GRADES AND ATTENDANCE TABLES
-- Migration to add grading, GPA, and attendance features
-- ============================================

-- ============================================
-- 1. GRADING PERIODS TABLE
-- ============================================
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

CREATE POLICY "Grading periods are publicly viewable" ON grading_periods
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_grading_periods_school_id ON grading_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_grading_periods_active ON grading_periods(is_active);

-- ============================================
-- 2. COURSE GRADES TABLE
-- ============================================
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

-- ============================================
-- 3. SEMESTER GPA TABLE
-- ============================================
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

-- ============================================
-- 4. REPORT CARDS TABLE
-- ============================================
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

-- ============================================
-- 5. TEACHER ATTENDANCE TABLE
-- ============================================
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
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['grading_periods', 'course_grades', 'semester_gpa', 'report_cards'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;
