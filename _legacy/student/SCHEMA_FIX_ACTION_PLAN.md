# SCHEMA FIX - COMPLETE ACTION PLAN

## Executive Summary

**Problem**: The "school software" schema exists with correct permissions but returns PGRST106 error when accessed via API.

**Root Cause**: PostgREST configuration includes quotes in the schema name (`"school software"`), causing PostgREST to look for a schema literally named `"school software"` (with quotes as part of the name) instead of `school software`.

**Confidence**: 95% certain this is the issue based on diagnostic testing.

## Three Solutions (In Recommended Order)

### 🥇 Solution 1: Fix PostgREST Config (TRY THIS FIRST)

**Time**: 5 minutes + 60 seconds wait
**Risk**: Low
**Reversible**: Yes
**Downtime**: None

#### Steps:

1. **Run SQL in Supabase SQL Editor**:
   ```sql
   -- Fix the config
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school software';

   -- Force reload
   NOTIFY pgrst, 'reload config';
   NOTIFY pgrst, 'reload schema';
   ```

2. **Wait 60 seconds** for PostgREST to reload

3. **Test**:
   ```bash
   node scripts/test-quote-variations.mjs
   ```

4. **If successful**:
   - No application changes needed
   - Schema access will work immediately

5. **If failed**:
   - Proceed to Solution 3 (recommended) or Solution 2

---

### 🥈 Solution 3: Rename Schema (RECOMMENDED IF #1 FAILS)

**Time**: 15 minutes
**Risk**: Medium (requires code changes)
**Reversible**: Yes (can rename back)
**Downtime**: 5 minutes during deployment

This eliminates the root problem by removing spaces from the schema name.

#### Steps:

1. **Run SQL** (`scripts/rename-schema-to-underscore.sql`):
   ```sql
   -- Rename schema
   ALTER SCHEMA "school software" RENAME TO school_software;

   -- Update config
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, school_software';

   -- Reload
   NOTIFY pgrst, 'reload config';
   ```

2. **Update Application Code**:

   **File**: `lib/supabase/client.ts`
   ```typescript
   // Change line 17:
   schema: "school_software", // Changed from "school software"
   ```

   **File**: `lib/supabase/server.ts`
   ```typescript
   // Change line 18:
   schema: "school_software", // Changed from "school software"
   ```

   **File**: `scripts/verify-schema.mjs`
   ```javascript
   // Change line 19:
   const EXPECTED_SCHEMA = 'school_software'; // Changed from 'school software'
   ```

3. **Global Search & Replace**:
   ```bash
   # Find all occurrences
   grep -r "school software" . --exclude-dir=node_modules

   # Replace in all files (careful!)
   # Review each occurrence manually
   ```

4. **Test**:
   ```bash
   node scripts/verify-schema.mjs
   ```

5. **Deploy**:
   - Commit changes
   - Push to repository
   - Redeploy all apps (student, teacher, admin)

#### Advantages:
- ✅ Eliminates quote/space issues permanently
- ✅ More reliable long-term
- ✅ Better practice (no spaces in identifiers)
- ✅ Easier to work with in SQL

#### Disadvantages:
- ❌ Requires code changes across 3 apps
- ❌ Needs deployment coordination
- ❌ Brief downtime during deployment

---

### 🥉 Solution 2: Migrate to Public Schema (LAST RESORT)

**Time**: 30 minutes
**Risk**: High (major schema change)
**Reversible**: Difficult
**Downtime**: 15 minutes

Only use this if Solutions 1 and 3 both fail.

#### Steps:

1. **Move all 45 tables** to public schema:
   ```sql
   -- Generate the commands
   SELECT
     'ALTER TABLE "school software".' || table_name || ' SET SCHEMA public;' as command
   FROM information_schema.tables
   WHERE table_schema = 'school software'
   ORDER BY table_name;

   -- Execute each command
   -- (This will be a long list)
   ```

2. **Update Application Code**:
   ```typescript
   // lib/supabase/client.ts
   schema: "public", // Changed from "school software"
   ```

3. **Drop old schema**:
   ```sql
   DROP SCHEMA "school software" CASCADE;
   ```

4. **Remove authenticator config**:
   ```sql
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public';
   ```

#### Advantages:
- ✅ Works with default Supabase configuration
- ✅ No custom schema configuration needed

#### Disadvantages:
- ❌ Loses schema-based organization
- ❌ All tables in one namespace
- ❌ May conflict with other tables
- ❌ Difficult to reverse

---

## Recommended Path

### Phase 1: Quick Win Attempt (5 minutes)
1. Try Solution 1 (fix PostgREST config)
2. Wait 60 seconds
3. Test with `node scripts/test-quote-variations.mjs`
4. If works → DONE!

### Phase 2: Proper Fix (If Phase 1 fails)
1. Implement Solution 3 (rename to `school_software`)
2. Update all code
3. Test locally
4. Deploy to production

### Phase 3: Nuclear Option (If Phase 2 fails)
1. Implement Solution 2 (migrate to public)
2. This should be avoided if possible

## Files Provided

### Diagnostic Scripts
- ✅ `scripts/diagnose-schema-access.mjs` - Full diagnostic suite
- ✅ `scripts/test-quote-variations.mjs` - Test all quote formats
- ✅ `scripts/verify-schema.mjs` - Verify schema access (existing)

### Fix Scripts
- ✅ `scripts/fix-postgrest-config.sql` - Solution 1
- ✅ `scripts/rename-schema-to-underscore.sql` - Solution 3
- ✅ `scripts/force-postgrest-reload.sql` - General reload script

### Documentation
- ✅ `SCHEMA_ACCESS_DIAGNOSIS.md` - Full technical diagnosis
- ✅ `SCHEMA_FIX_ACTION_PLAN.md` - This document

## Testing Checklist

After implementing any solution:

- [ ] Run `node scripts/test-quote-variations.mjs`
- [ ] Run `node scripts/verify-schema.mjs`
- [ ] Test student app login
- [ ] Test teacher app login
- [ ] Test admin app login
- [ ] Verify all database queries work
- [ ] Check RLS policies still work
- [ ] Test all CRUD operations

## Rollback Plans

### If Solution 1 fails:
- No rollback needed (changes are minimal)
- Proceed to Solution 3

### If Solution 3 fails:
```sql
-- Rename back
ALTER SCHEMA school_software RENAME TO "school software";

-- Restore config
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, "school software"';

-- Reload
NOTIFY pgrst, 'reload config';
```

### If Solution 2 fails:
- This is difficult to rollback
- Requires restoring from backup
- **Avoid this solution if possible**

## Success Criteria

The fix is successful when:

1. ✅ `node scripts/verify-schema.mjs` passes all tests
2. ✅ API queries to schema work without PGRST106 error
3. ✅ All three apps (student, teacher, admin) can access data
4. ✅ RLS policies function correctly
5. ✅ No console errors related to schema access

## Support Resources

- [Supabase PGRST106 Docs](https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema)
- [PostgREST Config Docs](https://docs.postgrest.org/en/v12/references/configuration.html)
- [PostgREST Schema Reload](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema)
- [Reserved Characters Issue](https://github.com/supabase/postgrest-js/issues/45)

## Current Status

- ✅ Problem diagnosed
- ✅ Root cause identified
- ✅ Solutions prepared
- ⏳ Awaiting implementation decision
- ⏳ Awaiting fix implementation

---

**Next Step**: Execute Solution 1 in Supabase SQL Editor and wait 60 seconds.
