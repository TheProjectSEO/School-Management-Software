# SCHEMA FIX - QUICK REFERENCE

## The Problem in One Sentence
PostgREST thinks the schema is named `"school software"` (with quotes) instead of `school software` (without quotes).

## Quick Diagnostic

```bash
# Run this to see all test results
node scripts/diagnose-schema-access.mjs

# Run this to test different quote formats
node scripts/test-quote-variations.mjs
```

## Solution 1: Fix Config (5 min - TRY FIRST)

**Copy-paste this in Supabase SQL Editor:**

```sql
-- Fix the config (remove quotes from schema list)
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

-- Force reload
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
```

**Wait 60 seconds, then test:**
```bash
node scripts/test-quote-variations.mjs
```

**If it works** → You're done! ✅

**If it fails** → Go to Solution 3 ⬇️

---

## Solution 3: Rename Schema (15 min - RECOMMENDED)

**Copy-paste this in Supabase SQL Editor:**

```sql
-- Rename schema to use underscores
ALTER SCHEMA "school software" RENAME TO school_software;

-- Update config
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school_software';

-- Reload
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
```

**Update these 3 files:**

1. **lib/supabase/client.ts** (line 17):
   ```typescript
   schema: "school_software", // Changed from "school software"
   ```

2. **lib/supabase/server.ts** (line 18):
   ```typescript
   schema: "school_software", // Changed from "school software"
   ```

3. **scripts/verify-schema.mjs** (line 19):
   ```javascript
   const EXPECTED_SCHEMA = 'school_software';
   ```

**Test:**
```bash
node scripts/verify-schema.mjs
```

**Deploy:**
```bash
git add .
git commit -m "Fix: Rename schema to school_software"
git push
```

---

## Verification Commands

```bash
# Full diagnostic
node scripts/diagnose-schema-access.mjs

# Test quotes
node scripts/test-quote-variations.mjs

# Verify schema works
node scripts/verify-schema.mjs
```

## SQL Verification Commands

**Check current config:**
```sql
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';
```

**Check schema name:**
```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE '%school%software%';
```

**Check table count:**
```sql
SELECT COUNT(*) as tables
FROM information_schema.tables
WHERE table_schema IN ('school software', 'school_software');
```

## Success Indicators

You know it's fixed when:
- ✅ `node scripts/verify-schema.mjs` shows all green checkmarks
- ✅ No PGRST106 errors in API calls
- ✅ Apps can query database successfully

## If Nothing Works

1. **Check Supabase project status** - Is it online?
2. **Verify API keys** - Are they correct in `.env.local`?
3. **Check PostgREST version** - Run diagnostic to see headers
4. **Last resort** - Consider migrating to `public` schema (see full action plan)

## Key Files

- `SCHEMA_ACCESS_DIAGNOSIS.md` - Full technical explanation
- `SCHEMA_FIX_ACTION_PLAN.md` - Detailed action plan with 3 solutions
- `scripts/diagnose-schema-access.mjs` - Diagnostic script
- `scripts/test-quote-variations.mjs` - Quote testing script
- `scripts/fix-postgrest-config.sql` - SQL for Solution 1
- `scripts/rename-schema-to-underscore.sql` - SQL for Solution 3

## Support Links

- [Supabase PGRST106 Docs](https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema)
- [PostgREST Config](https://docs.postgrest.org/en/v12/references/configuration.html)
- [Schema Reload](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema)

---

**START HERE**: Try Solution 1 first (5 minutes), then Solution 3 if needed (15 minutes).
