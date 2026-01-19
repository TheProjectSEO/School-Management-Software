-- ============================================
-- ADMIN SCRIPT: Assign Teacher to Courses
-- ============================================
-- Use this after creating a teacher
-- ============================================

-- OPTION 1: Assign to specific courses (manual)
-- ============================================

DO $$
DECLARE
  -- REPLACE THESE:
  p_teacher_id UUID := 'PASTE_TEACHER_ID_HERE';  -- From teacher_profiles table
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';

  -- List of course IDs to assign
  p_course_ids UUID[] := ARRAY[
    'COURSE_ID_1',
    'COURSE_ID_2',
    'COURSE_ID_3'
  ];

  v_course_id UUID;
  v_section_id UUID;
  v_assigned_count INT := 0;
BEGIN
  -- Assign teacher to each course
  FOREACH v_course_id IN ARRAY p_course_ids
  LOOP
    -- Get the section_id for this course
    SELECT section_id INTO v_section_id
    FROM courses
    WHERE id = v_course_id;

    -- Create assignment
    INSERT INTO teacher_assignments (
      id,
      teacher_profile_id,
      course_id,
      section_id,
      school_id
    )
    VALUES (
      gen_random_uuid(),
      p_teacher_id,
      v_course_id,
      v_section_id,
      p_school_id
    )
    ON CONFLICT DO NOTHING;  -- Prevent duplicates

    v_assigned_count := v_assigned_count + 1;
  END LOOP;

  RAISE NOTICE 'Assigned teacher to % courses', v_assigned_count;

  -- Reload schema
  PERFORM reload_postgrest_schema();

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error assigning teacher: %', SQLERRM;
END $$;


-- ============================================
-- OPTION 2: Assign to all courses in a section
-- ============================================

DO $$
DECLARE
  p_teacher_id UUID := 'PASTE_TEACHER_ID_HERE';
  p_section_id UUID := 'PASTE_SECTION_ID_HERE';
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';
  v_assigned_count INT;
BEGIN
  -- Assign teacher to ALL courses in a section
  INSERT INTO teacher_assignments (id, teacher_profile_id, course_id, section_id, school_id)
  SELECT
    gen_random_uuid(),
    p_teacher_id,
    c.id,
    c.section_id,
    c.school_id
  FROM courses c
  WHERE c.section_id = p_section_id
  AND c.school_id = p_school_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

  RAISE NOTICE 'Assigned teacher to % courses in section', v_assigned_count;
  PERFORM reload_postgrest_schema();

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error: %', SQLERRM;
END $$;


-- ============================================
-- OPTION 3: Assign to all Math courses
-- ============================================

DO $$
DECLARE
  p_teacher_id UUID := 'PASTE_TEACHER_ID_HERE';
  p_school_id UUID := '00000000-0000-0000-0000-000000000001';
  v_assigned_count INT;
BEGIN
  -- Assign teacher to all Math courses
  INSERT INTO teacher_assignments (id, teacher_profile_id, course_id, section_id, school_id)
  SELECT
    gen_random_uuid(),
    p_teacher_id,
    c.id,
    c.section_id,
    c.school_id
  FROM courses c
  WHERE c.subject_code LIKE 'MATH%'
  AND c.school_id = p_school_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

  RAISE NOTICE 'Assigned teacher to % Math courses', v_assigned_count;
  PERFORM reload_postgrest_schema();

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error: %', SQLERRM;
END $$;


-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check teacher's assignments
SELECT
  tp.employee_id,
  sp.full_name as teacher_name,
  c.name as course_name,
  c.subject_code,
  sec.name as section_name,
  COUNT(e.id) as enrolled_students,
  ta.created_at as assigned_at
FROM teacher_profiles tp
JOIN school_profiles sp ON sp.id = tp.profile_id
JOIN teacher_assignments ta ON ta.teacher_profile_id = tp.id
JOIN courses c ON c.id = ta.course_id
LEFT JOIN sections sec ON sec.id = c.section_id
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE tp.id = 'PASTE_TEACHER_ID_HERE'
GROUP BY tp.employee_id, sp.full_name, c.name, c.subject_code, sec.name, ta.created_at
ORDER BY c.name;
