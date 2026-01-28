# ⚠️ SCHEMA CONFIGURATION GUIDE ⚠️

## CRITICAL: Which Schema to Use?

**Answer:** `"school software"` (with a space)

## Why This Matters

Your Supabase database has **MULTIPLE schemas**, and using the wrong one will **break the entire application**.

### Schemas in This Database

| Schema Name | Purpose | Tables Include |
|-------------|---------|----------------|
| **`"school software"`** | ✅ **CORRECT - USE THIS** | schools, sections (class sections), students, courses, teacher_profiles, modules, lessons, assessments |
| `"n8n_content_creation"` | ❌ **WRONG - Article Generator** | sections (content outlines), drafts, extracted_content, outlines, serp_results |
| `"public"` | ❌ **LEGACY - Don't Use** | Old copies of tables |

## How to Verify You're Using the Correct Schema

### Quick Test
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'school software' AND table_name = 'sections';
```

**Expected Result (CORRECT schema):**
```
id
school_id
name
grade_level
adviser_teacher_id
created_at
updated_at
```

**Wrong Result (if using n8n_content_creation):**
```
id
outline_id
heading
heading_level
parent_section_id
... (content-related fields)
```

### Automated Verification

```bash
npm run verify-schema
```

This script checks that all required tables exist in `"school software"` schema.

## Where Schema is Configured

### 1. Supabase Client (Browser)
**File:** `lib/supabase/client.ts`
```typescript
{
  db: {
    schema: "school software", // ⚠️ DO NOT CHANGE
  },
}
```

### 2. Supabase Server Client
**File:** `lib/supabase/server.ts`
```typescript
{
  db: {
    schema: "school software", // ⚠️ DO NOT CHANGE
  },
}
```

### 3. Migration Scripts (if any)
All migrations should explicitly prefix tables:
```sql
-- WRONG
CREATE TABLE sections (...);

-- CORRECT
CREATE TABLE "school software".sections (...);
```

## Common Mistakes & How to Avoid

### ❌ Mistake #1: Changing Schema Based on CLAUDE.md
**Why it happens:** CLAUDE.md may say `n8n_content_creation` because it was written for a different database setup
**Solution:** **Trust the database, not the docs**. Run `npm run verify-schema` to check reality.

### ❌ Mistake #2: Using Schema Without Quotes
**Why it happens:** Schema name has a space, needs quotes in SQL
**Solution:**
```sql
-- WRONG
SELECT * FROM school software.sections;

-- CORRECT
SELECT * FROM "school software".sections;
```

**Note:** In JavaScript config, quotes are automatic:
```javascript
schema: "school software" // This is correct
```

### ❌ Mistake #3: Assuming All Tables in Same Schema
**Why it happens:** Different projects in same Supabase instance
**Solution:** Always verify schema for each new feature/table

## Prevention System

### 1. Automated Checks
- ✅ `npm run verify-schema` runs before `npm run dev`
- ✅ `npm run verify-schema` runs before `npm run build`
- ✅ Script fails if schema is wrong, preventing deployment

### 2. Code Comments
- ✅ Big warning comments in lib/supabase/client.ts
- ✅ Big warning comments in lib/supabase/server.ts
- ✅ Explanation of why "school software" is correct

### 3. Documentation
- ✅ This SCHEMA_GUIDE.md file
- ✅ .env.schema file with explicit schema name
- ⚠️ CLAUDE.md needs update (see below)

## Updating CLAUDE.md

**CLAUDE.md currently says:** Use `n8n_content_creation` schema
**Reality:** Use `"school software"` schema

**Action Required:** Find/replace in CLAUDE.md:
```bash
# Find all occurrences
grep -n "n8n_content_creation" CLAUDE.md

# Should be replaced with
"school software"
```

**Sections to Update:**
- Line 1: "All database objects live in..."
- All SQL examples
- All schema references in data model section
- Migration file examples

## Quick Reference

### ✅ DO THIS
```typescript
// In code
const supabase = createClient()
// (Already configured with "school software")

// In SQL (if writing raw queries)
SELECT * FROM "school software".schools;
INSERT INTO "school software".sections (...);

// In migrations
CREATE TABLE "school software".teacher_rubrics (...);
```

### ❌ DON'T DO THIS
```typescript
// Don't manually override schema
const supabase = createClient({ db: { schema: "n8n_content_creation" } })

// Don't query without schema prefix in raw SQL
SELECT * FROM sections; -- Which schema?

// Don't trust CLAUDE.md blindly
// Always verify with: npm run verify-schema
```

## Emergency Recovery

If you accidentally changed the schema and the app broke:

1. **Revert the schema in code:**
   ```bash
   git diff lib/supabase/
   git checkout lib/supabase/client.ts lib/supabase/server.ts
   ```

2. **Or manually fix:**
   - Edit `lib/supabase/client.ts` line 28: `schema: "school software"`
   - Edit `lib/supabase/server.ts` line 20: `schema: "school software"`

3. **Verify:**
   ```bash
   npm run verify-schema
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Why "school software" Schema Exists

This schema was likely created to:
1. Separate school management tables from other projects in same Supabase instance
2. Isolate student/teacher data for security
3. Allow multiple projects to coexist (n8n content, hotel bookings, school management, etc.)

**This is actually GOOD architecture** - keeps projects isolated.

## Final Answer to "Which Schema?"

```
USE: "school software"
NOT: "n8n_content_creation"
NOT: "public"
```

**Always verify before making changes:**
```bash
npm run verify-schema
```

---

**Last Updated:** January 1, 2026
**Status:** Schema configuration corrected and locked down
