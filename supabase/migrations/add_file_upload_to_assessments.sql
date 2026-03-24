-- Add file upload fields to assessments table
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS requires_file_upload BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS file_upload_instructions TEXT,
  ADD COLUMN IF NOT EXISTS allowed_file_types TEXT DEFAULT 'any';

-- Add file_attachments column to submissions table
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]'::jsonb;
