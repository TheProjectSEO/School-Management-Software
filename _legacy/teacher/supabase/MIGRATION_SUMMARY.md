# MSU Teacher App - Database Migration Summary

## Overview

All 7 migration files have been created for the MSU Teacher Web App. These migrations create a complete database schema in the `n8n_content_creation` schema.

## Migration Files

### 001_teacher_profiles.sql (5.4 KB)
**Purpose:** Teacher identity and assignment tables

**Tables Created:**
- `teacher_profiles` - Teacher-specific profile information
- `teacher_assignments` - Maps teachers to sections and courses

**Key Features:**
- Validation trigger ensures teacher, section, and course belong to same school
- Auto-update timestamp triggers
- Performance indexes on all foreign keys

---

### 002_teacher_content.sql (8.2 KB)
**Purpose:** Content management tables for teaching materials

**Tables Created:**
- `teacher_transcripts` - Module transcripts from recordings/AI
- `teacher_notes` - Lecture notes with rich text
- `teacher_content_assets` - Files, slides, PDFs, recordings (polymorphic)

**Key Features:**
- Version control for transcripts and notes
- Publish workflow with approval tracking
- Helper functions to get latest versions
- Storage path references for Supabase Storage

---

### 003_teacher_live_sessions.sql (12 KB)
**Purpose:** Live class sessions and attendance tracking

**Tables Created:**
- `teacher_live_sessions` - Scheduled/live class sessions
- `teacher_session_presence` - Join/leave tracking with ping counts
- `teacher_attendance` - Per-session attendance with auto-detection
- `teacher_daily_attendance` - Daily login-based attendance

**Key Features:**
- Support for multiple video providers (Zoom, Meet, Teams, LiveKit, Daily)
- Auto-calculate presence duration
- Helper function to detect attendance status from presence data
- Manual override capability for attendance

---

### 004_teacher_assessments.sql (13 KB)
**Purpose:** Question banks and randomized assessments

**Tables Created:**
- `teacher_question_banks` - Question pools for random generation
- `teacher_bank_questions` - Individual questions with tags/difficulty
- `teacher_assessment_bank_rules` - Randomization rules (pick count, filters, seed mode)
- `teacher_student_quiz_snapshots` - Frozen quiz instances per student/attempt

**Key Features:**
- Tag-based and difficulty-based filtering
- Shuffle questions and choices independently
- Seed modes: per_student, per_attempt, or fixed
- Validation trigger prevents insufficient questions
- Helper function to generate quiz snapshots

---

### 005_teacher_rubrics.sql (12 KB)
**Purpose:** Rubric-based grading and feedback system

**Tables Created:**
- `teacher_rubric_templates` - Reusable rubric definitions
- `teacher_rubric_scores` - Applied scores per submission
- `teacher_feedback` - Detailed feedback with AI drafts and release control

**Key Features:**
- Auto-calculate total rubric score
- Sync rubric scores to submission table
- Auto-calculate max score for templates
- AI draft feedback support
- Release control (grades hidden until teacher approves)
- Batch release functionality

---

### 006_teacher_communication.sql (14 KB)
**Purpose:** Announcements, discussions, and messaging

**Tables Created:**
- `teacher_announcements` - Scoped announcements (section/course/school)
- `teacher_discussion_threads` - Forum threads with lock/pin
- `teacher_discussion_posts` - Nested discussion posts
- `teacher_direct_messages` - One-to-one messaging

**Key Features:**
- Polymorphic announcement scoping
- Nested/threaded discussion replies
- Pin and lock functionality
- Read receipts for direct messages
- Auto-update thread timestamp on new post
- Helper functions for conversations and unread counts

---

### 007_teacher_rls_policies.sql (22 KB)
**Purpose:** Row Level Security policies for all teacher tables

**Key Security Principles:**
1. Teachers only access data within their school
2. Teachers only manage assigned courses/sections
3. Students only see published content
4. Students only see released grades/feedback
5. Everyone only messages within their school

**Helper Functions:**
- `current_profile_id()` - Get authenticated user's profile
- `is_teacher()` / `is_student()` - Role detection
- `current_teacher_profile_id()` - Get teacher profile ID
- `current_teacher_school_id()` - Get teacher's school
- `teacher_assigned_to_course()` - Check course assignment
- `teacher_assigned_to_section()` - Check section assignment
- `current_student_id()` - Get student ID

**Policies Created:** 40+ RLS policies covering:
- Teacher profile management
- Content management (transcripts, notes, assets)
- Live sessions and attendance
- Question banks and assessments
- Rubrics and feedback
- Communication (announcements, discussions, messages)

---

## Schema Architecture

### All Tables Are in `n8n_content_creation` Schema
```
n8n_content_creation.
├── teacher_profiles
├── teacher_assignments
├── teacher_transcripts
├── teacher_notes
├── teacher_content_assets
├── teacher_live_sessions
├── teacher_session_presence
├── teacher_attendance
├── teacher_daily_attendance
├── teacher_question_banks
├── teacher_bank_questions
├── teacher_assessment_bank_rules
├── teacher_student_quiz_snapshots
├── teacher_rubric_templates
├── teacher_rubric_scores
├── teacher_feedback
├── teacher_announcements
├── teacher_discussion_threads
├── teacher_discussion_posts
└── teacher_direct_messages
```

### Shared Tables (from Student App)
These tables are referenced but NOT created by these migrations:
- `profiles` - User profiles
- `schools` - School information
- `sections` - Class sections
- `students` - Student data
- `courses` - Course/subject data
- `modules` - Learning modules
- `lessons` - Module lessons
- `assessments` - Assignments/quizzes
- `submissions` - Student submissions
- `enrollments` - Student enrollments

