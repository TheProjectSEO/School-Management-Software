-- Check lesson_attachments table columns and their data types
-- Run this in Supabase SQL Editor to verify the schema

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'lesson_attachments'
ORDER BY
  ordinal_position;

-- Expected columns for proper attachment functionality:
-- 1. id (uuid, NOT NULL, primary key)
-- 2. lesson_id (uuid, NOT NULL, foreign key to lessons)
-- 3. title (text/varchar, NOT NULL) - Used as file_name in frontend
-- 4. description (text, nullable)
-- 5. file_url (text, NOT NULL)
-- 6. file_type (text/varchar, nullable) - MIME type
-- 7. file_size_bytes (integer/bigint, nullable) - File size in bytes
-- 8. order_index (integer, NOT NULL, default 0)
-- 9. download_count (integer, NOT NULL, default 0)
-- 10. created_at (timestamp, NOT NULL)
-- 11. created_by (uuid, nullable, foreign key to school_profiles)
-- 12. updated_at (timestamp, NOT NULL)

-- If any columns are missing, you may need to run a migration to add them
