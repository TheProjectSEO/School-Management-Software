# MSU School OS - Seed Data Documentation Index

## Quick Start

To quickly seed test data into your database:

1. **Open**: `/seed-test-data.sql`
2. **Copy**: All contents of the file
3. **Go to**: Supabase SQL Editor
4. **Paste**: Into a new query
5. **Execute**: Click "Run"
6. **Verify**: Check console output for success messages

---

## File Reference

### 1. **seed-test-data.sql** (Main Seed Script)
📁 Location: `/teacher-app/seed-test-data.sql`
📄 Size: 28 KB
⏱️ Execution Time: 30-60 seconds

**What it does:**
- Creates 1 teacher profile (Dr. Juan Dela Cruz)
- Creates 3 sections (Grades 10, 11, 12)
- Creates 6 student profiles (2 per section)
- Creates 3 courses across sections
- Creates teacher assignments
- Creates student enrollments
- Creates 6 published modules (2 per course)
- Creates 18 lessons (3 per module)
- Creates transcripts and notes for all modules
- Creates question banks with 5 questions each
- Creates sample assessments with randomization rules

**When to use:**
- First-time database setup
- Complete fresh test environment
- When starting new testing cycle

**Key Features:**
- Idempotent (safe to run multiple times)
- Includes built-in verification
- Creates realistic test data
- Generates status messages during execution
- Includes cleanup guidance

---

### 2. **SEED_DATA_README.md** (Setup & Testing Guide)
📁 Location: `/teacher-app/SEED_DATA_README.md`
📄 Size: 11 KB

**What it covers:**
- Overview of what data gets created
- Step-by-step setup instructions
- Complete data structure breakdown
- Student roster and details
- Course assignments
- Testing workflows (6 complete scenarios)
- Customization instructions
- Troubleshooting guide
- File organization reference

**When to use:**
- First time applying seed data
- Understanding the data structure
- Following guided testing workflows
- Customizing seed data
- Debugging data issues

**Key Sections:**
1. Data Overview (what gets created)
2. Database Schema (visual structure)
3. How to Apply (step-by-step)
4. Testing Workflows (6 complete scenarios)
5. Customizing (how to modify)
6. Troubleshooting (common issues)
7. Verification Queries (built-in checks)

---

### 3. **SEED_DATA_QUERIES.sql** (Testing & Verification Queries)
📁 Location: `/teacher-app/SEED_DATA_QUERIES.sql`
📄 Size: 18 KB

**What it contains:**
- 50+ pre-written SQL queries
- Organized by data category
- Copy-paste ready
- No parameter substitution needed
- Includes analytics and dashboards

**Query Categories:**
1. Teacher Verification (3 queries)
2. Section & Student Queries (4 queries)
3. Course & Enrollment Queries (2 queries)
4. Module, Lesson & Content Queries (5 queries)
5. Assessment & Question Bank Queries (4 queries)
6. Submission & Grading Queries (3 queries)
7. Attendance Queries (2 queries)
8. Quick Stats & Dashboards (3 queries)
9. Data Cleanup & Maintenance (1 query)

**When to use:**
- After applying seed data
- During testing to verify data
- To check specific aspects
- To generate reports
- For debugging data issues

**Usage:**
1. Open `SEED_DATA_QUERIES.sql`
2. Find the query you need
3. Copy the query
4. Paste into Supabase SQL Editor
5. Execute

---

## Data Overview

### Teacher Profile
```
Name: Dr. Juan Dela Cruz
Email: juan.delacruz@msu.edu.ph
Employee ID: EMP001
Department: Mathematics & Science
Specialization: Mathematics Education
Status: Active
```

### School Structure
```
School: MSU - Main Campus (ID: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd)
├── Grade 10 - Einstein Section
│   ├── 2 Students
│   └── 1 Course: Mathematics 101 (MATH101)
├── Grade 11 - Newton Section
│   ├── 2 Students
│   └── 1 Course: Mathematics 201 (MATH201)
└── Grade 12 - Curie Section
    ├── 2 Students
    └── 1 Course: Physics 101 (PHYS101)
```

