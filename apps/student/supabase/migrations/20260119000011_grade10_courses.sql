-- MSU Complete Foundation: Grade 10 Courses
-- Migration: 20260119000011_grade10_courses.sql
-- Creates 24 courses (8 subjects × 3 sections)

DO $$
DECLARE
  msu_school_id UUID := '11111111-1111-1111-1111-111111111111';

  -- Subject Area IDs
  math_subject_id UUID;
  science_subject_id UUID;
  english_subject_id UUID;
  filipino_subject_id UUID;
  social_subject_id UUID;
  pe_subject_id UUID;
  arts_subject_id UUID;
  values_subject_id UUID;

  -- Section IDs
  section_10a_id UUID;
  section_10b_id UUID;
  section_10c_id UUID;

  -- Teacher Profile ID (placeholder - replace with actual teacher)
  default_teacher_id UUID;
BEGIN

  -- Get subject area IDs
  SELECT id INTO math_subject_id FROM subject_areas WHERE slug = 'mathematics';
  SELECT id INTO science_subject_id FROM subject_areas WHERE slug = 'science';
  SELECT id INTO english_subject_id FROM subject_areas WHERE slug = 'english';
  SELECT id INTO filipino_subject_id FROM subject_areas WHERE slug = 'filipino';
  SELECT id INTO social_subject_id FROM subject_areas WHERE slug = 'social-sciences';
  SELECT id INTO pe_subject_id FROM subject_areas WHERE slug = 'physical-education';
  SELECT id INTO arts_subject_id FROM subject_areas WHERE slug = 'arts-design';
  SELECT id INTO values_subject_id FROM subject_areas WHERE slug = 'values-education';

  -- Get section IDs
  SELECT id INTO section_10a_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 10-A';
  SELECT id INTO section_10b_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 10-B';
  SELECT id INTO section_10c_id FROM sections WHERE school_id = msu_school_id AND name = 'Grade 10-C';

  -- Get a default teacher (first teacher from MSU)
  SELECT tp.id INTO default_teacher_id
  FROM teacher_profiles tp
  JOIN school_profiles sp ON sp.id = tp.profile_id
  WHERE sp.school_id = msu_school_id
  LIMIT 1;

  -- If no teacher exists, create a placeholder
  IF default_teacher_id IS NULL THEN
    RAISE NOTICE 'No teacher found for MSU. Courses will be created without teacher assignment.';
  END IF;

  -- ============================================================================
  -- GRADE 10-A COURSES
  -- ============================================================================

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  VALUES
    -- Mathematics 10-A
    (section_10a_id, default_teacher_id, math_subject_id,
     'Mathematics 10', 'MATH-10A',
     'Advanced Algebra, Sequences, Series, Polynomials, and Probability',
     1.0, true),

    -- Science 10-A
    (section_10a_id, default_teacher_id, science_subject_id,
     'Science 10', 'SCI-10A',
     'Forces, Motion, Energy, Biodiversity, and Ecosystems',
     1.0, true),

    -- English 10-A
    (section_10a_id, default_teacher_id, english_subject_id,
     'English 10', 'ENG-10A',
     'Literature, Critical Reading, Essay Writing, and Communication',
     1.0, true),

    -- Filipino 10-A
    (section_10a_id, default_teacher_id, filipino_subject_id,
     'Filipino 10', 'FIL-10A',
     'Panitikan ng Pilipinas, Gramatika, at Pagsulat',
     1.0, true),

    -- Araling Panlipunan 10-A
    (section_10a_id, default_teacher_id, social_subject_id,
     'Araling Panlipunan 10', 'AP-10A',
     'Philippine History, Government, and Current Events',
     1.0, true),

    -- PE & Health 10-A
    (section_10a_id, default_teacher_id, pe_subject_id,
     'Physical Education 10', 'PE-10A',
     'Sports, Fitness, and Health Education',
     1.0, true),

    -- Arts 10-A
    (section_10a_id, default_teacher_id, arts_subject_id,
     'Arts 10', 'ARTS-10A',
     'Visual Arts, Music, and Filipino Cultural Heritage',
     0.5, true),

    -- Values Education 10-A
    (section_10a_id, default_teacher_id, values_subject_id,
     'Values Education 10', 'VAL-10A',
     'Ethics, Character Development, and Social Responsibility',
     0.5, true);

  -- ============================================================================
  -- GRADE 10-B COURSES
  -- ============================================================================

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  VALUES
    -- Mathematics 10-B
    (section_10b_id, default_teacher_id, math_subject_id,
     'Mathematics 10', 'MATH-10B',
     'Advanced Algebra, Sequences, Series, Polynomials, and Probability',
     1.0, true),

    -- Science 10-B
    (section_10b_id, default_teacher_id, science_subject_id,
     'Science 10', 'SCI-10B',
     'Forces, Motion, Energy, Biodiversity, and Ecosystems',
     1.0, true),

    -- English 10-B
    (section_10b_id, default_teacher_id, english_subject_id,
     'English 10', 'ENG-10B',
     'Literature, Critical Reading, Essay Writing, and Communication',
     1.0, true),

    -- Filipino 10-B
    (section_10b_id, default_teacher_id, filipino_subject_id,
     'Filipino 10', 'FIL-10B',
     'Panitikan ng Pilipinas, Gramatika, at Pagsulat',
     1.0, true),

    -- Araling Panlipunan 10-B
    (section_10b_id, default_teacher_id, social_subject_id,
     'Araling Panlipunan 10', 'AP-10B',
     'Philippine History, Government, and Current Events',
     1.0, true),

    -- PE & Health 10-B
    (section_10b_id, default_teacher_id, pe_subject_id,
     'Physical Education 10', 'PE-10B',
     'Sports, Fitness, and Health Education',
     1.0, true),

    -- Arts 10-B
    (section_10b_id, default_teacher_id, arts_subject_id,
     'Arts 10', 'ARTS-10B',
     'Visual Arts, Music, and Filipino Cultural Heritage',
     0.5, true),

    -- Values Education 10-B
    (section_10b_id, default_teacher_id, values_subject_id,
     'Values Education 10', 'VAL-10B',
     'Ethics, Character Development, and Social Responsibility',
     0.5, true);

  -- ============================================================================
  -- GRADE 10-C COURSES
  -- ============================================================================

  INSERT INTO courses (section_id, teacher_id, subject_area_id, name, code, description, credits, is_core_subject)
  VALUES
    -- Mathematics 10-C
    (section_10c_id, default_teacher_id, math_subject_id,
     'Mathematics 10', 'MATH-10C',
     'Advanced Algebra, Sequences, Series, Polynomials, and Probability',
     1.0, true),

    -- Science 10-C
    (section_10c_id, default_teacher_id, science_subject_id,
     'Science 10', 'SCI-10C',
     'Forces, Motion, Energy, Biodiversity, and Ecosystems',
     1.0, true),

    -- English 10-C
    (section_10c_id, default_teacher_id, english_subject_id,
     'English 10', 'ENG-10C',
     'Literature, Critical Reading, Essay Writing, and Communication',
     1.0, true),

    -- Filipino 10-C
    (section_10c_id, default_teacher_id, filipino_subject_id,
     'Filipino 10', 'FIL-10C',
     'Panitikan ng Pilipinas, Gramatika, at Pagsulat',
     1.0, true),

    -- Araling Panlipunan 10-C
    (section_10c_id, default_teacher_id, social_subject_id,
     'Araling Panlipunan 10', 'AP-10C',
     'Philippine History, Government, and Current Events',
     1.0, true),

    -- PE & Health 10-C
    (section_10c_id, default_teacher_id, pe_subject_id,
     'Physical Education 10', 'PE-10C',
     'Sports, Fitness, and Health Education',
     1.0, true),

    -- Arts 10-C
    (section_10c_id, default_teacher_id, arts_subject_id,
     'Arts 10', 'ARTS-10C',
     'Visual Arts, Music, and Filipino Cultural Heritage',
     0.5, true),

    -- Values Education 10-C
    (section_10c_id, default_teacher_id, values_subject_id,
     'Values Education 10', 'VAL-10C',
     'Ethics, Character Development, and Social Responsibility',
     0.5, true);

  RAISE NOTICE 'Grade 10 Courses Created: 24 courses across 3 sections';

END $$;
