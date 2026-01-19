-- MSU Complete Foundation: School Setup, Sections, Tracks, Grading System
-- Migration: 20260119000010_msu_foundation.sql

-- ============================================================================
-- REFERENCE: MSU Main Campus School ID
-- ============================================================================

-- School already exists from seed data:
-- ID: '11111111-1111-1111-1111-111111111111'
-- Slug: 'msu-main'
-- Name: 'Mindanao State University - Main Campus'

DO $$
DECLARE
  msu_school_id UUID := '11111111-1111-1111-1111-111111111111';

  -- Academic Tracks
  track_stem_id UUID;
  track_abm_id UUID;
  track_humss_id UUID;

  -- Sections
  section_10a_id UUID;
  section_10b_id UUID;
  section_10c_id UUID;
  section_11_stem_id UUID;
  section_11_abm_id UUID;
  section_11_humss_id UUID;
  section_12_stem_id UUID;
  section_12_abm_id UUID;
  section_12_humss_id UUID;

  -- Grading Periods
  period_q1_id UUID;
  period_q2_id UUID;
  period_q3_id UUID;
  period_q4_id UUID;
BEGIN

  -- ============================================================================
  -- ACADEMIC TRACKS (Senior High School)
  -- ============================================================================

  INSERT INTO academic_tracks (id, school_id, name, code, description)
  VALUES
    (gen_random_uuid(), msu_school_id, 'Science, Technology, Engineering, and Mathematics', 'STEM',
     'For students pursuing careers in science, engineering, mathematics, medicine, and technology'),
    (gen_random_uuid(), msu_school_id, 'Accountancy, Business, and Management', 'ABM',
     'For students interested in business, accounting, management, and entrepreneurship'),
    (gen_random_uuid(), msu_school_id, 'Humanities and Social Sciences', 'HUMSS',
     'For students pursuing social sciences, mass communication, education, and liberal arts')
  ON CONFLICT (school_id, code) DO NOTHING
  RETURNING id INTO track_stem_id, track_abm_id, track_humss_id;

  -- Get track IDs if they already exist
  IF track_stem_id IS NULL THEN
    SELECT id INTO track_stem_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'STEM';
    SELECT id INTO track_abm_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'ABM';
    SELECT id INTO track_humss_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'HUMSS';
  END IF;

  -- ============================================================================
  -- SECTIONS
  -- ============================================================================

  -- Grade 10 Sections (no track, junior high)
  INSERT INTO sections (id, school_id, name, grade_level, max_students, track_id)
  VALUES
    (gen_random_uuid(), msu_school_id, 'Grade 10-A', '10', 40, NULL),
    (gen_random_uuid(), msu_school_id, 'Grade 10-B', '10', 40, NULL),
    (gen_random_uuid(), msu_school_id, 'Grade 10-C', '10', 40, NULL)
  ON CONFLICT DO NOTHING;

  -- Grade 11 Sections (with tracks)
  INSERT INTO sections (id, school_id, name, grade_level, max_students, track_id)
  VALUES
    (gen_random_uuid(), msu_school_id, 'Grade 11 - STEM A', '11', 35, track_stem_id),
    (gen_random_uuid(), msu_school_id, 'Grade 11 - ABM A', '11', 35, track_abm_id),
    (gen_random_uuid(), msu_school_id, 'Grade 11 - HUMSS A', '11', 35, track_humss_id)
  ON CONFLICT DO NOTHING;

  -- Grade 12 Sections (with tracks)
  INSERT INTO sections (id, school_id, name, grade_level, max_students, track_id)
  VALUES
    (gen_random_uuid(), msu_school_id, 'Grade 12 - STEM A', '12', 35, track_stem_id),
    (gen_random_uuid(), msu_school_id, 'Grade 12 - ABM A', '12', 35, track_abm_id),
    (gen_random_uuid(), msu_school_id, 'Grade 12 - HUMSS A', '12', 35, track_humss_id)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- GRADING PERIODS FOR 2024-2025 SCHOOL YEAR
  -- ============================================================================

  INSERT INTO grading_periods (id, school_id, name, start_date, end_date)
  VALUES
    (gen_random_uuid(), msu_school_id, 'First Quarter', '2024-08-05', '2024-10-18'),
    (gen_random_uuid(), msu_school_id, 'Second Quarter', '2024-10-21', '2024-12-20'),
    (gen_random_uuid(), msu_school_id, 'Third Quarter', '2025-01-06', '2025-03-28'),
    (gen_random_uuid(), msu_school_id, 'Fourth Quarter', '2025-04-07', '2025-06-13')
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- LETTER GRADE SCALE (A to F)
  -- ============================================================================

  -- Delete existing letter grades for MSU if any
  DELETE FROM letter_grade_scales WHERE school_id = msu_school_id;

  INSERT INTO letter_grade_scales (school_id, letter, min_percentage, max_percentage, gpa_value, description)
  VALUES
    (msu_school_id, 'A', 97.0, 100.0, 4.0, 'Excellent'),
    (msu_school_id, 'B+', 94.0, 96.99, 3.5, 'Very Good'),
    (msu_school_id, 'B', 90.0, 93.99, 3.0, 'Good'),
    (msu_school_id, 'C+', 87.0, 89.99, 2.5, 'Satisfactory Plus'),
    (msu_school_id, 'C', 83.0, 86.99, 2.0, 'Satisfactory'),
    (msu_school_id, 'D', 75.0, 82.99, 1.0, 'Passing'),
    (msu_school_id, 'F', 0.0, 74.99, 0.0, 'Failing');

  RAISE NOTICE 'MSU Foundation Setup Complete:';
  RAISE NOTICE '  - 3 Academic Tracks created (STEM, ABM, HUMSS)';
  RAISE NOTICE '  - 9 Sections created (3 for Grade 10, 3 for Grade 11, 3 for Grade 12)';
  RAISE NOTICE '  - 4 Grading Periods created for 2024-2025';
  RAISE NOTICE '  - 7 Letter Grades configured (A to F)';

END $$;
