# Database Tables Reference - MSU School Management System

**Generated:** January 19, 2026
**Database Schema:** `public`
**Total Tables in Database:** 157 tables

---

## 📊 Overview by Application

| Application | Tables Used | Shared Tables | Unique Tables |
|------------|-------------|---------------|---------------|
| **Student-App** | 49 | 7 core | 26 unique |
| **Teacher-App** | 38 | 7 core | 15 unique |
| **Admin-App** | 20 | 7 core | 13 unique |

---

## 🎓 STUDENT-APP TABLES (49 total)

### Core Authentication & Profile (6 tables)
- `school_profiles` - Main user profiles linked to Supabase Auth
- `students` - Student records with LRN, grade level, section
- `profiles` - Legacy generic profiles (being phased out)
- `schools` - School information
- `sections` - Class sections (Grade 10-A, etc.)
- `enrollments` - Student course enrollments

### Course Content & Learning (10 tables)
- `courses` - Course/subject definitions
- `modules` - Course modules (units/chapters)
- `lessons` - Individual lessons within modules
- `student_progress` - Lesson completion tracking
- `teacher_assignments` - Teacher-course assignments
- `lesson_attachments` - File attachments for lessons (not directly used yet)
- `content_assets` - Media assets for content
- `transcripts` - Video transcripts

### Assessments & Quizzes (11 tables)
- `assessments` - Quiz/exam definitions
- `questions` - Assessment questions
- `answer_options` - Multiple choice options
- `submissions` - Student assessment submissions
- `student_answers` - Individual question answers
- `quiz_snapshots` - Generated quiz instances
- `question_banks` - Question repositories
- `assessment_bank_rules` - Rules for generating quizzes from banks
- `rubric_templates` - Grading rubrics
- `rubric_scores` - Rubric-based scores
- `feedback` - Teacher feedback on submissions

### Grades & Reports (4 tables)
- `course_grades` - Final course grades
- `semester_gpa` - Calculated GPA per semester
- `report_cards` - Generated report cards
- `grading_periods` - Academic periods (quarters, semesters)

### Communication & Notifications (8 tables)
- `teacher_announcements` - Announcements from teachers
- `announcement_reads` - Track which announcements student has read
- `student_notifications` - In-app notifications
- `teacher_direct_messages` - Direct messaging with teachers
- `direct_messages` - Generic DM table
- `discussion_threads` - Discussion forums
- `discussion_posts` - Forum posts
- `announcements` - System announcements

### Attendance (4 tables)
- `teacher_attendance` - Attendance records
- `live_attendance` - Real-time attendance tracking
- `daily_presence` - Daily attendance logs
- `session_presence_events` - Session join/leave events

### Student Resources (6 tables)
- `student_downloads` - Downloadable resources
- `student_notes` - Personal notes
- `downloads` - File downloads (generic)
- `student_courses` - Alternative course tracking (duplicate?)
- `section_subjects` - Section-subject assignments
- `section_enrollments` - Section enrollment tracking
- `avatars` - Avatar image storage

---

## 👨‍🏫 TEACHER-APP TABLES (38 total)

### Core Authentication & Profile (4 tables)
- `school_profiles` - Main user profiles
- `teacher_profiles` - Teacher-specific data (employee_id, department)
- `profiles` - Legacy profiles (being phased out)
- `schools` - School information

### Course Management (8 tables)
- `courses` - Course definitions
- `modules` - Course modules
- `lessons` - Lesson content
- `teacher_assignments` - Teacher-course assignments
- `teacher_course_assignments` - Alternative assignment tracking
- `sections` - Class sections
- `enrollments` - Student enrollments
- `module_publish` - Module publication status

### Assessment & Grading (12 tables)
- `assessments` - Assessment definitions
- `submissions` - Student submissions
- `teacher_assessment_questions` - Teacher-created questions
- `teacher_question_banks` - Question bank repositories
- `teacher_bank_questions` - Questions in banks
- `teacher_grading_queue` - Pending grading queue
- `teacher_feedback` - Feedback on submissions
- `teacher_rubric_scores` - Rubric scoring
- `rubric_scores` - Score records
- `course_grades` - Final grades
- `grade_weight_configs` - Grade weighting rules
- `student_answers` - Student answer tracking

### Attendance & Live Sessions (6 tables)
- `teacher_attendance` - Attendance records created by teacher
- `teacher_daily_attendance` - Daily attendance logs
- `teacher_live_sessions` - Virtual class sessions
- `teacher_session_presence` - Session attendance tracking

### Communication (4 tables)
- `teacher_announcements` - Teacher-posted announcements
- `teacher_direct_messages` - Direct messaging
- `announcement_reads` - Read status tracking
- `notifications` - System notifications

### Reports & Analytics (4 tables)
- `report_cards` - Student report cards
- `grading_periods` - Academic periods
- `teacher_notes` - Teacher's private notes
- `lesson_attachments` - Lesson file attachments
- `teacher_transcripts` - Video transcripts for lessons

---

## 🛡️ ADMIN-APP TABLES (20 total)

### Core Authentication & Profile (2 tables)
- `school_profiles` - User profiles
- `teacher_profiles` - Teacher data

### Student Management (2 tables)
- `students` - Student records
- `enrollments` - Course enrollments

### Academic Structure (4 tables)
- `courses` - Course catalog
- `sections` - Class sections
- `section_advisers` - Section advisory assignments
- `teacher_course_sections` - Teacher-section-course mapping

### Academic Settings (5 tables)
- `academic_years` - School years
- `academic_settings` - Academic configurations
- `grading_periods` - Quarters/semesters
- `grading_scales` - Letter grade scales (A, B, C, etc.)
- `grade_weight_configs` - Grade calculation weights (not directly used yet)

