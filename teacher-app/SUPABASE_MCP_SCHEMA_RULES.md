# Supabase MCP Schema Rules - PERMANENT REFERENCE

## ⚠️ MANDATORY RULE FOR ALL FUTURE DATABASE OPERATIONS ⚠️

When using **Supabase MCP tools** (`execute_sql`, `apply_migration`, etc.) for this project:

---

## THE GOLDEN RULE

**ALWAYS use `"school software"` schema. ALWAYS prefix table names. NEVER use bare table names.**

---

## How to Use Supabase MCP Correctly

### ✅ CORRECT Examples

#### Creating Tables
```sql
-- ✅ CORRECT - Explicit schema prefix
CREATE TABLE "school software".teacher_rubrics (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  ...
);

-- ✅ CORRECT - With schema prefix in constraints
ALTER TABLE "school software".submissions
ADD CONSTRAINT fk_assessment
FOREIGN KEY (assessment_id)
REFERENCES "school software".assessments(id);
```

#### Querying Data
```sql
-- ✅ CORRECT - Always prefix
SELECT * FROM "school software".schools;

INSERT INTO "school software".sections (name, grade_level, school_id)
VALUES ('Grade 10-A', '10', '...');

UPDATE "school software".teacher_profiles
SET department = 'Physics'
WHERE id = '...';
```

#### Checking Structure
```sql
-- ✅ CORRECT - Specify schema in WHERE clause
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'school software'
  AND table_name = 'sections';
```

---

### ❌ WRONG Examples (NEVER DO THIS)

```sql
-- ❌ WRONG - No schema prefix
CREATE TABLE teacher_rubrics (...);

-- ❌ WRONG - Will create in wrong schema
INSERT INTO schools (name) VALUES ('Test School');

-- ❌ WRONG - Using wrong schema prefix
CREATE TABLE n8n_content_creation.teacher_rubrics (...);

-- ❌ WRONG - Using public schema
CREATE TABLE public.sections (...);

-- ❌ WRONG - Bare table name
SELECT * FROM schools;
```

---

## Before Every Database Operation - ASK YOURSELF:

1. **Did I prefix the table name with `"school software".`?**
   - If NO → Add the prefix!

2. **Am I using quotes around "school software"?**
   - If NO → Add quotes (required because of space in name)

3. **Did I verify the table exists in "school software" schema?**
   - If NO → Check first:
     ```sql
     SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'school software' AND table_name = 'your_table';
     ```

---

## MCP Tool Usage Pattern

### When Creating Migrations

```typescript
mcp__supabase__apply_migration({
  name: "add_rubric_system",
  query: `
    -- ALWAYS start with schema comment
    -- Schema: "school software"

    CREATE TABLE "school software".teacher_rubrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      ...
    );

    -- Enable RLS
    ALTER TABLE "school software".teacher_rubrics ENABLE ROW LEVEL SECURITY;

    -- Create policy with schema prefix in references
    CREATE POLICY "Teachers can view own rubrics"
    ON "school software".teacher_rubrics
    FOR SELECT
    USING (
      created_by IN (
        SELECT id FROM "school software".profiles
        WHERE auth_user_id = auth.uid()
      )
    );
  `
})
```

### When Querying Data

```typescript
mcp__supabase__execute_sql({
  query: `
    -- ALWAYS use schema prefix
    SELECT s.name, s.grade_level, COUNT(st.id) as student_count
    FROM "school software".sections s
    LEFT JOIN "school software".students st ON s.id = st.section_id
    GROUP BY s.id, s.name, s.grade_level;
  `
})
```

### When Checking Schema