### Student Roster
| Grade | Section | Student | LRN | Status |
|-------|---------|---------|-----|--------|
| 10 | Einstein | Maria Santos | 1000000001 | Active |
| 10 | Einstein | Juan Reyes | 1000000002 | Active |
| 11 | Newton | Rosa Garcia | 1000000003 | Active |
| 11 | Newton | Miguel Lopez | 1000000004 | Active |
| 12 | Curie | Anna Martinez | 1000000005 | Active |
| 12 | Curie | Carlos Fernandez | 1000000006 | Active |

### Course Content
Each course has:
- 2 published modules
- 3 lessons per module (6 lessons total)
- AI-generated transcript for each module
- Lecture notes for each module
- 1 question bank with 5 questions
- 1 assessment with randomization rules

### Assessment Details
- Type: Quiz
- Total Points: 20
- Time Limit: 30 minutes
- Max Attempts: 2
- Due Date: 7 days from now
- Randomization: 5 questions from bank, shuffled per student

---

## Testing Workflows

### Workflow 1: Module Publishing (Pre-loaded)
**Status**: ✅ Ready to test
- All 6 modules are already published
- All 18 lessons are published
- Transcripts and notes are visible

### Workflow 2: Student Enrollment (Pre-loaded)
**Status**: ✅ Ready to test
- 6 students are enrolled
- Each student is in 1 section
- Each section is enrolled in its course

### Workflow 3: Content Viewing (Immediate)
**Status**: ✅ Can test immediately after seed
- Students can view published modules
- Students can access lessons
- Students can read transcripts and notes

### Workflow 4: Assessment Taking (Ready)
**Status**: ✅ Ready to test
- 3 assessments are created
- Each has 5 questions from bank
- Randomization is configured

### Workflow 5: Grading (Immediate after submission)
**Status**: ✅ Can test after student submits
- Teacher accesses grading inbox
- Reviews student answers
- Grades with rubric
- Releases grades

### Workflow 6: Attendance (Manual tracking)
**Status**: ✅ Structure ready
- Teacher can manually input attendance
- Can override auto-detected attendance
- Can generate daily reports

---

## How to Validate Data

### Quick Validation (30 seconds)

Run this query to see all created data:
```sql
-- Count all created data
SELECT 'Teachers' as category, COUNT(*) as count FROM n8n_content_creation.teacher_profiles WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL SELECT 'Students', COUNT(*) FROM n8n_content_creation.students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL SELECT 'Courses', COUNT(*) FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
UNION ALL SELECT 'Modules', COUNT(*) FROM n8n_content_creation.modules WHERE course_id IN (SELECT id FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd');
```

Expected results:
- Teachers: 1
- Students: 6
- Courses: 3
- Modules: 6
- Assessments: 3

### Detailed Validation (5 minutes)

See **SEED_DATA_QUERIES.sql** for:
- Teacher profile details
- Section rosters
- Course assignments
- Module content
- Assessment details
- Student enrollments

---

## Important Configuration

### School ID (Critical)
```
4fa1be18-ebf6-41e7-a8ee-800ac3815ecd = MSU - Main Campus
```

All seed data uses this school ID. If it doesn't exist in your database, the script will create it.

### Teacher Auth ID (Placeholder)
```
00000000-0000-0000-0000-000000000001
```

This is a placeholder. To enable teacher login:
1. Create an auth user in Supabase Auth
2. Get the actual auth_user_id
3. Update the profile record:
```sql
UPDATE n8n_content_creation.profiles
SET auth_user_id = 'YOUR_ACTUAL_UUID'
WHERE full_name = 'Dr. Juan Dela Cruz';
```

### Student Auth IDs (Placeholders)
All student profiles use `gen_random_uuid()` for auth_user_id. To enable student login:
1. Create auth users in Supabase Auth
2. Get actual auth_user_ids
3. Update student profiles accordingly

---

## Common Testing Tasks

### Task 1: Verify Teacher Setup
1. Run SEED_DATA_QUERIES.sql → Query #1 (Teacher Verification)
2. Should show: Dr. Juan Dela Cruz, EMP001, Active
3. Check assigned courses and sections

### Task 2: Check Student Enrollments
1. Run SEED_DATA_QUERIES.sql → Query #9 (Get student's course enrollments)
2. Should show: 6 students, 1 enrollment each
3. Verify course names match

