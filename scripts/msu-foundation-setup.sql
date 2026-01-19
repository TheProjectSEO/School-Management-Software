-- ============================================
-- MSU FOUNDATION SETUP SCRIPT
-- ============================================
-- Run this ONCE before adding any students or teachers
-- Creates complete school structure, course catalog, and settings
-- ============================================

-- WARNING: This will create a LOT of data
-- Estimated: 9 sections + 72 courses + grading periods + scales
-- Run time: ~5 seconds

BEGIN;

-- ============================================
-- PHASE 1: SCHOOL & BASIC SETTINGS
-- ============================================

-- Create or use existing MSU Main Campus
INSERT INTO schools (id, name, slug, region, division, accent_color)
VALUES (
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
  'Mindanao State University - Main Campus',
  'msu-main',
  'Region X',
  'Marawi City',
  '#8B0000'  -- MSU Maroon
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  region = EXCLUDED.region,
  division = EXCLUDED.division;

-- ============================================
-- PHASE 2: ACADEMIC CALENDAR
-- ============================================

-- Create grading periods for 2024-2025
INSERT INTO grading_periods (id, school_id, name, period_type, period_number, academic_year, start_date, end_date, is_current, is_finalized)
VALUES
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'First Quarter 2024-2025', 'quarter', 1, '2024-2025', '2024-08-26', '2024-10-25', false, true),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Second Quarter 2024-2025', 'quarter', 2, '2024-2025', '2024-10-28', '2024-12-20', false, true),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Third Quarter 2024-2025', 'quarter', 3, '2024-2025', '2025-01-06', '2025-03-28', true, false),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Fourth Quarter 2024-2025', 'quarter', 4, '2024-2025', '2025-03-31', '2025-05-30', false, false)
ON CONFLICT DO NOTHING;

-- Create letter grade scale (Philippine system)
INSERT INTO letter_grade_scales (id, school_id, letter, min_grade, max_grade, gpa_points)
VALUES
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'A', 97, 100, 1.00),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'B+', 94, 96, 1.25),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'B', 91, 93, 1.50),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'C+', 88, 90, 1.75),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'C', 85, 87, 2.00),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'D', 80, 84, 2.25),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'E', 75, 79, 2.50),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'F', 0, 74, 5.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- PHASE 3: SECTIONS (Class Organization)
-- ============================================

-- Grade 10 Sections (Junior High)
INSERT INTO sections (id, school_id, name, grade_level, capacity)
VALUES
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Section A', '10', 40),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Section B', '10', 40),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 10 - Section C', '10', 40)
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Grade 11 Sections (Senior High by Track)
INSERT INTO sections (id, school_id, name, grade_level, capacity)
VALUES
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - STEM A', '11', 35),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - ABM A', '11', 35),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 11 - HUMSS A', '11', 35)
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Grade 12 Sections
INSERT INTO sections (id, school_id, name, grade_level, capacity)
VALUES
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - STEM A', '12', 35),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - ABM A', '12', 35),
  (gen_random_uuid(), '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd', 'Grade 12 - HUMSS A', '12', 35)
ON CONFLICT DO NOTHING
RETURNING id, name;

-- ============================================
-- PHASE 4: COMPLETE COURSE CATALOG
-- ============================================
-- Based on Philippine DepEd K-12 Curriculum

