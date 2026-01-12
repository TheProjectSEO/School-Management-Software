# MSU Teacher App - Supabase Database Schema

This directory contains all database migrations, documentation, and validation scripts for the MSU Teacher Web App.

## 📁 Directory Structure

```
supabase/
├── migrations/              # SQL migration files (run in order)
│   ├── 001_teacher_profiles.sql
│   ├── 002_teacher_content.sql
│   ├── 003_teacher_live_sessions.sql
│   ├── 004_teacher_assessments.sql
│   ├── 005_teacher_rubrics.sql
│   ├── 006_teacher_communication.sql
│   └── 007_teacher_rls_policies.sql
├── MIGRATION_SUMMARY.md     # Detailed documentation of all migrations
├── QUICK_REFERENCE.md       # Quick reference for queries and functions
├── validate_schema.sql      # Validation script to verify migrations
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Apply All Migrations

```bash
cd teacher-app
supabase db push
```

Or manually:

```bash
psql $DATABASE_URL -f supabase/migrations/001_teacher_profiles.sql
psql $DATABASE_URL -f supabase/migrations/002_teacher_content.sql
psql $DATABASE_URL -f supabase/migrations/003_teacher_live_sessions.sql
psql $DATABASE_URL -f supabase/migrations/004_teacher_assessments.sql
psql $DATABASE_URL -f supabase/migrations/005_teacher_rubrics.sql
psql $DATABASE_URL -f supabase/migrations/006_teacher_communication.sql
psql $DATABASE_URL -f supabase/migrations/007_teacher_rls_policies.sql
```

### 2. Validate Schema

```bash
psql $DATABASE_URL -f supabase/validate_schema.sql
```

### 3. Generate TypeScript Types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## 📊 Schema Overview

### Tables Created: 20

**Identity & Assignments** (2 tables)
- `teacher_profiles` - Teacher profile data
- `teacher_assignments` - Teacher-to-course/section mappings

**Content Management** (3 tables)
- `teacher_transcripts` - Module transcripts
- `teacher_notes` - Lecture notes
- `teacher_content_assets` - Files, slides, recordings

**Live Sessions & Attendance** (4 tables)
- `teacher_live_sessions` - Scheduled/live classes
- `teacher_session_presence` - Join/leave tracking
- `teacher_attendance` - Per-session attendance
- `teacher_daily_attendance` - Daily attendance

**Assessments & Question Banks** (4 tables)
- `teacher_question_banks` - Question pools
- `teacher_bank_questions` - Individual questions
- `teacher_assessment_bank_rules` - Randomization rules
- `teacher_student_quiz_snapshots` - Frozen quizzes

**Grading & Feedback** (3 tables)
- `teacher_rubric_templates` - Rubric definitions
- `teacher_rubric_scores` - Applied rubric scores
- `teacher_feedback` - Detailed feedback with release control

**Communication** (4 tables)
- `teacher_announcements` - Announcements
- `teacher_discussion_threads` - Forum threads
- `teacher_discussion_posts` - Discussion posts
- `teacher_direct_messages` - Direct messaging

### Additional Features

- **28 Helper Functions** - For common operations and RLS
- **19 Triggers** - Auto-update timestamps, calculations, validation
- **40+ RLS Policies** - Security at row level
- **60+ Indexes** - Performance optimization
- **40+ Check Constraints** - Data integrity

## 🔒 Security (Row Level Security)

All tables have RLS enabled with the following principles:

### Teachers Can:
✅ Access data within their school
✅ Manage courses/sections they're assigned to
✅ Grade submissions for their assessments
✅ Send announcements to their scope
✅ View student data for assigned sections

### Students Can:
✅ View published content for enrolled courses
✅ Submit to assigned assessments
✅ View released grades and feedback
✅ Participate in course discussions

### Both Cannot:
❌ Access data from other schools
❌ See unreleased grades/feedback
❌ Access unassigned courses/sections

## 📖 Documentation

### Full Documentation
See [`MIGRATION_SUMMARY.md`](./MIGRATION_SUMMARY.md) for:
- Detailed table descriptions
- Column explanations
- Trigger and function details
- Data flow examples
- Migration execution guide

### Quick Reference
See [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) for:
- Common queries
- Helper function usage
- Enum values
- RLS policy summary
- Troubleshooting tips

## ⚠️ Critical Rules

### Schema Location
**ALL tables MUST be in `n8n_content_creation` schema.**

```sql
-- ✅ CORRECT
CREATE TABLE n8n_content_creation.teacher_profiles (...);

