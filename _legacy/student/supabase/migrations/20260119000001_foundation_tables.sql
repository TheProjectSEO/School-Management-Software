-- MSU Complete Foundation: Subject Areas, Academic Tracks, and Extended Schema
-- Migration: 20260119000001_foundation_tables.sql

-- ============================================================================
-- SUBJECT TAXONOMY
-- ============================================================================

CREATE TABLE IF NOT EXISTS subject_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color_code TEXT,
  icon TEXT,
  department_type TEXT CHECK (department_type IN ('core', 'specialized', 'elective')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate 15 subject areas for K-12 and Bachelor's programs
INSERT INTO subject_areas (name, slug, description, color_code, icon, department_type) VALUES
  -- Core Subjects
  ('Mathematics', 'mathematics', 'Algebra, Geometry, Calculus, Statistics', '#1E40AF', '📐', 'core'),
  ('Science', 'science', 'Physics, Chemistry, Biology, Earth Science', '#059669', '🔬', 'core'),
  ('English Language', 'english', 'Reading, Writing, Literature, Communication', '#DC2626', '📚', 'core'),
  ('Filipino Language', 'filipino', 'Wika at Panitikan', '#F59E0B', '🇵🇭', 'core'),
  ('Social Sciences', 'social-sciences', 'History, Geography, Civics, Economics', '#7C3AED', '🌍', 'core'),

  -- Specialized STEM/ICT
  ('Computer Science', 'computer-science', 'Programming, Algorithms, Data Structures', '#3B82F6', '💻', 'specialized'),
  ('Information Technology', 'information-technology', 'Web Development, Networks, Databases', '#06B6D4', '🖥️', 'specialized'),

  -- Business & Economics
  ('Business & Management', 'business-management', 'Accounting, Finance, Entrepreneurship', '#10B981', '💼', 'specialized'),
  ('Economics', 'economics', 'Micro/Macro Economics, Market Analysis', '#8B5CF6', '📈', 'specialized'),

  -- Humanities & Arts
  ('Humanities', 'humanities', 'Philosophy, Literature, Cultural Studies', '#EC4899', '🎭', 'specialized'),
  ('Arts & Design', 'arts-design', 'Visual Arts, Music, Performing Arts', '#F97316', '🎨', 'elective'),

  -- Other Core Requirements
  ('Physical Education', 'physical-education', 'Health, Fitness, Sports', '#EF4444', '⚽', 'core'),
  ('Values Education', 'values-education', 'Ethics, Character Development', '#A855F7', '💎', 'core'),

  -- Electives & Specialized
  ('Technical-Vocational', 'technical-vocational', 'Trade Skills, Industry Training', '#78716C', '🔧', 'elective'),
  ('Research & Innovation', 'research-innovation', 'Research Methods, Capstone Projects', '#14B8A6', '🔍', 'specialized')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ACADEMIC TRACKS (Senior High School)
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, code)
);

COMMENT ON TABLE academic_tracks IS 'K-12 Senior High School tracks: STEM, ABM, HUMSS, TVL';

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Extend courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS subject_area_id UUID REFERENCES subject_areas(id),
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES academic_tracks(id),
  ADD COLUMN IF NOT EXISTS credits DECIMAL(4,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS is_core_subject BOOLEAN DEFAULT true;

COMMENT ON COLUMN courses.subject_area_id IS 'Links course to subject taxonomy';
COMMENT ON COLUMN courses.track_id IS 'For SHS: which academic track (STEM/ABM/HUMSS)';
COMMENT ON COLUMN courses.credits IS 'Credit hours/units for the course';
COMMENT ON COLUMN courses.is_core_subject IS 'Required vs elective course';

-- Extend modules table
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[],
  ADD COLUMN IF NOT EXISTS prerequisites TEXT[];

COMMENT ON COLUMN modules.learning_objectives IS 'Array of learning outcomes for this module';
COMMENT ON COLUMN modules.prerequisites IS 'Required knowledge before starting module';

-- Extend sections table
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES academic_tracks(id),
  ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 40;

COMMENT ON COLUMN sections.track_id IS 'For Grade 11-12: STEM, ABM, or HUMSS track';
COMMENT ON COLUMN sections.max_students IS 'Maximum enrollment capacity';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_subject_area ON courses(subject_area_id);
CREATE INDEX IF NOT EXISTS idx_courses_track ON courses(track_id);
CREATE INDEX IF NOT EXISTS idx_sections_track ON sections(track_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Subject areas are publicly readable
ALTER TABLE subject_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject areas are viewable by everyone"
  ON subject_areas FOR SELECT
  USING (true);

-- Academic tracks readable by school members
ALTER TABLE academic_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks viewable by school members"
  ON academic_tracks FOR SELECT
  USING (
    school_id IN (
      SELECT sm.school_id FROM school_members sm
      JOIN school_profiles sp ON sp.id = sm.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tracks"
  ON academic_tracks FOR ALL
  USING (
    school_id IN (
      SELECT sm.school_id FROM school_members sm
      JOIN school_profiles sp ON sp.id = sm.profile_id
      WHERE sp.auth_user_id = auth.uid() AND sm.role = 'school_admin'
    )
  );
