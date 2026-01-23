# 🔒 UNIVERSAL SCHEMA CONFIGURATION
## Copy this to ALL apps: student-app, teacher-app, admin-app

---

## ⚠️ THE SINGLE SOURCE OF TRUTH ⚠️

**Schema:** `"school software"` (with quotes, with space)

**Rule:** ALL database operations for student-app, teacher-app, and admin-app use this schema. No exceptions.

---

## Quick Reference

```javascript
// In all Supabase client configs
{
  db: {
    schema: "school software"  // ⚠️ NEVER CHANGE THIS
  }
}
```

```sql
-- In all SQL queries (migrations, execute_sql, etc.)
SELECT * FROM "school software".sections;
INSERT INTO "school software".students (...) VALUES (...);
CREATE TABLE "school software".new_table (...);
```

---

## Files to Copy to Each App

### 1. Update `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

/**
 * ⚠️ SCHEMA: "school software" - DO NOT CHANGE ⚠️
 *
 * This schema is shared across:
 * - student-app
 * - teacher-app
 * - admin-app
 *
 * All school management tables are here.
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school software", // ⚠️ NEVER CHANGE
      },
    }
  )
}

export function createPublicSchemaClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
    }
  )
}
```

### 2. Update `lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ⚠️ SCHEMA: "school software" - DO NOT CHANGE ⚠️
 *
 * Shared across student-app, teacher-app, admin-app.
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school software", // ⚠️ NEVER CHANGE
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - can ignore
          }
        },
      },
    }
  );
}

export async function createPublicSchemaClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

### 3. Create `.env.schema` (copy to root of each app)

```bash
# ⚠️ SCHEMA CONFIGURATION FOR MSU SCHOOL OS ⚠️
#
# Schema used by ALL apps (student, teacher, admin): "school software"
#
# DO NOT change this to:
# - "public" (duplicates deleted)
# - "n8n_content_creation" (different project)
# - Any other schema
#
# Verification: npm run verify-schema

SUPABASE_SCHEMA="school software"
```

### 4. Create `scripts/verify-schema.mjs` (copy to each app)

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCHEMA = 'school software';

// Core tables that MUST exist (shared across all apps)
const REQUIRED_TABLES = [
  'schools',
  'sections',
  'students',
  'courses',
  'profiles',
  'teacher_profiles', // Teacher-specific but in same schema
  'assessments',
  'modules',
  'lessons',
  'enrollments'
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { db: { schema: SCHEMA } }
);

async function verify() {
  console.log(`🔍 Verifying schema: "${SCHEMA}"\n`);

  let allPassed = true;

  for (const table of REQUIRED_TABLES) {
    process.stdout.write(`Checking ${table}... `);

    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(0);

    if (error) {
      console.log(`❌ FAIL: ${error.message}`);
      allPassed = false;
    } else {
      console.log('✅');
    }
  }

  if (allPassed) {
    console.log(`\n✅ Schema "${SCHEMA}" verified!`);
    process.exit(0);
  } else {
    console.log('\n❌ Verification failed!');
    console.log('\n⚠️  Check:');
    console.log(`1. lib/supabase/client.ts uses schema: "${SCHEMA}"`);
    console.log(`2. lib/supabase/server.ts uses schema: "${SCHEMA}"`);
    console.log('3. Schema is exposed in Supabase Dashboard → Settings → API');
    process.exit(1);
  }
}

verify();
```

### 5. Update `package.json` (in each app)

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "verify-schema": "node scripts/verify-schema.mjs",
    "predev": "npm run verify-schema",
    "prebuild": "npm run verify-schema"
  }
}
```

**Note:** Change port for each app:
- student-app: `3000`
- teacher-app: `3001`
- admin-app: `3002`

---

## Migration Template (Shared Across All Apps)

When creating migrations in ANY app, use this template:

```sql
-- ============================================================================
-- Migration: [descriptive_name]
-- App: [student-app | teacher-app | admin-app]
-- Schema: "school software" ⚠️ REQUIRED
-- Description: [What this migration does]
-- Date: [YYYY-MM-DD]
-- ============================================================================

-- Example: Create a new table
CREATE TABLE IF NOT EXISTS "school software".table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES "school software".schools(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "school software".table_name ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "policy_name"
ON "school software".table_name
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM "school software".students
    WHERE profile_id IN (
      SELECT id FROM "school software".profiles
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".table_name TO authenticated;

-- Add comments
COMMENT ON TABLE "school software".table_name IS 'Description';
```

---

## Supabase MCP Rules (For Claude)

When using MCP tools in ANY of the three apps:

### ✅ ALWAYS Do This

```typescript
// CORRECT - Explicit schema prefix
mcp__supabase__execute_sql({
  query: `
    SELECT * FROM "school software".students
    WHERE grade_level = '10';
  `
})

mcp__supabase__apply_migration({
  name: "add_feature",
  query: `
    CREATE TABLE "school software".new_table (...);
    ALTER TABLE "school software".new_table ENABLE ROW LEVEL SECURITY;
  `
})
```

### ❌ NEVER Do This

```typescript
// WRONG - No schema prefix
mcp__supabase__execute_sql({
  query: `SELECT * FROM students WHERE grade_level = '10';`
})

// WRONG - Wrong schema
mcp__supabase__apply_migration({
  name: "add_feature",
  query: `CREATE TABLE n8n_content_creation.new_table (...);`
})

// WRONG - Public schema
mcp__supabase__apply_migration({
  name: "add_feature",
  query: `CREATE TABLE public.new_table (...);`
})
```

---

## Table Naming Convention

All apps share the same database, so use **prefixes for app-specific tables**:

### Shared Tables (No Prefix)
Used by ALL apps:
- `schools`
- `sections`
- `students`
- `courses`
- `profiles`
- `assessments`
- `modules`
- `lessons`
- `enrollments`
- `submissions`

### Teacher-Specific Tables (Prefix: `teacher_`)
Used only by teacher-app:
- `teacher_profiles`
- `teacher_assignments`
- `teacher_transcripts`
- `teacher_notes`
- `teacher_rubric_templates`
- etc.

### Admin-Specific Tables (Prefix: `admin_`)
Used only by admin-app:
- `admin_profiles`
- `admin_audit_logs`
- `admin_settings`
- etc.

### Student-Specific Tables (Prefix: `student_`)
Used only by student-app (if needed):
- `student_progress`
- `student_preferences`
- etc.

**Rule:** If table is shared → no prefix. If app-specific → use prefix.

---

## Copy These Files to All Apps

**To student-app folder:**
1. Copy `UNIVERSAL_SCHEMA_CONFIG.md`
2. Copy `.env.schema`
3. Copy `scripts/verify-schema.mjs`
4. Update `lib/supabase/client.ts` with template above
5. Update `lib/supabase/server.ts` with template above
6. Update `package.json` with verify-schema scripts

**To admin-app folder:**
1. Same as student-app (copy all 6 items)

**Result:** All three apps will use the same schema and verify on startup!

---

## Final Answer

**Q: Which schema for Supabase MCP?**
**A: `"school software"` - ALWAYS, in ALL apps (student, teacher, admin)**

**Q: How to ensure it happens?**
**A:**
1. ✅ Automated verification before dev/build
2. ✅ Big warning comments in code
3. ✅ UNIVERSAL_SCHEMA_CONFIG.md in each app
4. ✅ I'll check this file BEFORE every database operation
5. ✅ Template shows: `"school software".table_name`

---

**This config is now PORTABLE and CONSISTENT across all apps!** 🎯
