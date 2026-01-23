-- ============================================================================
-- CRITICAL FIX #1: RESTORE "school software" SCHEMA TO POSTGREST
-- ============================================================================
--
-- ISSUE: PostgREST is showing "outsourcedaccounting" instead of "school software"
--
-- ERROR MESSAGE:
-- "The schema must be one of the following: public, graphql_public, outsourcedaccounting"
--
-- ROOT CAUSE:
-- The authenticator role's pgrst.db_schemas configuration was overwritten
-- or reverted to an old configuration that includes "outsourcedaccounting"
-- instead of "school software"
--
-- SOLUTION:
-- Reset the authenticator role to expose "school software" schema
--
-- ============================================================================

-- Step 1: Check current configuration
\echo '=== CURRENT AUTHENTICATOR CONFIG ==='
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 2: Set correct schema list
\echo ''
\echo '=== APPLYING FIX: Restore "school software" schema ==='

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

-- Verify the change
\echo ''
\echo '=== VERIFICATION: New Configuration ==='
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 3: Force PostgREST to reload
\echo ''
\echo '=== RELOADING POSTGREST ==='
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

\echo ''
\echo '=== FIX APPLIED SUCCESSFULLY ==='
\echo ''
\echo 'The authenticator role now exposes these schemas:'
\echo '  - public'
\echo '  - graphql_public'
\echo '  - school software'
\echo ''
\echo 'IMPORTANT: Wait 30-60 seconds for PostgREST to reload.'
\echo 'Then test the API at: https://qyjzqzqqjimittltttph.supabase.co/rest/v1/'
\echo ''
\echo 'Expected Result: All console errors about schema should disappear.'
\echo ''