-- Store section IDs (you'll need to get these after INSERT above)
DO $$
DECLARE
  v_school_id UUID := '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
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

  -- Get or create section IDs
  SELECT id INTO v_section_10a FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section A' LIMIT 1;
  SELECT id INTO v_section_10b FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section B' LIMIT 1;
  SELECT id INTO v_section_10c FROM sections WHERE school_id = v_school_id AND name = 'Grade 10 - Section C' LIMIT 1;
  SELECT id INTO v_section_11_stem FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - STEM A' LIMIT 1;
  SELECT id INTO v_section_11_abm FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - ABM A' LIMIT 1;
  SELECT id INTO v_section_11_humss FROM sections WHERE school_id = v_school_id AND name = 'Grade 11 - HUMSS A' LIMIT 1;
  SELECT id INTO v_section_12_stem FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - STEM A' LIMIT 1;
  SELECT id INTO v_section_12_abm FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - ABM A' LIMIT 1;
  SELECT id INTO v_section_12_humss FROM sections WHERE school_id = v_school_id AND name = 'Grade 12 - HUMSS A' LIMIT 1;

  -- ========================================
  -- GRADE 10 COURSES (All Sections - 24 courses total)
  -- ========================================

  -- Section A
  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    (gen_random_uuid(), v_school_id, v_section_10a, 'Mathematics 10', 'MATH1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'Science 10 (Earth Science)', 'SCI1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'English 10', 'ENG1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'Filipino 10', 'FIL1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'Araling Panlipunan 10', 'AP1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'MAPEH 10', 'MAPEH1001-A'),
    (gen_random_uuid(), v_school_id, v_section_10a, 'TLE-ICT 10', 'TLE1001-A')
  ON CONFLICT DO NOTHING;

  -- Section B
  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    (gen_random_uuid(), v_school_id, v_section_10b, 'Mathematics 10', 'MATH1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'Science 10 (Earth Science)', 'SCI1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'English 10', 'ENG1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'Filipino 10', 'FIL1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'Araling Panlipunan 10', 'AP1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'MAPEH 10', 'MAPEH1001-B'),
    (gen_random_uuid(), v_school_id, v_section_10b, 'TLE-ICT 10', 'TLE1001-B')
  ON CONFLICT DO NOTHING;

  -- Section C
  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    (gen_random_uuid(), v_school_id, v_section_10c, 'Mathematics 10', 'MATH1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'Science 10 (Earth Science)', 'SCI1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'English 10', 'ENG1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'Filipino 10', 'FIL1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'Araling Panlipunan 10', 'AP1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'Edukasyon sa Pagpapakatao 10', 'ESP1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'MAPEH 10', 'MAPEH1001-C'),
    (gen_random_uuid(), v_school_id, v_section_10c, 'TLE-ICT 10', 'TLE1001-C')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 11 STEM TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Mathematics', 'MATH1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Earth and Life Science', 'SCI1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Reading and Writing', 'ENG1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Komunikasyon at Pananaliksik', 'FIL1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Understanding Culture, Society & Politics', 'AP1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Physical Education & Health 11', 'PE1101-STEM'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Practical Research 1', 'RESEARCH1101-STEM'),
    -- STEM specialized
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'Pre-Calculus', 'STEM1101-PRECAL'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Physics 1', 'STEM1102-PHYS1'),
    (gen_random_uuid(), v_school_id, v_section_11_stem, 'General Chemistry 1', 'STEM1103-CHEM1')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 11 ABM TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'General Mathematics', 'MATH1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Earth and Life Science', 'SCI1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Reading and Writing', 'ENG1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Komunikasyon at Pananaliksik', 'FIL1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Understanding Culture, Society & Politics', 'AP1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Physical Education & Health 11', 'PE1101-ABM'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Practical Research 1', 'RESEARCH1101-ABM'),
    -- ABM specialized
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Business Mathematics', 'ABM1101-BUSMATH'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Applied Economics', 'ABM1102-ECON'),
    (gen_random_uuid(), v_school_id, v_section_11_abm, 'Organization and Management', 'ABM1103-ORGMGT')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 11 HUMSS TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'General Mathematics', 'MATH1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Earth and Life Science', 'SCI1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Reading and Writing', 'ENG1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Komunikasyon at Pananaliksik', 'FIL1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Understanding Culture, Society & Politics', 'AP1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Physical Education & Health 11', 'PE1101-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Practical Research 1', 'RESEARCH1101-HUMSS'),
    -- HUMSS specialized
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Creative Writing', 'HUMSS1101-CRWRT'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Introduction to World Religions', 'HUMSS1102-RELG'),
    (gen_random_uuid(), v_school_id, v_section_11_humss, 'Disciplines and Ideas in Social Sciences', 'HUMSS1103-DISS')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 12 STEM TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Statistics and Probability', 'MATH1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Physical Science', 'SCI1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, '21st Century Literature', 'ENG1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Pagbasa at Pagsusuri', 'FIL1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Contemporary Philippine Arts', 'ARTS1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Physical Education & Health 12', 'PE1201-STEM'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Practical Research 2', 'RESEARCH1201-STEM'),
    -- STEM specialized
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'Basic Calculus', 'STEM1201-CALC'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'General Biology 1', 'STEM1202-BIO1'),
    (gen_random_uuid(), v_school_id, v_section_12_stem, 'General Physics 2', 'STEM1203-PHYS2')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 12 ABM TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Statistics and Probability', 'MATH1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Physical Science', 'SCI1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, '21st Century Literature', 'ENG1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Pagbasa at Pagsusuri', 'FIL1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Contemporary Philippine Arts', 'ARTS1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Physical Education & Health 12', 'PE1201-ABM'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Practical Research 2', 'RESEARCH1201-ABM'),
    -- ABM specialized
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Business Finance', 'ABM1201-BUSFIN'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Entrepreneurship', 'ABM1202-ENTREP'),
    (gen_random_uuid(), v_school_id, v_section_12_abm, 'Business Marketing', 'ABM1203-MKTG')
  ON CONFLICT DO NOTHING;

  -- ========================================
  -- GRADE 12 HUMSS TRACK (10 courses)
  -- ========================================

  INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
    -- Core subjects
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Statistics and Probability', 'MATH1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Physical Science', 'SCI1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, '21st Century Literature', 'ENG1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Pagbasa at Pagsusuri', 'FIL1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Contemporary Philippine Arts', 'ARTS1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Physical Education & Health 12', 'PE1201-HUMSS'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Practical Research 2', 'RESEARCH1201-HUMSS'),
    -- HUMSS specialized
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Community Engagement, Solidarity, and Citizenship', 'HUMSS1201-COMSOL'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Philippine Politics and Governance', 'HUMSS1202-POLSCI'),
    (gen_random_uuid(), v_school_id, v_section_12_humss, 'Trends, Networks, and Critical Thinking', 'HUMSS1203-TRENDS')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MSU FOUNDATION SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '- 1 School: MSU Main Campus';
  RAISE NOTICE '- 9 Sections (Grade 10: 3, Grade 11: 3, Grade 12: 3)';
  RAISE NOTICE '- 72 Courses (8 per Grade 10 section, 10 per Grade 11/12 section)';
  RAISE NOTICE '- 4 Grading Periods (Q1-Q4 2024-2025)';
  RAISE NOTICE '- 8 Letter Grades (A to F with GPA points)';
  RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Reload schema cache
SELECT reload_postgrest_schema();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  (SELECT COUNT(*) FROM sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as sections_created,
  (SELECT COUNT(*) FROM courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as courses_created,
  (SELECT COUNT(*) FROM grading_periods WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as grading_periods,
  (SELECT COUNT(*) FROM letter_grade_scales WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd') as letter_grades;

-- Show course catalog by grade
SELECT
  sec.grade_level,
  sec.name as section,
  COUNT(c.id) as courses
FROM sections sec
LEFT JOIN courses c ON c.section_id = sec.id
WHERE sec.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY sec.grade_level, sec.name
ORDER BY sec.grade_level, sec.name;

-- ============================================
-- NEXT STEPS
-- ============================================
-- Now you can:
-- 1. Add teachers → scripts/admin-add-teacher.sql
-- 2. Assign teachers to courses → scripts/admin-assign-teacher.sql
-- 3. Add students → scripts/admin-add-student.sql
-- 4. Students auto-enroll in all section courses
-- ============================================
