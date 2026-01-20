-- ============================================
-- COMPLETE FOUNDATIONAL DATA SETUP
-- ============================================
-- This script creates ALL foundational data required for enrollment
-- Run this ONCE before adding students or teachers
-- ============================================

BEGIN;

-- ============================================
-- PHASE 0: CREATE MISSING TABLES (if they don't exist)
-- ============================================

-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Create academic_tracks table
CREATE TABLE IF NOT EXISTS academic_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, code)
);

-- Create letter_grade_scales table
CREATE TABLE IF NOT EXISTS letter_grade_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  min_grade NUMERIC(5,2),
  max_grade NUMERIC(5,2),
  gpa_points NUMERIC(3,2),
  min_percentage NUMERIC(5,2),
  max_percentage NUMERIC(5,2),
  gpa_value NUMERIC(3,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, letter)
);

-- Create grading_periods table if it doesn't exist
CREATE TABLE IF NOT EXISTS grading_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_number INTEGER NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grading_periods ENABLE ROW LEVEL SECURITY;

-- Ensure columns exist (if grading_periods already exists)
ALTER TABLE grading_periods
  ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'quarter',
  ADD COLUMN IF NOT EXISTS period_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grading_periods' AND policyname = 'grading_periods_full_access') THEN
    CREATE POLICY grading_periods_full_access ON grading_periods FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_grade_scales ENABLE ROW LEVEL SECURITY;

-- Ensure sections columns exist (if table already exists)
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Ensure courses columns exist (if table already exists)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure letter_grade_scales columns exist (if table already exists)
ALTER TABLE letter_grade_scales
  ADD COLUMN IF NOT EXISTS letter TEXT,
  ADD COLUMN IF NOT EXISTS min_grade NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS max_grade NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS gpa_points NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS min_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS max_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS gpa_value NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create basic RLS policies (allow all for now, can be tightened later)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'academic_years' AND policyname = 'academic_years_full_access') THEN
    CREATE POLICY academic_years_full_access ON academic_years FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'academic_tracks' AND policyname = 'academic_tracks_full_access') THEN
    CREATE POLICY academic_tracks_full_access ON academic_tracks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'letter_grade_scales' AND policyname = 'letter_grade_scales_full_access') THEN
    CREATE POLICY letter_grade_scales_full_access ON letter_grade_scales FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- PHASE 1: GET OR CREATE SCHOOL
-- ============================================

DO $$
DECLARE
  v_school_id UUID;
  v_section_10a UUID;
  v_section_10b UUID;
  v_section_10c UUID;
  v_section_11_stem UUID;
  v_section_11_abm UUID;
  v_section_11_humss UUID;
  v_section_12_stem UUID;
  v_section_12_abm UUID;
  v_section_12_humss UUID;
