-- MSU Student Portal Database Schema
-- Complete schema for all tables with RLS policies

-- ============================================
-- 1. PROFILES TABLE (linked to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ============================================
-- 2. SCHOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  division TEXT,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#7B1113',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools are publicly viewable" ON schools
  FOR SELECT USING (true);

-- ============================================
-- 3. SECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level TEXT,
  adviser_teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sections are viewable by school members" ON sections
  FOR SELECT USING (true);

-- ============================================
-- 4. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lrn TEXT,
  grade_level TEXT,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- 5. COURSES TABLE (subjects)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject_code TEXT,
  description TEXT,
  cover_image_url TEXT,
  teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view courses" ON courses
  FOR SELECT USING (true);

-- ============================================
-- 6. ENROLLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON enrollments
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 7. MODULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published modules are viewable" ON modules
  FOR SELECT USING (is_published = true);

-- ============================================
-- 8. LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'reading', 'quiz', 'activity')) DEFAULT 'reading',
  video_url TEXT,
  duration_minutes INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lessons are viewable" ON lessons
  FOR SELECT USING (is_published = true);

-- ============================================
-- 9. ASSESSMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'exam', 'assignment', 'project')) DEFAULT 'assignment',
  due_date TIMESTAMPTZ,
  total_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assessments viewable by enrolled students" ON assessments
  FOR SELECT USING (true);

-- ============================================
-- 10. SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  feedback TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'graded')) DEFAULT 'pending',
  attempt_number INTEGER DEFAULT 1,
  UNIQUE(assessment_id, student_id, attempt_number)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submissions" ON submissions
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 11. STUDENT PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own progress" ON student_progress
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own progress" ON student_progress
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own progress" ON student_progress
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 12. NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL CHECK (type IN ('note', 'highlight', 'bookmark')) DEFAULT 'note',
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own notes" ON notes
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own notes" ON notes
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own notes" ON notes
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own notes" ON notes
  FOR DELETE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 13. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'grade', 'announcement')) DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own notifications" ON notifications
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own notifications" ON notifications
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 14. DOWNLOADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('ready', 'syncing', 'queued', 'error')) DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own downloads" ON downloads
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own downloads" ON downloads
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own downloads" ON downloads
  FOR DELETE USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_student_id ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_downloads_student_id ON downloads(student_id);

-- ============================================
-- TRIGGER FOR AUTO-UPDATING updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles', 'schools', 'sections', 'students', 'courses', 'enrollments', 'modules', 'lessons', 'assessments', 'student_progress', 'notes'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================
-- FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
