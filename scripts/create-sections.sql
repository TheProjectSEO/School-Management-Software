-- Create Sections for All Grade Levels
-- This script creates sections that are required for student enrollment
-- Run this AFTER creating a school but BEFORE approving applications

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- 1. A school must exist (get the school_id from schools table)
-- 2. Replace 'YOUR_SCHOOL_ID' with your actual school_id UUID

-- ============================================================================
-- SECTIONS SETUP
-- ============================================================================

-- Replace this with your actual school_id
-- You can find it by running: SELECT id, name FROM schools LIMIT 1;
DO $$
DECLARE
  v_school_id UUID;
BEGIN
  -- Get the first school (or specify a specific school_id)
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No school found. Please create a school first.';
  END IF;

  RAISE NOTICE 'Using school_id: %', v_school_id;

  -- ============================================================================
  -- JUNIOR HIGH SCHOOL SECTIONS (Grades 7-10)
  -- ============================================================================
  
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

  -- Grade 10 Sections
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section A', '10', 40),
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section B', '10', 40),
    (gen_random_uuid(), v_school_id, 'Grade 10 - Section C', '10', 40)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SENIOR HIGH SCHOOL SECTIONS (Grades 11-12, by Track)
  -- ============================================================================
  
  -- Grade 11 - STEM Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 11 - STEM A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - STEM B', '11', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 11 - ABM Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 11 - ABM A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - ABM B', '11', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 11 - HUMSS Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 11 - HUMSS A', '11', 35),
    (gen_random_uuid(), v_school_id, 'Grade 11 - HUMSS B', '11', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 11 - General Academic (if needed)
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 11 - GA A', '11', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 12 - STEM Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 12 - STEM A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - STEM B', '12', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 12 - ABM Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 12 - ABM A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - ABM B', '12', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 12 - HUMSS Track
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 12 - HUMSS A', '12', 35),
    (gen_random_uuid(), v_school_id, 'Grade 12 - HUMSS B', '12', 35)
  ON CONFLICT DO NOTHING;

  -- Grade 12 - General Academic (if needed)
  INSERT INTO sections (id, school_id, name, grade_level, capacity)
  VALUES
    (gen_random_uuid(), v_school_id, 'Grade 12 - GA A', '12', 35)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Sections created successfully!';
  RAISE NOTICE 'Run this query to verify: SELECT grade_level, COUNT(*) FROM sections WHERE school_id = ''%'' GROUP BY grade_level;', v_school_id;

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to see all created sections:
-- SELECT grade_level, name, capacity FROM sections ORDER BY grade_level, name;
