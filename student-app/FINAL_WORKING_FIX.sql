-- ============================================================================
-- FINAL WORKING FIX - Uses correct types
-- ============================================================================

SET search_path TO "school software", public;

BEGIN;

-- ============================================================================
-- ENROLL STUDENT IN ALL EXISTING COURSES
-- ============================================================================

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
LIMIT 50  -- Safety limit
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE NOTIFICATIONS WITH CORRECT TYPES
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
    ('assignment', 'Assignment Due Soon', 'Check your assignments - some are due this week!', '/assessments', false, NOW() - INTERVAL '1 hour'),
    ('announcement', 'Welcome to MSU!', 'Start your learning journey today!', '/subjects', false, NOW() - INTERVAL '1 day'),
    ('info', 'Explore Your Courses', 'You are enrolled in multiple courses. Check them out!', '/subjects', false, NOW() - INTERVAL '2 hours')
) AS data(ntype, title, message, action_url, is_read, created_at)
WHERE s.profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27'
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- SHOW RESULTS
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID;
  v_enrollments INT;
  v_notifications INT;
BEGIN
  SELECT id INTO v_student_id FROM "school software".students WHERE profile_id = '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  SELECT COUNT(*) INTO v_enrollments FROM "school software".enrollments WHERE student_id = v_student_id;
  SELECT COUNT(*) INTO v_notifications FROM "school software".student_notifications WHERE student_id = v_student_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUCCESS!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Enrolled in: % courses', v_enrollments;
  RAISE NOTICE 'Notifications: %', v_notifications;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Refresh your browser now!';
  RAISE NOTICE 'Your dashboard should show courses and data!';
  RAISE NOTICE '========================================';
END $$;
