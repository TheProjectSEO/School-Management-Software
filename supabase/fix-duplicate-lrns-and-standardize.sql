-- Fix duplicate LRNs and standardize format to YYYY-MSU-####
-- Run this in your Supabase SQL Editor

-- Step 1: Identify current issues
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 CURRENT STATE ANALYSIS';
  RAISE NOTICE '========================================';
END $$;

-- Show duplicates
SELECT
  'DUPLICATES' as issue_type,
  lrn,
  COUNT(*) as count,
  ARRAY_AGG(id ORDER BY created_at) as student_ids
FROM students
WHERE lrn IS NOT NULL AND lrn != ''
GROUP BY lrn
HAVING COUNT(*) > 1;

-- Show format types
SELECT
  'FORMAT TYPES' as category,
  CASE
    WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN 'Standard (YYYY-MSU-####)'
    WHEN lrn ~ '^MSU-\d{4}-\d+$' THEN 'Non-standard (MSU-YYYY-#####)'
    WHEN lrn IS NULL OR lrn = '' THEN 'Missing'
    ELSE 'Other format'
  END as format_type,
  COUNT(*) as count,
  ARRAY_AGG(lrn ORDER BY lrn LIMIT 3) as examples
FROM students
GROUP BY format_type
ORDER BY count DESC;

-- Step 2: Create assignments table for ALL students needing new LRNs
CREATE TEMP TABLE temp_lrn_fix AS
WITH current_year AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as year
),
-- All students with their current LRN
all_students AS (
  SELECT
    id,
    lrn,
    created_at,
    -- Mark if LRN is valid, unique, and standard format
    CASE
      WHEN lrn IS NULL OR lrn = '' THEN FALSE
      WHEN NOT (lrn ~ '^\d{4}-MSU-\d{4}$') THEN FALSE -- Non-standard format
      ELSE TRUE
    END as is_valid_format,
    -- Count how many times this LRN appears
    COUNT(*) OVER (PARTITION BY lrn) as lrn_count
  FROM students
),
-- Students that need new LRNs (invalid format, duplicate, or missing)
needs_new_lrn AS (
  SELECT
    id,
    lrn as old_lrn,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as sequence_num
  FROM all_students
  WHERE NOT is_valid_format
     OR lrn_count > 1  -- Include duplicates
     OR lrn IS NULL
     OR lrn = ''
),
-- Parse valid unique LRNs to find max number
valid_unique_lrns AS (
  SELECT
    CASE
      WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN
        SUBSTRING(lrn FROM '^\d{4}-MSU-(\d{4})$')::INTEGER
      ELSE NULL
    END as lrn_number
  FROM all_students
  WHERE is_valid_format = TRUE
    AND lrn_count = 1  -- Only unique ones
    AND lrn IS NOT NULL
),
-- Get max number
max_lrn AS (
  SELECT COALESCE(MAX(lrn_number), 0) as max_num
  FROM valid_unique_lrns
)
-- Assign new sequential LRNs
SELECT
  n.id,
  n.old_lrn,
  (SELECT year FROM current_year) || '-MSU-' ||
    LPAD((m.max_num + n.sequence_num)::TEXT, 4, '0') as new_lrn,
  n.created_at
FROM needs_new_lrn n
CROSS JOIN max_lrn m;

-- Step 3: Show what will be updated
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 CHANGES TO BE APPLIED';
  RAISE NOTICE '========================================';
END $$;

SELECT
  old_lrn,
  new_lrn,
  COUNT(*) as students_affected
FROM temp_lrn_fix
GROUP BY old_lrn, new_lrn
ORDER BY new_lrn;

-- Step 4: Show detailed student info for verification
SELECT
  id,
  old_lrn as current_lrn,
  new_lrn as new_lrn,
  created_at
FROM temp_lrn_fix
ORDER BY new_lrn;

-- Step 5: Perform the update
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚙️  APPLYING UPDATES...';
  RAISE NOTICE '========================================';
END $$;

UPDATE students
SET
  lrn = t.new_lrn,
  updated_at = NOW()
FROM temp_lrn_fix t
WHERE students.id = t.id;

-- Step 6: Verify results
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '========================================';
END $$;

-- Check format distribution after update
SELECT
  'AFTER UPDATE' as status,
  CASE
    WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN 'Standard (YYYY-MSU-####)'
    WHEN lrn IS NULL OR lrn = '' THEN 'Missing'
    ELSE 'Non-standard'
  END as format_type,
  COUNT(*) as count
FROM students
GROUP BY format_type
ORDER BY format_type;

-- Check for remaining duplicates (should be 0)
SELECT
  'REMAINING DUPLICATES' as check_type,
  lrn,
  COUNT(*) as count
FROM students
WHERE lrn IS NOT NULL AND lrn != ''
GROUP BY lrn
HAVING COUNT(*) > 1;

-- If no duplicates, return this message
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT lrn
    FROM students
    WHERE lrn IS NOT NULL AND lrn != ''
    GROUP BY lrn
    HAVING COUNT(*) > 1
  ) dups;

  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate LRNs found!';
  ELSE
    RAISE WARNING '⚠️  Still have % duplicate LRN(s)', duplicate_count;
  END IF;
END $$;

-- Step 7: Show all LRNs sorted
SELECT
  id,
  lrn,
  grade_level,
  created_at
FROM students
ORDER BY lrn;

-- Step 8: Add unique constraint to prevent future duplicates
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_lrn_unique'
  ) THEN
    ALTER TABLE students
    ADD CONSTRAINT students_lrn_unique
    UNIQUE (lrn)
    WHERE lrn IS NOT NULL AND lrn != '';

    RAISE NOTICE '✅ Added UNIQUE constraint on LRN column';
  ELSE
    RAISE NOTICE 'ℹ️  UNIQUE constraint already exists';
  END IF;
END $$;

-- Final success report
DO $$
DECLARE
  total_students INTEGER;
  standard_format INTEGER;
  missing_lrn INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students FROM students;

  SELECT COUNT(*) INTO standard_format
  FROM students
  WHERE lrn ~ '^\d{4}-MSU-\d{4}$';

  SELECT COUNT(*) INTO missing_lrn
  FROM students
  WHERE lrn IS NULL OR lrn = '';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 FINAL REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total students: %', total_students;
  RAISE NOTICE 'Standard format: % (%%%)', standard_format,
    ROUND((standard_format::NUMERIC / NULLIF(total_students, 0) * 100)::NUMERIC, 2);
  RAISE NOTICE 'Missing LRN: %', missing_lrn;
  RAISE NOTICE '========================================';

  IF standard_format = total_students AND missing_lrn = 0 THEN
    RAISE NOTICE '✅ SUCCESS! All LRNs are standardized!';
  END IF;
END $$;
