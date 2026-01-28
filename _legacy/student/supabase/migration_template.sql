-- Migration Template with Auto-Reload
-- Copy this template when creating new migrations
-- Replace MIGRATION_NAME with descriptive name

-- ============================================
-- MIGRATION: [MIGRATION_NAME]
-- Date: [DATE]
-- Description: [DESCRIPTION]
-- ============================================

BEGIN;

-- Your migration code here
-- Example:
-- CREATE TABLE example (...);
-- ALTER TABLE example ADD COLUMN ...;
-- CREATE INDEX ...;
-- CREATE FUNCTION ...;
-- CREATE POLICY ...;

-- ============================================
-- IMPORTANT: Always end migrations with schema reload
-- This prevents PostgREST schema cache lag issues
-- ============================================
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- Post-Migration Verification
-- Add verification queries as comments:
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'example';
-- SELECT * FROM example LIMIT 1;
