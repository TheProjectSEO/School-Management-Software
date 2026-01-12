# Quick Guide: Apply RLS Policies

## The Problem
Student exists but can't see any data because RLS policies are missing/broken!

## The Solution
Apply comprehensive RLS policies to all 24 tables.

## Quick Steps (3 minutes)

### Step 1: Get Your Supabase Project
Find your project reference from your Supabase URL:
```
https://[PROJECT_REF].supabase.co
         ^^^^^^^^^^^^
    (this is your project ref)
```

### Step 2: Open SQL Editor
Go to:
```
https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql/new
```

### Step 3: Copy & Paste
1. Open the file: `COMPLETE_RLS_POLICIES.sql`
2. Copy ALL contents (Cmd/Ctrl + A, then Cmd/Ctrl + C)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** button

### Step 4: Verify
You should see: ✅ **"Success. No rows returned"**

## What This Fixes

### Before (Broken)
```typescript
// Courses query returns empty []
const { data: courses } = await supabase.from('courses').select('*');
console.log(courses); // [] - EMPTY!
```

### After (Fixed)
```typescript
// Courses query returns enrolled courses
const { data: courses } = await supabase.from('courses').select('*');
console.log(courses); // [{ id: '...', name: 'English 101' }, ...]
```

## Critical Tables Fixed

1. ✅ **courses** - Was showing NO courses (using `true`)
2. ✅ **modules** - Was showing ALL modules (using `true`)
3. ✅ **lessons** - Was showing ALL lessons (using `true`)
4. ✅ **assessments** - Was showing ALL assessments (using `true`)
5. ✅ **grading_periods** - Was showing ALL periods (using `true`)
6. ✅ **schools** - Was showing ALL schools (using `true`)
7. ✅ **sections** - Was showing ALL sections (using `true`)

Now shows ONLY data for enrolled courses!

## Test It Works

After applying, test with your demo student:

```typescript
// Login
const { data: session } = await supabase.auth.signInWithPassword({
  email: 'demo.student@msu.edu',
  password: 'password123'
});

// Should now work!
const { data: courses } = await supabase.from('courses').select('*');
console.log('My courses:', courses); // Should see courses!
```

## Files Created

- **COMPLETE_RLS_POLICIES.sql** ← The main file to apply
- **RLS_POLICIES_README.md** ← Full documentation
- **APPLY_RLS_QUICK_GUIDE.md** ← This file
- **apply-rls-policies.js** ← Node script with instructions
- **apply-rls-policies.sh** ← Bash script (requires CLI)

## Need Help?

### Can't see courses?
Check enrollments exist:
```sql
SELECT * FROM enrollments
WHERE student_id IN (
  SELECT s.id FROM students s
  JOIN profiles p ON p.id = s.profile_id
  WHERE p.auth_user_id = auth.uid()
);
```

### Getting permission errors?
Re-run the SQL file - it will drop and recreate all policies.

### Still not working?
Check the full README: `RLS_POLICIES_README.md`

## What Students Can Now Access

✅ Their own profile
✅ Their school
✅ Their section
✅ **Enrolled courses only**
✅ **Modules for enrolled courses**
✅ **Lessons for enrolled courses**
✅ **Assessments for enrolled courses**
✅ Their submissions
✅ Their progress
✅ Their notes
✅ Their notifications
✅ Relevant announcements
✅ Their messages
✅ Their grades (when released)
✅ Their GPA
✅ Their attendance

❌ Cannot see other students' data
❌ Cannot see courses they're not enrolled in

## Next Steps After Applying

1. ✅ Apply the SQL file
2. ✅ Test student login
3. ✅ Verify courses show up
4. ✅ Test the full app

Done! 🎉
