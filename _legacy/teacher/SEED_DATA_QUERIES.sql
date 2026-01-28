-- ============================================================================
-- MSU School OS - Seed Data Verification & Testing Queries
-- ============================================================================
-- Use this file for common queries during testing
-- Copy and paste individual queries into Supabase SQL Editor as needed
-- ============================================================================

-- SCHOOL ID (constant)
-- 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd = MSU - Main Campus

-- ============================================================================
-- 1. TEACHER VERIFICATION QUERIES
-- ============================================================================

-- Get teacher profile details
SELECT
  p.id,
  p.auth_user_id,
  p.full_name,
  p.phone,
  tp.id as teacher_profile_id,
  tp.employee_id,
  tp.department,
  tp.specialization,
  tp.is_active,
  tp.created_at
FROM n8n_content_creation.teacher_profiles tp
JOIN n8n_content_creation.profiles p ON tp.profile_id = p.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

-- Get all sections this teacher teaches
SELECT
  s.id,
  s.name,
  s.grade_level,
  COUNT(DISTINCT ta.course_id) as assigned_courses
FROM n8n_content_creation.sections s
LEFT JOIN n8n_content_creation.teacher_assignments ta ON s.id = ta.section_id
LEFT JOIN n8n_content_creation.teacher_profiles tp ON ta.teacher_profile_id = tp.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY s.id, s.name, s.grade_level
ORDER BY s.grade_level;

-- Get teacher's course assignments
SELECT
  ta.id,
  c.id as course_id,
  c.name,
  c.subject_code,
  s.name as section_name,
  s.grade_level,
  ta.is_primary
FROM n8n_content_creation.teacher_assignments ta
JOIN n8n_content_creation.courses c ON ta.course_id = c.id
JOIN n8n_content_creation.sections s ON ta.section_id = s.id
JOIN n8n_content_creation.teacher_profiles tp ON ta.teacher_profile_id = tp.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
  AND tp.employee_id = 'EMP001'
ORDER BY s.grade_level, c.name;

-- ============================================================================
-- 2. SECTION & STUDENT QUERIES
-- ============================================================================

-- Get section rosters with enrollment counts
SELECT
  s.id,
  s.name,
  s.grade_level,
  COUNT(DISTINCT st.id) as total_students,
  COUNT(DISTINCT e.id) as total_enrollments
FROM n8n_content_creation.sections s
LEFT JOIN n8n_content_creation.students st ON s.id = st.section_id
LEFT JOIN n8n_content_creation.enrollments e ON st.id = e.student_id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY s.id, s.name, s.grade_level
ORDER BY s.grade_level;

-- Get all students in a section with their courses
SELECT
  p.id as profile_id,
  p.full_name as student_name,
  s.lrn,
  sec.name as section_name,
  sec.grade_level,
  COUNT(DISTINCT e.course_id) as enrolled_courses
FROM n8n_content_creation.students s
JOIN n8n_content_creation.profiles p ON s.profile_id = p.id
JOIN n8n_content_creation.sections sec ON s.section_id = sec.id
LEFT JOIN n8n_content_creation.enrollments e ON s.id = e.student_id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY p.id, p.full_name, s.lrn, sec.name, sec.grade_level
ORDER BY sec.grade_level, p.full_name;

-- Get student's course enrollments
SELECT
  st.id as student_id,
  p.full_name as student_name,
  e.id as enrollment_id,
  c.id as course_id,
  c.name as course_name,
  c.subject_code,
  e.created_at as enrolled_at
FROM n8n_content_creation.enrollments e
JOIN n8n_content_creation.students st ON e.student_id = st.id
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
JOIN n8n_content_creation.courses c ON e.course_id = c.id
WHERE st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY p.full_name, c.name;

-- Get a specific student's profile
SELECT
  st.id as student_id,
  p.full_name,
  p.phone,
  st.lrn,
  st.grade_level,
  sec.name as section_name
FROM n8n_content_creation.students st
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
JOIN n8n_content_creation.sections sec ON st.section_id = sec.id
WHERE p.full_name = 'Maria Santos'
  AND st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid;

-- ============================================================================
-- 3. COURSE & ENROLLMENT QUERIES
-- ============================================================================

