-- ============================================================================
-- ENROLL ALL STUDENTS TO GRADE 12 STEM-A
-- This migration:
-- 1. Creates or finds the STEM-A section for Grade 12
-- 2. Assigns all students to this section
-- ============================================================================

-- First, let's check what schools exist and use the first one
DO $$
DECLARE
  v_school_id UUID;
  v_section_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Get the first school
  SELECT id INTO v_school_id FROM schools LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No schools found in the database';
  END IF;

  -- Check if STEM-A section exists for Grade 12
  SELECT id INTO v_section_id
  FROM sections
  WHERE school_id = v_school_id
    AND grade_level = '12'
    AND name ILIKE '%STEM%A%'
  LIMIT 1;

  -- If not found, try to find any Grade 12 section with STEM
  IF v_section_id IS NULL THEN
    SELECT id INTO v_section_id
    FROM sections
    WHERE school_id = v_school_id
      AND grade_level = '12'
      AND name ILIKE '%STEM%'
    LIMIT 1;
  END IF;

  -- If still not found, create the section
  IF v_section_id IS NULL THEN
    INSERT INTO sections (school_id, name, grade_level, capacity, is_active)
    VALUES (v_school_id, 'STEM-A', '12', 50, true)
    RETURNING id INTO v_section_id;

    RAISE NOTICE 'Created new section STEM-A with ID: %', v_section_id;
  ELSE
    RAISE NOTICE 'Using existing section with ID: %', v_section_id;
  END IF;

  -- Update all students to be in this section and set grade level to 12
  UPDATE students
  SET
    section_id = v_section_id,
    grade_level = '12',
    status = 'active'
  WHERE school_id = v_school_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Updated % students to Grade 12 STEM-A', v_updated_count;

END $$;

-- Show the results
SELECT
  s.name as section_name,
  s.grade_level,
  COUNT(st.id) as student_count
FROM sections s
LEFT JOIN students st ON st.section_id = s.id
WHERE s.grade_level = '12'
GROUP BY s.id, s.name, s.grade_level
ORDER BY s.name;

-- Show sample of enrolled students
SELECT
  sp.full_name,
  st.grade_level,
  sec.name as section_name,
  st.status
FROM students st
JOIN school_profiles sp ON sp.id = st.profile_id
JOIN sections sec ON sec.id = st.section_id
WHERE st.grade_level = '12'
ORDER BY sp.full_name
LIMIT 10;

-- ============================================================================
-- ASSIGN TEACHERS TO STEM-A SECTION
-- This ensures teachers can send announcements to the section
-- ============================================================================

DO $$
DECLARE
  v_school_id UUID;
  v_section_id UUID;
  v_teacher_id UUID;
  v_course_id UUID;
BEGIN
  -- Get the first school
  SELECT id INTO v_school_id FROM schools LIMIT 1;

  -- Get the STEM-A section
  SELECT id INTO v_section_id
  FROM sections
  WHERE school_id = v_school_id
    AND grade_level = '12'
    AND (name ILIKE '%STEM%A%' OR name ILIKE 'STEM-A')
  LIMIT 1;

  IF v_section_id IS NULL THEN
    RAISE NOTICE 'No STEM-A section found, skipping teacher assignment';
    RETURN;
  END IF;

  -- Get a course for this section (or create one)
  SELECT id INTO v_course_id
  FROM courses
  WHERE school_id = v_school_id
  LIMIT 1;

  IF v_course_id IS NULL THEN
    INSERT INTO courses (school_id, name, subject_code, description, grade_level, is_active)
    VALUES (v_school_id, 'General STEM', 'STEM101', 'General STEM Course', '12', true)
    RETURNING id INTO v_course_id;
    RAISE NOTICE 'Created course with ID: %', v_course_id;
  END IF;

  -- Assign all teachers to this section
  FOR v_teacher_id IN
    SELECT tp.id
    FROM teacher_profiles tp
    WHERE tp.school_id = v_school_id
  LOOP
    -- Check if assignment already exists
    IF NOT EXISTS (
      SELECT 1 FROM teacher_assignments
      WHERE teacher_profile_id = v_teacher_id
        AND section_id = v_section_id
    ) THEN
      INSERT INTO teacher_assignments (teacher_profile_id, section_id, course_id, school_id, is_active)
      VALUES (v_teacher_id, v_section_id, v_course_id, v_school_id, true)
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'Assigned teacher % to section %', v_teacher_id, v_section_id;
    END IF;
  END LOOP;

END $$;

-- Show teacher assignments
SELECT
  sp.full_name as teacher_name,
  sec.name as section_name,
  c.name as course_name
FROM teacher_assignments ta
JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
JOIN school_profiles sp ON sp.id = tp.profile_id
JOIN sections sec ON sec.id = ta.section_id
LEFT JOIN courses c ON c.id = ta.course_id
WHERE sec.grade_level = '12'
ORDER BY sp.full_name;
