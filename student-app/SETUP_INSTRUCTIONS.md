# Grades and Attendance Setup Instructions

## Quick Setup

I've created all the necessary database tables and seed data for grades, attendance, and progress tracking. Follow these steps to apply them:

### Option 1: Run via Supabase Dashboard (RECOMMENDED)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql

2. **Copy and paste the SQL script**
   - Open the file: `setup_grades_attendance.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run"

3. **Verify the setup**
   - Check that tables were created successfully
   - Verify data is populated

### Option 2: Run via Command Line

If you prefer using the command line:

```bash
# From the project root directory
cd "/Users/adityaaman/Desktop/All Development/School management Software/student-app"

# Run the SQL script
psql "postgresql://postgres.qyjzqzqqjimittltttph:[YOUR_PASSWORD]@db.qyjzqzqqjimittltttph.supabase.co:5432/postgres" -f setup_grades_attendance.sql
```

Replace `[YOUR_PASSWORD]` with your Supabase database password.

## What This Creates

### 1. Database Tables
- **grading_periods**: Academic terms/semesters
- **course_grades**: Individual course grades with letter grades, scores, and comments
- **semester_gpa**: GPA calculations per semester
- **report_cards**: Complete report cards with adviser comments
- **teacher_attendance**: Daily attendance records per course

### 2. Sample Data
For each student in the database:

#### Grades
- **Fall 2024 Midterm Grades** (Released):
  - Web Development (CS 201): A (92%)
  - Data Structures (CS 202): B+ (88%)
  - Philippine History (GE 103): A- (90%)
  - Calculus I (MATH 101): B (85%)
  - Technical Writing (ENG 201): A (94%)

#### GPA Records
- **Fall 2024 Midterm**: 3.65 GPA (Dean's List)
- **Cumulative GPA**: 3.63

#### Attendance Records
- **Past 60 days** of attendance data
- Realistic pattern: ~85% present, ~10% late, ~3% absent, ~2% excused
- Different schedules per course:
  - Web Dev: Mon, Wed, Fri (8:00-9:30 AM)
  - Data Structures: Tue, Thu (10:00-11:30 AM)
  - Philippine History: Mon, Wed (1:00-2:30 PM)
  - Calculus: Mon, Wed, Fri (3:00-4:30 PM)
  - Technical Writing: Tue, Thu (1:30-3:00 PM)

#### Report Cards
- Released report card for Fall 2024 Midterm
- Includes adviser and principal comments

## Verification

After running the script, verify the setup:

1. **Check Grades Page**: Navigate to `/grades` in the student app
   - Should show course grades
   - Should display GPA
   - Should show grading periods

2. **Check Attendance Page**: Navigate to `/attendance`
   - Should show attendance calendar
   - Should display attendance summary statistics
   - Should show attendance rate and punctuality rate

3. **Check Progress Tracking**: Navigate to `/subjects`
   - Lesson progress should be enhanced with more variety
   - Some lessons 100% complete
   - Some lessons in progress (40%, 50%, 75%, 80%, 90%)
   - Last accessed times should be realistic

## Database Schema

The following tables are created with Row Level Security (RLS) policies:

- Students can only view their own grades (where `is_released = true`)
- Students can only view their own attendance records
- Students can only view their own GPA data
- Students can only view released report cards

## Files Created

- `/setup_grades_attendance.sql` - Complete setup script
- `/supabase/migrations/20260110062800_grades_attendance.sql` - Table definitions
- `/supabase/migrations/20260110062801_seed_grades_attendance.sql` - Seed data

## Need Help?

If you encounter any issues:

1. Check the Supabase logs for any errors
2. Verify all prerequisite tables exist (schools, students, courses, etc.)
3. Ensure you're running the script as a database admin
4. Check that the school_id and student IDs match your existing data
