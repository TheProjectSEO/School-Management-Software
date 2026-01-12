# 🏫 MSU School OS - Database Schema Reference
## For ALL Apps: student-app, teacher-app, admin-app

---

## ⚠️ CRITICAL: Which Schema to Use?

**Answer:** `"school software"` (with quotes, includes space)

**Apps Using This Schema:**
- ✅ student-app (port 3000)
- ✅ teacher-app (port 3001)
- ✅ admin-app (port 3002)

---

## The Rule (Apply to ALL Apps)

### In Code (JavaScript/TypeScript)
```typescript
// lib/supabase/client.ts and server.ts in ALL apps
{
  db: {
    schema: "school software"  // ⚠️ NEVER CHANGE
  }
}
```

### In SQL (Migrations, Queries)
```sql
-- ALWAYS prefix table names
SELECT * FROM "school software".students;
INSERT INTO "school software".sections (...) VALUES (...);
CREATE TABLE "school software".new_table (...);
```

### In Supabase MCP
```typescript
// ALWAYS use schema prefix in queries
mcp__supabase__execute_sql({
  query: `SELECT * FROM "school software".schools;`
})

mcp__supabase__apply_migration({
  name: "migration_name",
  query: `CREATE TABLE "school software".table_name (...);`
})
```

---

## Setup Checklist for Each App

Copy these steps for **student-app**, **teacher-app**, and **admin-app**:

### 1. Copy Files
- [ ] `UNIVERSAL_SCHEMA_CONFIG.md` → to app folder
- [ ] `.env.schema` → to app folder
- [ ] `scripts/verify-schema.mjs` → to app/scripts/ folder

### 2. Update Supabase Clients
- [ ] Edit `lib/supabase/client.ts` → Set `schema: "school software"`
- [ ] Edit `lib/supabase/server.ts` → Set `schema: "school software"`
- [ ] Add warning comments (see template in UNIVERSAL_SCHEMA_CONFIG.md)

### 3. Update package.json
```json
{
  "scripts": {
    "verify-schema": "node scripts/verify-schema.mjs",
    "predev": "npm run verify-schema",
    "prebuild": "npm run verify-schema"
  }
}
```

### 4. Verify Setup
```bash
cd student-app && npm run verify-schema  # Should pass
cd ../teacher-app && npm run verify-schema  # Should pass
cd ../admin-app && npm run verify-schema  # Should pass
```

---

## Database Architecture

### Schema Structure

```
Supabase Database (qyjzqzqqjimittltttph)
│
├── "school software" ← ✅ ALL school tables here (ONLY use this)
│   ├── Shared Tables (all apps use these)
│   │   ├── schools
│   │   ├── sections (class sections: Grade 10-A, etc.)
│   │   ├── students
│   │   ├── courses
│   │   ├── profiles
│   │   ├── modules
│   │   ├── lessons
│   │   ├── assessments
│   │   ├── submissions
│   │   ├── enrollments
│   │   └── questions, answer_options, student_answers
│   │
│   ├── Teacher Tables (teacher-app specific)
│   │   ├── teacher_profiles
│   │   ├── teacher_assignments
│   │   ├── teacher_transcripts
│   │   ├── teacher_notes
│   │   ├── teacher_live_sessions
│   │   ├── teacher_rubric_templates
│   │   └── teacher_* (all teacher-prefixed tables)
│   │
│   ├── Admin Tables (admin-app specific)
│   │   ├── admin_profiles
│   │   ├── admin_audit_logs
│   │   └── admin_* (all admin-prefixed tables)
│   │
│   └── Student Tables (student-app specific, if any)
│       ├── student_progress
│       └── student_* (if needed)
│
├── "n8n_content_creation" ← ❌ DIFFERENT PROJECT (article generation)
│   ├── outlines (article outlines, NOT school content)
│   ├── sections (article sections, NOT class sections)
│   ├── drafts (article drafts)
│   └── ... (content generation tables)
│
└── "public" ← ❌ EMPTY (duplicates deleted)
```

---

## Table Naming Rules

### When Creating New Tables

**Ask:** Will this table be used by multiple apps or just one?

#### Shared Tables (Multiple Apps)
**Format:** `table_name` (no prefix)

