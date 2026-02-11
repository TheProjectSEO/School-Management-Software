-- ============================================================================
-- Migration: Admin fixes - enrollment QR, section advisers, messaging
-- Run this in your Supabase SQL editor
-- ============================================================================

-- ============================================================================
-- 1. ENROLLMENT QR CODES TABLE (was in scripts/ but not in migrations/)
-- ============================================================================
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

-- Allow service_role full access (API routes use service client)
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

-- ============================================================================
-- 2. STUDENT APPLICATIONS TABLE (needed by enrollment QR)
-- ============================================================================
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
  ip_address INET,
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

-- ============================================================================
-- 3. SECTION ADVISERS TABLE (referenced by sections API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_advisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_id)
);

ALTER TABLE section_advisers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'section_advisers' AND policyname = 'section_advisers_full_access'
  ) THEN
    CREATE POLICY section_advisers_full_access
      ON section_advisers FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 4. MESSAGING: Update sender_type CHECK to allow 'admin'
-- ============================================================================
ALTER TABLE teacher_direct_messages
  DROP CONSTRAINT IF EXISTS teacher_direct_messages_sender_type_check;

ALTER TABLE teacher_direct_messages
  ADD CONSTRAINT teacher_direct_messages_sender_type_check
  CHECK (sender_type IN ('teacher', 'student', 'admin'));

-- ============================================================================
-- 5. MESSAGING: Create/update get_user_conversations RPC
-- Supports admin partner detection
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_profile_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  partner_profile_id UUID,
  partner_name TEXT,
  partner_avatar_url TEXT,
  partner_role TEXT,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_type TEXT,
  unread_count BIGINT,
  total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CASE
        WHEN from_profile_id = p_profile_id THEN to_profile_id
        ELSE from_profile_id
      END AS partner_id,
      body,
      created_at,
      sender_type,
      is_read,
      to_profile_id
    FROM teacher_direct_messages
    WHERE from_profile_id = p_profile_id OR to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (partner_id)
      partner_id,
      body AS last_body,
      created_at AS last_at,
      sender_type AS last_sender
    FROM conversations
    ORDER BY partner_id, created_at DESC
  ),
  stats AS (
    SELECT
      partner_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE to_profile_id = p_profile_id AND is_read = false) AS unread
    FROM conversations
    GROUP BY partner_id
  )
  SELECT
    l.partner_id,
    sp.full_name,
    sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM teacher_profiles WHERE profile_id = l.partner_id) THEN 'teacher'
      WHEN EXISTS (SELECT 1 FROM students WHERE profile_id = l.partner_id) THEN 'student'
      WHEN EXISTS (SELECT 1 FROM admins WHERE profile_id = l.partner_id) THEN 'admin'
      ELSE 'unknown'
    END,
    l.last_body,
    l.last_at,
    l.last_sender,
    COALESCE(s.unread, 0),
    COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. AUDIT LOGS TABLE (referenced by admin DAL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_full_access'
  ) THEN
    CREATE POLICY audit_logs_full_access
      ON audit_logs FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
