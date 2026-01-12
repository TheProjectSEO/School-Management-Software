# How to Expose "school software" Schema to PostgREST API

## The Problem

The `"school software"` schema exists in Postgres but is **NOT accessible** via Supabase's REST API because PostgREST hasn't been configured to expose it.

Current error:
```
PGRST106: The schema must be one of the following: public, graphql_public, Modular-buildings.co, LondonHotels, n8n_content_creation
```

Notice `"school software"` is **NOT** in that list!

## The Solution

### Option 1: Configure in Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

2. **Navigate to Settings → API:**
   - Click "Settings" in sidebar
   - Click "API" tab

3. **Find "Exposed schemas" setting:**
   - Look for "Extra schemas" or "Exposed schemas" section
   - This controls which schemas PostgREST can access

4. **Add "school software" to exposed schemas:**
   - Current value probably: `public`
   - Change to: `public, "school software"` (with quotes because of space)
   - **Or just:** `"school software"` (if you don't need public)

5. **Save and restart API:**
   - Click "Save"
   - May require project restart (1-2 minutes)

### Option 2: Use Supabase CLI (If you have it set up)

```bash
# In your Supabase config
supabase settings update --api-extra-search-paths='"school software"'
```

### Option 3: Rename Schema (If Modification is Allowed)

If you have the ability to rename the schema (requires superuser):

```sql
-- Rename schema to remove space
ALTER SCHEMA "school software" RENAME TO school_software;
```

Then update app config to:
```typescript
schema: "school_software" // No space
```

**Pros:** Easier to work with (no quotes needed)
**Cons:** Requires schema rename, may affect other apps

## Verification

After exposing the schema, verify it works:

```bash
# Run the verification script
npm run verify-schema

# Or test directly
curl -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://qyjzqzqqjimittltttph.supabase.co/rest/v1/schools?select=id,name"

# Should return schools data, not PGRST106 error
```

## Which Option Should You Choose?

### **Recommended: Option 1 (Expose Schema in Dashboard)**
- ✅ No schema rename needed
- ✅ Preserves existing schema name
- ✅ Quick (5 minutes)
- ✅ No code changes beyond app config
- ⚠️ Requires dashboard access

### If Dashboard doesn't have the option: Option 3 (Rename Schema)
- ⚠️ Requires superuser/admin access
- ⚠️ May affect other apps using this database
- ✅ Removes space from schema name (cleaner)
- ✅ Permanent solution

## After Exposing Schema

Once "school software" is exposed to PostgREST:

1. **Verify app config:**
   - `lib/supabase/client.ts` → `schema: "school software"`
   - `lib/supabase/server.ts` → `schema: "school software"`

2. **Run verification:**
   ```bash
   npm run verify-schema
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Test registration:**
   - Schools dropdown should load
   - Registration should complete
   - No PGRST106 errors

---

**ACTION REQUIRED:** Go to Supabase Dashboard and expose `"school software"` schema to PostgREST API.
