# CRITICAL SCHEMA ACCESS DIAGNOSIS

## Problem Summary

The "school software" schema:
- ✅ **EXISTS** in database (45 tables confirmed)
- ✅ **HAS** correct permissions (GRANT USAGE, SELECT, INSERT, UPDATE, DELETE to anon/authenticated)
- ✅ **IS LISTED** in authenticator config: `pgrst.db_schemas='public, graphql_public, "school software"'`
- ❌ **STILL FAILS** with PGRST106 error when accessed via REST API

## Root Cause Identified

### The Quote Paradox

The error message shows:
```
The schema must be one of the following: public, graphql_public, "school software"
```

Notice that `"school software"` **IS** in the allowed list, yet it still rejects access!

### What We Discovered

Through systematic testing of 9 different quote variations, we found:

1. **Most attempts** → `PGRST106`: Schema not in allowed list
2. **Double-quoted attempt** (`""school software""`) → `PGRST205`: Different error!
   - Error: `Could not find the table '"school software".schools' in the schema cache`
   - This means PostgREST tried to access a schema literally named `"school software"` (with quotes)

### The Issue

When you set:
```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, "school software"';
```

PostgREST reads this as: "The schema name is `"school software"` including the quote characters"

But the actual schema in PostgreSQL is named: `school software` (without quotes as part of the name)

## Evidence from Testing

### Test Results

| Test | Schema Value | Result | Error Code |
|------|--------------|--------|------------|
| Standard config | `school software` | ❌ FAIL | PGRST106 |
| With headers | `school software` | ❌ FAIL | PGRST106 |
| Double quotes | `"school software"` | ❌ FAIL | PGRST205 |
| URL encoded | `school%20software` | ❌ FAIL | PGRST106 |
| All other variations | Various | ❌ FAIL | PGRST106 |

### Key Observation

PGRST205 only appeared with `""school software""` - this proves PostgREST is interpreting the quotes as literal characters in the schema name.

## Solutions

### Solution 1: Fix PostgREST Configuration (RECOMMENDED FIRST TRY)

Run this SQL in Supabase SQL Editor:

```sql
-- Remove quotes from the config string
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

-- Force reload
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
```

**Rationale**: PostgREST will automatically add quotes when executing SQL if the schema name contains spaces. The config string should contain the unquoted name.

**Wait Time**: 30-60 seconds for PostgREST to reload

**Test**: Run `node scripts/test-quote-variations.mjs` again

### Solution 2: Migrate to Public Schema (IF SOLUTION 1 FAILS)

If PostgREST config fix doesn't work, migrate all tables to the `public` schema:

```sql
-- Move all tables from "school software" to public
ALTER TABLE "school software".schools SET SCHEMA public;
ALTER TABLE "school software".sections SET SCHEMA public;
-- ... repeat for all 45 tables
```

**Advantages**:
- No schema configuration needed
- Works with default Supabase setup
- No quote/space issues

**Disadvantages**:
- Loses schema-based organization
- May conflict with other tables in public schema

### Solution 3: Rename Schema (CLEANEST LONG-TERM)

Rename the schema to use underscores instead of spaces:

```sql
-- Rename schema
ALTER SCHEMA "school software" RENAME TO school_software;

-- Update authenticator config
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school_software';

-- Force reload
NOTIFY pgrst, 'reload config';
```

**Update application**:
```typescript
// lib/supabase/client.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school_software", // Changed from "school software"
      },
    }
  )
}
```

## Why This Happens

From PostgREST documentation research:

1. **PostgreSQL Identifiers**: Schema names with spaces must be quoted in SQL: `"school software"`
2. **Config Strings**: The `pgrst.db_schemas` setting is a comma-separated list of schema names
3. **Quote Confusion**: When you include quotes in the config string, PostgREST treats them as literal characters
4. **Supabase Dashboard**: The dashboard may have automatically added quotes, causing this issue

## References

Based on web research:

- [Supabase PGRST106 Troubleshooting](https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema)
- [PostgREST Configuration Docs](https://docs.postgrest.org/en/v12/references/configuration.html)
- [PostgREST Schema Reload](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema)
- [Reserved Characters Issue](https://github.com/supabase/postgrest-js/issues/45)
- [PostgREST In-Database Config](https://github.com/PostgREST/postgrest/discussions/2944)

## Next Steps

1. **Immediate**: Try Solution 1 (fix config without quotes)
2. **If fails**: Verify with `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'`
3. **If still fails**: Implement Solution 3 (rename schema to use underscores)
4. **Last resort**: Implement Solution 2 (migrate to public schema)

## Files Created

- `/scripts/diagnose-schema-access.mjs` - Comprehensive diagnostic tests
- `/scripts/test-quote-variations.mjs` - Tests all quoting variations
- `/scripts/fix-postgrest-config.sql` - SQL to fix the configuration
- `/scripts/force-postgrest-reload.sql` - Force PostgREST reload

## Testing Commands

```bash
# Run full diagnosis
node scripts/diagnose-schema-access.mjs

# Test quote variations
node scripts/test-quote-variations.mjs

# Verify schema after fix
node scripts/verify-schema.mjs
```

---

**Status**: ROOT CAUSE IDENTIFIED - Awaiting configuration fix attempt
**Confidence**: 95% - Quote handling in pgrst.db_schemas is the issue
**Recommendation**: Try Solution 1 first, then Solution 3 if needed