### Reports & Analytics (4 tables)
- `attendance` - Attendance records
- `attendance_summary` - Aggregated attendance
- `grades` - Grade records
- `grade_records` - Historical grade data
- `section_progress` - Section performance metrics

### System Administration (3 tables)
- `school_settings` - School configuration
- `audit_logs` - System audit trail
- `messages` - Admin messaging system

---

## 🔗 SHARED TABLES (Used by All 3 Apps)

These 7 core tables are the foundation of the system:

| Table | Purpose | Used By |
|-------|---------|---------|
| `school_profiles` | User authentication & basic profile | All apps - links to Supabase Auth |
| `students` | Student records (LRN, grade level) | All apps - core entity |
| `teacher_profiles` | Teacher information | All apps - core entity |
| `courses` | Course/subject definitions | All apps - academic structure |
| `sections` | Class sections | All apps - organizational structure |
| `enrollments` | Student-course relationships | All apps - enrollment management |
| `grading_periods` | Academic periods (Q1, Q2, etc.) | All apps - temporal organization |

---

## 🔍 TABLE CATEGORIES BY FUNCTION

### Authentication & User Management
- `school_profiles` ✅ (All apps)
- `students` ✅ (All apps)
- `teacher_profiles` ✅ (All apps)
- `profiles` ⚠️ (Legacy - being replaced by school_profiles)

### Academic Structure
- `schools` (Student, Teacher)
- `courses` ✅ (All apps)
- `sections` ✅ (All apps)
- `enrollments` ✅ (All apps)
- `teacher_assignments` (Student, Teacher)

### Content & Learning
- `modules` (Student, Teacher)
- `lessons` (Student, Teacher)
- `student_progress` (Student only)
- `lesson_attachments` (Teacher only)

### Assessments
- `assessments` (Student, Teacher)
- `submissions` (Student, Teacher)
- `questions` (Student)
- `teacher_assessment_questions` (Teacher)
- `teacher_question_banks` (Teacher)
- `student_answers` (Student, Teacher)

### Grading
- `course_grades` (Student, Teacher)
- `semester_gpa` (Student)
- `report_cards` (Student, Teacher, Admin)
- `grading_periods` ✅ (All apps)
- `grade_weight_configs` (Teacher)

### Communication
- `teacher_announcements` (Student, Teacher)
- `teacher_direct_messages` (Student, Teacher)
- `notifications` (Student, Teacher)
- `announcement_reads` (Student, Teacher)
- `messages` (Admin)

### Attendance
- `teacher_attendance` (Student, Teacher)
- `teacher_daily_attendance` (Teacher)
- `teacher_live_sessions` (Teacher)
- `teacher_session_presence` (Teacher)
- `attendance` (Admin)
- `attendance_summary` (Admin)

### Downloads & Resources
- `student_downloads` (Student)
- `student_notes` (Student)
- `avatars` (Student - storage bucket)

### Administration
- `school_settings` (Admin)
- `audit_logs` (Admin)
- `academic_years` (Admin)
- `academic_settings` (Admin)

---

## ⚠️ DEPRECATED / REDUNDANT TABLES

These tables appear to be duplicates or legacy:

| Table | Status | Replacement |
|-------|--------|-------------|
| `profiles` | ⚠️ Deprecated | Use `school_profiles` instead |
| `student_courses` | ⚠️ Duplicate | Use `enrollments` instead |
| `section_subjects` | ❓ Unclear | May be replaced by `teacher_assignments` |
| `section_enrollments` | ❓ Unclear | May be replaced by `enrollments` |
| `announcements` | ❓ Unclear | Use `teacher_announcements` instead |

---

## 🔧 Tables Referenced But Not Existing

These tables are referenced in code but don't exist in public schema:

### From Teacher-App (expected in n8n_content_creation schema)
- `module_publish` - Should use `modules.is_published` column instead
- `teacher_course_assignments` - Should use `teacher_assignments`

### From Student-App DAL
- `section_subjects` - Not in public schema
- `section_enrollments` - Not in public schema
- `daily_presence` - Not in public schema
- `live_attendance` - Not in public schema
- `session_presence_events` - Not in public schema

**Note:** These may be in a different schema or need to be created.

---

## 📝 Recommendations

1. **Phase out `profiles` table** - Migrate all references to `school_profiles`
2. **Consolidate enrollment tables** - Use `enrollments` as single source of truth
3. **Clean up attendance tables** - Standardize on `teacher_attendance` and `teacher_daily_attendance`
4. **Remove n8n_content_creation references** - Already done in recent fixes
5. **Create missing tables** - If teacher-app needs session_presence_events, etc.

---

## 🎯 Critical Tables for Each App

### Student-App Must-Have
1. `school_profiles`, `students`, `enrollments`
2. `courses`, `modules`, `lessons`
3. `assessments`, `submissions`
4. `student_progress`, `student_notifications`
5. `teacher_announcements`, `teacher_direct_messages`

### Teacher-App Must-Have
1. `school_profiles`, `teacher_profiles`, `teacher_assignments`
2. `courses`, `modules`, `lessons`, `sections`
3. `assessments`, `submissions`, `teacher_grading_queue`
4. `teacher_announcements`, `teacher_direct_messages`
5. `teacher_attendance`, `teacher_live_sessions`

### Admin-App Must-Have
1. `school_profiles`, `students`, `teacher_profiles`
2. `courses`, `sections`, `enrollments`
3. `school_settings`, `academic_years`, `grading_periods`
4. `audit_logs`, `attendance_summary`, `grade_records`

---

**Last Updated:** 2026-01-19
**Database:** Supabase (public schema)
**Apps:** student-app, teacher-app, admin-app