### Task 3: View Course Content
1. Run SEED_DATA_QUERIES.sql → Query #13 (Get modules for specific course)
2. Should show: 2 modules per course
3. Should show: 3 lessons per module

### Task 4: Check Assessments
1. Run SEED_DATA_QUERIES.sql → Query #18 (Get all assessments)
2. Should show: 1 quiz per course
3. Verify randomization rules are set

### Task 5: Review Question Banks
1. Run SEED_DATA_QUERIES.sql → Query #19 (Get question banks)
2. Should show: 1 bank per course with 5 questions
3. Check difficulty distribution

### Task 6: School Statistics
1. Run SEED_DATA_QUERIES.sql → Query #29 (School-wide statistics)
2. Verify all counts match expectations
3. Use for dashboard validation

---

## Troubleshooting Quick Links

| Issue | Solution | File |
|-------|----------|------|
| "relation does not exist" | Run migrations first | CLAUDE.md |
| "duplicate key" | Normal, data already exists | SEED_DATA_README.md §3 |
| No data appearing | Check school_id, verify success | SEED_DATA_README.md §4 |
| Auth user missing | Update placeholder auth IDs | SEED_DATA_README.md §14 |
| Test query failing | Check query syntax | SEED_DATA_QUERIES.sql |

---

## File Checklist

Before starting your test:

- [ ] Migrations applied (001-013)
- [ ] Supabase project selected
- [ ] SQL Editor open
- [ ] seed-test-data.sql copied
- [ ] Query executed successfully
- [ ] Console shows completion message

After seeding:

- [ ] Ran verification queries
- [ ] All counts match expectations
- [ ] Teacher profile visible
- [ ] Student enrollments created
- [ ] Courses and modules published
- [ ] Assessments configured

---

## Next Steps

1. **If seed succeeds**: → Go to Testing Workflows section
2. **If seed fails**: → Check Troubleshooting section
3. **To test teacher app**: → Read Workflow #1-6 in SEED_DATA_README.md
4. **To test student app**: → Check Workflow #2-3
5. **To test grading**: → Follow Workflow #5
6. **To verify data**: → Use queries in SEED_DATA_QUERIES.sql

---

## Support References

- **Specification**: /CLAUDE.md
- **Schema Details**: /supabase/migrations/*.sql
- **Queries**: /SEED_DATA_QUERIES.sql
- **Setup Guide**: /SEED_DATA_README.md
- **Main Script**: /seed-test-data.sql

---

## Database Schema Diagram

```
n8n_content_creation schema:

schools
  ├── teacher_profiles
  │   └── teacher_assignments
  │       ├── sections
  │       │   ├── courses
  │       │   │   ├── modules
  │       │   │   │   ├── lessons
  │       │   │   │   ├── teacher_transcripts
  │       │   │   │   └── teacher_notes
  │       │   │   ├── enrollments
  │       │   │   │   └── students
  │       │   │   ├── assessments
  │       │   │   │   ├── submissions
  │       │   │   │   │   └── student_answers
  │       │   │   │   └── teacher_assessment_bank_rules
  │       │   │   └── teacher_question_banks
  │       │   │       └── teacher_bank_questions
  │       │   └── students
  │       └── profiles
```

---

## Summary Statistics

**Data Created by seed-test-data.sql:**

| Entity | Count | Notes |
|--------|-------|-------|
| Teachers | 1 | Dr. Juan Dela Cruz (EMP001) |
| Sections | 3 | Grades 10, 11, 12 |
| Students | 6 | 2 per section |
| Courses | 3 | 1 per section |
| Teacher Assignments | 3 | Connects teachers to courses |
| Enrollments | 6 | 1 per student |
| Modules | 6 | 2 per course, all published |
| Lessons | 18 | 3 per module, all published |
| Transcripts | 6 | AI-generated for modules |
| Notes | 6 | Lecture notes for modules |
| Question Banks | 3 | 1 per course |
| Questions | 15 | 5 per bank |
| Assessments | 3 | 1 quiz per course |
| Bank Rules | 3 | Randomization configured |

**Totals**:
- 1 Complete school environment
- 3 Operating sections
- 6 Enrolled students
- 3 Active courses
- 18 Learning modules
- 45+ Database records

---

**Last Updated**: January 12, 2026
**Version**: 1.0
**Status**: Production Ready
