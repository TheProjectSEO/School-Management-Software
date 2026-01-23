-- Migration 013: Public Schools Access for Registration
-- Description: Allow unauthenticated users to read schools list for registration
-- Schema: n8n_content_creation

-- ============================================================================
-- SCHOOLS TABLE PUBLIC READ ACCESS
-- ============================================================================

-- Enable RLS on schools table (if not already enabled)
ALTER TABLE n8n_content_creation.schools ENABLE ROW LEVEL SECURITY;

-- Allow all users (including unauthenticated) to read schools
-- This is safe because schools is just a list of school names/info
-- No sensitive data is exposed
CREATE POLICY "Public can view schools for registration"
ON n8n_content_creation.schools
FOR SELECT
USING (true);

-- Comment
COMMENT ON POLICY "Public can view schools for registration" ON n8n_content_creation.schools
IS 'Allows unauthenticated users to read schools list during teacher/student registration';
