-- =====================================================================
-- Fix teacher_daily_attendance table schema
-- =====================================================================
-- The original table (from legacy) is missing: section_id, school_id,
-- notes, updated_by columns that the attendance API inserts.
-- This migration creates the table if missing, or adds the missing columns.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- Step 1: Create the table if it doesn't exist at all (public schema)
CREATE TABLE IF NOT EXISTS teacher_daily_attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  section_id     UUID REFERENCES sections(id) ON DELETE SET NULL,
  school_id      UUID REFERENCES schools(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'absent'
                   CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes          TEXT,
  first_seen_at  TIMESTAMPTZ,
  last_seen_at   TIMESTAMPTZ,
  detected_from_login BOOLEAN DEFAULT false,
  manual_override     BOOLEAN DEFAULT true,
  updated_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- Step 2: Add missing columns to existing table (if already exists but incomplete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'section_id'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added section_id column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added school_id column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'notes'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN updated_by UUID;
    RAISE NOTICE 'Added updated_by column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'first_seen_at'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN first_seen_at TIMESTAMPTZ;
    RAISE NOTICE 'Added first_seen_at column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_daily_attendance' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE teacher_daily_attendance ADD COLUMN last_seen_at TIMESTAMPTZ;
    RAISE NOTICE 'Added last_seen_at column';
  END IF;
END $$;

-- Step 3: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tda_student_id  ON teacher_daily_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_tda_section_date ON teacher_daily_attendance(section_id, date);
CREATE INDEX IF NOT EXISTS idx_tda_date        ON teacher_daily_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_tda_status      ON teacher_daily_attendance(status);

-- Step 4: Verify
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'teacher_daily_attendance'
ORDER BY ordinal_position;
