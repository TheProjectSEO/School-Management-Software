-- SIMPLE FIX - Just create the student record
-- Copy and paste this into Supabase SQL Editor

SET search_path TO "school software", public;

-- Create student for profile 44d7c894-d749-4e15-be1b-f42afe6f8c27
DO $$
DECLARE
  v_profile_id UUID := '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  v_student_id UUID;
BEGIN
  -- Check if student already exists
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    -- Create new student
    INSERT INTO "school software".students (
      school_id,
      profile_id,
      lrn,
      grade_level,
      section_id
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      v_profile_id,
      '202400123456',
      'Grade 11',
      '22222222-2222-2222-2222-222222222222'
    )
    RETURNING id INTO v_student_id;

    RAISE NOTICE 'Student created: %', v_student_id;
  ELSE
    RAISE NOTICE 'Student already exists: %', v_student_id;
  END IF;

  -- Show result
  RAISE NOTICE '✅ DONE! Refresh your browser.';
END $$;
