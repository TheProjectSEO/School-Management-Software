# MSU School OS - Comprehensive Test Data Seed

## Overview

This document explains the `seed-test-data.sql` file, which creates a complete test environment for the teacher-app and student-app to work together seamlessly.

## What Gets Created

### 1. **Teacher Profile** (Dr. Juan Dela Cruz)
- **Email**: juan.delacruz@msu.edu.ph
- **Employee ID**: EMP001
- **Department**: Mathematics & Science
- **Specialization**: Mathematics Education
- **Status**: Active

### 2. **School Structure** (3 Sections)
- **Grade 10 - Einstein Section**: 2 students
- **Grade 11 - Newton Section**: 2 students
- **Grade 12 - Curie Section**: 2 students

### 3. **Student Profiles** (6 Students)
| Name | Grade | Section |
|------|-------|---------|
| Maria Santos | 10 | Einstein |
| Juan Reyes | 10 | Einstein |
| Rosa Garcia | 11 | Newton |
| Miguel Lopez | 11 | Newton |
| Anna Martinez | 12 | Curie |
| Carlos Fernandez | 12 | Curie |

### 4. **Courses** (3 Courses)
- **Mathematics 101** (Grade 10): MATH101
- **Mathematics 201** (Grade 11): MATH201
- **Physics 101** (Grade 12): PHYS101

### 5. **Content Structure**
- **2 Modules per Course** (6 total)
- **3 Lessons per Module** (18 total)
- **Transcripts**: All modules have AI-generated transcripts
- **Notes**: All modules have lecture notes
- **Question Banks**: 1 per course with 5 sample questions
- **Assessments**: 1 quiz per course with randomization rules

## Database Schema

All data is created in the `n8n_content_creation` schema as per specification:

```
n8n_content_creation.profiles
├── teacher_profiles
├── students
│   └── (linked to sections)
├── sections
│   └── courses
│       ├── enrollments
│       ├── modules
│       │   ├── lessons
│       │   ├── teacher_transcripts
│       │   └── teacher_notes
│       └── teacher_question_banks
│           ├── teacher_bank_questions
│           └── teacher_assessment_bank_rules
├── courses
│   ├── teacher_assignments
│   └── assessments
└── schools
```

## How to Apply the Seed

### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (MSU School OS)
3. Go to **SQL Editor** in the left sidebar
4. Click **"New Query"**

### Step 2: Copy and Paste

1. Open `/seed-test-data.sql`
2. Copy **all contents**
3. Paste into Supabase SQL Editor
4. Click **Run**

### Step 3: Review Results

The script will output:
- Summary statistics of what was created
- Verification queries showing all data
- Teacher profile details
- Section listings
- Student roster
- Course assignments
- Module & lesson structure
- Assessment details
- Question bank contents

## Testing Workflows

### Workflow 1: Teacher Creates & Publishes Content

**Status**: ✅ Pre-loaded (modules are already published)

**What to test**:
1. Login to teacher-app as Dr. Juan Dela Cruz
2. Navigate to `/teacher/subjects`
3. Verify 3 courses appear across 3 sections
4. Click into a course to see:
   - 2 modules with published status
   - Each module has 3 lessons
   - Transcript and notes are visible
   - Ready to add more content

### Workflow 2: Student Enrolls & Views Content

**Status**: ✅ Ready to test

**Steps**:
1. In student-app, login as **Maria Santos** (student email can be derived from profile)
2. Dashboard should show:
   - Enrolled in "Mathematics 101" (Grade 10)
   - 2 published modules available
   - 3 lessons per module
3. Click into a module to see:
   - Lesson titles and descriptions
   - Video/reading/interactive content
   - Transcript accessible
   - Notes visible

### Workflow 3: Teacher Creates Assessment

**Status**: ✅ Pre-loaded with sample quiz

**What to test**:
1. Teacher navigates to `/teacher/assessments`
2. Should see "Quiz 1: Mathematics 101..." assessment
3. Assessment details show:
   - Type: Quiz
   - Total Points: 20
   - Time Limit: 30 minutes
   - Max Attempts: 2
   - Due Date: 7 days from now
4. Click to view question bank rules:
   - Bank: "Question Bank 1: Basic Concepts"
   - Pick: 5 questions
   - Difficulty: Easy/Medium
   - Shuffle: Enabled for questions and choices
   - Seed Mode: Per Student (each student gets unique randomization)

### Workflow 4: Student Takes Quiz

**Status**: ✅ Ready for submission testing

**Steps**:
1. In student-app, student clicks on assessment
2. Quiz snapshot is generated (5 questions randomly selected & shuffled)
3. Student answers all questions
4. Submit quiz
5. Submission appears in teacher's grading inbox

### Workflow 5: Teacher Grades Submission

**Status**: ✅ Prepared for grading workflow

**Steps**:
1. Teacher navigates to `/teacher/submissions`
2. Sees pending submissions from students
3. Click on submission to grade:
   - Review student answers
   - See auto-graded MCQ results
   - Add manual feedback
   - Apply rubric scores
4. Click "Release Grade"
5. Student sees score and feedback in student-app

### Workflow 6: Attendance Tracking

**Status**: ✅ Data structure ready

