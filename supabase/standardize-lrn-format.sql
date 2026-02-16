-- Standardize LRN format to unified YYYY-MSU-#### format
-- Run this in your Supabase SQL Editor

-- Step 1: Show current LRN formats before update
SELECT
  lrn,
  CASE
    WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN 'Standard (YYYY-MSU-####)'
    WHEN lrn ~ '^MSU-\d{4}-\d+$' THEN 'Non-standard (MSU-YYYY-#####)'
    WHEN lrn IS NULL OR lrn = '' THEN 'Missing'
    ELSE 'Other format'
  END as format_type,
  COUNT(*) as count
FROM students
GROUP BY lrn, format_type
ORDER BY format_type, lrn;

-- Step 2: Create a temporary sequence table for reassignment
CREATE TEMP TABLE temp_lrn_assignments AS
WITH current_year AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as year
),
-- Parse existing standard LRNs to get max number
existing_standard AS (
  SELECT
    id,
    lrn,
    CASE
      WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN
        SUBSTRING(lrn FROM '^\d{4}-MSU-(\d{4})$')::INTEGER
      ELSE NULL
    END as lrn_number
  FROM students
  WHERE lrn ~ '^\d{4}-MSU-\d{4}$'
),
-- Get the max number already in use
max_lrn AS (
  SELECT COALESCE(MAX(lrn_number), 0) as max_num
  FROM existing_standard
),
-- Students that need new LRNs (non-standard or missing)
needs_update AS (
  SELECT
    id,
    lrn,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM students
  WHERE lrn IS NULL
     OR lrn = ''
     OR NOT (lrn ~ '^\d{4}-MSU-\d{4}$')
)
-- Assign new sequential LRN numbers
SELECT
  n.id,
  n.lrn as old_lrn,
  (SELECT year FROM current_year) || '-MSU-' ||
    LPAD((m.max_num + n.row_num)::TEXT, 4, '0') as new_lrn
FROM needs_update n
CROSS JOIN max_lrn m;

-- Step 3: Show what will be updated
SELECT
  old_lrn,
  new_lrn,
  COUNT(*) as students_affected
FROM temp_lrn_assignments
GROUP BY old_lrn, new_lrn
ORDER BY new_lrn;

-- Step 4: Perform the update
UPDATE students
SET
  lrn = t.new_lrn,
  updated_at = NOW()
FROM temp_lrn_assignments t
WHERE students.id = t.id;

-- Step 5: Verify all LRNs are now in standard format
SELECT
  CASE
    WHEN lrn ~ '^\d{4}-MSU-\d{4}$' THEN 'Standard (YYYY-MSU-####)'
    WHEN lrn IS NULL OR lrn = '' THEN 'Missing'
    ELSE 'Non-standard'
  END as format_type,
  COUNT(*) as count,
  MIN(lrn) as example_lrn
FROM students
GROUP BY format_type
ORDER BY format_type;

-- Step 6: Show all LRNs in order
SELECT
  id,
  lrn,
  grade_level,
  created_at
FROM students
ORDER BY lrn;

-- Step 7: Check for duplicates (should return 0 rows)
SELECT
  lrn,
  COUNT(*) as duplicate_count
FROM students
WHERE lrn IS NOT NULL AND lrn != ''
GROUP BY lrn
HAVING COUNT(*) > 1;

-- Optional: Add unique constraint to prevent future duplicates
-- Uncomment if you want to enforce uniqueness
-- ALTER TABLE students
-- ADD CONSTRAINT students_lrn_unique
-- UNIQUE (lrn)
-- WHERE lrn IS NOT NULL AND lrn != '';

-- Success message
DO $$
DECLARE
  total_students INTEGER;
  standard_format INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students FROM students;
  SELECT COUNT(*) INTO standard_format
  FROM students
  WHERE lrn ~ '^\d{4}-MSU-\d{4}$';

  RAISE NOTICE '✅ LRN Standardization Complete!';
  RAISE NOTICE 'Total students: %', total_students;
  RAISE NOTICE 'Standard format (YYYY-MSU-####): %', standard_format;
  RAISE NOTICE 'Success rate: %%%', ROUND((standard_format::NUMERIC / total_students * 100)::NUMERIC, 2);
END $$;
