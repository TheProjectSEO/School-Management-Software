# How to Apply Assessments Migration

## Quick Summary
This migration creates **28 comprehensive assessments** across **10 courses** with quizzes, assignments, projects, submissions, and notifications for students.

## 3 Ways to Apply

### ⭐ Method 1: Supabase SQL Editor (RECOMMENDED - Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: "School management Software"

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy the Migration File**
   - Open: `supabase/migrations/008_populate_assessments_and_submissions.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)

4. **Paste and Run**
   - Create a new query in SQL Editor
   - Paste the entire migration
   - Click "Run" button (or Cmd+Enter)

5. **Wait for Completion**
   - Should take 5-15 seconds
   - You'll see "Success. No rows returned" when done

6. **Verify**
   - Run this query to check:
   ```sql
   SELECT 'Courses' as type, COUNT(*)::text FROM courses
   UNION ALL SELECT 'Assessments', COUNT(*)::text FROM assessments
   UNION ALL SELECT 'Questions', COUNT(*)::text FROM questions;
   ```
   - Expected: 10 courses, ~28 assessments, ~30 questions

---

### Method 2: Using Supabase CLI (If You Have It Set Up)

```bash
cd student-app

# Option A: Direct SQL execution
npx supabase db execute -f supabase/migrations/008_populate_assessments_and_submissions.sql

# Option B: If that doesn't work, use db push
npx supabase db push
```

---

### Method 3: Local Supabase (For Development)

```bash
cd student-app

# Start local Supabase
npx supabase start

# Reset and apply migrations
npx supabase db reset

# Or apply just this migration
npx supabase db execute -f supabase/migrations/008_populate_assessments_and_submissions.sql
```

---

## What Gets Created

### 📚 5 New Courses
- Database Systems (CS 203)
- Software Engineering (CS 204)
- Filipino Literature (FIL 201)
- Physics I (PHYS 101)
- Ethics & Philosophy (PHIL 101)

### 📝 28 Assessments Total
- **10 Quizzes** - Multiple choice, timed, auto-graded
- **12 Assignments** - Homework, essays, problem sets
- **4 Projects** - Major work like portfolios, reports
- **2 Exams** - Midterm exams

### ❓ 30+ Quiz Questions
With multiple choice options, correct answers, and explanations

### 📊 Student Submissions
- 4 completed & graded (with scores & feedback)
- 2 submitted awaiting grading
- 2 in progress (started but not finished)

### 🔔 6 Notifications Per Student
About upcoming assignments, grades, reminders

---

## Verification Steps

After applying, verify everything worked:

### Step 1: Check Course Count
```sql
SELECT COUNT(*) FROM courses;
-- Expected: 10 courses
```

### Step 2: Check Assessments
```sql
SELECT type, COUNT(*)
FROM assessments
GROUP BY type;
-- Expected: quiz (10), assignment (12), project (4), exam (2)
```

### Step 3: Check Quiz Questions
```sql
SELECT COUNT(*) FROM questions;
-- Expected: ~30 questions
```

### Step 4: Check Submissions
```sql
SELECT status, COUNT(*)
FROM submissions
GROUP BY status;
-- Expected: graded, submitted, pending
```

### Step 5: View Upcoming Assignments
```sql
SELECT
  c.name as course,
  a.title,
  a.type,
  a.due_date
