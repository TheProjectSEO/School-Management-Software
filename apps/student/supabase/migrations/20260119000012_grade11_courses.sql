-- MSU Complete Foundation: Grade 11 Courses (STEM, ABM, HUMSS)
-- Migration: 20260119000012_grade11_courses.sql
-- Creates representative Grade 11 courses for each track

DO $$
DECLARE
  msu_school_id UUID := '11111111-1111-1111-1111-111111111111';
  section_11_stem_id UUID;
  section_11_abm_id UUID;
  section_11_humss_id UUID;
  track_stem_id UUID;
  track_abm_id UUID;
  track_humss_id UUID;
  default_teacher_id UUID;

  -- Subject IDs
  math_id UUID;
  science_id UUID;
  english_id UUID;
  business_id UUID;
  humanities_id UUID;
BEGIN

  -- Get tracks
  SELECT id INTO track_stem_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'STEM';
  SELECT id INTO track_abm_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'ABM';
  SELECT id INTO track_humss_id FROM academic_tracks WHERE school_id = msu_school_id AND code = 'HUMSS';

  -- Get sections
  SELECT id INTO section_11_stem_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 11 - STEM A';
  SELECT id INTO section_11_abm_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 11 - ABM A';
  SELECT id INTO section_11_humss_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 11 - HUMSS A';

  -- Get subject IDs
  SELECT id INTO math_id FROM subject_areas WHERE slug = 'mathematics';
  SELECT id INTO science_id FROM subject_areas WHERE slug = 'science';
  SELECT id INTO english_id FROM subject_areas WHERE slug = 'english';
  SELECT id INTO business_id FROM subject_areas WHERE slug = 'business-management';
  SELECT id INTO humanities_id FROM subject_areas WHERE slug = 'humanities';

  -- Get default teacher
  SELECT tp.id INTO default_teacher_id
  FROM teacher_profiles tp
  JOIN school_profiles sp ON sp.id = tp.profile_id
  WHERE sp.school_id = msu_school_id
  LIMIT 1;

  -- STEM Track Courses
  INSERT INTO courses (section_id, teacher_id, subject_area_id, track_id, name, code, description, credits, is_core_subject)
  VALUES
    (section_11_stem_id, default_teacher_id, math_id, track_stem_id,
     'Pre-Calculus', 'PRECALC-11',
     'Functions, Trigonometry, Analytic Geometry, and Limits',
     1.0, true),
    (section_11_stem_id, default_teacher_id, science_id, track_stem_id,
     'General Biology 1', 'GENBIO1-11',
     'Cell Biology, Genetics, and Evolution',
     1.0, true),
    (section_11_stem_id, default_teacher_id, science_id, track_stem_id,
     'General Chemistry 1', 'GENCHEM1-11',
     'Matter, Chemical Bonding, and Stoichiometry',
     1.0, true),
    (section_11_stem_id, default_teacher_id, science_id, track_stem_id,
     'General Physics 1', 'GENPHYS1-11',
     'Mechanics, Thermodynamics, and Waves',
     1.0, true),
    (section_11_stem_id, default_teacher_id, english_id, track_stem_id,
     'Oral Communication', 'ORALCOM-11',
     'Public Speaking and Communication Skills',
     1.0, true);

  -- ABM Track Courses
  INSERT INTO courses (section_id, teacher_id, subject_area_id, track_id, name, code, description, credits, is_core_subject)
  VALUES
    (section_11_abm_id, default_teacher_id, business_id, track_abm_id,
     'Fundamentals of Accountancy 1', 'FUNDACC1-11',
     'Introduction to Accounting Principles',
     1.0, true),
    (section_11_abm_id, default_teacher_id, business_id, track_abm_id,
     'Business Finance', 'BUSFIN-11',
     'Financial Management and Investment',
     1.0, true),
    (section_11_abm_id, default_teacher_id, business_id, track_abm_id,
     'Organization and Management', 'ORGMAN-11',
     'Business Organizations and Management Principles',
     1.0, true),
    (section_11_abm_id, default_teacher_id, english_id, track_abm_id,
     'Oral Communication', 'ORALCOM-11',
     'Public Speaking and Communication Skills',
     1.0, true);

  -- HUMSS Track Courses
  INSERT INTO courses (section_id, teacher_id, subject_area_id, track_id, name, code, description, credits, is_core_subject)
  VALUES
    (section_11_humss_id, default_teacher_id, humanities_id, track_humss_id,
     'Introduction to Philosophy', 'PHILOS-11',
     'Logic, Ethics, and Metaphysics',
     1.0, true),
    (section_11_humss_id, default_teacher_id, humanities_id, track_humss_id,
     'Creative Writing', 'CRWRITE-11',
     'Poetry, Fiction, and Non-Fiction Writing',
     1.0, true),
    (section_11_humss_id, default_teacher_id, humanities_id, track_humss_id,
     'World Religions', 'WORLDREL-11',
     'Comparative Study of Major World Religions',
     1.0, true),
    (section_11_humss_id, default_teacher_id, english_id, track_humss_id,
     'Oral Communication', 'ORALCOM-11',
     'Public Speaking and Communication Skills',
     1.0, true);

  RAISE NOTICE 'Grade 11 Courses Created for STEM, ABM, and HUMSS tracks';

END $$;
