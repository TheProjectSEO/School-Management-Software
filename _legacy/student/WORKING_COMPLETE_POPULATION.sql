-- ============================================================================
-- WORKING COMPLETE POPULATION SCRIPT
-- Fixed to match actual table structure
-- ============================================================================

SET search_path TO "school software", public;

BEGIN;

-- ============================================================================
-- STEP 1: Verify student exists (already created by SIMPLE_FIX.sql)
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID;
  v_profile_id UUID := '44d7c894-d749-4e15-be1b-f42afe6f8c27';
BEGIN
  SELECT id INTO v_student_id FROM "school software".students WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student not found! Run SIMPLE_FIX.sql first.';
  ELSE
    RAISE NOTICE '✅ Student found: %', v_student_id;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ENROLL STUDENT IN EXISTING COURSES
-- ============================================================================
-- Check what courses already exist and enroll the student

INSERT INTO "school software".enrollments (school_id, student_id, course_id, created_at, updated_at)
SELECT
  c.school_id,
  s.id,
  c.id,
  NOW() - INTERVAL '2 months',
  NOW()
FROM "school software".students s
CROSS JOIN "school software".courses c
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
  AND c.school_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE STUDENT NOTIFICATIONS
-- ============================================================================

INSERT INTO "school software".student_notifications (
  student_id, type, title, message, action_url, is_read, created_at
)
SELECT
  s.id,
  data.ntype,
  data.title,
  data.message,
  data.action_url,
  data.is_read,
  data.created_at
FROM "school software".students s
CROSS JOIN (
  VALUES
    ('assignment_due', 'Assignment Due Soon', 'Check your assignments - some are due this week!', '/assessments', false, NOW() - INTERVAL '1 hour'),
    ('welcome', 'Welcome to MSU!', 'Start your learning journey today!', '/subjects', false, NOW() - INTERVAL '1 day'),
    ('info', 'Explore Your Courses', 'You are enrolled in courses. Check them out!', '/subjects', false, NOW() - INTERVAL '2 hours')
) AS data(ntype, title, message, action_url, is_read, created_at)
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID;
  v_enrollment_count INT;
  v_notification_count INT;
BEGIN
  SELECT id INTO v_student_id FROM "school software".students WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  SELECT COUNT(*) INTO v_enrollment_count FROM "school software".enrollments WHERE student_id = v_student_id;
  SELECT COUNT(*) INTO v_notification_count FROM "school software".student_notifications WHERE student_id = v_student_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POPULATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Enrolled Courses: %', v_enrollment_count;
  RAISE NOTICE 'Notifications: %', v_notification_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refresh your browser - dashboard should show courses!';
END $$;

SELECT '🎉 DONE - Refresh your browser!' as status;
