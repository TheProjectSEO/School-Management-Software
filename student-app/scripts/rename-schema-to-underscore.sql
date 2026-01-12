-- ============================================================================
-- RENAME SCHEMA: "school software" → "school_software"
-- ============================================================================
--
-- This script renames the schema to use underscores instead of spaces,
-- which eliminates all quoting issues with PostgREST.
--
-- IMPORTANT: This is a destructive operation. Make sure you have backups!
--
-- ============================================================================

-- Step 1: Verify current schema exists
\echo '=== STEP 1: Verify Current Schema ==='
SELECT schema_name, schema_owner
FROM information_schema.schemata
WHERE schema_name = 'school software';

-- Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'school software';

-- Step 2: Check if target schema already exists
\echo ''
\echo '=== STEP 2: Check if target schema exists ==='
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'school_software';

-- If it exists, you may need to drop it first:
-- DROP SCHEMA IF EXISTS school_software CASCADE;

-- Step 3: Rename the schema
\echo ''
\echo '=== STEP 3: Rename Schema ==='
ALTER SCHEMA "school software" RENAME TO school_software;

-- Verify rename
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('school software', 'school_software');

-- Step 4: Update authenticator role config
\echo ''
\echo '=== STEP 4: Update Authenticator Config ==='
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school_software';

-- Verify
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 5: Verify permissions are maintained
\echo ''
\echo '=== STEP 5: Verify Permissions ==='
SELECT
  schemaname as schema,
  tablename as table,
  has_table_privilege('anon', schemaname || '.' || tablename, 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', schemaname || '.' || tablename, 'SELECT') as auth_can_select
FROM pg_tables
WHERE schemaname = 'school_software'
LIMIT 5;

-- Step 6: Force PostgREST reload
\echo ''
\echo '=== STEP 6: Force PostgREST Reload ==='
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

\echo ''
\echo '==================================================================='
\echo 'SCHEMA RENAME COMPLETE!'
\echo '==================================================================='
\echo ''
\echo 'Schema renamed: "school software" → school_software'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Update lib/supabase/client.ts - change schema to "school_software"'
\echo '2. Update lib/supabase/server.ts - change schema to "school_software"'
\echo '3. Update any documentation mentioning "school software"'
\echo '4. Wait 30-60 seconds for PostgREST to reload'
\echo '5. Run: node scripts/verify-schema.mjs'
\echo ''
\echo 'Search and replace in codebase:'
\echo '  Find: "school software"'
\echo '  Replace: school_software'
\echo ''
