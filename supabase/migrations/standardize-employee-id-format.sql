-- =====================================================
-- Standardize Employee ID Format for Teachers
-- =====================================================
-- Date: 2026-02-21
-- Issue: Inconsistent employee_id formats in teacher_profiles table
-- Standard Format: T-YYYY-#### (e.g., T-2026-0001, T-2026-0002)
-- Pattern: Same as LRN standardization (Fix #9)
-- =====================================================

-- Step 1: Show current employee ID formats (BEFORE update)
SELECT
  'Current Employee ID Formats' AS report_section,
  employee_id,
  COUNT(*) AS count
FROM teacher_profiles
WHERE employee_id IS NOT NULL
GROUP BY employee_id
ORDER BY employee_id;

-- Step 2: Identify non-standard and missing employee IDs
SELECT
  'Non-Standard or Missing Employee IDs' AS report_section,
  tp.id,
  tp.employee_id,
  tp.created_at,
  sp.full_name
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
WHERE tp.employee_id IS NULL
   OR tp.employee_id = ''
   OR tp.employee_id !~ '^T-\d{4}-\d{4,}$'
ORDER BY tp.created_at;

-- Step 3: Get the max sequential number from existing standard-format employee IDs
DO $$
DECLARE
  max_number INTEGER;
  current_year TEXT;
  next_number INTEGER;
  teacher_record RECORD;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Find highest number in standard format for current year (T-YYYY-####)
  SELECT COALESCE(MAX(
    CASE
      WHEN employee_id ~ ('^T-' || current_year || '-\d{4,}$')
      THEN CAST(SUBSTRING(employee_id FROM '\d+$') AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_number
  FROM teacher_profiles
  WHERE employee_id IS NOT NULL;

  RAISE NOTICE 'Highest existing employee number for year %: %', current_year, max_number;

  -- Start from next number
  next_number := max_number + 1;

  -- Update all non-standard/missing employee IDs
  FOR teacher_record IN
    SELECT id, employee_id, created_at
    FROM teacher_profiles
    WHERE employee_id IS NULL
       OR employee_id = ''
       OR employee_id !~ '^T-\d{4}-\d{4,}$'
    ORDER BY created_at
  LOOP
    -- Generate new employee ID in standard format
    UPDATE teacher_profiles
    SET employee_id = 'T-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0'),
        updated_at = NOW()
    WHERE id = teacher_record.id;

    RAISE NOTICE 'Updated teacher % from "%" to "T-%-%"',
      teacher_record.id,
      COALESCE(teacher_record.employee_id, 'NULL'),
      current_year,
      LPAD(next_number::TEXT, 4, '0');

    next_number := next_number + 1;
  END LOOP;

  RAISE NOTICE 'Employee ID standardization complete. Next available number: %', next_number;
END $$;

-- Step 4: Verify all employee IDs are now in standard format
SELECT
  'Verification: All Employee IDs After Update' AS report_section,
  CASE
    WHEN employee_id ~ '^T-\d{4}-\d{4,}$' THEN 'Standard Format ✓'
    WHEN employee_id IS NULL OR employee_id = '' THEN 'Missing ✗'
    ELSE 'Non-Standard ✗'
  END AS format_status,
  COUNT(*) AS count
FROM teacher_profiles
GROUP BY format_status
ORDER BY format_status;

-- Step 5: Check for duplicate employee IDs (should be 0)
SELECT
  'Duplicate Employee ID Check' AS report_section,
  employee_id,
  COUNT(*) AS duplicate_count
FROM teacher_profiles
WHERE employee_id IS NOT NULL
GROUP BY employee_id
HAVING COUNT(*) > 1;

-- Step 6: Show updated employee IDs
SELECT
  'Updated Employee IDs (Sample)' AS report_section,
  tp.employee_id,
  sp.full_name,
  tp.department,
  tp.created_at
FROM teacher_profiles tp
LEFT JOIN school_profiles sp ON tp.profile_id = sp.id
ORDER BY tp.employee_id
LIMIT 20;

-- Step 7: Summary report
SELECT
  'Summary Report' AS report_section,
  COUNT(*) AS total_teachers,
  COUNT(CASE WHEN employee_id ~ '^T-\d{4}-\d{4,}$' THEN 1 END) AS standard_format_count,
  COUNT(CASE WHEN employee_id IS NULL OR employee_id = '' THEN 1 END) AS missing_count,
  COUNT(CASE WHEN employee_id IS NOT NULL
             AND employee_id != ''
             AND employee_id !~ '^T-\d{4}-\d{4,}$' THEN 1 END) AS non_standard_count
FROM teacher_profiles;

-- =====================================================
-- Expected Results After Running:
-- =====================================================
-- ✅ All employee IDs follow format: T-YYYY-####
-- ✅ No missing employee IDs
-- ✅ No non-standard formats
-- ✅ No duplicate employee IDs
-- ✅ Sequential numbering from existing max
-- =====================================================

-- OPTIONAL: Add UNIQUE constraint to prevent future duplicates
-- Uncomment the line below to enforce uniqueness:
-- ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_employee_id_unique UNIQUE (employee_id);

-- =====================================================
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =====================================================