**Examples:**
- `schools` - Used by student, teacher, admin apps
- `sections` - Used by student, teacher, admin apps
- `courses` - Used by student, teacher, admin apps

**SQL:**
```sql
CREATE TABLE "school software".table_name (...);
```

#### App-Specific Tables
**Format:** `{app}_table_name`

**Examples:**
- `teacher_rubrics` - Only teacher-app uses this
- `admin_audit_logs` - Only admin-app uses this
- `student_preferences` - Only student-app uses this

**SQL:**
```sql
CREATE TABLE "school software".teacher_table_name (...);
CREATE TABLE "school software".admin_table_name (...);
CREATE TABLE "school software".student_table_name (...);
```

---

## Migration Coordination

Since all apps share the same database:

### Migration Folder Structure

Each app has its own migrations folder, but they all write to same schema:

```
student-app/supabase/migrations/
  001_initial_schema.sql         → Creates schools, sections, students
  002_student_features.sql       → Creates student_progress, etc.

teacher-app/supabase/migrations/
  001_teacher_profiles.sql       → Creates teacher_profiles
  002_teacher_content.sql        → Creates teacher_transcripts, etc.
  003_teacher_assessments.sql    → Creates teacher_question_banks, etc.

admin-app/supabase/migrations/
  001_admin_profiles.sql         → Creates admin_profiles
  002_admin_audit.sql            → Creates admin_audit_logs, etc.
```

**Important:** All migrations write to `"school software"` schema!

### Avoiding Conflicts

**Rule:** Each app creates tables with its prefix, OR creates shared tables only if they don't exist yet.

**Example:**
```sql
-- Student app creates shared table (safe - uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "school software".schools (...);

-- Teacher app creates teacher-specific table (safe - different prefix)
CREATE TABLE IF NOT EXISTS "school software".teacher_profiles (...);

-- Admin app creates admin-specific table (safe - different prefix)
CREATE TABLE IF NOT EXISTS "school software".admin_audit_logs (...);
```

---

## Supabase Dashboard Configuration

### ONE-TIME SETUP REQUIRED

**Expose Schema to PostgREST API:**

1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph
2. Settings → API
3. Find "Exposed schemas" or "Extra search paths"
4. Add: `"school software"`
5. Save

**This makes the schema accessible to all three apps via REST API!**

---

## Verification Command (Same for All Apps)

```bash
# In student-app folder
npm run verify-schema

# In teacher-app folder
npm run verify-schema

# In admin-app folder
npm run verify-schema

# All should show: ✅ Schema "school software" verified!
```

---

## Quick Copy-Paste for Each App

### For student-app:

```bash
cd student-app

# Copy files
cp ../teacher-app/UNIVERSAL_SCHEMA_CONFIG.md .
cp ../teacher-app/.env.schema .
cp ../teacher-app/scripts/verify-schema.mjs scripts/

# Update package.json (add verify-schema scripts)
# Update lib/supabase/client.ts (use template above)
# Update lib/supabase/server.ts (use template above)

# Verify
npm run verify-schema
```

### For admin-app:

```bash
cd admin-app

# Copy files
cp ../teacher-app/UNIVERSAL_SCHEMA_CONFIG.md .
cp ../teacher-app/.env.schema .
cp ../teacher-app/scripts/verify-schema.mjs scripts/

# Update package.json
# Update lib/supabase/client.ts
# Update lib/supabase/server.ts

# Verify
npm run verify-schema
```

---

## Remember This Forever

**ONE SCHEMA FOR ALL APPS:**

```
student-app  ┐
teacher-app  ├─→ "school software" schema
admin-app    ┘
```

**Prefixes keep tables organized:**
- No prefix = shared across all apps
- `teacher_` = teacher-app only
- `admin_` = admin-app only
- `student_` = student-app only (if needed)

**Verification prevents mistakes:**
- `npm run verify-schema` fails if wrong schema
- Pre-hooks run verification automatically
- Can't start dev server with wrong config

---

**Created:** January 1, 2026
**Status:** ✅ PERMANENT SOLUTION
**Location:** Copy this to all three app folders + keep one in parent folder
