-- Add missing academic settings columns to school_settings table
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS attendance_required  INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS max_absences         INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS late_threshold       INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS class_start_time     TEXT    NOT NULL DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS class_end_time       TEXT    NOT NULL DEFAULT '17:00';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'school_settings'
  AND column_name IN ('attendance_required','max_absences','late_threshold','class_start_time','class_end_time');