BEGIN
  -- Get first school or create default
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  IF v_school_id IS NULL THEN
    v_school_id := gen_random_uuid();
    INSERT INTO schools (id, name, slug, region, division, accent_color)
    VALUES (
      v_school_id,
      'Mindanao State University - Main Campus',
      'msu-main',
      'Region X',
      'Marawi City',
      '#7B1113'
    );
    RAISE NOTICE 'Created new school: %', v_school_id;
  ELSE
    RAISE NOTICE 'Using existing school: %', v_school_id;
  END IF;

  -- ============================================
  -- PHASE 2: ACADEMIC YEAR
  -- ============================================
  
  INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
  VALUES (
    gen_random_uuid(),
    v_school_id,
    '2024-2025',
    '2024-08-01',
    '2025-05-31',
    true
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Academic year created/verified';

  -- ============================================
  -- PHASE 3: ACADEMIC TRACKS (Senior High)
  -- ============================================
  
  INSERT INTO academic_tracks (id, school_id, name, code, description)
  VALUES
    (gen_random_uuid(), v_school_id, 'Science, Technology, Engineering, and Mathematics', 'STEM', 
     'For students pursuing careers in science, engineering, mathematics, medicine, and technology'),
    (gen_random_uuid(), v_school_id, 'Accountancy, Business, and Management', 'ABM', 
     'For students interested in business, accounting, management, and entrepreneurship'),
    (gen_random_uuid(), v_school_id, 'Humanities and Social Sciences', 'HUMSS', 
     'For students pursuing social sciences, mass communication, education, and liberal arts'),
    (gen_random_uuid(), v_school_id, 'General Academic', 'GA', 
     'For students pursuing general academic track')
  ON CONFLICT (school_id, code) DO NOTHING;
  
  RAISE NOTICE 'Academic tracks created/verified';

  -- ============================================
  -- PHASE 4: GRADING PERIODS
  -- ============================================
  
  INSERT INTO grading_periods (id, school_id, name, period_type, period_number, academic_year, start_date, end_date, is_current, is_finalized)
  VALUES
    (gen_random_uuid(), v_school_id, 'First Quarter 2024-2025', 'quarter', 1, '2024-2025', '2024-08-26', '2024-10-25', false, true),
    (gen_random_uuid(), v_school_id, 'Second Quarter 2024-2025', 'quarter', 2, '2024-2025', '2024-10-28', '2024-12-20', false, true),
    (gen_random_uuid(), v_school_id, 'Third Quarter 2024-2025', 'quarter', 3, '2024-2025', '2025-01-06', '2025-03-28', true, false),
    (gen_random_uuid(), v_school_id, 'Fourth Quarter 2024-2025', 'quarter', 4, '2024-2025', '2025-03-31', '2025-05-30', false, false)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Grading periods created/verified';

  -- ============================================
  -- PHASE 5: LETTER GRADE SCALES
  -- ============================================
  
  INSERT INTO letter_grade_scales (
    id, school_id, letter,
    min_grade, max_grade, gpa_points,
    min_percentage, max_percentage, gpa_value,
    description
  )
  VALUES
    (gen_random_uuid(), v_school_id, 'A', 97, 100, 4.00, 97.00, 100.00, 4.00, 'Excellent'),
    (gen_random_uuid(), v_school_id, 'B+', 94, 96.99, 3.50, 94.00, 96.99, 3.50, 'Very Good'),
    (gen_random_uuid(), v_school_id, 'B', 90, 93.99, 3.00, 90.00, 93.99, 3.00, 'Good'),
    (gen_random_uuid(), v_school_id, 'C+', 87, 89.99, 2.50, 87.00, 89.99, 2.50, 'Satisfactory Plus'),
    (gen_random_uuid(), v_school_id, 'C', 83, 86.99, 2.00, 83.00, 86.99, 2.00, 'Satisfactory'),
    (gen_random_uuid(), v_school_id, 'D', 75, 82.99, 1.00, 75.00, 82.99, 1.00, 'Passing'),
    (gen_random_uuid(), v_school_id, 'F', 0, 74.99, 0.00, 0.00, 74.99, 0.00, 'Failing')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Letter grade scales created/verified';

  -- ============================================
  -- PHASE 6: SECTIONS
  -- ============================================
  
  -- Grade 7 Sections
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 7 - Section A', '7', 40),
    (gen_random_uuid(), v_school_id, 'Grade 7 - Section B', '7', 40),
    (gen_random_uuid(), v_school_id, 'Grade 7 - Section C', '7', 40)
  ON CONFLICT DO NOTHING;

  -- Grade 8 Sections
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 8 - Section A', '8', 40),
    (gen_random_uuid(), v_school_id, 'Grade 8 - Section B', '8', 40),
    (gen_random_uuid(), v_school_id, 'Grade 8 - Section C', '8', 40)
  ON CONFLICT DO NOTHING;

  -- Grade 9 Sections
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 9 - Section A', '9', 40),
    (gen_random_uuid(), v_school_id, 'Grade 9 - Section B', '9', 40),
    (gen_random_uuid(), v_school_id, 'Grade 9 - Section C', '9', 40)
  ON CONFLICT DO NOTHING;

  -- Grade 10 Sections (Junior High)
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section A', '10', 40),
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section B', '10', 40),
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section C', '10', 40)
  ON CONFLICT DO NOTHING;

  -- Grade 11 Sections (Senior High by Track)
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 11 - STEM A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - STEM B', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - ABM A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - ABM B', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - HUMSS A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - HUMSS B', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - GA A', '11', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 12 Sections
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 12 - STEM A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - STEM B', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - ABM A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - ABM B', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - HUMSS A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - HUMSS B', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - GA A', '12', 35)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Sections created/verified';

  -- ============================================
  -- PHASE 7: COMPLETE COURSE CATALOG (72+ courses)
  -- ============================================
  
  -- Get section IDs
    SELECT id INTO v_section_10a FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section A' LIMIT 1;
    SELECT id INTO v_section_10b FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section B' LIMIT 1;
    SELECT id INTO v_section_10c FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section C' LIMIT 1;
    SELECT id INTO v_section_11_stem FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - STEM A' LIMIT 1;
    SELECT id INTO v_section_11_abm FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - ABM A' LIMIT 1;
    SELECT id INTO v_section_11_humss FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - HUMSS A' LIMIT 1;
    SELECT id INTO v_section_12_stem FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - STEM A' LIMIT 1;
    SELECT id INTO v_section_12_abm FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - ABM A' LIMIT 1;
    SELECT id INTO v_section_12_humss FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - HUMSS A' LIMIT 1;

    -- GRADE 10 COURSES (8 courses × 3 sections = 24 courses)
    
    -- Section A
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      (gen_random_uuid(), v_school_id, v_section_10a, 'Mathematics 10', 'MATH1001-A', 'Pattern Recognition, Algebra, Sequences, Series'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'Science 10 (Earth Science)', 'SCI1001-A', 'Earth Science, Astronomy, Geology'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'English 10', 'ENG1001-A', 'Literature, Composition, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'Filipino 10', 'FIL1001-A', 'Panitikan, Gramatika, Pagsulat'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'Araling Panlipunan 10', 'AP1001-A', 'Philippine History, Economics, Government'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-A', 'Values Education, Ethics, Character Development'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'MAPEH 10', 'MAPEH1001-A', 'Music, Arts, Physical Education, Health'),
      (gen_random_uuid(), v_school_id, v_section_10a, 'TLE-ICT 10', 'TLE1001-A', 'Technology and Livelihood Education - Information and Communications Technology')
    ON CONFLICT DO NOTHING;

    -- Section B
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      (gen_random_uuid(), v_school_id, v_section_10b, 'Mathematics 10', 'MATH1001-B', 'Pattern Recognition, Algebra, Sequences, Series'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'Science 10 (Earth Science)', 'SCI1001-B', 'Earth Science, Astronomy, Geology'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'English 10', 'ENG1001-B', 'Literature, Composition, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'Filipino 10', 'FIL1001-B', 'Panitikan, Gramatika, Pagsulat'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'Araling Panlipunan 10', 'AP1001-B', 'Philippine History, Economics, Government'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-B', 'Values Education, Ethics, Character Development'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'MAPEH 10', 'MAPEH1001-B', 'Music, Arts, Physical Education, Health'),
      (gen_random_uuid(), v_school_id, v_section_10b, 'TLE-ICT 10', 'TLE1001-B', 'Technology and Livelihood Education - Information and Communications Technology')
    ON CONFLICT DO NOTHING;

    -- Section C
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      (gen_random_uuid(), v_school_id, v_section_10c, 'Mathematics 10', 'MATH1001-C', 'Pattern Recognition, Algebra, Sequences, Series'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'Science 10 (Earth Science)', 'SCI1001-C', 'Earth Science, Astronomy, Geology'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'English 10', 'ENG1001-C', 'Literature, Composition, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'Filipino 10', 'FIL1001-C', 'Panitikan, Gramatika, Pagsulat'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'Araling Panlipunan 10', 'AP1001-C', 'Philippine History, Economics, Government'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-C', 'Values Education, Ethics, Character Development'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'MAPEH 10', 'MAPEH1001-C', 'Music, Arts, Physical Education, Health'),
      (gen_random_uuid(), v_school_id, v_section_10c, 'TLE-ICT 10', 'TLE1001-C', 'Technology and Livelihood Education - Information and Communications Technology')
    ON CONFLICT DO NOTHING;

    -- GRADE 11 STEM TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Mathematics', 'MATH1101-STEM', 'Business Math, Consumer Math, Functions'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Earth and Life Science', 'SCI1101-STEM', 'Biology, Geology, Earth Systems'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Reading and Writing', 'ENG1101-STEM', 'Academic Writing, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Komunikasyon at Pananaliksik', 'FIL1101-STEM', 'Research in Filipino, Communication'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Understanding Culture, Society & Politics', 'AP1101-STEM', 'Sociology, Anthropology, Political Science'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Physical Education & Health 11', 'PE1101-STEM', 'Fitness, Sports, Health Education'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Practical Research 1', 'RESEARCH1101-STEM', 'Introduction to Research Methods'),
      -- STEM specialized
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'Pre-Calculus', 'STEM1101-PRECAL', 'Trigonometry, Conic Sections, Sequences'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Physics 1', 'STEM1102-PHYS1', 'Mechanics, Waves, Thermodynamics'),
      (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Chemistry 1', 'STEM1103-CHEM1', 'Atomic Structure, Chemical Bonding, Stoichiometry')
    ON CONFLICT DO NOTHING;

    -- GRADE 11 ABM TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'General Mathematics', 'MATH1101-ABM', 'Business Math, Consumer Math, Functions'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Earth and Life Science', 'SCI1101-ABM', 'Biology, Geology, Earth Systems'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Reading and Writing', 'ENG1101-ABM', 'Academic Writing, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Komunikasyon at Pananaliksik', 'FIL1101-ABM', 'Research in Filipino, Communication'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Understanding Culture, Society & Politics', 'AP1101-ABM', 'Sociology, Anthropology, Political Science'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Physical Education & Health 11', 'PE1101-ABM', 'Fitness, Sports, Health Education'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Practical Research 1', 'RESEARCH1101-ABM', 'Introduction to Research Methods'),
      -- ABM specialized
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Business Mathematics', 'ABM1101-BUSMATH', 'Business Calculations, Financial Mathematics'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Applied Economics', 'ABM1102-ECON', 'Microeconomics, Macroeconomics, Market Analysis'),
      (gen_random_uuid(), v_school_id, v_section_11_abm, 'Organization and Management', 'ABM1103-ORGMGT', 'Business Organization, Management Principles')
    ON CONFLICT DO NOTHING;

    -- GRADE 11 HUMSS TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'General Mathematics', 'MATH1101-HUMSS', 'Business Math, Consumer Math, Functions'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Earth and Life Science', 'SCI1101-HUMSS', 'Biology, Geology, Earth Systems'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Reading and Writing', 'ENG1101-HUMSS', 'Academic Writing, Critical Reading'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Komunikasyon at Pananaliksik', 'FIL1101-HUMSS', 'Research in Filipino, Communication'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Understanding Culture, Society & Politics', 'AP1101-HUMSS', 'Sociology, Anthropology, Political Science'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Physical Education & Health 11', 'PE1101-HUMSS', 'Fitness, Sports, Health Education'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Practical Research 1', 'RESEARCH1101-HUMSS', 'Introduction to Research Methods'),
      -- HUMSS specialized
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Creative Writing', 'HUMSS1101-CRWRT', 'Fiction, Poetry, Creative Nonfiction'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Introduction to World Religions', 'HUMSS1102-RELG', 'Comparative Religion, Religious Studies'),
      (gen_random_uuid(), v_school_id, v_section_11_humss, 'Disciplines and Ideas in Social Sciences', 'HUMSS1103-DISS', 'Anthropology, Sociology, Psychology')
    ON CONFLICT DO NOTHING;

    -- GRADE 12 STEM TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Statistics and Probability', 'MATH1201-STEM', 'Descriptive Statistics, Probability, Inferential Statistics'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Physical Science', 'SCI1201-STEM', 'Physics and Chemistry Integration'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, '21st Century Literature', 'ENG1201-STEM', 'Contemporary Literature, Literary Analysis'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Pagbasa at Pagsusuri', 'FIL1201-STEM', 'Critical Reading and Analysis in Filipino'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Contemporary Philippine Arts', 'ARTS1201-STEM', 'Modern Philippine Art Forms'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Physical Education & Health 12', 'PE1201-STEM', 'Advanced Fitness, Sports, Health'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Practical Research 2', 'RESEARCH1201-STEM', 'Quantitative Research Methods'),
      -- STEM specialized
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'Basic Calculus', 'STEM1201-CALC', 'Limits, Derivatives, Integration'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'General Biology 1', 'STEM1202-BIO1', 'Cell Biology, Genetics, Evolution'),
      (gen_random_uuid(), v_school_id, v_section_12_stem, 'General Physics 2', 'STEM1203-PHYS2', 'Electricity, Magnetism, Optics')
    ON CONFLICT DO NOTHING;

    -- GRADE 12 ABM TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Statistics and Probability', 'MATH1201-ABM', 'Descriptive Statistics, Probability, Inferential Statistics'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Physical Science', 'SCI1201-ABM', 'Physics and Chemistry Integration'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, '21st Century Literature', 'ENG1201-ABM', 'Contemporary Literature, Literary Analysis'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Pagbasa at Pagsusuri', 'FIL1201-ABM', 'Critical Reading and Analysis in Filipino'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Contemporary Philippine Arts', 'ARTS1201-ABM', 'Modern Philippine Art Forms'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Physical Education & Health 12', 'PE1201-ABM', 'Advanced Fitness, Sports, Health'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Practical Research 2', 'RESEARCH1201-ABM', 'Quantitative Research Methods'),
      -- ABM specialized
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Business Finance', 'ABM1201-BUSFIN', 'Financial Management, Investment Analysis'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Entrepreneurship', 'ABM1202-ENTREP', 'Business Planning, Startup Management'),
      (gen_random_uuid(), v_school_id, v_section_12_abm, 'Business Marketing', 'ABM1203-MKTG', 'Marketing Principles, Consumer Behavior')
    ON CONFLICT DO NOTHING;

    -- GRADE 12 HUMSS TRACK (10 courses)
    INSERT INTO courses (id, school_id, section_id, name, subject_code, description) VALUES
      -- Core subjects
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Statistics and Probability', 'MATH1201-HUMSS', 'Descriptive Statistics, Probability, Inferential Statistics'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Physical Science', 'SCI1201-HUMSS', 'Physics and Chemistry Integration'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, '21st Century Literature', 'ENG1201-HUMSS', 'Contemporary Literature, Literary Analysis'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Pagbasa at Pagsusuri', 'FIL1201-HUMSS', 'Critical Reading and Analysis in Filipino'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Contemporary Philippine Arts', 'ARTS1201-HUMSS', 'Modern Philippine Art Forms'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Physical Education & Health 12', 'PE1201-HUMSS', 'Advanced Fitness, Sports, Health'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Practical Research 2', 'RESEARCH1201-HUMSS', 'Qualitative Research Methods'),
      -- HUMSS specialized
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Community Engagement, Solidarity, and Citizenship', 'HUMSS1201-COMSOL', 'Community Development, Social Action'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Philippine Politics and Governance', 'HUMSS1202-POLSCI', 'Political Systems, Governance, Public Administration'),
      (gen_random_uuid(), v_school_id, v_section_12_humss, 'Trends, Networks, and Critical Thinking', 'HUMSS1203-TRENDS', 'Social Trends, Network Analysis, Critical Thinking')
    ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Courses created/verified';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETE FOUNDATION SETUP FINISHED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '- 1 Academic Year (2024-2025)';
  RAISE NOTICE '- 4 Academic Tracks (STEM, ABM, HUMSS, GA)';
  RAISE NOTICE '- 4 Grading Periods (Q1-Q4)';
  RAISE NOTICE '- 8 Letter Grade Scales (A to F)';
  RAISE NOTICE '- 25 Sections (Grades 7-12)';
  RAISE NOTICE '- 72 Courses (Complete curriculum)';
  RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verification queries
SELECT
  (SELECT COUNT(*) FROM academic_years) as academic_years,
  (SELECT COUNT(*) FROM academic_tracks) as academic_tracks,
  (SELECT COUNT(*) FROM grading_periods) as grading_periods,
  (SELECT COUNT(*) FROM letter_grade_scales) as letter_grades,
  (SELECT COUNT(*) FROM sections) as sections,
  (SELECT COUNT(*) FROM courses) as courses;
