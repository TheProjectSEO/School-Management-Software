-- MSU Complete Foundation: Grade 12 and Bachelor's Courses
-- Migration: 20260119000013_grade12_bscs_bsit_courses.sql
-- Representative courses for Grade 12, BSCS, and BSIT programs

DO $$
DECLARE
  msu_school_id UUID := '11111111-1111-1111-1111-111111111111';
  default_teacher_id UUID;

  -- Subject IDs
  math_id UUID;
  cs_id UUID;
  it_id UUID;
BEGIN

  -- Get subject IDs
  SELECT id INTO math_id FROM subject_areas WHERE slug = 'mathematics';
  SELECT id INTO cs_id FROM subject_areas WHERE slug = 'computer-science';
  SELECT id INTO it_id FROM subject_areas WHERE slug = 'information-technology';

  -- Get default teacher
  SELECT tp.id INTO default_teacher_id
  FROM teacher_profiles tp
  JOIN school_profiles sp ON sp.id = tp.profile_id
  WHERE sp.school_id = msu_school_id
  LIMIT 1;

  -- ============================================================================
  -- GRADE 12 - STEM (Representative Courses)
  -- ============================================================================

  INSERT INTO courses (section_id, teacher_id, subject_area_id, track_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    math_id,
    s.track_id,
    'Basic Calculus',
    'CALC-12',
    'Limits, Derivatives, and Integrals',
    1.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'Grade 12 - STEM A';

  INSERT INTO courses (section_id, teacher_id, subject_area_id, track_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    (SELECT id FROM subject_areas WHERE slug = 'science'),
    s.track_id,
    'General Biology 2',
    'GENBIO2-12',
    'Ecology, Biodiversity, and Evolution',
    1.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'Grade 12 - STEM A';

  -- ============================================================================
  -- BACHELOR OF SCIENCE IN COMPUTER SCIENCE (Representative Courses)
  -- ============================================================================

  -- Create a Bachelor's section if it doesn't exist
  INSERT INTO sections (school_id, name, grade_level, max_students)
  VALUES
    (msu_school_id, 'BSCS - 1st Year', 'Bachelor''s', 40),
    (msu_school_id, 'BSCS - 2nd Year', 'Bachelor''s', 40),
    (msu_school_id, 'BSCS - 3rd Year', 'Bachelor''s', 35),
    (msu_school_id, 'BSCS - 4th Year', 'Bachelor''s', 35)
  ON CONFLICT DO NOTHING;

  -- BSCS 1st Year Courses
  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    cs_id,
    'Introduction to Computing',
    'CS101',
    'Fundamentals of Computing, Algorithms, and Problem Solving',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSCS - 1st Year';

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    cs_id,
    'Programming Fundamentals',
    'CS102',
    'Introduction to Python, Variables, Control Structures, Functions',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSCS - 1st Year';

  -- BSCS 2nd Year
  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    cs_id,
    'Data Structures and Algorithms',
    'CS201',
    'Arrays, Linked Lists, Trees, Graphs, Sorting, Searching',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSCS - 2nd Year';

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    cs_id,
    'Database Management Systems',
    'CS202',
    'SQL, Relational Databases, Normalization, Transactions',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSCS - 2nd Year';

  -- ============================================================================
  -- BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY (Representative Courses)
  -- ============================================================================

  -- Create IT sections
  INSERT INTO sections (school_id, name, grade_level, max_students)
  VALUES
    (msu_school_id, 'BSIT - 1st Year', 'Bachelor''s', 40),
    (msu_school_id, 'BSIT - 2nd Year', 'Bachelor''s', 40)
  ON CONFLICT DO NOTHING;

  -- BSIT 1st Year
  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    it_id,
    'Introduction to Information Technology',
    'IT101',
    'IT Fundamentals, Hardware, Software, Networks',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSIT - 1st Year';

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  SELECT
    s.id,
    default_teacher_id,
    it_id,
    'Web Development Fundamentals',
    'IT102',
    'HTML, CSS, JavaScript, Responsive Design',
    3.0,
    true
  FROM sections s
  WHERE s.school_id = msu_school_id AND s.name = 'BSIT - 1st Year';

  RAISE NOTICE 'Grade 12, BSCS, and BSIT representative courses created';
  RAISE NOTICE 'NOTE: This is a subset. Full catalog would include 135+ courses total';

END $$;