-- Get all courses with their sections and teachers
SELECT
  c.id,
  c.name,
  c.subject_code,
  s.name as section_name,
  s.grade_level,
  p.full_name as teacher_name,
  COUNT(DISTINCT e.student_id) as enrolled_students
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.profiles p ON c.teacher_id = p.id
LEFT JOIN n8n_content_creation.enrollments e ON c.id = e.course_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY c.id, c.name, c.subject_code, s.name, s.grade_level, p.full_name
ORDER BY s.grade_level, c.name;

-- Get course details with module count
SELECT
  c.id,
  c.name,
  c.subject_code,
  s.name as section_name,
  COUNT(m.id) as total_modules,
  SUM(CASE WHEN m.is_published THEN 1 ELSE 0 END) as published_modules
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.modules m ON c.id = m.course_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY c.id, c.name, c.subject_code, s.name
ORDER BY s.name, c.name;

-- ============================================================================
-- 4. MODULE, LESSON & CONTENT QUERIES
-- ============================================================================

-- Get all modules with lesson counts
SELECT
  m.id,
  m.title,
  m.is_published,
  c.name as course_name,
  s.name as section_name,
  COUNT(DISTINCT l.id) as lesson_count,
  m.duration_minutes,
  m.created_at
FROM n8n_content_creation.modules m
JOIN n8n_content_creation.courses c ON m.course_id = c.id
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.lessons l ON m.id = l.module_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY m.id, m.title, m.is_published, c.name, s.name, m.duration_minutes, m.created_at
ORDER BY c.name, m.order;

-- Get modules for a specific course
SELECT
  m.id,
  m.title,
  m.description,
  m.order,
  m.duration_minutes,
  m.is_published,
  COUNT(l.id) as lesson_count
FROM n8n_content_creation.modules m
LEFT JOIN n8n_content_creation.lessons l ON m.id = l.module_id
WHERE m.course_id = (
  SELECT id FROM n8n_content_creation.courses
  WHERE name LIKE '%Mathematics 101%'
  LIMIT 1
)
GROUP BY m.id, m.title, m.description, m.order, m.duration_minutes, m.is_published
ORDER BY m.order;

-- Get all lessons in a module
SELECT
  l.id,
  l.title,
  l.content_type,
  l.duration_minutes,
  l.order,
  l.is_published,
  m.title as module_title
FROM n8n_content_creation.lessons l
JOIN n8n_content_creation.modules m ON l.module_id = m.id
WHERE m.id = (
  SELECT id FROM n8n_content_creation.modules
  LIMIT 1
)
ORDER BY l.order;

-- Get module transcripts and notes
SELECT
  m.id as module_id,
  m.title as module_title,
  COUNT(DISTINCT tt.id) as transcript_count,
  SUM(CASE WHEN tt.is_published THEN 1 ELSE 0 END) as published_transcripts,
  COUNT(DISTINCT tn.id) as notes_count,
  SUM(CASE WHEN tn.is_published THEN 1 ELSE 0 END) as published_notes
FROM n8n_content_creation.modules m
LEFT JOIN n8n_content_creation.teacher_transcripts tt ON m.id = tt.module_id
LEFT JOIN n8n_content_creation.teacher_notes tn ON m.id = tn.module_id
WHERE m.is_published = true
GROUP BY m.id, m.title
ORDER BY m.title;

-- Get a specific transcript
SELECT
  id,
  source_type,
  version,
  is_published,
  LEFT(content, 200) as content_preview,
  published_at,
  created_at
FROM n8n_content_creation.teacher_transcripts
WHERE module_id = (SELECT id FROM n8n_content_creation.modules LIMIT 1)
ORDER BY version DESC;

-- ============================================================================
-- 5. ASSESSMENT & QUESTION BANK QUERIES
-- ============================================================================

-- Get all assessments with details
SELECT
  a.id,
  a.title,
  a.type,
  a.total_points,
  a.time_limit_minutes,
  a.max_attempts,
  a.due_date,
  c.name as course_name,
  s.name as section_name,
  a.is_published
FROM n8n_content_creation.assessments a
JOIN n8n_content_creation.courses c ON a.course_id = c.id
JOIN n8n_content_creation.sections s ON c.section_id = s.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY a.due_date, c.name;

