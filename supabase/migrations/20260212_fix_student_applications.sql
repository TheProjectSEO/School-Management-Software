-- ============================================================================
-- Migration: Fix student_applications table
-- 1. Create table if it doesn't exist (for fresh databases)
-- 2. Add missing how_did_you_hear column
-- 3. Fix ip_address type (INET → TEXT for easier API compatibility)
-- Run this in your Supabase SQL editor
-- ============================================================================

-- Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  qr_code_id UUID REFERENCES enrollment_qr_codes(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  guardian_relation TEXT,
  previous_school TEXT,
  last_grade_completed TEXT,
  applying_for_grade TEXT NOT NULL,
  preferred_track TEXT,
  gpa NUMERIC(3,2),
  birth_certificate_path TEXT,
  report_card_path TEXT,
  good_moral_path TEXT,
  photo_id_path TEXT,
  other_documents JSONB,
  status TEXT CHECK (status IN (
    'draft','submitted','under_review','pending_info','approved','rejected'
  )) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES school_profiles(id),
  rejection_reason TEXT,
  requested_documents TEXT[],
  admin_notes TEXT,
  how_did_you_hear TEXT,
  ip_address TEXT,
  user_agent TEXT,
  student_id UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_applications' AND policyname = 'student_applications_full_access'
  ) THEN
    CREATE POLICY student_applications_full_access
      ON student_applications FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- For databases where the table already exists, add the missing column
ALTER TABLE student_applications ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT;

-- Fix ip_address type if it was INET (change to TEXT for API compatibility)
-- This is safe because TEXT can store anything INET can
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_applications'
      AND column_name = 'ip_address'
      AND data_type = 'inet'
  ) THEN
    ALTER TABLE student_applications ALTER COLUMN ip_address TYPE TEXT USING ip_address::TEXT;
  END IF;
END $$;

-- Also ensure enrollment_qr_codes table exists (referenced by qr_code_id FK)
CREATE TABLE IF NOT EXISTS enrollment_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_grade_levels TEXT[],
  available_tracks TEXT[],
  max_applications INTEGER,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  enrollment_url TEXT,
  qr_image_url TEXT,
  created_by UUID REFERENCES school_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE enrollment_qr_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enrollment_qr_codes' AND policyname = 'enrollment_qr_codes_full_access'
  ) THEN
    CREATE POLICY enrollment_qr_codes_full_access
      ON enrollment_qr_codes FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
