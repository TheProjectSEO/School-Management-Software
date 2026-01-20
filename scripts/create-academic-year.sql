-- Create Academic Year
-- This creates the current academic year that enrollments reference

DO $$
DECLARE
  v_school_id UUID;
  v_academic_year_id UUID;
BEGIN
  -- Get the first school (or specify a specific school_id)
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No school found. Please create a school first.';
  END IF;

  RAISE NOTICE 'Using school_id: %', v_school_id;

  -- Create academic year for 2024-2025
  INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
  VALUES (
    gen_random_uuid(),
    v_school_id,
    '2024-2025',
    '2024-08-01',
    '2025-05-31',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_academic_year_id;

  IF v_academic_year_id IS NULL THEN
    -- Academic year already exists, get its ID
    SELECT id INTO v_academic_year_id 
    FROM academic_years 
    WHERE school_id = v_school_id 
    AND name = '2024-2025' 
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Academic year created/found: %', v_academic_year_id;
  RAISE NOTICE 'Run this to verify: SELECT * FROM academic_years WHERE school_id = ''%'';', v_school_id;

END $$;