FROM assessments a
JOIN courses c ON c.id = a.course_id
WHERE a.due_date > NOW()
ORDER BY a.due_date
LIMIT 10;
-- Should show assignments due soon
```

---

## What Students Will See

### Dashboard
- ✅ 8 assignments due in next 7 days
- ✅ 2 submissions in progress
- ✅ 4 graded assignments with feedback
- ✅ 6 notifications (3 unread)

### Assessments Page
- ✅ All 28 assessments across 10 courses
- ✅ Due dates clearly marked
- ✅ Point values shown
- ✅ Status indicators (pending/submitted/graded)

### Quiz Taking
- ✅ Timed quizzes with countdown
- ✅ Multiple choice questions
- ✅ Auto-grading
- ✅ Explanations after submission

### Grades Page
- ✅ Completed work with scores
- ✅ Teacher feedback
- ✅ Performance metrics

---

## Troubleshooting

### Issue: "relation courses does not exist"
**Solution**: Run migrations 001-007 first. These create the base schema.
```bash
npx supabase db push
```

### Issue: "duplicate key value violates unique constraint"
**Solution**: Data already exists. This is fine - the migration uses `ON CONFLICT DO NOTHING`.

### Issue: No data showing for students
**Solution**: Make sure students exist in the database:
```sql
SELECT * FROM students;
```
If empty, you need to create a demo student first (migration 003).

### Issue: Quizzes not working
**Solution**: Verify the questions table exists:
```sql
SELECT COUNT(*) FROM questions;
```
If 0, make sure migration 007 ran successfully.

### Issue: RLS blocking access
**Solution**:
1. Check student has proper auth_user_id linkage
2. Verify RLS policies are enabled
3. Make sure user is authenticated

---

## Assessment Details

### By Course:

**Web Development (3)**
- HTML Quiz (3 days) ✅ DONE: 45/50
- Portfolio (14 days) ⏳ IN PROGRESS
- Calculator (21 days)

**Data Structures (3)**
- Arrays Quiz (5 days) ✅ DONE: 38/40
- Stack Assignment (7 days) 📤 SUBMITTED
- Binary Tree (14 days)

**Philippine History (3)**
- Pre-Colonial Essay ⚠️ OVERDUE
- Spanish Quiz (6 days) ✅ DONE: 48/50
- Revolution Paper (18 days)

**Calculus (3)**
- Limits Practice (4 days) ✅ DONE: 42/50
- Derivatives Quiz (8 days)
- Midterm Exam (21 days)

**Technical Writing (3)**
- Report Draft (12 days) 📤 SUBMITTED
- API Documentation (15 days)
- Writing Quiz (5 days)

**Database Systems (3)**
- SQL Quiz (4 days) ⏳ IN PROGRESS
- Normalization (9 days)
- Design Project (20 days)

**Software Engineering (3)**
- SDLC Quiz (3 days)
- Requirements Doc (16 days)
- Testing Exam (25 days)

**Filipino Literature (3)**
- Poetry Quiz (7 days)
- Noli Analysis (13 days)
- Original Story (22 days)

**Physics (3)**
- Newton's Laws Quiz (5 days)
- Kinematics Problems (6 days)
- Lab Report (11 days)

**Ethics (3)**
- Ethical Theories Quiz (4 days)
- AI Ethics Case Study (17 days)
- Philosophy Midterm (28 days)

---

## Next Steps After Applying

1. ✅ **Test Student Dashboard** - Should show upcoming work
2. ✅ **Test Quiz Taking** - Start a quiz and complete it
3. ✅ **Test Submissions** - View graded work with feedback
4. ✅ **Test Notifications** - Check unread notifications
5. ✅ **Test Enrollments** - Verify all 10 courses appear

---

## Rolling Back (If Needed)

⚠️ **WARNING**: This will delete all assessment data!

```sql
-- Delete in reverse order due to foreign keys
DELETE FROM student_answers;
DELETE FROM submissions;
DELETE FROM answer_options;
DELETE FROM questions;
DELETE FROM notifications WHERE created_at > NOW() - INTERVAL '1 day';
DELETE FROM assessments WHERE created_at > NOW() - INTERVAL '1 day';
DELETE FROM enrollments WHERE course_id IN (
  'c6666666-6666-6666-6666-666666666666',
  'c7777777-7777-7777-7777-777777777777',
  'c8888888-8888-8888-8888-888888888888',
  'c9999999-9999-9999-9999-999999999999',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);
DELETE FROM courses WHERE id IN (
  'c6666666-6666-6666-6666-666666666666',
  'c7777777-7777-7777-7777-777777777777',
  'c8888888-8888-8888-8888-888888888888',
  'c9999999-9999-9999-9999-999999999999',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);
```

---

## Files Created

1. **Migration File**: `supabase/migrations/008_populate_assessments_and_submissions.sql`
   - Main SQL migration with all data

2. **Documentation**: `ASSESSMENTS_MIGRATION_GUIDE.md`
   - Detailed guide with full breakdown

3. **This Guide**: `HOW_TO_APPLY_ASSESSMENTS.md`
   - Quick how-to instructions

4. **Quick Script**: `scripts/apply-assessments-migration.sh`
   - Automated application script (if CLI works)

---

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Verify RLS policies are working
3. Check that base migrations (001-007) are applied
4. Review error messages for specific issues

**Schema**: Public (school software)
**Created**: 2026-01-10
**Compatibility**: Requires migrations 001-007 to be applied first
