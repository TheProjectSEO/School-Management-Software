-- =====================================================
-- View Teachers Data - Comprehensive Report
-- =====================================================
-- Date: 2026-02-21
-- Purpose: Display all teacher data with related information
-- Run in: Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Basic Teacher Information
-- =====================================================
SELECT
  '=== BASIC TEACHER INFORMATION ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name,
  sp.email,
  tp.department,
  tp.specialization,
  CASE
    WHEN tp.is_active THEN 'Active ✓'
    ELSE 'Inactive ✗'
  END AS status,
  tp.hire_date,
  tp.created_at AS registered_date
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY tp.employee_id;

-- =====================================================
-- 2. Teacher Count by Department
-- =====================================================
SELECT
  '=== TEACHERS BY DEPARTMENT ===' AS report_section;

SELECT
  COALESCE(department, 'No Department') AS department,
  COUNT(*) AS teacher_count,
  COUNT(CASE WHEN is_active THEN 1 END) AS active_count,
  COUNT(CASE WHEN NOT is_active THEN 1 END) AS inactive_count
FROM teacher_profiles
GROUP BY department
ORDER BY teacher_count DESC;

-- =====================================================
-- 3. Teacher Status Summary
-- =====================================================
SELECT
  '=== STATUS SUMMARY ===' AS report_section;

SELECT
  CASE
    WHEN is_active THEN 'Active'
    ELSE 'Inactive'
  END AS status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM teacher_profiles
GROUP BY is_active
ORDER BY is_active DESC;

-- =====================================================
-- 4. Teachers with Course Assignments
-- =====================================================
SELECT
  '=== TEACHER COURSE ASSIGNMENTS ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name AS teacher_name,
  tp.department,
  c.name AS course_name,
  c.code AS course_code,
  s.name AS section_name,
  s.grade_level
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
LEFT JOIN teacher_assignments ta ON tp.id = ta.teacher_profile_id
LEFT JOIN courses c ON ta.course_id = c.id
LEFT JOIN sections s ON ta.section_id = s.id
WHERE tp.is_active = true
ORDER BY tp.employee_id, c.name;

-- =====================================================
-- 5. Teachers Without Course Assignments
-- =====================================================
SELECT
  '=== TEACHERS WITHOUT ASSIGNMENTS ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name,
  sp.email,
  tp.department,
  CASE
    WHEN tp.is_active THEN 'Active'
    ELSE 'Inactive'
  END AS status
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
LEFT JOIN teacher_assignments ta ON tp.id = ta.teacher_profile_id
WHERE ta.id IS NULL
ORDER BY tp.is_active DESC, tp.employee_id;

-- =====================================================
-- 6. Teacher Contact Information
-- =====================================================
SELECT
  '=== TEACHER CONTACT INFO ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name,
  sp.email,
  sp.phone,
  CASE
    WHEN tp.is_active THEN 'Active'
    ELSE 'Inactive'
  END AS status,
  tp.department
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY sp.full_name;

-- =====================================================
-- 7. Recently Added Teachers (Last 30 days)
-- =====================================================
SELECT
  '=== RECENTLY ADDED TEACHERS (Last 30 Days) ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name,
  sp.email,
  tp.department,
  tp.created_at,
  EXTRACT(DAY FROM (NOW() - tp.created_at)) AS days_since_added
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE tp.created_at >= NOW() - INTERVAL '30 days'
ORDER BY tp.created_at DESC;

-- =====================================================
-- 8. Teacher Data Quality Check
-- =====================================================
SELECT
  '=== DATA QUALITY CHECK ===' AS report_section;

SELECT
  'Total Teachers' AS metric,
  COUNT(*) AS count
FROM teacher_profiles
UNION ALL
SELECT
  'Missing Employee ID',
  COUNT(*)
FROM teacher_profiles
WHERE employee_id IS NULL OR employee_id = ''
UNION ALL
SELECT
  'Missing Email',
  COUNT(*)
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.email IS NULL OR sp.email = ''
UNION ALL
SELECT
  'Missing Full Name',
  COUNT(*)
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.full_name IS NULL OR sp.full_name = ''
UNION ALL
SELECT
  'Missing Department',
  COUNT(*)
FROM teacher_profiles
WHERE department IS NULL OR department = ''
UNION ALL
SELECT
  'Missing Profile Link',
  COUNT(*)
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.id IS NULL
UNION ALL
SELECT
  'Standard Employee ID Format (T-YYYY-####)',
  COUNT(*)
FROM teacher_profiles
WHERE employee_id ~ '^T-\d{4}-\d{4,}$';

-- =====================================================
-- 9. Full Teacher Details (Verbose)
-- =====================================================
SELECT
  '=== FULL TEACHER DETAILS ===' AS report_section;

SELECT
  tp.id AS teacher_id,
  tp.employee_id,
  sp.full_name,
  sp.email,
  sp.phone,
  tp.department,
  tp.specialization,
  tp.is_active,
  tp.hire_date,
  tp.created_at,
  tp.updated_at,
  tp.profile_id,
  sp.avatar_url,
  COUNT(DISTINCT ta.course_id) AS assigned_courses,
  COUNT(DISTINCT ta.section_id) AS assigned_sections
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
LEFT JOIN teacher_assignments ta ON tp.id = ta.teacher_profile_id
GROUP BY
  tp.id, tp.employee_id, sp.full_name, sp.email, sp.phone,
  tp.department, tp.specialization, tp.is_active, tp.hire_date,
  tp.created_at, tp.updated_at, tp.profile_id, sp.avatar_url
ORDER BY tp.employee_id;

-- =====================================================
-- 10. Teacher Workload (Assignments per Teacher)
-- =====================================================
SELECT
  '=== TEACHER WORKLOAD ===' AS report_section;

SELECT
  tp.employee_id,
  sp.full_name,
  tp.department,
  COUNT(DISTINCT ta.course_id) AS courses_assigned,
  COUNT(DISTINCT ta.section_id) AS sections_assigned,
  COUNT(DISTINCT e.student_id) AS total_students
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
LEFT JOIN teacher_assignments ta ON tp.id = ta.teacher_profile_id
LEFT JOIN enrollments e ON ta.course_id = e.course_id
WHERE tp.is_active = true
GROUP BY tp.id, tp.employee_id, sp.full_name, tp.department
ORDER BY courses_assigned DESC, total_students DESC;

-- =====================================================
-- EXPORT OPTIONS
-- =====================================================
-- To export any query results:
-- 1. Run the query in Supabase SQL Editor
-- 2. Click "Download CSV" button
-- 3. Or copy results and paste into Excel
-- =====================================================
