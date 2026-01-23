-- ============================================================================
-- FORCE POSTGREST RELOAD SCRIPT
-- ============================================================================
-- This script forces PostgREST to reload its schema cache by:
-- 1. Verifying the schema exists and has correct permissions
-- 2. Verifying authenticator role configuration
-- 3. Sending reload signal to PostgREST
-- 4. Testing different schema name formats
-- ============================================================================

-- Step 1: Verify schema exists
\echo '=== STEP 1: Verify Schema Exists ==='
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'school software';

-- Step 2: Check what tables are in the schema
\echo ''
\echo '=== STEP 2: Tables in "school software" Schema ==='
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'school software'
ORDER BY table_name
LIMIT 10;

-- Step 3: Check authenticator role config
\echo ''
\echo '=== STEP 3: Authenticator Role Config ==='
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 4: Check permissions on schema
\echo ''
\echo '=== STEP 4: Schema Permissions ==='
SELECT
  nspname as schema_name,
  r.rolname as role_name,
  has_schema_privilege(r.oid, n.oid, 'USAGE') as has_usage,
  has_schema_privilege(r.oid, n.oid, 'CREATE') as has_create
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE n.nspname = 'school software'
  AND r.rolname IN ('anon', 'authenticated', 'authenticator')
ORDER BY r.rolname;

-- Step 5: Check permissions on tables
\echo ''
\echo '=== STEP 5: Table Permissions for anon role ==='
SELECT
  schemaname,
  tablename,
  has_table_privilege('anon', schemaname || '."' || tablename || '"', 'SELECT') as can_select,
  has_table_privilege('anon', schemaname || '."' || tablename || '"', 'INSERT') as can_insert,
  has_table_privilege('anon', schemaname || '."' || tablename || '"', 'UPDATE') as can_update,
  has_table_privilege('anon', schemaname || '."' || tablename || '"', 'DELETE') as can_delete
FROM pg_tables
WHERE schemaname = 'school software'
LIMIT 5;

-- Step 6: Try to update authenticator config (may require superuser)
\echo ''
\echo '=== STEP 6: Update Authenticator Config ==='
\echo 'Attempting to set db_schemas...'

-- Option A: Without quotes (may fail)
-- ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

-- Option B: With double quotes
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, "school software"';

-- Verify the change
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 7: Send reload signal to PostgREST
\echo ''
\echo '=== STEP 7: Send Reload Signal to PostgREST ==='
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

\echo ''
\echo '=== RELOAD COMPLETE ==='
\echo 'PostgREST should reload within 30 seconds.'
\echo 'Test the API after waiting.'
\echo ''

-- Step 8: Alternative - Try creating a view in public schema
\echo '=== STEP 8: Alternative - Create View in Public Schema ==='
\echo 'If schema access fails, we can create views in public schema...'

-- Example (commented out):
-- DROP VIEW IF EXISTS public.schools CASCADE;
-- CREATE VIEW public.schools AS SELECT * FROM "school software".schools;
-- GRANT SELECT ON public.schools TO anon, authenticated;

\echo 'To create views, uncomment the lines in this script.'