-- Get question banks with question counts
SELECT
  qb.id,
  qb.name,
  qb.description,
  c.name as course_name,
  COUNT(bq.id) as total_questions,
  COUNT(CASE WHEN bq.difficulty = 'easy' THEN 1 END) as easy_count,
  COUNT(CASE WHEN bq.difficulty = 'medium' THEN 1 END) as medium_count,
  COUNT(CASE WHEN bq.difficulty = 'hard' THEN 1 END) as hard_count,
  qb.created_at
FROM n8n_content_creation.teacher_question_banks qb
JOIN n8n_content_creation.courses c ON qb.course_id = c.id
LEFT JOIN n8n_content_creation.teacher_bank_questions bq ON qb.id = bq.bank_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY qb.id, qb.name, qb.description, c.name, qb.created_at
ORDER BY c.name, qb.name;

-- Get all questions in a bank
SELECT
  bq.id,
  bq.question_text,
  bq.question_type,
  bq.points,
  bq.difficulty,
  bq.tags,
  CASE WHEN bq.choices_json IS NOT NULL
    THEN jsonb_array_length(bq.choices_json)
    ELSE 0
  END as choice_count
FROM n8n_content_creation.teacher_bank_questions bq
WHERE bq.bank_id = (
  SELECT id FROM n8n_content_creation.teacher_question_banks
  LIMIT 1
)
ORDER BY bq.created_at;

-- Get assessment bank rules (randomization setup)
SELECT
  abr.id,
  a.title as assessment_title,
  qb.name as bank_name,
  abr.pick_count,
  abr.difficulty_filter,
  abr.tag_filter,
  abr.shuffle_questions,
  abr.shuffle_choices,
  abr.seed_mode
FROM n8n_content_creation.teacher_assessment_bank_rules abr
JOIN n8n_content_creation.assessments a ON abr.assessment_id = a.id
JOIN n8n_content_creation.teacher_question_banks qb ON abr.bank_id = qb.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY a.title;

-- ============================================================================
-- 6. SUBMISSION & GRADING QUERIES
-- ============================================================================

-- Get all submissions (for grading inbox)
SELECT
  sub.id,
  sub.assessment_id,
  a.title as assessment_title,
  st.id as student_id,
  p.full_name as student_name,
  sub.status,
  sub.score,
  sub.submitted_at,
  sub.graded_at,
  sub.attempt_number
FROM n8n_content_creation.submissions sub
JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
JOIN n8n_content_creation.students st ON sub.student_id = st.id
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY sub.submitted_at DESC;

-- Get pending submissions (status = 'submitted' and graded_at IS NULL)
SELECT
  sub.id,
  a.title as assessment_title,
  p.full_name as student_name,
  sub.submitted_at,
  sub.attempt_number,
  (EXTRACT(EPOCH FROM (NOW() - sub.submitted_at)) / 3600)::INTEGER as hours_ago
FROM n8n_content_creation.submissions sub
JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
JOIN n8n_content_creation.students st ON sub.student_id = st.id
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
  AND sub.graded_at IS NULL
ORDER BY sub.submitted_at DESC;

-- Get a specific submission with student answers
SELECT
  sub.id as submission_id,
  p.full_name as student_name,
  a.title as assessment_title,
  sa.id as answer_id,
  q.question_text,
  q.question_type,
  sa.text_answer,
  sa.is_correct,
  sa.points_earned,
  q.correct_answer
FROM n8n_content_creation.submissions sub
JOIN n8n_content_creation.students st ON sub.student_id = st.id
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
LEFT JOIN n8n_content_creation.student_answers sa ON sub.id = sa.submission_id
LEFT JOIN n8n_content_creation.questions q ON sa.question_id = q.id
WHERE sub.id = (SELECT id FROM n8n_content_creation.submissions LIMIT 1)
ORDER BY sa.created_at;

-- ============================================================================
-- 7. ATTENDANCE QUERIES
-- ============================================================================

-- Get daily attendance for a date
SELECT
  st.id as student_id,
  p.full_name as student_name,
  tda.date,
  tda.status,
  tda.first_seen_at,
  tda.last_seen_at,
  tda.detected_from_login,
  tda.manual_override
FROM n8n_content_creation.teacher_daily_attendance tda
JOIN n8n_content_creation.students st ON tda.student_id = st.id
JOIN n8n_content_creation.profiles p ON st.profile_id = p.id
WHERE tda.date = CURRENT_DATE
  AND st.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
ORDER BY p.full_name;

