-- Create Academic Tracks for Senior High School
-- Required for organizing Grade 11-12 sections and courses

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

  -- Create academic tracks (Philippine DepEd K-12)
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

  RAISE NOTICE 'Academic tracks created successfully!';
  RAISE NOTICE 'Run this to verify: SELECT * FROM academic_tracks WHERE school_id = ''%'';', v_school_id;

END $$;
