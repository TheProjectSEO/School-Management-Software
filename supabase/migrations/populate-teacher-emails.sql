-- =====================================================
-- Populate Missing Teacher Emails
-- =====================================================
-- Date: 2026-02-21
-- Issue: All teacher emails showing as NULL
-- Root Cause: school_profiles.email not populated from auth.users
-- Same pattern as BUG-006 (student fix)
-- =====================================================

-- Step 1: Check current state (BEFORE update)
SELECT
  'Teachers with Missing Email (BEFORE)' AS report_section,
  COUNT(*) AS missing_email_count
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.email IS NULL OR sp.email = '';

-- Step 2: Show which teachers are missing emails
SELECT
  'Teachers Missing Email Details' AS report_section,
  tp.employee_id,
  sp.full_name,
  sp.email AS current_email,
  au.email AS auth_email
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
LEFT JOIN auth.users au ON sp.id = au.id
WHERE sp.email IS NULL OR sp.email = '';

-- Step 3: Populate emails from auth.users
UPDATE school_profiles sp
SET
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE sp.id = au.id
  AND (sp.email IS NULL OR sp.email = '')
  AND au.email IS NOT NULL;

-- Step 4: Verify update (AFTER)
SELECT
  'Teachers with Missing Email (AFTER)' AS report_section,
  COUNT(*) AS missing_email_count
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.email IS NULL OR sp.email = '';

-- Step 5: Show updated teacher emails
SELECT
  'Updated Teacher Emails' AS report_section,
  tp.employee_id,
  sp.full_name,
  sp.email,
  CASE
    WHEN tp.is_active THEN 'Active'
    ELSE 'Inactive'
  END AS status
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY tp.employee_id;

-- Step 6: Summary
SELECT
  'Summary' AS report_section,
  COUNT(*) AS total_teachers,
  COUNT(CASE WHEN sp.email IS NOT NULL AND sp.email != '' THEN 1 END) AS teachers_with_email,
  COUNT(CASE WHEN sp.email IS NULL OR sp.email = '' THEN 1 END) AS teachers_without_email
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id;

-- =====================================================
-- Expected Results:
-- =====================================================
-- ✅ All teachers should have email populated
-- ✅ Emails pulled from auth.users table
-- ✅ teachers_without_email should be 0
-- =====================================================

-- =====================================================
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =====================================================