**What to test**:
- Teacher can track daily attendance
- Can view attendance reports by section
- Can manually override attendance status
- Attendance linked to student enrollment

## Important Notes

### Auth User ID

The seed data uses a placeholder auth_user_id for the teacher:
```
00000000-0000-0000-0000-000000000001
```

**To enable teacher login**:
1. Create a real auth user in Supabase Auth
2. Update the teacher_profiles.profile_id to link to the real auth user
3. Or modify the seed script before running to use your actual auth user ID

### School ID

The seed data uses:
```
4fa1be18-ebf6-41e7-a8ee-800ac3815ecd
```

This is the **MSU - Main Campus** school. If it doesn't exist in your database, the script will create it.

### Student Auth Users

The seed creates profile entries for students but uses placeholder auth_user_ids. To test student login:
1. Create actual auth users for students
2. Link their student records to the real auth user IDs
3. Or modify seed script to include real auth user IDs

## Verification Queries

The seed script includes built-in verification. After running, you can see:

### Count all created data:
```sql
SELECT COUNT(*) FROM n8n_content_creation.teacher_profiles WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT COUNT(*) FROM n8n_content_creation.students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT COUNT(*) FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
```

### View teacher profile:
```sql
SELECT p.full_name, tp.employee_id, tp.department
FROM n8n_content_creation.teacher_profiles tp
JOIN n8n_content_creation.profiles p ON tp.profile_id = p.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
```

### View all sections:
```sql
SELECT name, grade_level FROM n8n_content_creation.sections
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY grade_level;
```

### View student roster:
```sql
SELECT p.full_name, s.grade_level, sec.name as section
FROM n8n_content_creation.students s
JOIN n8n_content_creation.profiles p ON s.profile_id = p.id
JOIN n8n_content_creation.sections sec ON s.section_id = sec.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY p.full_name;
```

### View courses with teacher assignments:
```sql
SELECT c.name, c.subject_code, s.name as section, p.full_name as teacher
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.profiles p ON c.teacher_id = p.id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY s.grade_level, c.name;
```

## Customizing the Seed

### To change the teacher name:
Find and replace:
```sql
'Dr. Juan Dela Cruz' → 'Your Teacher Name'
'EMP001' → 'Your Employee ID'
```

### To change the school:
Replace the school_id:
```sql
'4fa1be18-ebf6-41e7-a8ee-800ac3815ecd' → 'YOUR_ACTUAL_SCHOOL_ID'
```

### To add more students:
Add entries to the student profiles section:
```sql
INSERT INTO n8n_content_creation.profiles (auth_user_id, full_name, phone)
VALUES (gen_random_uuid(), 'Student Name', '+63-912-1234567');
```

### To add more courses:
Add entries to the courses section:
```sql
INSERT INTO n8n_content_creation.courses (school_id, section_id, name, subject_code, teacher_id)
VALUES ('school_id', 'section_id', 'Course Name', 'CODE101', 'teacher_id');
```

## Troubleshooting

### Error: "relation does not exist"
- Ensure all migrations have been run first
- Check that you're using the correct schema: `n8n_content_creation`
- Run migrations in this order:
  1. `001_teacher_profiles.sql`
  2. `002_teacher_content.sql`
  3. `003_teacher_live_sessions.sql`
  4. `004_teacher_assessments.sql`
  5. `005_teacher_rubrics.sql`
  6. `006_teacher_communication.sql`
  7. `007_teacher_rls_policies.sql`

### Error: "duplicate key value violates unique constraint"
- The data may have already been seeded
- Either delete existing data first or modify the INSERT statements to use `ON CONFLICT DO NOTHING` (already included)

### No data appearing after running
- Check that the script completed without errors
- Verify the school_id exists in your database
- Run the verification queries to check data creation

## File Organization

```
teacher-app/
├── seed-test-data.sql          (This seed script)
├── SEED_DATA_README.md         (This documentation)
├── supabase/
│   └── migrations/
│       ├── 001_teacher_profiles.sql
│       ├── 002_teacher_content.sql
│       ├── 003_teacher_live_sessions.sql
│       ├── 004_teacher_assessments.sql
│       ├── 005_teacher_rubrics.sql
│       ├── 006_teacher_communication.sql
│       └── 007_teacher_rls_policies.sql
└── scripts/
    └── seed-comprehensive-data.sql (Legacy - use seed-test-data.sql)
```

## Testing Checklist

After applying the seed data:

- [ ] Teacher can login to teacher-app
- [ ] Teacher sees 3 sections with assigned courses
- [ ] Students can login to student-app
- [ ] Students see enrolled courses in dashboard
- [ ] Students can view published modules and lessons
- [ ] Students can view module transcripts and notes
- [ ] Students can start and submit quiz assessments
- [ ] Teacher can view submissions in grading inbox
- [ ] Teacher can grade and release submissions
- [ ] Students see grades and feedback when released
- [ ] Attendance tracking appears in teacher section dashboard

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the CLAUDE.md specification file
3. Check Supabase logs for SQL errors
4. Verify all migrations have been applied

---

**Last Updated**: January 12, 2026
**Schema**: n8n_content_creation
**School**: MSU - Main Campus (ID: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd)
