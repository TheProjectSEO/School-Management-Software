# Quick Data Seeding Guide

## Step 1: Verify Prerequisites

Make sure these exist in your database:
- ✅ Student ID: `cc0c8b60-5736-4299-8015-e0a649119b8f`
- ✅ Profile ID: `44d7c894-d749-4e15-be1b-f42afe6f8c27`
- ✅ School ID: `11111111-1111-1111-1111-111111111111`
- ✅ 10 courses exist
- ✅ RLS policies are fixed

## Step 2: Run the Seed Script

### Option A: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Open `COMPLETE_DATA_SEEDING.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

### Option B: Command Line
```bash
# If you have psql configured
psql $DATABASE_URL -f COMPLETE_DATA_SEEDING.sql
```

## Step 3: Verify Data

Run these verification queries:

```sql
-- Check enrollments
SELECT COUNT(*) as enrollment_count
FROM enrollments
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 8

-- Check student progress
SELECT COUNT(*) as progress_count
FROM student_progress
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 4

-- Check assessments
SELECT COUNT(*) as assessment_count FROM assessments;
-- Expected: 16+

-- Check submissions
SELECT COUNT(*) as submission_count
FROM submissions
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 9

-- Check notifications
SELECT COUNT(*) as notification_count
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 12

-- Check notifications (unread)
SELECT COUNT(*) as unread_count
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
AND is_read = false;
-- Expected: 4

-- Check announcements
SELECT COUNT(*) as announcement_count FROM announcements;
-- Expected: 8

-- Check notes
SELECT COUNT(*) as note_count
FROM notes
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 5

-- Check downloads
SELECT COUNT(*) as download_count
FROM downloads
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: 8

-- Check attendance
SELECT COUNT(*) as attendance_count
FROM teacher_attendance
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Expected: ~80 (20 weekdays × 4 courses)

-- Summary view
SELECT
  'Enrollments' as category, COUNT(*) as count
FROM enrollments
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Progress', COUNT(*)
FROM student_progress
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Submissions', COUNT(*)
FROM submissions
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Notifications', COUNT(*)
FROM notifications
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Notes', COUNT(*)
FROM notes
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Downloads', COUNT(*)
FROM downloads
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f'
UNION ALL
SELECT 'Attendance', COUNT(*)
FROM teacher_attendance
WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
```

## Step 4: Test the App

Login with student credentials and verify:

### Dashboard Page
- [ ] Shows 4 unread notifications
- [ ] Shows upcoming assignments
- [ ] Shows recent grades

### Courses Page
- [ ] Shows 8 enrolled courses
- [ ] Shows progress for each course
- [ ] Can click into course details

### Assignments Page
- [ ] Shows 16 assessments
- [ ] Shows due dates correctly
- [ ] Shows submission status (pending/submitted/graded)

### Grades Page
- [ ] Shows 3 graded submissions
- [ ] Shows scores and feedback

### Notes Page
- [ ] Shows 5 study notes
- [ ] Can view note contents
- [ ] Favorites are marked

### Downloads Page
- [ ] Shows 8 downloadable files
- [ ] Shows file sizes and types
- [ ] Shows sync status

### Attendance Page
- [ ] Shows attendance calendar
- [ ] Shows statistics (present/late/absent)
- [ ] Shows attendance percentage

### Announcements
- [ ] Shows 8 announcements
- [ ] Pinned announcements at top
- [ ] Urgent ones highlighted

## Expected Data Overview

```
✓ 8 Course Enrollments
✓ 4 Lesson Progress Records (0%, 25%, 50%, 100%)
✓ 16 Assessments (quizzes, assignments, projects, exams)
✓ 9 Submissions (3 graded, 2 pending review, 4 not submitted)
✓ 12 Notifications (4 unread, 8 read)
✓ 8 Announcements (3 pinned)
✓ 5 Student Notes (4 favorites)
✓ 8 Downloads (6 ready, 1 syncing, 1 queued)
✓ ~80 Attendance Records (past 30 days, 4 courses)
✓ 4 Grading Periods (1 active)
```

## Troubleshooting

### If data doesn't appear:
1. Check RLS policies are correct
2. Verify student ID matches in all tables
3. Check browser console for errors
4. Clear cache and reload

### If duplicate key errors:
- Script uses `ON CONFLICT DO NOTHING` for safety
- Safe to run multiple times
- Will skip existing records

### If foreign key errors:
- Verify prerequisite data exists (school, courses, sections)
- Check UUIDs match exactly
- Ensure migrations ran successfully

## Clean Up (if needed)

To remove all seeded data:

```sql
-- WARNING: This deletes all data for this student!
DELETE FROM enrollments WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM student_progress WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM submissions WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM notifications WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM notes WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM downloads WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
DELETE FROM teacher_attendance WHERE student_id = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
-- Assessments and announcements are shared, don't delete unless needed
```

## Success!

Your student app should now be populated with realistic, comprehensive data ready for testing! 🎉
