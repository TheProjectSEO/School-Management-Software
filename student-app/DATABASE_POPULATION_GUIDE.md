# Database Population Guide

## Overview

This guide explains how to populate the complete school management database with realistic data for testing the student dashboard.

## What Gets Created

### 1. School Data
- **1 School**: Manila Central High School
- **6 Sections**: Grade 7-12 sections (Einstein, Newton, Galileo, Curie, Darwin, Tesla)

### 2. Courses (10 Total)
- **Advanced Mathematics** (MATH-401) - Calculus, Trigonometry, Advanced Algebra
- **Geometry & Statistics** (MATH-301)
- **Physics** (SCI-401) - Classical Mechanics, Electricity, Magnetism
- **Chemistry** (SCI-402) - Organic Chemistry, Chemical Reactions
- **Biology** (SCI-301) - Cell Biology, Genetics, Human Anatomy
- **English Literature** (ENG-401) - World Literature, Literary Analysis
- **Filipino** (FIL-401) - Panitikang Pilipinas
- **Philippine History** (HIST-401) - Pre-Colonial to Modern Philippines
- **World History** (HIST-402) - Ancient Civilizations to Contemporary Issues
- **Computer Programming** (CS-401) - Python, Web Development, Algorithms

### 3. Student Record
- **Profile ID**: `44d7c894-d749-4e15-be1b-f42afe6f8c27`
- **LRN**: LRN-2024-001234
- **Grade Level**: Grade 11
- **Section**: Section A - Darwin (Grade 11)
- **Enrolled in 8 courses** (Math, Physics, Chemistry, English, Filipino, Philippine History, World History, Computer Programming)

### 4. Learning Content
- **13 Modules** across all courses
- **Multiple Lessons** per module (reading, video, activities)
- **5 Assessments** (quizzes and assignments)
- **5 Notifications** (welcome, assignments, reminders)
- **3 Study Notes**

## How to Populate the Database

### Method 1: Supabase SQL Editor (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new

2. **Copy SQL File Content**
   - Open: `/Users/adityaaman/Desktop/All Development/School management Software/student-app/supabase/migrations/00000000000011_populate_clean.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)

3. **Execute in Supabase**
   - Paste into the SQL Editor
   - Click "Run" button
   - Wait for success message

4. **Verify**
   - Check that no errors occurred
   - You should see success messages for each INSERT statement

### Method 2: Using Node.js Script (Alternative)

```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app
node scripts/populate-db-simple.js
```

Note: This method may encounter schema cache issues. If so, use Method 1 instead.

### Method 3: Using Shell Script

```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app
chmod +x scripts/run-sql-file.sh
./scripts/run-sql-file.sh
```

This will display the SQL content and instructions.

## Verification

After populating, verify the data using Supabase Table Editor:

1. **Check Schools**: Should have "Manila Central High School"
2. **Check Sections**: Should have 6 sections (Grade 7-12)
3. **Check Courses**: Should have 10 courses
4. **Check Students**: Should have 1 student with profile_id `44d7c894-d749-4e15-be1b-f42afe6f8c27`
5. **Check Enrollments**: Should have 8 enrollments for the student

Or run the verification script:

```bash
node scripts/verify-tables.js
```

## Test the Student Dashboard

After populating:

1. Log in to the student portal with the account linked to profile ID `44d7c894-d749-4e15-be1b-f42afe6f8c27`
2. You should see:
   - Dashboard with 8 enrolled courses
   - Course cards with names, codes, and descriptions
   - Notifications (5 total: 2 unread, 3 read)
   - Quick stats showing enrolled courses
   - Study notes (3 notes)

## Files Created

- `/supabase/migrations/00000000000010_complete_school_data.sql` - Full migration with all features
- `/supabase/migrations/00000000000011_populate_clean.sql` - Clean version for SQL Editor
- `/scripts/populate-db-simple.js` - Node.js population script
- `/scripts/verify-tables.js` - Verification script
- `/scripts/run-sql-file.sh` - Shell script helper
- `/scripts/populate-database.js` - Alternative population script
- `/scripts/populate-direct.js` - Direct SQL execution script

## Troubleshooting

### Issue: "Could not find the table in schema cache"
**Solution**: Use Method 1 (Supabase SQL Editor) instead of the Node.js scripts.

### Issue: "Unique constraint violation"
**Solution**: The SQL uses `ON CONFLICT` clauses, so re-running is safe. Existing data will be updated.

### Issue: "Foreign key constraint violation"
**Solution**: Make sure the profile ID `44d7c894-d749-4e15-be1b-f42afe6f8c27` exists in the `profiles` table first.

### Issue: Student dashboard shows no courses
**Solution**:
1. Check that enrollments were created
2. Verify RLS policies allow the student to view courses
3. Check that the student's auth_user_id matches the profile_id in the students table

## Database Structure

```
schools
  └── sections
       └── courses
            ├── modules
            │    └── lessons
            └── assessments

students (linked to profiles)
  ├── enrollments → courses
  ├── student_progress → lessons
  ├── submissions → assessments
  ├── notifications
  ├── notes
  └── downloads
```

## Important IDs

- School ID: `11111111-1111-1111-1111-111111111111`
- Student Profile ID: `44d7c894-d749-4e15-be1b-f42afe6f8c27`
- Student ID: `44444444-4444-4444-4444-444444444444`
- Section ID (Grade 11): `22222225-2222-2222-2222-222222222225`

## Next Steps

After populating the database:

1. Test student login and dashboard view
2. Verify course enrollment display
3. Test lesson navigation
4. Check notifications display
5. Verify notes functionality
6. Test assessment submissions

## Support

If you encounter issues:

1. Check Supabase logs in the dashboard
2. Verify RLS policies are correctly configured
3. Ensure the student's auth account is properly linked to the profile
4. Check browser console for any client-side errors

---

Generated: 2026-01-10
Database: Supabase (qyjzqzqqjimittltttph)
