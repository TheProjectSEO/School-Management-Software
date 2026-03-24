-- ============================================================
-- Add missing student profile fields
-- Run in Supabase SQL Editor
-- ============================================================
-- This fixes createStudent() silently failing to save:
-- status, birth_date, gender, address, guardian_name, guardian_phone
-- and adds the remaining fields needed for a complete DepEd-style
-- student record.
-- ============================================================

-- -------------------------------------------------------
-- 1. STUDENTS table — academic + personal fields
-- -------------------------------------------------------

-- Status (active, inactive, graduated, transferred, suspended, dropped)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'suspended', 'graduated', 'transferred', 'dropped'));

-- Personal info (stored on students, not school_profiles, because
-- these are student-specific — teachers don't have strands/guardians)
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date        DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS place_of_birth    TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender            TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality       TEXT DEFAULT 'Filipino';
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS civil_status      TEXT DEFAULT 'single'
  CHECK (civil_status IN ('single', 'married', 'widowed', 'separated'));

-- Address (split for structured records)
ALTER TABLE students ADD COLUMN IF NOT EXISTS address           TEXT;   -- street / house no.
ALTER TABLE students ADD COLUMN IF NOT EXISTS barangay          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS city_municipality TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS province          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS zip_code          TEXT;

-- Guardian / parent info
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name           TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_occupation     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_phone          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name           TEXT;   -- maiden name
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_occupation     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_phone          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name         TEXT;   -- if not parent
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone        TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;

-- Emergency contact (may differ from guardian)
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- SHS strand/track (Grades 11-12 only)
ALTER TABLE students ADD COLUMN IF NOT EXISTS track  TEXT
  CHECK (track IN ('Academic', 'TVL', 'Sports', 'Arts and Design'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS strand TEXT
  CHECK (strand IN ('STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'SPORTS', 'ARTS', 'HE', 'IA', 'CSS'));
-- (HE = Home Economics, IA = Industrial Arts, CSS = Computer Systems Servicing — common TVL sub-strands)

-- Academic year of enrollment (e.g. "2025-2026")
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- -------------------------------------------------------
-- 2. SCHOOL_PROFILES table — split name fields
-- -------------------------------------------------------
-- full_name stays (used everywhere for display).
-- Adding separate first/last/middle for forms that need them.

ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS first_name  TEXT;
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS last_name   TEXT;

-- -------------------------------------------------------
-- 3. Back-fill name parts from full_name (best-effort)
--    Assumes "First [Middle] Last" ordering.
--    Admins can correct individual records as needed.
-- -------------------------------------------------------
UPDATE school_profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name  = split_part(full_name, ' ', -1)
WHERE first_name IS NULL AND full_name IS NOT NULL AND full_name != '';

-- -------------------------------------------------------
-- 4. Verify
-- -------------------------------------------------------
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;
