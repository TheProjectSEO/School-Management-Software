-- ============================================
-- FIX CRITICAL ISSUE: Create Missing Student Data
-- ============================================
-- Run this in Supabase SQL Editor to create the demo student
-- for auth user: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--
-- This fixes the PGRST116 error by ensuring profile and student exist

SET search_path TO "school software", public;

-- 1. Check if profile exists
DO $$
DECLARE
  v_profile_id UUID;
  v_student_id UUID;
  v_auth_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  RAISE NOTICE 'Checking for existing profile...';

  -- Check if profile exists
  SELECT id INTO v_profile_id
  FROM "school software".profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_profile_id IS NULL THEN
    RAISE NOTICE 'Profile not found. Creating profile...';

    -- Create profile
    INSERT INTO "school software".profiles (auth_user_id, full_name, created_at, updated_at)
    VALUES (
      v_auth_user_id,
      'Demo Student',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_profile_id;

    RAISE NOTICE 'Profile created with ID: %', v_profile_id;
  ELSE
    RAISE NOTICE 'Profile already exists with ID: %', v_profile_id;
  END IF;

  -- Check if student exists
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'Student not found. Creating student...';

    -- Create student
    INSERT INTO "school software".students (
      school_id,
      profile_id,
      lrn,
      grade_level,
      section_id,
      created_at,
      updated_at
    )
    VALUES (
      v_school_id,
      v_profile_id,
      '123456789012',
      'College - 2nd Year',
      v_section_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_student_id;

    RAISE NOTICE 'Student created with ID: %', v_student_id;

    -- Create enrollments for all courses
    INSERT INTO "school software".enrollments (school_id, student_id, course_id, created_at, updated_at)
    VALUES
      (v_school_id, v_student_id, 'c1111111-1111-1111-1111-111111111111', NOW(), NOW()),
      (v_school_id, v_student_id, 'c2222222-2222-2222-2222-222222222222', NOW(), NOW()),
      (v_school_id, v_student_id, 'c3333333-3333-3333-3333-333333333333', NOW(), NOW()),
      (v_school_id, v_student_id, 'c4444444-4444-4444-4444-444444444444', NOW(), NOW()),
      (v_school_id, v_student_id, 'c5555555-5555-5555-5555-555555555555', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created 5 enrollments';

    -- Create sample progress
    INSERT INTO "school software".student_progress (student_id, course_id, lesson_id, progress_percent, last_accessed_at, created_at, updated_at)
    VALUES
      (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111111', 100, NOW() - INTERVAL '2 hours', NOW(), NOW()),
      (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111112', 100, NOW() - INTERVAL '1 day', NOW(), NOW()),
      (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111121', 60, NOW() - INTERVAL '3 hours', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created sample progress records';

    -- Create welcome notification
    INSERT INTO "school software".notifications (student_id, type, title, message, action_url, created_at)
    VALUES (
      v_student_id,
      'announcement',
      'Welcome to MSU Student Portal!',
      'Start your learning journey today. Check out your enrolled subjects and begin watching lessons.',
      '/subjects',
      NOW()
    );

    RAISE NOTICE 'Created welcome notification';
  ELSE
    RAISE NOTICE 'Student already exists with ID: %', v_student_id;
  END IF;

  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE 'Auth User ID: %', v_auth_user_id;
  RAISE NOTICE 'Profile ID: %', v_profile_id;
  RAISE NOTICE 'Student ID: %', v_student_id;
END $$;

-- Verify the data
SELECT
  p.id as profile_id,
  p.auth_user_id,
  p.full_name,
  s.id as student_id,
  s.lrn,
  s.grade_level,
  (SELECT COUNT(*) FROM "school software".enrollments WHERE student_id = s.id) as enrollment_count
FROM "school software".profiles p
LEFT JOIN "school software".students s ON s.profile_id = p.id
WHERE p.auth_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
