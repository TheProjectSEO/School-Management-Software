# Schema Validation Scripts

These scripts help verify that the `lesson_attachments` table has all required columns with correct data types.

## Why This Matters

The attachment feature requires specific columns:
- `title` (displayed as filename on teacher side)
- `file_size_bytes` (displayed as file size)
- `file_url`, `file_type`, `order_index`, etc.

If any columns are missing or have wrong data types, attachments will show as "NaN MB" or not display at all.

## Available Scripts

### 1. SQL Validation (Recommended)

**File:** `scripts/validate-attachment-schema.sql`

**How to use:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `validate-attachment-schema.sql`
4. Click "Run"

**What it checks:**
- ✓ Table existence
- ✓ All required columns
- ✓ Column data types
- ✓ Missing columns
- ✓ Constraints and indexes
- ✓ Existing data issues (missing file sizes, etc.)

**Output:** Detailed report with ✓ and ✗ indicators

---

### 2. Simple Column List

**File:** `scripts/check-attachment-columns.sql`

**How to use:**
1. Open Supabase SQL Editor
2. Run `check-attachment-columns.sql`

**Output:** Simple list of all columns with their types and defaults

---

### 3. TypeScript Check

**File:** `scripts/check-attachment-schema.ts`

**How to use:**
```bash
npx tsx scripts/check-attachment-schema.ts
```

**Requirements:**
- Node.js installed
- `.env.local` configured with Supabase credentials

**Output:** Terminal-based validation report

---

### 4. Bash Script (Linux/Mac)

**File:** `scripts/check-schema.sh`

**How to use:**
```bash
bash scripts/check-schema.sh
```

**Requirements:** Supabase CLI installed
```bash
npm install -g supabase
```

---

## Expected Schema

The `lesson_attachments` table should have these columns:

| Column Name | Data Type | Nullable | Notes |
|------------|-----------|----------|-------|
| `id` | uuid | NO | Primary key |
| `lesson_id` | uuid | NO | Foreign key to lessons |
| `title` | text/varchar | NO | **Used as filename in UI** |
| `description` | text | YES | Optional description |
| `file_url` | text | NO | Storage URL or external link |
| `file_type` | text/varchar | YES | MIME type (e.g., 'application/pdf') |
| `file_size_bytes` | bigint/integer | YES | **File size in bytes** |
| `order_index` | integer | NO | Display order (default 0) |
| `download_count` | integer | NO | Tracks downloads (default 0) |
| `created_at` | timestamp | NO | Creation timestamp |
| `created_by` | uuid | YES | Foreign key to school_profiles |
| `updated_at` | timestamp | NO | Last update timestamp |

## Common Issues

### Issue 1: "NaN MB" displayed
**Cause:** `file_size_bytes` column is missing or NULL

**Fix:**
1. Add column if missing:
```sql
ALTER TABLE lesson_attachments
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
```

2. Update existing records (if file_size_bytes is NULL)

---

### Issue 2: Attachments not showing on student side
**Cause:** Attachments not being fetched from database

**Status:** Fixed in `lib/dal/subjects.ts` - all lesson fetch functions now include attachments

---

### Issue 3: Wrong column names
**Cause:** Frontend expecting `file_name` but database has `title`

**Status:** Fixed in teacher API routes with field transformation:
- Database `title` → Frontend `file_name`
- Database `file_size_bytes` → Frontend `file_size`

---

## Migration Template

If columns are missing, create a migration:

```sql
-- Add missing columns to lesson_attachments
ALTER TABLE lesson_attachments
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

ALTER TABLE lesson_attachments
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE lesson_attachments
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id
ON lesson_attachments(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_attachments_order
ON lesson_attachments(lesson_id, order_index);
```

## Testing After Schema Changes

1. **Teacher Side:**
   - Open a module editor
   - Edit a lesson with attachments
   - Verify filename and file size display correctly (not "NaN MB")

2. **Student Side:**
   - Open a lesson with attachments
   - Verify PDF/attachments are visible
   - Test download functionality

3. **Database Check:**
```sql
-- Verify data
SELECT
  id,
  title,
  file_size_bytes,
  file_type,
  order_index
FROM lesson_attachments
LIMIT 5;
```

## Need Help?

If schema validation fails:
1. Run `scripts/validate-attachment-schema.sql` for detailed diagnostics
2. Check the migration files in `supabase/migrations/`
3. Look for `lesson_attachments` table creation
4. Run any missing migrations

For questions about the attachment system, see:
- `CLAUDE.md` - Bug patterns section (BUG-001)
- `lib/dal/content.ts` - Teacher content DAL
- `lib/dal/subjects.ts` - Student content DAL
- `components/teacher/teacher/LessonEditor.tsx` - Teacher UI
- `components/student/lesson/LessonAttachments.tsx` - Student UI
