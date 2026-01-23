# Comprehensive Seed Data Setup Guide for MSU School OS

## Overview
This guide provides instructions to create comprehensive interconnected data for the MSU School OS teacher-app and student-app.

**Database**: Supabase (https://qyjzqzqqjimittltttph.supabase.co)
**Schema**: "school software" (CRITICAL - all queries use this schema prefix)
**School**: MSU - Main Campus (ID: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd)

## Quick Start (Recommended)

```bash
cd "/Users/adityaaman/Desktop/All Development/School management Software/teacher-app"
node scripts/setup-seed-data.mjs
```

This script automatically creates:
- 3 sections (Grade 10, 11, 12)
- 8 courses distributed across sections
- 18 students (6 per section) with realistic Filipino names
- Teacher assignments for Dr. Juan Dela Cruz to all courses
- 19 modules across courses
- 57 lessons across modules
- 54+ student-course enrollments

## What Gets Created

### Sections (3)
- Grade 10 - Einstein
- Grade 11 - Newton
- Grade 12 - Curie

### Courses (8)
- Mathematics 101 (Grade 10)
- Physics 101 (Grade 10)
- English 101 (Grade 10)
- Mathematics 201 (Grade 11)
- Chemistry 101 (Grade 11)
- Advanced Physics (Grade 12)

### Students (18)
6 students per section with names like: Juan Santos, Maria Garcia, Carlos Reyes, Ana Fernandez, Miguel Dela Cruz, Rosa Montoya

### Content
- 19 modules (2-3 per course)
- 57 lessons (3 per module, with types: video, reading, quiz)

## Setup Options

### Option 1: Node.js Automated (Recommended)
```bash
node scripts/setup-seed-data.mjs
```

### Option 2: SQL Editor
1. Open: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new
2. Open: scripts/seed-comprehensive-data.sql
3. Copy and paste into SQL editor
4. Click Run

### Option 3: Python Script
```bash
pip install requests
python3 scripts/seed-data.py
```

### Option 4: Bash Script
```bash
bash scripts/seed-data.sh
```

## Verification Queries

After running seed script, verify data with these SQL queries:

```sql
-- Sections (should be 3)
SELECT COUNT(*) FROM "school software".sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Courses (should be 8)
SELECT COUNT(*) FROM "school software".courses
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Students (should be 18)
SELECT COUNT(*) FROM "school software".students
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Enrollments (should be 54+)
SELECT COUNT(*) FROM "school software".enrollments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Modules (should be 19)
SELECT COUNT(*) FROM "school software".modules m
WHERE m.course_id IN (
  SELECT id FROM "school software".courses
  WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
);

-- Lessons (should be 57)
SELECT COUNT(*) FROM "school software".lessons l
WHERE l.module_id IN (
  SELECT id FROM "school software".modules m
  WHERE m.course_id IN (
    SELECT id FROM "school software".courses
    WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
  )
);
```

## Testing

### Teacher App Testing
- Login as Dr. Juan Dela Cruz
- View 3 assigned sections
- Access 8 courses
- Browse students in each section
- Create content, assessments, grades

### Student App Testing
- Login as created student account
- View enrolled courses
- Browse modules and lessons
- View published content
- Submit assignments (when available)

## Files Created

### Scripts
- `scripts/setup-seed-data.mjs` - Main Node.js automated setup
- `scripts/seed-comprehensive-data.sql` - SQL migration script
- `scripts/seed-data.py` - Python REST API script
- `scripts/seed-data.sh` - Bash/curl script

### Documentation
- `COMPREHENSIVE_SEED_DATA_GUIDE.md` - This file
- `SEED_DATA_DELIVERY_SUMMARY.md` - Executive summary

## Troubleshooting

**Teacher profile not found**
- Ensure teacher exists in Supabase dashboard
- Check teacher_profiles table for school ID

**Connection errors**
- Verify .env.local has valid Supabase credentials
- Check network connectivity

**Duplicate data**
- Scripts include duplicate detection
- Running again safely skips existing records

## Technical Details

**Schema**: "school software"
**All queries prefix tables with**: "school software".

**Tables Used**:
- profiles, schools, sections, courses
- students, enrollments
- modules, lessons
- teacher_profiles, teacher_assignments

**Data Integrity**:
- All foreign keys properly linked
- No orphaned records
- RLS policies respected

## Next Steps

1. Run seed script
2. Verify in Supabase dashboard
3. Test teacher-app
4. Test student-app
5. Cross-app integration testing

Refer to SEED_DATA_DELIVERY_SUMMARY.md for complete overview.
