-- ============================================================================
-- CHECK MESSAGING RELATIONSHIP: Gabriel B Ignacio (teacher) <-> felu cos (student)
-- Run this in Supabase SQL Editor to validate the messaging relationship
-- ============================================================================

-- 1. Find the teacher "Gabriel B Ignacio"
SELECT
  'TEACHER INFO' as section,
  tp.id as teacher_id,
  tp.profile_id as teacher_profile_id,
  sp.full_name as teacher_name,
  sp.auth_user_id,
  tp.school_id
FROM teacher_profiles tp
JOIN school_profiles sp ON sp.id = tp.profile_id
WHERE sp.full_name ILIKE '%Gabriel%Ignacio%' OR sp.full_name ILIKE '%Gabriel B%';

-- 2. Find the student "felu cos"
SELECT
  'STUDENT INFO' as section,
  s.id as student_id,
  s.profile_id as student_profile_id,
  sp.full_name as student_name,
  sp.auth_user_id,
  s.school_id,
  s.section_id,
  s.grade_level
FROM students s
JOIN school_profiles sp ON sp.id = s.profile_id
WHERE sp.full_name ILIKE '%felu%' OR sp.full_name ILIKE '%cos%';

-- 3. Check teacher's course assignments
SELECT
  'TEACHER COURSES' as section,
  ta.id as assignment_id,
  ta.teacher_profile_id,
  ta.course_id,
  c.name as course_name,
  c.subject_code
FROM teacher_assignments ta
JOIN courses c ON c.id = ta.course_id
JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
JOIN school_profiles sp ON sp.id = tp.profile_id
WHERE sp.full_name ILIKE '%Gabriel%Ignacio%' OR sp.full_name ILIKE '%Gabriel B%';

-- 4. Check student's enrollments
SELECT
  'STUDENT ENROLLMENTS' as section,
  e.id as enrollment_id,
  e.student_id,
  e.course_id,
  c.name as course_name
FROM enrollments e
JOIN courses c ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
WHERE sp.full_name ILIKE '%felu%' OR sp.full_name ILIKE '%cos%';

-- 5. Check if there are SHARED COURSES (this determines if they can message)
SELECT
  'SHARED COURSES (CAN MESSAGE)' as section,
  ta.teacher_profile_id,
  e.student_id,
  c.id as course_id,
  c.name as course_name,
  c.subject_code
FROM teacher_assignments ta
JOIN enrollments e ON e.course_id = ta.course_id
JOIN courses c ON c.id = ta.course_id
JOIN teacher_profiles tp ON tp.id = ta.teacher_profile_id
JOIN school_profiles teacher_sp ON teacher_sp.id = tp.profile_id
JOIN students s ON s.id = e.student_id
JOIN school_profiles student_sp ON student_sp.id = s.profile_id
WHERE (teacher_sp.full_name ILIKE '%Gabriel%Ignacio%' OR teacher_sp.full_name ILIKE '%Gabriel B%')
  AND (student_sp.full_name ILIKE '%felu%' OR student_sp.full_name ILIKE '%cos%');

-- 6. Check existing messages between them
SELECT
  'EXISTING MESSAGES' as section,
  tdm.id,
  tdm.sender_type,
  tdm.body,
  tdm.is_read,
  tdm.created_at,
  from_sp.full_name as from_user,
  to_sp.full_name as to_user
FROM teacher_direct_messages tdm
JOIN school_profiles from_sp ON from_sp.id = tdm.from_profile_id
JOIN school_profiles to_sp ON to_sp.id = tdm.to_profile_id
WHERE (from_sp.full_name ILIKE '%Gabriel%Ignacio%' AND to_sp.full_name ILIKE '%felu%')
   OR (from_sp.full_name ILIKE '%felu%' AND to_sp.full_name ILIKE '%Gabriel%Ignacio%')
ORDER BY tdm.created_at DESC
LIMIT 10;

-- 7. Check student's message quota (if student → teacher messaging)
SELECT
  'STUDENT QUOTA' as section,
  smq.*
FROM student_message_quotas smq
JOIN students s ON s.id = smq.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
WHERE sp.full_name ILIKE '%felu%' OR sp.full_name ILIKE '%cos%';

-- 8. Summary validation
DO $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
  v_teacher_profile_id UUID;
  v_student_profile_id UUID;
  v_shared_count INTEGER;
BEGIN
  -- Get teacher ID
  SELECT tp.id, tp.profile_id INTO v_teacher_id, v_teacher_profile_id
  FROM teacher_profiles tp
  JOIN school_profiles sp ON sp.id = tp.profile_id
  WHERE sp.full_name ILIKE '%Gabriel%Ignacio%' OR sp.full_name ILIKE '%Gabriel B%'
  LIMIT 1;

  -- Get student ID
  SELECT s.id, s.profile_id INTO v_student_id, v_student_profile_id
  FROM students s
  JOIN school_profiles sp ON sp.id = s.profile_id
  WHERE sp.full_name ILIKE '%felu%' OR sp.full_name ILIKE '%cos%'
  LIMIT 1;

  -- Count shared courses
  SELECT COUNT(*) INTO v_shared_count
  FROM teacher_assignments ta
  JOIN enrollments e ON e.course_id = ta.course_id
  WHERE ta.teacher_profile_id = v_teacher_id
    AND e.student_id = v_student_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MESSAGING VALIDATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Teacher ID: %', v_teacher_id;
  RAISE NOTICE 'Teacher Profile ID: %', v_teacher_profile_id;
  RAISE NOTICE 'Student ID: %', v_student_id;
  RAISE NOTICE 'Student Profile ID: %', v_student_profile_id;
  RAISE NOTICE 'Shared Courses: %', v_shared_count;
  RAISE NOTICE 'Can Message: %', CASE WHEN v_shared_count > 0 THEN 'YES' ELSE 'NO' END;
END $$;
