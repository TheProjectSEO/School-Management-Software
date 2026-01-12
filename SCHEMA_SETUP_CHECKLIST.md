# 📋 Schema Setup Checklist - Do This Once

**Purpose:** Ensure all three apps (student, teacher, admin) use the correct schema
**Time Required:** 15-20 minutes
**Status:** Must be done before continuing development

---

## Part 1: Supabase Dashboard (ONE-TIME - 5 minutes)

### ⚠️ CRITICAL FIRST STEP ⚠️

Expose `"school software"` schema to PostgREST API:

1. **Open Supabase Dashboard:**
   - https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

2. **Navigate to Settings:**
   - Click "Settings" in left sidebar
   - Click "API" tab

3. **Find "Exposed schemas" setting:**
   - Look for "Extra schemas" or "Exposed schemas" field
   - Current value probably shows: `public, graphql_public`

4. **Add "school software":**
   - Update to: `public, graphql_public, "school software"`
   - **Important:** Include the quotes around "school software"

5. **Save:**
   - Click "Save" button
   - May require API restart (wait 1-2 minutes)

6. **Verify:**
   ```bash
   # Test if schema is now accessible
   curl https://qyjzqzqqjimittltttph.supabase.co/rest/v1/schools?select=id \
     -H "apikey: YOUR_ANON_KEY"

   # Should return data, NOT "PGRST106: The schema must be..." error
   ```

---

## Part 2: Teacher App (DONE ✅)

Already configured! Skip this.

---

## Part 3: Student App (DO THIS - 10 minutes)

### Navigate to student-app
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app
```

### Copy Configuration Files

```bash
# Copy universal schema docs
cp ../teacher-app/UNIVERSAL_SCHEMA_CONFIG.md .
cp ../teacher-app/.env.schema .

# Copy verification script
mkdir -p scripts
cp ../teacher-app/scripts/verify-schema.mjs scripts/

# Make executable
chmod +x scripts/verify-schema.mjs
```

### Update `lib/supabase/client.ts`

**Find and replace:**
```typescript
// Change this line:
schema: "public"  // or whatever it currently is

// To this:
schema: "school software"  // ⚠️ NEVER CHANGE

