-- =====================================================
-- Fix Teacher Search - Schema Verification & Repair
-- =====================================================
-- Date: 2026-02-21
-- Issue: Teacher search returns 0 results when searching by name
-- Root Cause: Missing email column in school_profiles (if not already added)
-- Related: BUG-006 (student fix), same pattern
-- =====================================================

-- Step 1: Ensure email column exists in school_profiles
-- (Should already exist from student fix, but make this idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'school_profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE school_profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to school_profiles';
  ELSE
    RAISE NOTICE 'Email column already exists in school_profiles';
  END IF;
END $$;

-- Step 2: Populate missing emails from auth.users
-- Update school_profiles where email is NULL but user exists in auth.users
UPDATE school_profiles sp
SET email = au.email
FROM auth.users au
WHERE sp.id = au.id
  AND (sp.email IS NULL OR sp.email = '');

-- Step 3: Verify teacher_profiles → school_profiles FK constraint exists
-- Check constraint name (should be teacher_profiles_profile_id_fkey)
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'teacher_profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'profile_id'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE 'Foreign key constraint on teacher_profiles.profile_id exists';
  ELSE
    RAISE WARNING 'Foreign key constraint on teacher_profiles.profile_id is MISSING - this will break teacher search!';
  END IF;
END $$;

-- Step 4: Check for teachers with missing profile data
SELECT
  'Teachers with missing school_profiles' AS check_type,
  COUNT(*) AS count
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.id IS NULL;

-- Step 5: Check for teachers with missing email
SELECT
  'Teachers with missing email in school_profiles' AS check_type,
  COUNT(*) AS count
FROM teacher_profiles tp
JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE sp.email IS NULL OR sp.email = '';

-- Step 6: Verification - Show sample of teacher data
SELECT
  tp.id AS teacher_id,
  tp.employee_id,
  sp.full_name,
  sp.email,
  tp.department,
  tp.is_active
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY tp.created_at DESC
LIMIT 10;

-- =====================================================
-- Expected Results:
-- =====================================================
-- ✅ Email column exists in school_profiles
-- ✅ All teachers have email populated
-- ✅ FK constraint verified
-- ✅ Sample data shows full_name and email correctly
-- =====================================================

-- =====================================================
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =====================================================
