-- Add released_at and released_by columns to submissions table
-- Required by releaseSubmission() in lib/dal/grading.ts

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'released_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN released_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'released_by'
  ) THEN
    ALTER TABLE submissions ADD COLUMN released_by UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
