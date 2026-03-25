-- Populate academic_year for grading_periods where it is NULL
-- Derives the academic year from start_date using Philippine school year convention:
-- School year starts in June/July, so a period starting in 2025-06 belongs to "2025-2026"
-- A period starting in 2026-01 (second semester) belongs to "2025-2026"

UPDATE grading_periods
SET academic_year = CASE
  -- If start month >= 6 (June or later), academic year starts that calendar year
  WHEN EXTRACT(MONTH FROM start_date) >= 6
    THEN EXTRACT(YEAR FROM start_date)::TEXT || '-' || (EXTRACT(YEAR FROM start_date) + 1)::TEXT
  -- If start month < 6 (Jan-May), academic year started the previous calendar year
  ELSE (EXTRACT(YEAR FROM start_date) - 1)::TEXT || '-' || EXTRACT(YEAR FROM start_date)::TEXT
END
WHERE academic_year IS NULL
  AND start_date IS NOT NULL;

-- For rows where start_date is also null, derive from name year patterns or use current school year
UPDATE grading_periods
SET academic_year = (
  EXTRACT(YEAR FROM NOW())::TEXT || '-' || (EXTRACT(YEAR FROM NOW()) + 1)::TEXT
)
WHERE academic_year IS NULL;

-- Verify
SELECT id, name, academic_year, start_date FROM grading_periods ORDER BY start_date;