```typescript
// ✅ CORRECT - Always check "school software" schema
mcp__supabase__execute_sql({
  query: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'school software'
    ORDER BY table_name;
  `
})
```

---

## Verification Process

**BEFORE making any database changes:**

1. **Verify which schema has the table:**
   ```sql
   SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_name = 'your_table'
   ORDER BY table_schema;
   ```

2. **If table exists in multiple schemas:**
   - Use ONLY `"school software"` version
   - Delete others (as we just did)

3. **If table doesn't exist yet:**
   - Create it in `"school software"` schema
   - Use explicit schema prefix

4. **After any changes:**
   ```bash
   npm run verify-schema
   ```

---

## Common Mistakes to AVOID

### ❌ Mistake #1: Forgetting Schema Prefix
**Wrong:**
```sql
CREATE TABLE teacher_rubrics (...);
```
**Right:**
```sql
CREATE TABLE "school software".teacher_rubrics (...);
```

### ❌ Mistake #2: Using Wrong Schema from CLAUDE.md
**Wrong:** Blindly trusting CLAUDE.md saying "n8n_content_creation"
**Right:** Trust the verification script and SCHEMA_GUIDE.md

### ❌ Mistake #3: Missing Quotes Around Schema Name
**Wrong:**
```sql
SELECT * FROM school software.schools;
-- Syntax error: "school" and "software" seen as two identifiers
```
**Right:**
```sql
SELECT * FROM "school software".schools;
-- Quotes treat "school software" as single identifier
```

### ❌ Mistake #4: Creating Tables Without Checking First
**Wrong:** Assume table doesn't exist and CREATE TABLE
**Right:** Check first, then create with IF NOT EXISTS

---

## Template for All Future Migrations

```sql
-- ============================================================================
-- Migration: [Name of Migration]
-- Description: [What this does]
-- Schema: "school software" ← ALWAYS THIS SCHEMA
-- Date: [Date]
-- ============================================================================

-- Create table with explicit schema prefix
CREATE TABLE IF NOT EXISTS "school software".table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- Indexes with schema prefix
CREATE INDEX IF NOT EXISTS idx_table_column
ON "school software".table_name(column);

-- Foreign keys with schema prefix on both sides
ALTER TABLE "school software".table_name
ADD CONSTRAINT fk_other_table
FOREIGN KEY (other_id)
REFERENCES "school software".other_table(id);

-- Enable RLS with schema prefix
ALTER TABLE "school software".table_name ENABLE ROW LEVEL SECURITY;

-- Create policies with schema prefix in USING clause
CREATE POLICY "policy_name"
ON "school software".table_name
FOR SELECT
USING (
  column IN (
    SELECT id FROM "school software".other_table
    WHERE condition
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE "school software".table_name TO authenticated;

-- Comments
COMMENT ON TABLE "school software".table_name IS 'Description';
```

---

## Quick Reference Card

**When you see me about to use Supabase MCP:**

| Action | Correct Schema | Template |
|--------|----------------|----------|
| CREATE TABLE | `"school software".` | `CREATE TABLE "school software".name (...)` |
| INSERT | `"school software".` | `INSERT INTO "school software".name (...) VALUES (...)` |
| SELECT | `"school software".` | `SELECT * FROM "school software".name` |
| UPDATE | `"school software".` | `UPDATE "school software".name SET ...` |
| DELETE | `"school software".` | `DELETE FROM "school software".name WHERE ...` |
| ALTER TABLE | `"school software".` | `ALTER TABLE "school software".name ...` |
| CREATE INDEX | `ON "school software".` | `CREATE INDEX ... ON "school software".name(...)` |
| CREATE POLICY | `ON "school software".` | `CREATE POLICY ... ON "school software".name` |
| GRANT | `"school software".` | `GRANT ... ON TABLE "school software".name` |

**Remember:** ALWAYS include `"school software".` prefix!

---

## How Verification Works

When you run `npm run dev` or `npm run build`:

1. **Pre-hook triggers:** `predev` or `prebuild` script
2. **Runs:** `npm run verify-schema`
3. **Script checks:** All required tables exist in `"school software"` schema
4. **If FAIL:** Build stops with error message
5. **If PASS:** Dev server starts normally

**This prevents the app from running with wrong schema!**

---

## Final Answer

**Q: Which schema will you use?**
**A: `"school software"` - ALWAYS, with explicit prefix, with quotes**

**Q: How will that happen?**
**A:**
1. Every SQL query I write will have `"school software".` prefix
2. Every migration will start with comment: `-- Schema: "school software"`
3. I'll verify first by running: `npm run verify-schema`
4. If verification fails, I'll check which schema has correct structure
5. I'll NEVER create tables in `public` or `n8n_content_creation` for this project

**Q: What if CLAUDE.md says different?**
**A:** **Ignore CLAUDE.md and trust SCHEMA_GUIDE.md** - The code and database are the source of truth, not the docs!

---

**This is now LOCKED DOWN and DOCUMENTED. You'll never have to ask this again!** 🔒✅