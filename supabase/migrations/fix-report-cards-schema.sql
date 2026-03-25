-- Fix report_cards table — add all missing columns
-- Run this in the Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'school_id') THEN
    ALTER TABLE report_cards ADD COLUMN school_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'grading_period_id') THEN
    ALTER TABLE report_cards ADD COLUMN grading_period_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'student_info_json') THEN
    ALTER TABLE report_cards ADD COLUMN student_info_json JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'grades_snapshot_json') THEN
    ALTER TABLE report_cards ADD COLUMN grades_snapshot_json JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'gpa_snapshot_json') THEN
    ALTER TABLE report_cards ADD COLUMN gpa_snapshot_json JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'attendance_summary_json') THEN
    ALTER TABLE report_cards ADD COLUMN attendance_summary_json JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'teacher_remarks_json') THEN
    ALTER TABLE report_cards ADD COLUMN teacher_remarks_json JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'status') THEN
    ALTER TABLE report_cards ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'generated_at') THEN
    ALTER TABLE report_cards ADD COLUMN generated_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'generated_by') THEN
    ALTER TABLE report_cards ADD COLUMN generated_by TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'pdf_url') THEN
    ALTER TABLE report_cards ADD COLUMN pdf_url TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'created_at') THEN
    ALTER TABLE report_cards ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'updated_at') THEN
    ALTER TABLE report_cards ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'report_cards'
ORDER BY ordinal_position;
