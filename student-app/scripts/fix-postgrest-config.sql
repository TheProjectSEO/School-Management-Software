-- ============================================================================
-- FIX POSTGREST CONFIGURATION FOR "school software" SCHEMA
-- ============================================================================
--
-- PROBLEM IDENTIFIED:
-- The authenticator role has: pgrst.db_schemas='public, graphql_public, "school software"'
-- But PostgREST is treating "school software" (with quotes) as a LITERAL schema name
-- including the quotes as part of the name!
--
-- SOLUTION:
-- We need to configure the setting WITHOUT quotes in the config string,
-- because PostgREST will add quotes when needed.
--
-- ============================================================================

-- Step 1: Check current configuration
\echo '=== CURRENT AUTHENTICATOR CONFIG ==='
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 2: Try setting WITHOUT quotes in the config string
\echo ''
\echo '=== ATTEMPTING FIX: Set config without embedded quotes ==='

-- This should work:
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

-- Verify the change
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';

-- Step 3: Force PostgREST to reload
\echo ''
\echo '=== SENDING RELOAD SIGNALS ==='
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

\echo ''
\echo '=== FIX APPLIED ==='
\echo 'The authenticator role now has: school software (without quotes in config)'
\echo 'PostgREST will add quotes when needed during SQL execution.'
\echo ''
\echo 'Wait 30-60 seconds for PostgREST to reload, then test the API.'
\echo ''

-- Step 4: If the above doesn't work, try with escaped quotes
-- \echo '=== ALTERNATIVE: Try with escaped quotes ==='
-- ALTER ROLE authenticator SET pgrst.db_schemas = E'public, graphql_public, \"school software\"';
--
-- SELECT rolname, rolconfig
-- FROM pg_roles
-- WHERE rolname = 'authenticator';
--
-- NOTIFY pgrst, 'reload config';
