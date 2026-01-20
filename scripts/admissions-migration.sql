-- Admissions workflow schema
-- Target schema: public

-- Ensure extension for UUID generation (if not already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enrollment QR codes
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

-- Student applications
CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  qr_code_id UUID REFERENCES enrollment_qr_codes(id),

  -- Applicant info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),

  -- Guardian info
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  guardian_relation TEXT,

  -- Academic info
  previous_school TEXT,
  last_grade_completed TEXT,
  applying_for_grade TEXT NOT NULL,
  preferred_track TEXT,
  gpa NUMERIC(3,2),

  -- Document storage paths
  birth_certificate_path TEXT,
  report_card_path TEXT,
  good_moral_path TEXT,
  photo_id_path TEXT,
  other_documents JSONB,

  -- Workflow
  status TEXT CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'pending_info',
    'approved',
    'rejected'
  )) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES school_profiles(id),
  rejection_reason TEXT,
  requested_documents TEXT[],
  admin_notes TEXT,

  -- Tracking
  ip_address INET,
  user_agent TEXT,

  -- Link to created student on approval
  student_id UUID REFERENCES students(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Application documents
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES student_applications(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN (
    'birth_certificate',
    'report_card',
    'good_moral',
    'photo',
    'transcript',
    'recommendation_letter',
    'other'
  )),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,

  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES school_profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,

  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Application status log (audit trail)
CREATE TABLE IF NOT EXISTS application_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES student_applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES school_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket for application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE enrollment_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_log ENABLE ROW LEVEL SECURITY;

-- Policies (service_role and authenticated have full access; refine as needed per app logic)
DO $$
BEGIN
  -- enrollment_qr_codes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enrollment_qr_codes' AND policyname = 'enrollment_qr_codes_full_access'
  ) THEN
    CREATE POLICY enrollment_qr_codes_full_access
      ON enrollment_qr_codes
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  -- student_applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_applications' AND policyname = 'student_applications_full_access'
  ) THEN
    CREATE POLICY student_applications_full_access
      ON student_applications
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  -- application_documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'application_documents' AND policyname = 'application_documents_full_access'
  ) THEN
    CREATE POLICY application_documents_full_access
      ON application_documents
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  -- application_status_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'application_status_log' AND policyname = 'application_status_log_full_access'
  ) THEN
    CREATE POLICY application_status_log_full_access
      ON application_status_log
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- TODO: tighten policies after wiring server-side service-role usage.
