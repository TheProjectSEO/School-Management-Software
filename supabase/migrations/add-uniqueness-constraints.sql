-- Add uniqueness constraints to prevent duplicate names across sections, courses, teachers, students
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING patterns)

-- =====================================================================
-- 1. SECTIONS: (name, grade_level) must be unique per school
-- API already validates this, adding DB constraint as safety net
-- First rename any existing duplicates to avoid constraint failure
-- =====================================================================
DO $$
DECLARE
  dup  RECORD;
  rec  RECORD;
  cnt  INT;
BEGIN
  -- Rename duplicate sections (keep earliest, suffix the rest)
  FOR dup IN (
    SELECT school_id, name, grade_level
    FROM sections
    GROUP BY school_id, name, grade_level
    HAVING COUNT(*) > 1
  ) LOOP
    cnt := 2;
    FOR rec IN (
      SELECT id FROM sections
      WHERE school_id = dup.school_id
        AND name = dup.name
        AND grade_level = dup.grade_level
      ORDER BY created_at ASC
      OFFSET 1
    ) LOOP
      UPDATE sections
        SET name = dup.name || ' (' || cnt || ')'
        WHERE id = rec.id;
      cnt := cnt + 1;
    END LOOP;
  END LOOP;

  -- Now safe to add the unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sections_school_name_grade_unique'
  ) THEN
    ALTER TABLE sections
      ADD CONSTRAINT sections_school_name_grade_unique
      UNIQUE(school_id, name, grade_level);
  END IF;
END $$;

-- =====================================================================
-- 2. COURSES: subject_code must be unique per school
-- (API already checks this, adding DB constraint)
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_school_subject_code_unique'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_school_subject_code_unique
      UNIQUE(school_id, subject_code);
  END IF;
END $$;

-- =====================================================================
-- 3. TEACHERS: employee_id must be unique per school
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_profiles' AND column_name = 'school_id'
  ) THEN
    -- school_id column does not exist yet — skip this constraint
    RAISE NOTICE 'teacher_profiles.school_id not found, skipping employee_id unique constraint';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'teacher_profiles_school_employee_id_unique'
    ) THEN
      ALTER TABLE teacher_profiles
        ADD CONSTRAINT teacher_profiles_school_employee_id_unique
        UNIQUE(school_id, employee_id);
    END IF;
  END IF;
END $$;

-- =====================================================================
-- 4. STUDENTS: LRN must be unique per school (partial — only non-null LRNs)
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS students_school_lrn_unique
  ON students(school_id, lrn)
  WHERE lrn IS NOT NULL AND lrn <> '';

-- Verify
SELECT
  'sections' as tbl, COUNT(*) as constraint_count
  FROM pg_constraint WHERE conname = 'sections_school_name_grade_unique'
UNION ALL
SELECT 'courses', COUNT(*) FROM pg_constraint WHERE conname = 'courses_school_subject_code_unique'
UNION ALL
SELECT 'teacher_profiles', COUNT(*) FROM pg_constraint WHERE conname = 'teacher_profiles_school_employee_id_unique'
UNION ALL
SELECT 'students_lrn_idx', COUNT(*) FROM pg_indexes WHERE indexname = 'students_school_lrn_unique';