-- ❌ WRONG
CREATE TABLE teacher_profiles (...);
CREATE TABLE public.teacher_profiles (...);
```

### Migration Order
**Migrations MUST be run in numerical order:**
1. `001_teacher_profiles.sql` - Identity tables (required by others)
2. `002_teacher_content.sql` - Content tables
3. `003_teacher_live_sessions.sql` - Session tables
4. `004_teacher_assessments.sql` - Assessment tables
5. `005_teacher_rubrics.sql` - Grading tables
6. `006_teacher_communication.sql` - Communication tables
7. `007_teacher_rls_policies.sql` - **MUST BE LAST** (policies)

## 🧪 Testing

### Test RLS Policies

```sql
-- Test as teacher
SET LOCAL ROLE authenticated;
SET request.jwt.claims TO '{"sub": "teacher-auth-uuid"}';

SELECT * FROM n8n_content_creation.teacher_assignments;
-- Should see only assigned courses

-- Test as student
SET request.jwt.claims TO '{"sub": "student-auth-uuid"}';

SELECT * FROM n8n_content_creation.teacher_transcripts;
-- Should see only published transcripts for enrolled courses
```

### Test Helper Functions

```sql
-- Test quiz generation
SELECT n8n_content_creation.generate_quiz_snapshot(
  'assessment-uuid'::uuid,
  'student-uuid'::uuid,
  1
);

-- Test feedback release
SELECT n8n_content_creation.release_feedback(
  'submission-uuid'::uuid,
  'teacher-profile-uuid'::uuid
);

-- Test attendance detection
SELECT n8n_content_creation.detect_attendance_status(
  'session-uuid'::uuid,
  'student-uuid'::uuid,
  30 -- threshold minutes
);
```

## 📝 Common Tasks

### Create a Teacher Profile

```sql
-- First create profile in profiles table
INSERT INTO n8n_content_creation.profiles (auth_user_id, full_name)
VALUES (auth.uid(), 'John Doe')
RETURNING id;

-- Then create teacher profile
INSERT INTO n8n_content_creation.teacher_profiles (
  profile_id,
  school_id,
  employee_id,
  department
) VALUES (
  'profile-uuid'::uuid,
  'school-uuid'::uuid,
  'EMP001',
  'Mathematics'
);
```

### Assign Teacher to Course

```sql
INSERT INTO n8n_content_creation.teacher_assignments (
  teacher_profile_id,
  section_id,
  course_id,
  is_primary
) VALUES (
  'teacher-profile-uuid'::uuid,
  'section-uuid'::uuid,
  'course-uuid'::uuid,
  true
);
```

### Publish a Module with Transcript

```sql
-- Update transcript to published
UPDATE n8n_content_creation.teacher_transcripts
SET
  is_published = true,
  published_at = NOW(),
  published_by = 'teacher-profile-uuid'::uuid
WHERE id = 'transcript-uuid'::uuid;

-- Publish the module
UPDATE n8n_content_creation.modules
SET is_published = true
WHERE id = 'module-uuid'::uuid;
```

### Release Grades in Batch

```sql
SELECT n8n_content_creation.batch_release_feedback(
  ARRAY[
    'submission-1-uuid'::uuid,
    'submission-2-uuid'::uuid,
    'submission-3-uuid'::uuid
  ],
  'teacher-profile-uuid'::uuid
);
```

## 🐛 Troubleshooting

### Issue: Migrations fail with "schema does not exist"

**Solution:** Ensure `n8n_content_creation` schema exists:
```sql
CREATE SCHEMA IF NOT EXISTS n8n_content_creation;
```

### Issue: RLS blocks all queries

**Solution:** Check that:
1. User is authenticated (`auth.uid()` returns value)
2. Profile exists in `profiles` table
3. Helper functions return correct values

### Issue: Quiz generation fails

**Solution:** Ensure:
1. Question bank has enough questions matching filters
2. `pick_count` <= available questions
3. Validation trigger allows the rule

### Issue: Students can't see published content

**Solution:** Check:
1. Module `is_published = true`
2. Student enrolled in course
3. RLS policy allows access

## 🔄 Updates & Versioning

### Schema Version: 1.0.0

To update the schema:

1. Create new migration file: `00X_description.sql`
2. Update `MIGRATION_SUMMARY.md`
3. Update `QUICK_REFERENCE.md`
4. Run `validate_schema.sql`
5. Regenerate TypeScript types

## 📞 Support

For questions or issues:

1. Check [`MIGRATION_SUMMARY.md`](./MIGRATION_SUMMARY.md) for detailed docs
2. Check [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) for examples
3. Run [`validate_schema.sql`](./validate_schema.sql) to verify setup
4. Review RLS policies in `007_teacher_rls_policies.sql`

## 📜 License

Part of MSU Online School OS - Teacher Web App

---

**Last Updated:** 2025-12-28
**Schema Version:** 1.0.0
**Total Migrations:** 7
**Total Tables:** 20
**Total RLS Policies:** 40+