-- Get attendance summary by section
SELECT
  s.id,
  s.name as section_name,
  CURRENT_DATE as date,
  COUNT(DISTINCT st.id) as total_students,
  COUNT(CASE WHEN tda.status = 'present' THEN 1 END) as present_count,
  COUNT(CASE WHEN tda.status = 'late' THEN 1 END) as late_count,
  COUNT(CASE WHEN tda.status = 'absent' THEN 1 END) as absent_count,
  COUNT(CASE WHEN tda.status = 'excused' THEN 1 END) as excused_count
FROM n8n_content_creation.sections s
LEFT JOIN n8n_content_creation.students st ON s.id = st.section_id
LEFT JOIN n8n_content_creation.teacher_daily_attendance tda ON st.id = tda.student_id
  AND tda.date = CURRENT_DATE
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY s.id, s.name
ORDER BY s.grade_level;

-- ============================================================================
-- 8. QUICK STATS & DASHBOARDS
-- ============================================================================

-- School-wide statistics
SELECT
  'Teachers' as metric,
  COUNT(DISTINCT tp.id)::TEXT as count
FROM n8n_content_creation.teacher_profiles tp
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT
  'Sections',
  COUNT(*)::TEXT
FROM n8n_content_creation.sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT
  'Students',
  COUNT(*)::TEXT
FROM n8n_content_creation.students
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT
  'Courses',
  COUNT(*)::TEXT
FROM n8n_content_creation.courses
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT
  'Published Modules',
  COUNT(*)::TEXT
FROM n8n_content_creation.modules
WHERE is_published = true
  AND course_id IN (
    SELECT id FROM n8n_content_creation.courses
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
  )
UNION ALL
SELECT
  'Lessons',
  COUNT(*)::TEXT
FROM n8n_content_creation.lessons
WHERE module_id IN (
  SELECT id FROM n8n_content_creation.modules
  WHERE course_id IN (
    SELECT id FROM n8n_content_creation.courses
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
  )
)
UNION ALL
SELECT
  'Assessments',
  COUNT(*)::TEXT
FROM n8n_content_creation.assessments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT
  'Submissions',
  COUNT(*)::TEXT
FROM n8n_content_creation.submissions
WHERE assessment_id IN (
  SELECT id FROM n8n_content_creation.assessments
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
)
ORDER BY metric;

-- Course dashboard summary
SELECT
  c.name as course_name,
  c.subject_code,
  s.grade_level,
  COUNT(DISTINCT e.student_id) as enrolled_students,
  COUNT(DISTINCT m.id) as modules,
  SUM(CASE WHEN m.is_published THEN 1 ELSE 0 END) as published_modules,
  COUNT(DISTINCT a.id) as assessments,
  COUNT(DISTINCT sub.id) as submissions
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.enrollments e ON c.id = e.course_id
LEFT JOIN n8n_content_creation.modules m ON c.id = m.course_id
LEFT JOIN n8n_content_creation.assessments a ON c.id = a.course_id
LEFT JOIN n8n_content_creation.submissions sub ON a.id = sub.assessment_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
GROUP BY c.id, c.name, c.subject_code, s.grade_level
ORDER BY s.grade_level, c.name;

-- ============================================================================
-- 9. DATA CLEANUP & MAINTENANCE
-- ============================================================================

-- Count all data for school
SELECT
  'teacher_profiles' as table_name,
  COUNT(*)::INTEGER as row_count
FROM n8n_content_creation.teacher_profiles
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'sections', COUNT(*) FROM n8n_content_creation.sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'students', COUNT(*) FROM n8n_content_creation.students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'courses', COUNT(*) FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'enrollments', COUNT(*) FROM n8n_content_creation.enrollments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'modules', COUNT(*) FROM n8n_content_creation.modules WHERE course_id IN (SELECT id FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid)
UNION ALL
SELECT 'lessons', COUNT(*) FROM n8n_content_creation.lessons WHERE module_id IN (SELECT id FROM n8n_content_creation.modules WHERE course_id IN (SELECT id FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid))
UNION ALL
SELECT 'assessments', COUNT(*) FROM n8n_content_creation.assessments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid
UNION ALL
SELECT 'submissions', COUNT(*) FROM n8n_content_creation.submissions WHERE assessment_id IN (SELECT id FROM n8n_content_creation.assessments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid)
ORDER BY table_name;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================
