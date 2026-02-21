-- =====================================================
-- Quick Teacher List View (Single Query)
-- =====================================================
-- Mirrors the UI display at /admin/users/teachers
-- Shows exactly what admins see in the frontend
-- =====================================================

SELECT
  tp.employee_id AS "Employee ID",
  sp.full_name AS "Name",
  sp.email AS "Email",
  CASE
    WHEN tp.department = 'mathematics' THEN 'Mathematics'
    WHEN tp.department = 'science' THEN 'Science'
    WHEN tp.department = 'english' THEN 'English'
    WHEN tp.department = 'filipino' THEN 'Filipino'
    WHEN tp.department = 'social_studies' THEN 'Social Studies'
    WHEN tp.department = 'mapeh' THEN 'MAPEH'
    WHEN tp.department = 'tle' THEN 'TLE'
    WHEN tp.department = 'values' THEN 'Values Education'
    ELSE COALESCE(tp.department, '-')
  END AS "Department",
  CASE
    WHEN tp.is_active THEN 'Active ✓'
    ELSE 'Inactive ✗'
  END AS "Status",
  tp.created_at AS "Added On"
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY tp.created_at DESC;

-- =====================================================
-- QUICK FILTERS (uncomment to use)
-- =====================================================

-- Show only ACTIVE teachers:
-- WHERE tp.is_active = true

-- Show only INACTIVE teachers:
-- WHERE tp.is_active = false

-- Show only MATHEMATICS department:
-- WHERE tp.department = 'mathematics'

-- Search by NAME (example):
-- WHERE LOWER(sp.full_name) LIKE LOWER('%Aditya%')

-- Search by EMAIL (example):
-- WHERE LOWER(sp.email) LIKE LOWER('%@example.com%')

-- Search by EMPLOYEE ID (example):
-- WHERE tp.employee_id LIKE '%T-2026%'

-- COMBINED FILTERS (example: Active Mathematics teachers):
-- WHERE tp.is_active = true
--   AND tp.department = 'mathematics'

-- =====================================================
