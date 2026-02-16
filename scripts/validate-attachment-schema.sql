-- Comprehensive validation of lesson_attachments table schema
-- This will show which required columns are present or missing

-- Step 1: Check if table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'lesson_attachments'
    ) THEN '✓ lesson_attachments table exists'
    ELSE '✗ lesson_attachments table NOT FOUND'
  END AS table_check;

-- Step 2: List all existing columns with their properties
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN (
      'id', 'lesson_id', 'title', 'file_url', 'file_type',
      'file_size_bytes', 'order_index', 'download_count',
      'created_at', 'created_by', 'updated_at', 'description'
    ) THEN '✓ Required'
    ELSE 'Extra column'
  END AS status
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'lesson_attachments'
ORDER BY
  ordinal_position;

-- Step 3: Check for missing required columns
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'id',
    'lesson_id',
    'title',
    'description',
    'file_url',
    'file_type',
    'file_size_bytes',
    'order_index',
    'download_count',
    'created_at',
    'created_by',
    'updated_at'
  ]) AS column_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'lesson_attachments'
)
SELECT
  r.column_name AS missing_column,
  '✗ MISSING' AS status
FROM
  required_columns r
WHERE
  r.column_name NOT IN (SELECT column_name FROM existing_columns);

-- Step 4: Verify critical column data types
SELECT
  c.column_name,
  c.data_type AS current_type,
  CASE c.column_name
    WHEN 'id' THEN 'uuid'
    WHEN 'lesson_id' THEN 'uuid'
    WHEN 'title' THEN 'text/varchar'
    WHEN 'description' THEN 'text'
    WHEN 'file_url' THEN 'text'
    WHEN 'file_type' THEN 'text/varchar'
    WHEN 'file_size_bytes' THEN 'bigint/integer'
    WHEN 'order_index' THEN 'integer'
    WHEN 'download_count' THEN 'integer'
    WHEN 'created_at' THEN 'timestamp'
    WHEN 'created_by' THEN 'uuid'
    WHEN 'updated_at' THEN 'timestamp'
  END AS expected_type,
  CASE
    WHEN c.column_name = 'id' AND c.data_type = 'uuid' THEN '✓'
    WHEN c.column_name = 'lesson_id' AND c.data_type = 'uuid' THEN '✓'
    WHEN c.column_name = 'title' AND c.data_type IN ('text', 'character varying') THEN '✓'
    WHEN c.column_name = 'description' AND c.data_type = 'text' THEN '✓'
    WHEN c.column_name = 'file_url' AND c.data_type = 'text' THEN '✓'
    WHEN c.column_name = 'file_type' AND c.data_type IN ('text', 'character varying') THEN '✓'
    WHEN c.column_name = 'file_size_bytes' AND c.data_type IN ('bigint', 'integer') THEN '✓'
    WHEN c.column_name = 'order_index' AND c.data_type = 'integer' THEN '✓'
    WHEN c.column_name = 'download_count' AND c.data_type = 'integer' THEN '✓'
    WHEN c.column_name = 'created_at' AND c.data_type LIKE 'timestamp%' THEN '✓'
    WHEN c.column_name = 'created_by' AND c.data_type = 'uuid' THEN '✓'
    WHEN c.column_name = 'updated_at' AND c.data_type LIKE 'timestamp%' THEN '✓'
    ELSE '✗ Type mismatch'
  END AS type_check
FROM
  information_schema.columns c
WHERE
  c.table_schema = 'public'
  AND c.table_name = 'lesson_attachments'
  AND c.column_name IN (
    'id', 'lesson_id', 'title', 'description', 'file_url',
    'file_type', 'file_size_bytes', 'order_index', 'download_count',
    'created_at', 'created_by', 'updated_at'
  )
ORDER BY
  c.ordinal_position;

-- Step 5: Check constraints and indexes
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
  END AS constraint_description
FROM
  pg_constraint con
  JOIN pg_class cls ON con.conrelid = cls.oid
  JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE
  nsp.nspname = 'public'
  AND cls.relname = 'lesson_attachments';

-- Step 6: Check if there are any existing attachments
SELECT
  COUNT(*) AS total_attachments,
  COUNT(CASE WHEN file_size_bytes IS NULL THEN 1 END) AS missing_file_size,
  COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) AS missing_title,
  COUNT(CASE WHEN file_url IS NULL OR file_url = '' THEN 1 END) AS missing_file_url
FROM
  lesson_attachments;
