# QUICK START - Database Population

## Execute in 3 Steps

### Step 1: Copy SQL
```bash
cat "/Users/adityaaman/Desktop/All Development/School management Software/student-app/supabase/migrations/00000000000011_populate_clean.sql" | pbcopy
```

### Step 2: Open Supabase SQL Editor
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new

### Step 3: Paste & Run
- Paste the SQL (Cmd+V)
- Click "Run"
- Wait for success

## What You'll Get

- 1 School (Manila Central High School)
- 10 Courses (Math, Science, Languages, History, CS)
- 1 Student enrolled in 8 courses
- 13 Modules with lessons
- 5 Assessments
- 5 Notifications
- 3 Study notes

## Verify

```bash
cd "/Users/adityaaman/Desktop/All Development/School management Software/student-app"
node scripts/verify-tables.js
```

## Test Login

Profile ID: `44d7c894-d749-4e15-be1b-f42afe6f8c27`

The student dashboard should show 8 enrolled courses!

---

For detailed documentation, see: `DATABASE_SETUP_COMPLETE.md`
