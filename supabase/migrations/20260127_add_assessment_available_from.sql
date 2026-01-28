-- Add available_from column to assessments table for scheduling when assessments become available
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN assessments.available_from IS 'Date/time when the assessment becomes available to students. NULL means immediately available when published.';

-- Create index for querying available assessments
CREATE INDEX IF NOT EXISTS idx_assessments_available_from ON assessments(available_from) WHERE available_from IS NOT NULL;
