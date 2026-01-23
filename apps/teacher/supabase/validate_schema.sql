-- Validation Script for Teacher App Database Schema
-- Run this after applying all migrations to verify everything is correct

-- ============================================================================
-- VALIDATION 1: Check all tables exist in n8n_content_creation schema
-- ============================================================================
SELECT 'VALIDATION 1: Checking tables exist...' as status;

SELECT
  CASE
    WHEN COUNT(*) = 20 THEN '✅ PASS: All 20 teacher tables exist'
    ELSE '❌ FAIL: Expected 20 tables, found ' || COUNT(*)
  END as result
FROM information_schema.tables
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%';

-- List all teacher tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
ORDER BY table_name;

-- ============================================================================
-- VALIDATION 2: Check no tables in public schema
-- ============================================================================
SELECT 'VALIDATION 2: Checking no teacher tables in public schema...' as status;

SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: No teacher tables in public schema'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' teacher tables in public schema'
  END as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'teacher_%';

-- ============================================================================
-- VALIDATION 3: Check RLS enabled on all tables
-- ============================================================================
SELECT 'VALIDATION 3: Checking RLS enabled...' as status;

SELECT
  CASE
    WHEN COUNT(*) = 20 THEN '✅ PASS: RLS enabled on all 20 tables'
    ELSE '❌ FAIL: RLS not enabled on all tables (' || COUNT(*) || '/20)'
  END as result
FROM pg_tables
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%'
  AND rowsecurity = true;

-- List tables without RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%'
  AND rowsecurity = false;

-- ============================================================================
-- VALIDATION 4: Check foreign keys exist
-- ============================================================================
SELECT 'VALIDATION 4: Checking foreign key constraints...' as status;

SELECT
  CASE
    WHEN COUNT(*) >= 30 THEN '✅ PASS: Found ' || COUNT(*) || ' foreign keys'
    ELSE '⚠️  WARNING: Only ' || COUNT(*) || ' foreign keys (expected ~30+)'
  END as result
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- VALIDATION 5: Check check constraints exist
-- ============================================================================
SELECT 'VALIDATION 5: Checking check constraints...' as status;

SELECT
  CASE
    WHEN COUNT(*) >= 40 THEN '✅ PASS: Found ' || COUNT(*) || ' check constraints'
    ELSE '⚠️  WARNING: Only ' || COUNT(*) || ' check constraints (expected ~40+)'
  END as result
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'CHECK';

-- ============================================================================
-- VALIDATION 6: Check indexes exist
-- ============================================================================
SELECT 'VALIDATION 6: Checking indexes...' as status;

SELECT
  CASE
    WHEN COUNT(*) >= 60 THEN '✅ PASS: Found ' || COUNT(*) || ' indexes'
    ELSE '⚠️  WARNING: Only ' || COUNT(*) || ' indexes (expected ~60+)'
  END as result
FROM pg_indexes
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%';

-- ============================================================================
-- VALIDATION 7: Check triggers exist
-- ============================================================================
SELECT 'VALIDATION 7: Checking triggers...' as status;

SELECT
  CASE
    WHEN COUNT(*) >= 15 THEN '✅ PASS: Found ' || COUNT(*) || ' triggers'
    ELSE '⚠️  WARNING: Only ' || COUNT(*) || ' triggers (expected ~15+)'
  END as result
FROM information_schema.triggers
WHERE event_object_schema = 'n8n_content_creation'
  AND event_object_table LIKE 'teacher_%';

-- ============================================================================
-- VALIDATION 8: Check helper functions exist
-- ============================================================================
SELECT 'VALIDATION 8: Checking helper functions...' as status;

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'n8n_content_creation'
  AND (
    routine_name LIKE '%teacher%'
    OR routine_name LIKE 'current_%'
    OR routine_name LIKE 'is_%'
    OR routine_name LIKE 'get_%'
    OR routine_name LIKE 'calculate_%'
    OR routine_name LIKE 'generate_%'
    OR routine_name LIKE 'release_%'
    OR routine_name LIKE 'detect_%'
  )
ORDER BY routine_name;

-- ============================================================================
-- VALIDATION 9: Check RLS policies exist
-- ============================================================================
SELECT 'VALIDATION 9: Checking RLS policies...' as status;

SELECT
  CASE
    WHEN COUNT(*) >= 40 THEN '✅ PASS: Found ' || COUNT(*) || ' RLS policies'
    ELSE '❌ FAIL: Only ' || COUNT(*) || ' policies (expected ~40+)'
  END as result
FROM pg_policies
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%';

-- List all policies by table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- VALIDATION 10: Check unique constraints
-- ============================================================================
SELECT 'VALIDATION 10: Checking unique constraints...' as status;

SELECT
  table_name,
  constraint_name
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'UNIQUE'
ORDER BY table_name;

-- ============================================================================
-- VALIDATION 11: Check JSONB columns exist
-- ============================================================================
SELECT 'VALIDATION 11: Checking JSONB columns...' as status;

SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND data_type = 'jsonb'
ORDER BY table_name, column_name;

-- ============================================================================
-- VALIDATION 12: Test RLS helper functions
-- ============================================================================
SELECT 'VALIDATION 12: Testing RLS helper functions...' as status;

-- These should not error (will return NULL if not authenticated)
SELECT
  'current_profile_id' as function_name,
  n8n_content_creation.current_profile_id() as result
UNION ALL
SELECT
  'is_teacher',
  n8n_content_creation.is_teacher()::text
UNION ALL
SELECT
  'is_student',
  n8n_content_creation.is_student()::text;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '
================================================================================
VALIDATION COMPLETE
================================================================================

Next Steps:
1. Review any ❌ FAIL or ⚠️  WARNING messages above
2. If all validations pass, generate TypeScript types:
   npx supabase gen types typescript --project-id <id> > types/supabase.ts

3. Create Data Access Layer functions in /lib/dal/teacher/

4. Build frontend components for teacher portal

5. Test RLS policies with real users

================================================================================
' as summary;

-- ============================================================================
-- QUICK STATS
-- ============================================================================
SELECT 'SCHEMA STATISTICS' as section;

SELECT
  'Tables' as metric,
  COUNT(*)::text as count
FROM information_schema.tables
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
UNION ALL
SELECT
  'Columns',
  COUNT(*)::text
FROM information_schema.columns
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
UNION ALL
SELECT
  'Foreign Keys',
  COUNT(*)::text
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'FOREIGN KEY'
UNION ALL
SELECT
  'Check Constraints',
  COUNT(*)::text
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'CHECK'
UNION ALL
SELECT
  'Unique Constraints',
  COUNT(*)::text
FROM information_schema.table_constraints
WHERE constraint_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
  AND constraint_type = 'UNIQUE'
UNION ALL
SELECT
  'Indexes',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%'
UNION ALL
SELECT
  'Triggers',
  COUNT(*)::text
FROM information_schema.triggers
WHERE event_object_schema = 'n8n_content_creation'
  AND event_object_table LIKE 'teacher_%'
UNION ALL
SELECT
  'Functions',
  COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'n8n_content_creation'
  AND routine_name LIKE '%teacher%'
UNION ALL
SELECT
  'RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%';