// Add this comment above the config:
/**
 * ⚠️ SCHEMA: "school software" - DO NOT CHANGE ⚠️
 *
 * Shared across student-app, teacher-app, admin-app.
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
```

### Update `lib/supabase/server.ts`

**Same as client.ts:**
```typescript
schema: "school software"  // ⚠️ NEVER CHANGE
```

### Update `package.json`

**Add these scripts:**
```json
{
  "scripts": {
    "verify-schema": "node scripts/verify-schema.mjs",
    "predev": "npm run verify-schema",
    "prebuild": "npm run verify-schema"
  }
}
```

### Verify Student App

```bash
npm run verify-schema
# Should show: ✅ Schema "school software" verified!

npm run dev
# Should start without schema errors
```

---

## Part 4: Admin App (DO THIS - 10 minutes)

### Navigate to admin-app
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/admin-app
```

### Copy Configuration Files

```bash
# Copy docs
cp ../teacher-app/UNIVERSAL_SCHEMA_CONFIG.md .
cp ../teacher-app/.env.schema .

# Copy verification script
mkdir -p scripts
cp ../teacher-app/scripts/verify-schema.mjs scripts/
chmod +x scripts/verify-schema.mjs
```

### Update `lib/supabase/client.ts`

```typescript
schema: "school software"  // ⚠️ NEVER CHANGE
```

### Update `lib/supabase/server.ts`

```typescript
schema: "school software"  // ⚠️ NEVER CHANGE
```

### Update `package.json`

```json
{
  "scripts": {
    "verify-schema": "node scripts/verify-schema.mjs",
    "predev": "npm run verify-schema",
    "prebuild": "npm run verify-schema"
  }
}
```

### Verify Admin App

```bash
npm run verify-schema
npm run dev
```

---

## Part 5: Verification (ALL APPS - 5 minutes)

### Test All Three Apps

```bash
# Terminal 1 - Student App
cd student-app
npm run dev
# Should start on port 3000 with schema verification passing

# Terminal 2 - Teacher App
cd teacher-app
npm run dev
# Should start on port 3001 with schema verification passing

# Terminal 3 - Admin App
cd admin-app
npm run dev
# Should start on port 3002 with schema verification passing
```

### Test Database Queries

**In each app, verify data loads:**
- student-app: Login → Dashboard → My Classes (should load sections)
- teacher-app: Login → My Classes (should load assigned sections)
- admin-app: Login → Schools (should load school list)

**No PGRST106 errors = SUCCESS!** ✅

---

## Future Database Work - Always Remember

### Before Creating Any Table

1. **Which app needs this table?**
   - All apps → No prefix (e.g., `sections`, `schools`)
   - Teacher only → `teacher_` prefix (e.g., `teacher_rubrics`)
   - Admin only → `admin_` prefix (e.g., `admin_audit_logs`)
   - Student only → `student_` prefix (e.g., `student_preferences`)

2. **Always use schema prefix:**
   ```sql
   CREATE TABLE "school software".table_name (...);
   -- NOT: CREATE TABLE table_name (...);
   ```

3. **Verify after creation:**
   ```bash
   npm run verify-schema
   ```

### Before Running Any Query

1. **Always prefix tables:**
   ```sql
   SELECT * FROM "school software".students WHERE grade_level = '10';
   -- NOT: SELECT * FROM students WHERE grade_level = '10';
   ```

2. **In JavaScript code:**
   ```typescript
   // Supabase client already configured with schema
   // So this is fine:
   const { data } = await supabase.from('students').select('*')
   // Supabase automatically adds "school software" prefix
   ```

---

## Red Flags (Stop and Check!)

**If you see these errors, schema is wrong:**

```
❌ PGRST106: The schema must be one of the following: public, ...
   → Schema not exposed to PostgREST API

❌ permission denied for table schools (42501)
   → Using wrong schema or missing RLS policies

❌ relation "students" does not exist
   → Missing schema prefix in raw SQL

❌ relation "public.students" does not exist
   → Using public schema (duplicates deleted)
```

**Fix:** Check lib/supabase/client.ts and server.ts use `"school software"`

---

## Maintenance

### Monthly Check

```bash
# Verify all apps still use correct schema
cd student-app && npm run verify-schema
cd ../teacher-app && npm run verify-schema
cd ../admin-app && npm run verify-schema
```

### After Adding New Developer

**Give them this checklist:**
1. Read `SCHEMA_REFERENCE.md` (this file)
2. Read `UNIVERSAL_SCHEMA_CONFIG.md` in their app folder
3. Never change schema in lib/supabase/*.ts files
4. Always prefix tables in SQL: `"school software".table_name`
5. Run `npm run verify-schema` if anything seems broken

---

## Emergency Recovery

**If someone accidentally changes schema:**

1. **Symptom:** App breaks, PGRST106 errors everywhere

2. **Fix:**
   ```bash
   # Revert Supabase clients
   cd your-app
   git checkout lib/supabase/client.ts
   git checkout lib/supabase/server.ts

   # Or manually edit:
   # lib/supabase/client.ts line ~26: schema: "school software"
   # lib/supabase/server.ts line ~20: schema: "school software"
   ```

3. **Verify:**
   ```bash
   npm run verify-schema
   ```

4. **Restart:**
   ```bash
   npm run dev
   ```

---

## Summary

**ONE SCHEMA:** `"school software"`
**THREE APPS:** All use the same schema
**TABLE PREFIXES:** Keep app-specific tables organized
**AUTO-VERIFICATION:** Prevents wrong schema from running
**DOCUMENTATION:** Multiple files ensure no confusion

**Status:**
- ✅ teacher-app configured
- ⚠️ student-app needs update (copy files)
- ⚠️ admin-app needs update (copy files)
- ⚠️ Supabase Dashboard needs to expose schema

**Time to Complete:** 15-20 minutes total

---

**Last Updated:** January 1, 2026
**Applies To:** MSU School OS v1.0 (student-app, teacher-app, admin-app)