---

## Key Features Across All Migrations

### 1. Timestamps
- All tables have `created_at` (auto-set to NOW())
- Most tables have `updated_at` (auto-updated via trigger)

### 2. Constraints
- Foreign keys with CASCADE or SET NULL
- Check constraints for enum fields
- Validation constraints (e.g., no empty strings, positive numbers)
- Consistency constraints (e.g., published requires published_by)

### 3. Indexes
- Foreign key columns
- Commonly filtered columns (status, is_published, etc.)
- Composite indexes for common queries
- GIN indexes for JSONB and array columns

### 4. Triggers
- Auto-update timestamps
- Auto-calculate values (duration, scores)
- Validation (locked threads, school boundaries)
- Sync related tables

### 5. Helper Functions
- Get latest versions
- Calculate durations/scores
- Detect status from data
- Batch operations
- Release workflows

### 6. JSONB Fields
Used for flexible/complex data:
- `timestamps_json` - Transcript timestamps
- `choices_json` - Question choices
- `answer_key_json` - Correct answers
- `criteria_json` - Rubric criteria
- `levels_json` - Rubric levels
- `scores_json` - Rubric scores per criterion
- `inline_notes_json` - Line-by-line feedback
- `attachments_json` - File attachments
- `meta_json` - Additional metadata

---

## Migration Execution Order

**CRITICAL:** Run migrations in numerical order:

```bash
# 1. Teacher identity
psql -f 001_teacher_profiles.sql

# 2. Content management
psql -f 002_teacher_content.sql

# 3. Live sessions & attendance
psql -f 003_teacher_live_sessions.sql

# 4. Assessments & question banks
psql -f 004_teacher_assessments.sql

# 5. Rubrics & grading
psql -f 005_teacher_rubrics.sql

# 6. Communication
psql -f 006_teacher_communication.sql

# 7. RLS policies (MUST BE LAST)
psql -f 007_teacher_rls_policies.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

---

## Data Flow Examples

### Publishing a Module
1. Teacher creates module (`modules.is_published = false`)
2. Teacher uploads recording → creates transcript (`teacher_transcripts`)
3. Teacher edits transcript → increments version
4. Teacher clicks Publish → sets `is_published = true`, records `published_by`
5. Students can now see module (RLS allows published content)

### Randomized Quiz
1. Teacher creates question bank (`teacher_question_banks`)
2. Teacher adds questions with tags (`teacher_bank_questions`)
3. Teacher creates assessment and adds bank rule (`teacher_assessment_bank_rules`)
4. Student starts quiz → system generates snapshot (`teacher_student_quiz_snapshots`)
5. Snapshot freezes questions/choices for that student/attempt

### Grading with Rubric
1. Teacher creates rubric template (`teacher_rubric_templates`)
2. Student submits assignment (`submissions`)
3. Teacher applies rubric → creates scores (`teacher_rubric_scores`)
4. Auto-trigger calculates total score and syncs to submission
5. Teacher adds feedback (`teacher_feedback.ai_draft` → edits → `teacher_comment`)
6. Teacher clicks Release → `feedback.is_released = true`
7. Student sees grade and feedback (RLS allows released feedback)

### Attendance Tracking
1. Student logs in → `teacher_daily_attendance` updated
2. Student joins live session → `teacher_session_presence` tracks join/leave
3. Session ends → auto-populate `teacher_attendance` from presence
4. Teacher can override status manually (`manual_override = true`)

---

## Next Steps

### 1. Apply Migrations
```bash
cd teacher-app
supabase db push
```

### 2. Generate TypeScript Types
```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

### 3. Create Data Access Layer
Create helper functions in `/lib/dal/teacher/`:
- `getCurrentTeacher()`
- `getTeacherAssignments()`
- `createModule()`
- `publishModule()`
- `gradeSubmission()`
- `releaseGrades()`
- etc.

### 4. Build Frontend
Implement teacher portal routes per CLAUDE.md:
- `/teacher` - Dashboard
- `/teacher/classes` - My classes
- `/teacher/subjects` - My subjects
- `/teacher/assessments` - Assessment builder
- `/teacher/submissions` - Grading inbox
- etc.

---

## Validation Checklist

- [x] All tables in `n8n_content_creation` schema
- [x] Foreign keys properly defined
- [x] Check constraints on enums
- [x] Indexes on foreign keys and common filters
- [x] Update timestamp triggers
- [x] Validation triggers where needed
- [x] Helper functions for common operations
- [x] RLS policies enabled on all tables
- [x] RLS helper functions for role detection
- [x] Teacher policies enforce school/assignment boundaries
- [x] Student policies enforce enrollment and release controls
- [x] Comments on tables, columns, and functions

---

## Schema Size Summary

| Migration | Tables | Triggers | Functions | Policies | Size |
|-----------|--------|----------|-----------|----------|------|
| 001 | 2 | 2 | 2 | 0 | 5.4 KB |
| 002 | 3 | 2 | 2 | 0 | 8.2 KB |
| 003 | 4 | 4 | 3 | 0 | 12 KB |
| 004 | 4 | 2 | 3 | 0 | 13 KB |
| 005 | 3 | 4 | 5 | 0 | 12 KB |
| 006 | 4 | 5 | 6 | 0 | 14 KB |
| 007 | 0 | 0 | 7 | 40+ | 22 KB |
| **Total** | **20** | **19** | **28** | **40+** | **87 KB** |

---

**Generated:** 2025-12-28
**Schema Version:** 1.0.0
**Author:** Database Schema Architect (Claude Code)
**Project:** MSU Teacher Web App
