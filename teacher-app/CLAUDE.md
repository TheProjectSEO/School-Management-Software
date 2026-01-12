# CLAUDE.md - Teacher Web App (MSU Online School OS)

This is the **source of truth** for the MSU Teacher Web App. All development must follow this specification.

**Non-negotiable**: All database objects live in `n8n_content_creation` schema. Nothing in `public`.

---

## 1. Project Overview

The Teacher Portal enables teachers to:
- Manage academic hierarchy: Program > Year/Grade > Section > Subject > Module
- Create and publish learning content (modules, transcripts, notes, attachments)
- Run live classes and publish recordings
- Create assessments with question banks and randomization
- Grade submissions with rubrics and AI-assisted feedback
- Send announcements and communicate with students
- Track attendance (auto from login/presence + manual override)

**Guardrails**:
- AI helps draft content; teachers approve before publish
- Grades/results hidden until teacher clicks Release
- RLS enforces role + school boundaries
- Managed via Supabase + MCP (Model Context Protocol)

---

## 2. Tech Stack

- **Next.js 14+** (App Router)
- **Tailwind CSS** (build-time, same config as student app)
- **Supabase** (Auth, Database, Storage, RLS) + **MCP** integration
- **TypeScript** (strict mode)
- **Lexend font** + Material Symbols Outlined icons
- **Same monorepo** as student app (shared components)

---

## 3. Build Commands

```bash
npm install
npm run dev
npm run build
npx supabase gen types typescript --project-id <id> > types/supabase.ts
```

---

## 4. Frontend Architecture (Same Brand as Student App)

### Design Tokens (MUST MATCH STUDENT APP)
```css
/* Colors */
Primary (MSU Maroon): #7B1113
Primary Hover: #961517
Primary Active: #5a0c0e
MSU Gold: #FDB913
MSU Green: #006400
Background Light: #f6f7f8
Background Dark: #101822
Card Dark: #1a2634

/* Typography */
Font: Lexend (display font)
Icons: Material Symbols Outlined (FILL:1, wght:400, GRAD:0, opsz:24)

/* Spacing & Radius */
Card padding: p-5 or p-6
Border radius: rounded-xl
Shadows: shadow-sm, hover:shadow-md
```

### Tailwind Config (Shared)
```js
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#7B1113",
        "msu-gold": "#FDB913",
        "msu-green": "#006400",
      },
      fontFamily: {
        sans: ["Lexend", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
```

### Shared Components (Reuse from Student App)
```
components/
├── brand/
│   └── BrandLogo.tsx         (SINGLE source of truth for logo - /public/brand/logo.png)
├── layout/
│   ├── TeacherShell.tsx      (NEW - Teacher layout with teacher sidebar)
│   ├── TeacherSidebar.tsx    (NEW - Teacher navigation)
│   └── MobileNav.tsx         (Reuse pattern from student app)
└── ui/
    ├── Button.tsx            (Shared)
    ├── Card.tsx              (Shared)
    ├── Input.tsx             (Shared)
    ├── Badge.tsx             (Shared)
    └── MarkdownRenderer.tsx  (Shared)
```

### Teacher Sidebar Navigation Items
```tsx
const teacherNavItems = [
  { name: "Dashboard", href: "/teacher", icon: "dashboard" },
  { name: "My Classes", href: "/teacher/classes", icon: "groups" },
  { name: "My Subjects", href: "/teacher/subjects", icon: "book_2" },
  { name: "Assessments", href: "/teacher/assessments", icon: "quiz" },
  { name: "Grading", href: "/teacher/submissions", icon: "grading" },
  { name: "Gradebook", href: "/teacher/gradebook", icon: "score" },
  { name: "Attendance", href: "/teacher/attendance", icon: "fact_check" },
  { name: "Calendar", href: "/teacher/calendar", icon: "calendar_month" },
  { name: "Messages", href: "/teacher/messages", icon: "chat" },
  { name: "Students", href: "/teacher/students", icon: "school" },
  { name: "Settings", href: "/teacher/settings", icon: "settings" },
];
```

### Card Styling Pattern
```tsx
// Consistent with student app
<div className="
  rounded-xl
  border border-slate-200 dark:border-slate-700
  bg-white dark:bg-[#1a2634]
  p-5
  shadow-sm hover:shadow-md
  transition-shadow
">
```

### Button Styling Pattern
```tsx
// Primary button (consistent with student app)
<button className="
  h-12 w-full
  rounded-lg
  bg-primary hover:bg-[#961517] active:bg-[#5a0c0e]
  text-white font-semibold
  transition-colors
">
```

---

## 5. Authentication (Teacher Login/Register)

### Teacher Registration Flow
```
/teacher/register
├── Full Name (badge icon)
├── Employee ID (id_card icon)
├── Email (mail icon)
├── School Selection (domain icon) - Dropdown of schools
├── Department (work icon)
├── Password + Confirm (lock icons)
├── Terms checkbox
└── Submit → Creates auth.user + profile + teacher_profiles
```

### Teacher Login Flow
```
/teacher/login (or /login with role detection)
├── Email/Employee ID (person icon)
├── Password (lock icon)
├── Remember me checkbox
├── Forgot password link
└── Submit → Check teacher_profiles exists, redirect to /teacher
```

### Auth Route Structure
```
app/
├── (auth)/
│   ├── login/page.tsx           (Shared - role detection)
│   ├── register/page.tsx        (Student registration)
│   └── teacher-register/page.tsx (NEW - Teacher registration)
```

### Role Detection on Login
```typescript
// After Supabase auth success, check role:
const { data: teacherProfile } = await supabase
  .from('teacher_profiles')
  .select('id')
  .eq('profile_id', profile.id)
  .single();

if (teacherProfile) {
  redirect('/teacher');
} else {
  redirect('/'); // Student dashboard
}
```

### RLS for Teacher Auth
```sql
-- Teacher can only access their own profile
CREATE POLICY "Teachers can view own profile" ON n8n_content_creation.teacher_profiles
  FOR SELECT USING (
    profile_id IN (SELECT id FROM n8n_content_creation.profiles WHERE auth_user_id = auth.uid())
  );
```

---

## 6. Schema Rules

### Location
ALL tables in `n8n_content_creation` schema only.

### Naming Convention
- **Shared tables** (used by both apps): Keep existing names
  - `profiles`, `schools`, `sections`, `students`, `courses`, `enrollments`
  - `modules`, `lessons`, `assessments`, `submissions`, `questions`, `answer_options`, `student_answers`
  - `student_progress`, `notes`, `notifications`, `downloads`

- **Teacher-only tables**: Prefix with `teacher_`
  - `teacher_profiles`, `teacher_assignments`, `teacher_notes`
  - `teacher_rubric_templates`, `teacher_rubric_scores`, `teacher_feedback`
  - `teacher_announcements`, `teacher_discussion_threads`, `teacher_discussion_posts`
  - `teacher_direct_messages`, `teacher_live_sessions`, `teacher_attendance`

### Enforcement
- Every migration uses `n8n_content_creation.` prefix
- CI grep blocks: `create table public`, `create function public`

---

## 7. Complete Data Model

### EXISTING TABLES (Shared with Student App)

#### Identity & School Structure
```sql
-- n8n_content_creation.profiles (SHARED)
id, auth_user_id, full_name, phone, avatar_url, created_at, updated_at

-- n8n_content_creation.schools (SHARED)
id, slug, name, region, division, logo_url, accent_color, created_at, updated_at

-- n8n_content_creation.sections (SHARED)
id, school_id, name, grade_level, adviser_teacher_id, created_at, updated_at

-- n8n_content_creation.students (SHARED - Teacher reads only)
id, school_id, profile_id, lrn, grade_level, section_id, created_at, updated_at
```

#### Courses & Content
```sql
-- n8n_content_creation.courses (SHARED - Teacher manages)
id, school_id, section_id, name, subject_code, description, cover_image_url, teacher_id, created_at, updated_at

-- n8n_content_creation.enrollments (SHARED - Teacher reads)
id, school_id, student_id, course_id, created_at, updated_at

-- n8n_content_creation.modules (SHARED - Teacher creates)
id, course_id, title, description, order, duration_minutes, is_published, created_at, updated_at

-- n8n_content_creation.lessons (SHARED - Teacher creates)
id, module_id, title, content, content_type, video_url, duration_minutes, order, is_published, created_at, updated_at
```

#### Assessments
```sql
-- n8n_content_creation.assessments (SHARED - Teacher creates)
id, school_id, course_id, title, description, type, due_date, total_points, time_limit_minutes, max_attempts, instructions, created_at, updated_at

-- n8n_content_creation.questions (SHARED - Teacher creates)
id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index, created_at

-- n8n_content_creation.answer_options (SHARED - Teacher creates)
id, question_id, option_text, is_correct, order_index

-- n8n_content_creation.submissions (SHARED - Teacher grades)
id, assessment_id, student_id, score, submitted_at, graded_at, feedback, status, attempt_number

-- n8n_content_creation.student_answers (SHARED - Teacher reviews)
id, submission_id, question_id, selected_option_id, text_answer, is_correct, points_earned, created_at
```

#### Student Data (Teacher Read-Only)
```sql
-- n8n_content_creation.student_progress (Teacher reads for analytics)
id, student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at

-- n8n_content_creation.notifications (Teacher creates, Student reads)
id, student_id, type, title, message, is_read, action_url, created_at
```

---

### NEW TABLES (Teacher-Specific)

#### Teacher Identity
```sql
-- n8n_content_creation.teacher_profiles
CREATE TABLE n8n_content_creation.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES n8n_content_creation.schools(id) ON DELETE CASCADE,
  employee_id TEXT,
  department TEXT,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- n8n_content_creation.teacher_assignments (which teacher teaches which section+subject)
CREATE TABLE n8n_content_creation.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_profile_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_profiles(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_profile_id, section_id, course_id)
);
```

#### Content Management
```sql
-- n8n_content_creation.teacher_transcripts (module transcripts)
CREATE TABLE n8n_content_creation.teacher_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES n8n_content_creation.modules(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('recording', 'live_session', 'upload', 'ai_generated')),
  content TEXT NOT NULL,
  timestamps_json JSONB,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_notes (lecture notes per module)
CREATE TABLE n8n_content_creation.teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES n8n_content_creation.modules(id) ON DELETE CASCADE,
  title TEXT,
  rich_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_content_assets (slides, PDFs, recordings)
CREATE TABLE n8n_content_creation.teacher_content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('module', 'lesson', 'assessment', 'announcement')),
  owner_id UUID NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('slide', 'pdf', 'image', 'video', 'audio', 'recording', 'document')),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  meta_json JSONB,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Live Sessions & Attendance
```sql
-- n8n_content_creation.teacher_live_sessions
CREATE TABLE n8n_content_creation.teacher_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  module_id UUID REFERENCES n8n_content_creation.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  provider TEXT CHECK (provider IN ('zoom', 'meet', 'teams', 'livekit', 'daily', 'internal')),
  room_id TEXT,
  join_url TEXT,
  recording_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_session_presence (join/leave tracking)
CREATE TABLE n8n_content_creation.teacher_session_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ping_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_attendance (per session attendance)
CREATE TABLE n8n_content_creation.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
  detected_from_presence BOOLEAN DEFAULT false,
  manual_override BOOLEAN DEFAULT false,
  notes TEXT,
  updated_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- n8n_content_creation.teacher_daily_attendance (daily presence tracking)
CREATE TABLE n8n_content_creation.teacher_daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  detected_from_login BOOLEAN DEFAULT true,
  manual_override BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
```

#### Advanced Assessments
```sql
-- n8n_content_creation.teacher_question_banks
CREATE TABLE n8n_content_creation.teacher_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_bank_questions (questions in banks)
CREATE TABLE n8n_content_creation.teacher_bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_question_banks(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  choices_json JSONB,
  answer_key_json JSONB,
  points INTEGER DEFAULT 1,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[],
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_assessment_bank_rules (randomization)
CREATE TABLE n8n_content_creation.teacher_assessment_bank_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES n8n_content_creation.assessments(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_question_banks(id) ON DELETE CASCADE,
  pick_count INTEGER NOT NULL DEFAULT 5,
  tag_filter TEXT[],
  difficulty_filter TEXT[],
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_choices BOOLEAN DEFAULT true,
  seed_mode TEXT DEFAULT 'per_student' CHECK (seed_mode IN ('per_student', 'per_attempt', 'fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_student_quiz_snapshots (frozen quiz per student)
CREATE TABLE n8n_content_creation.teacher_student_quiz_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES n8n_content_creation.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  questions_json JSONB NOT NULL,
  seed_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, student_id, attempt_number)
);
```

#### Rubrics & Grading
```sql
-- n8n_content_creation.teacher_rubric_templates
CREATE TABLE n8n_content_creation.teacher_rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES n8n_content_creation.courses(id) ON DELETE SET NULL,
  criteria_json JSONB NOT NULL,
  levels_json JSONB NOT NULL,
  max_score INTEGER,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_rubric_scores (applied rubric to submission)
CREATE TABLE n8n_content_creation.teacher_rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.submissions(id) ON DELETE CASCADE,
  rubric_template_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_rubric_templates(id) ON DELETE CASCADE,
  scores_json JSONB NOT NULL,
  total_score INTEGER,
  graded_by UUID REFERENCES n8n_content_creation.profiles(id),
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id)
);

-- n8n_content_creation.teacher_feedback (detailed feedback with release control)
CREATE TABLE n8n_content_creation.teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES n8n_content_creation.submissions(id) ON DELETE CASCADE,
  teacher_comment TEXT,
  inline_notes_json JSONB,
  ai_draft TEXT,
  is_released BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id)
);
```

#### Communication
```sql
-- n8n_content_creation.teacher_announcements
CREATE TABLE n8n_content_creation.teacher_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('section', 'course', 'school')),
  scope_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_pinned BOOLEAN DEFAULT false,
  publish_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_discussion_threads
CREATE TABLE n8n_content_creation.teacher_discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_discussion_posts
CREATE TABLE n8n_content_creation.teacher_discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_discussion_threads(id) ON DELETE CASCADE,
  parent_post_id UUID REFERENCES n8n_content_creation.teacher_discussion_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments_json JSONB,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  is_teacher_post BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_content_creation.teacher_direct_messages
CREATE TABLE n8n_content_creation.teacher_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES n8n_content_creation.schools(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Teacher Route Map

### Public
```
/teacher/login (or reuse /login with role redirect)
/teacher/register
```

### Protected (Teacher Shell)
```
/teacher                          - Teacher Home (Today's overview)
/teacher/classes                  - My Classes (sections I teach)
/teacher/classes/[sectionId]      - Section Dashboard (roster, feed, attendance)
/teacher/classes/[sectionId]/subjects/[subjectId] - Subject in Section

/teacher/subjects                 - My Subjects (cross-section view)
/teacher/subjects/[subjectId]     - Subject Workspace (modules, templates)
/teacher/subjects/[subjectId]/modules/[moduleId] - Module Editor

/teacher/live/[sessionId]         - Live Class Room

/teacher/assessments              - Assessment Library
/teacher/assessments/[assessmentId] - Create/Edit Assessment
/teacher/assessments/[assessmentId]/banks - Question Bank Manager

/teacher/submissions              - Grading Inbox
/teacher/submissions/[submissionId] - Submission Review

/teacher/gradebook                - Gradebook (by section/subject)
/teacher/rubrics                  - Rubric Templates

/teacher/messages                 - Messaging (DM + channels)
/teacher/calendar                 - Calendar (sessions + deadlines)
/teacher/attendance               - Attendance Dashboard
/teacher/students                 - Students Directory (teacher's scope)
/teacher/settings                 - Preferences
```

---

## 9. Teacher-Student Data Flows

### A) Module Publishing Flow
```
Teacher creates module (is_published=false)
  |
Teacher adds lessons, uploads content
  |
Teacher creates/uploads recording
  |
System generates transcript (teacher_transcripts)
  |
Teacher edits transcript, clicks Publish
  |
module.is_published = true, lessons visible to students
  |
Student sees module in learning surface
  |
Student progress tracked in student_progress
```

### B) Quiz with Randomization
```
Teacher creates question_bank with questions
  |
Teacher creates assessment (type=quiz)
  |
Teacher adds bank_rules (pick 10 from bank, shuffle)
  |
Teacher publishes assessment
  |
Student starts quiz -> system generates quiz_snapshot
  |
Student submits -> student_answers created
  |
MCQ auto-graded, score calculated
  |
Teacher reviews in grading inbox
  |
Teacher clicks Release -> student sees result
```

### C) Assignment with Rubric
```
Teacher creates rubric_template
  |
Teacher creates assessment (type=assignment) + links rubric
  |
Student submits file/text -> submissions + answers created
  |
Submission appears in teacher's grading inbox
  |
Teacher grades with rubric -> rubric_scores created
  |
AI suggests feedback draft -> teacher edits
  |
Teacher clicks Release -> feedback.is_released=true
  |
Student sees score + feedback
```

### D) Notifications
```
Teacher sends announcement (scope=section)
  |
System creates notification for each student_id in section
  |
Student sees notification in app
```

### E) Attendance
```
Student logs in -> teacher_daily_attendance updated
  |
Student joins live session -> teacher_session_presence tracked
  |
Session ends -> teacher_attendance auto-populated
  |
Teacher can override status manually
```

---

## 10. RLS Policy Rules

### Teacher Access
- Access rows within their `school_id`
- Access sections/courses only where assigned via `teacher_assignments`
- Create/edit/publish modules and assessments for their assignments
- Read student submissions for their assessments
- Grade and release results for their assessments
- Send announcements to their sections/courses

### Student Access
- Read only enrolled section content
- Submit only to assigned assessments
- Read only their own grades/feedback (when released)
- Cannot see grades until `feedback.is_released = true`

---

## 11. AI Features (Teacher Assistance)

### P0 (Must Have)
1. **Module Builder** - Generate modules from topic list or uploaded files
2. **Transcript Cleanup** - Clean up auto-generated transcripts
3. **Notes Generation** - Generate lecture notes from transcript
4. **Quiz Generator** - Create questions from module content with answer key
5. **Rubric Generator** - Create rubric templates from assignment description
6. **Feedback Drafting** - Draft feedback aligned to rubric criteria
7. **Lesson Plan Generator** - Generate plan for next session
8. **Announcement Drafting** - Draft announcements

### Rules
- All AI outputs saved as drafts
- Teacher must review and approve before publish/release
- Version history maintained

---

## 12. Storage Buckets

```
teacher_assets/      - Slides, PDFs, images
recordings/          - Live + uploaded recordings
submissions/         - Student submission files
message_attachments/ - DM and discussion attachments
```

---

## 13. Data Access Layer

Create in `/lib/dal/teacher/`:

### Teacher Identity
- `getCurrentTeacher()` - Get authenticated teacher with profile
- `getTeacherAssignments(teacherId)` - Get assigned sections/courses

### Content Management
- `getTeacherSubjects(teacherId)` - Get all assigned courses
- `createModule(courseId, data)` - Create module
- `publishModule(moduleId)` - Set is_published=true
- `createTranscript(moduleId, data)` - Add transcript
- `publishTranscript(transcriptId)` - Publish transcript

### Assessments
- `getQuestionBanks(courseId)` - Get question banks
- `createQuestionBank(data)` - Create bank
- `addQuestionToBank(bankId, data)` - Add question
- `createAssessment(data)` - Create assessment
- `addBankRules(assessmentId, rules)` - Add randomization rules

### Grading
- `getPendingSubmissions(teacherId)` - Grading inbox
- `gradeSubmission(submissionId, data)` - Apply grade
- `applyRubricScore(submissionId, rubricId, scores)` - Rubric grading
- `releaseGrades(assessmentId)` - Release all grades

### Communication
- `sendAnnouncement(data)` - Create announcement
- `getDiscussionThreads(courseId)` - Get discussions
- `sendDirectMessage(toProfileId, body)` - Send DM

### Attendance
- `getSessionAttendance(sessionId)` - Get attendance
- `overrideAttendance(sessionId, studentId, status)` - Manual override
- `getDailyAttendance(date, sectionId)` - Daily report

---

## 14. Frontend Screen Specifications

### Teacher Dashboard (`/teacher`)
```
+-------------------------------------------------------------+
| [TeacherShell with Sidebar]                                 |
+-------------------------------------------------------------+
| Welcome, [Teacher Name]!                       Today: Dec 28|
+------------------------------+------------------------------+
| TODAY'S SESSIONS             | GRADING INBOX               |
| +---------------------------+| +------------------------+  |
| | 9:00 AM - Math 101       || | 12 submissions pending |  |
| | Section A - Live Now     || | View All ->            |  |
| | [Join Session]           || +------------------------+  |
| +---------------------------+|                              |
| +---------------------------+| PENDING RELEASES            |
| | 2:00 PM - Physics 201    || +------------------------+  |
| | Section B - In 4 hours   || | 3 assessments ready    |  |
| | [Prepare]                || | Release ->             |  |
| +---------------------------+| +------------------------+  |
+------------------------------+------------------------------+
| DRAFT CONTENT                | ATTENDANCE ALERTS           |
| +---------------------------+| +------------------------+  |
| | 5 modules awaiting       || | 4 students absent      |  |
| | publish                  || | today                  |  |
| +---------------------------+| +------------------------+  |
+-------------------------------------------------------------+
```

### My Classes (`/teacher/classes`)
```
+-------------------------------------------------------------+
| My Classes                                    [+ New Class] |
+-------------------------------------------------------------+
| +----------------------+ +----------------------+          |
| | Section A - Grade 10 | | Section B - Grade 11 |          |
| | 32 students          | | 28 students          |          |
| | 3 subjects assigned  | | 2 subjects assigned  |          |
| | [View Section]       | | [View Section]       |          |
| +----------------------+ +----------------------+          |
+-------------------------------------------------------------+
```

### Section Dashboard (`/teacher/classes/[sectionId]`)
```
+-------------------------------------------------------------+
| <- Back to Classes          Section A - Grade 10            |
+----------------+--------------------------------------------+
| TABS:          |                                            |
| [Roster]       | Roster View:                               |
| [Subjects]     | +------+--------------+------------------+ |
| [Feed]         | |Avatar| Student Name | Actions          | |
| [Attendance]   | +------+--------------+------------------+ |
| [Schedule]     | | JD   | John Doe     | [Profile] [Msg]  | |
|                | | JS   | Jane Smith   | [Profile] [Msg]  | |
|                | +------+--------------+------------------+ |
+----------------+--------------------------------------------+
```

### Subject Workspace (`/teacher/subjects/[subjectId]`)
```
+-------------------------------------------------------------+
| <- My Subjects              Mathematics 101                 |
+-------------------------------------------------------------+
| TABS: [Modules] [Assessments] [Question Banks] [Rubrics]   |
+-------------------------------------------------------------+
| Modules                                    [+ Create Module]|
| +----------------------------------------------------------+|
| | Module 1: Introduction       [Published]   [Edit]        ||
| | Module 2: Basic Algebra      [Published]   [Edit]        ||
| | Module 3: Linear Equations   [Draft]       [Edit]        ||
| |    [Preview] [Publish]                                   ||
| +----------------------------------------------------------+|
|                                                             |
| [Generate Module with AI]                                   |
+-------------------------------------------------------------+
```

### Module Editor (`/teacher/subjects/[subjectId]/modules/[moduleId]`)
```
+-------------------------------------------------------------+
| <- Back to Subject          Editing: Linear Equations       |
+--------------------------------------+----------------------+
| Module Settings                      | Preview Panel       |
| +----------------------------------+ | +------------------+|
| | Title: [Linear Equations      ] | | | (Student view)   ||
| | Description: [________________] | | |                  ||
| | Duration: [60 minutes]          | | |                  ||
| +----------------------------------+ | +------------------+|
|                                      |                      |
| Lessons                 [+ Add]      |                      |
| +----------------------------------+ |                      |
| | 1. What are equations? [video]  | |                      |
| | 2. Solving for X       [reading]| |                      |
| | 3. Practice problems   [quiz]   | |                      |
| +----------------------------------+ |                      |
|                                      |                      |
| Transcript                           |                      |
| +----------------------------------+ |                      |
| | [Upload Recording]               | |                      |
| | [Generate from AI] [Edit]        | |                      |
| | Status: Draft                    | |                      |
| +----------------------------------+ |                      |
|                                      |                      |
| [Save Draft]    [Preview]   [Publish]|                      |
+--------------------------------------+----------------------+
```

### Assessment Builder (`/teacher/assessments/[assessmentId]`)
```
+-------------------------------------------------------------+
| <- Assessments              Create Quiz: Algebra Test       |
+-------------------------------------------------------------+
| TABS: [Settings] [Questions] [Bank Rules] [Preview]        |
+-------------------------------------------------------------+
| Settings Tab:                                               |
| +----------------------------------------------------------+|
| | Type: [Quiz]    Subject: [Math 101]                      ||
| | Title: [Algebra Test                              ]      ||
| | Due Date: [Dec 30, 2025]   Time Limit: [45 min]          ||
| | Max Attempts: [2]                                        ||
| | [ ] Allow resubmission after grading                     ||
| | Rubric: [None] or [Create New]                           ||
| +----------------------------------------------------------+|
|                                                             |
| Bank Rules Tab:                                             |
| +----------------------------------------------------------+|
| | [+ Add Bank Rule]                                        ||
| | +------------------------------------------------------+ ||
| | | Bank: [Algebra Questions]                            | ||
| | | Pick: [10] questions   Tags: [equations, basics]     | ||
| | | [x] Shuffle questions   [x] Shuffle choices          | ||
| | | Seed: [Per Student]                                  | ||
| | +------------------------------------------------------+ ||
| +----------------------------------------------------------+|
|                                                             |
| [Save Draft]        [Preview as Student]        [Publish]   |
+-------------------------------------------------------------+
```

### Grading Inbox (`/teacher/submissions`)
```
+-------------------------------------------------------------+
| Grading Inbox                          [Filter] [Sort]      |
+-------------------------------------------------------------+
| Pending (12)    Graded (48)    Released (156)              |
+-------------------------------------------------------------+
| +----------------------------------------------------------+|
| | [ ] John Doe - Algebra Test                              ||
| |   Section A - Submitted 2h ago - [Grade Now]             ||
| +----------------------------------------------------------+|
| | [ ] Jane Smith - Essay Assignment                        ||
| |   Section B - Submitted 1d ago - [Grade Now]             ||
| +----------------------------------------------------------+|
|                                                             |
| Batch Actions: [Grade Selected] [Release Selected]         |
+-------------------------------------------------------------+
```

### Submission Review (`/teacher/submissions/[submissionId]`)
```
+-------------------------------------------------------------+
| <- Grading Inbox      John Doe - Algebra Test               |
+--------------------------------+----------------------------+
| STUDENT SUBMISSION             | GRADING PANEL              |
| +----------------------------+ | Rubric: [Algebra Rubric]   |
| | Q1: What is 2x + 3 = 7?    | | +----------------------+   |
| | Answer: x = 2 [Correct]    | | | Criteria    Score    |   |
| | +10 points                 | | +----------------------+   |
| +----------------------------+ | | Accuracy   [4/5]     |   |
| | Q2: Solve for y...         | | | Method     [3/5]     |   |
| | Answer: y = 5 [Incorrect]  | | | Clarity    [5/5]     |   |
| | Correct: y = 3             | | +----------------------+   |
| | +0 points                  | | Total: 12/15 (80%)         |
| +----------------------------+ |                            |
|                                | Feedback:                  |
| Score: 10/20 (50%)             | +----------------------+   |
|                                | | [AI Draft] [Edit]    |   |
|                                | | Good work on Q1...   |   |
|                                | +----------------------+   |
|                                |                            |
|                                | [Save] [Return to Student] |
|                                | [Release Grade]            |
+--------------------------------+----------------------------+
```

### Teacher Messages (`/teacher/messages`)
```
+-------------------------------------------------------------+
| Messages                               [+ New Conversation] |
+------------------+------------------------------------------+
| CONVERSATIONS    | CHAT VIEW                                |
| +--------------+ | +--------------------------------------+ |
| | John Doe     | | | John Doe                 Section A  | |
| | "Thanks..."  | | +--------------------------------------+ |
| +--------------+ | | [Student] 10:30 AM                   | |
| | Jane Smith   | | | I have a question about homework...  | |
| | "Okay"       | | |                                      | |
| +--------------+ | | [You] 10:45 AM                       | |
|                  | | Sure, what's the question?           | |
| CHANNELS         | | |                                      | |
| +--------------+ | +--------------------------------------+ |
| | # Section A  | | | [Type a message...]         [Send]  | |
| | # Section B  | | +--------------------------------------+ |
| +--------------+ |                                          |
+------------------+------------------------------------------+
```

### Attendance Dashboard (`/teacher/attendance`)
```
+-------------------------------------------------------------+
| Attendance                    Date: [Dec 28, 2025]          |
+-------------------------------------------------------------+
| Section: [Section A]     Subject: [All]                     |
+-------------------------------------------------------------+
| +-------+--------------+--------+------------+-------------+ |
| |Avatar | Name         | Status | Time In    | Override    | |
| +-------+--------------+--------+------------+-------------+ |
| | JD    | John Doe     | P      | 8:02 AM    | [Change]    | |
| | JS    | Jane Smith   | L      | 8:35 AM    | [Change]    | |
| | MM    | Mike Miller  | A      | --         | [Change]    | |
| +-------+--------------+--------+------------+-------------+ |
|                                                             |
| Summary: Present: 28  Late: 2  Absent: 2                   |
|                                                             |
| [Export to CSV]    [Mark All Present]    [Save Changes]    |
+-------------------------------------------------------------+
```

---

## 15. API Routes (Next.js)

### Teacher API Structure
```
app/api/
  teacher/
    profile/route.ts         (GET/PATCH teacher profile)
    assignments/route.ts     (GET assigned sections/courses)

    modules/
      route.ts             (GET/POST modules)
      [id]/route.ts        (GET/PATCH/DELETE module)
      [id]/publish/route.ts (POST publish)

    lessons/
      route.ts             (POST create lesson)
      [id]/route.ts        (PATCH/DELETE lesson)

    assessments/
      route.ts             (GET/POST assessments)
      [id]/route.ts        (GET/PATCH/DELETE)
      [id]/publish/route.ts (POST publish)
      [id]/release/route.ts (POST release grades)

    question-banks/
      route.ts             (GET/POST banks)
      [id]/questions/route.ts (GET/POST questions)

    submissions/
      route.ts             (GET pending submissions)
      [id]/route.ts        (GET submission detail)
      [id]/grade/route.ts  (POST grade submission)

    attendance/
      daily/route.ts       (GET/POST daily attendance)
      session/[id]/route.ts (GET/PATCH session attendance)

    live-sessions/
      route.ts             (GET/POST sessions)
      [id]/route.ts        (PATCH/DELETE session)

    announcements/
      route.ts             (GET/POST announcements)

    messages/
      route.ts             (GET conversations)
      [id]/route.ts        (GET/POST messages)
      send/route.ts        (POST send message)

    ai/
      generate-module/route.ts
      generate-quiz/route.ts
      generate-feedback/route.ts
      cleanup-transcript/route.ts
```

---

## 16. Supabase MCP Integration

### MCP Tools for Teacher App
```typescript
// Use Supabase MCP for:
- list_tables: View n8n_content_creation schema
- execute_sql: Run queries on teacher tables
- apply_migration: Create new teacher tables
- search_docs: Reference Supabase documentation
- get_logs: Debug issues
- get_advisors: Security/performance checks
```

### MCP-Powered AI Features
```typescript
// AI endpoints leverage MCP for context:
- Fetch module content via execute_sql
- Generate quiz questions with context
- Draft feedback based on rubric criteria
- Generate lesson plans from curriculum data
```

---

## 17. Implementation Phases

### Phase 1: Foundation
1. Create teacher-app folder structure
2. Set up shared tailwind config
3. Create TeacherShell and TeacherSidebar components
4. Implement teacher registration flow
5. Add role detection to login

### Phase 2: Core Backend
1. Run teacher profile migrations
2. Implement teacher DAL functions
3. Set up RLS policies
4. Create API routes for core features

### Phase 3: Content Management
1. Module Editor UI
2. Transcript management
3. Content asset uploads
4. AI module generation

### Phase 4: Assessments
1. Question Bank Manager
2. Assessment Builder
3. Randomization engine
4. Quiz snapshot generation

### Phase 5: Grading
1. Grading Inbox UI
2. Rubric Builder
3. AI feedback drafting
4. Grade release workflow

### Phase 6: Communication
1. Announcements system
2. Direct messaging
3. Discussion threads
4. Notification triggers

### Phase 7: Attendance & Live
1. Daily attendance tracking
2. Live session scheduling
3. Presence detection
4. Attendance override UI

---

## 18. Migration Files

Create migrations in order:
```
supabase/migrations/
  001_teacher_profiles.sql       - Teacher identity tables
  002_teacher_content.sql        - Transcripts, notes, assets
  003_teacher_live_sessions.sql  - Live sessions & attendance
  004_teacher_assessments.sql    - Question banks, rules, snapshots
  005_teacher_rubrics.sql        - Rubric templates & scores
  006_teacher_communication.sql  - Announcements, discussions, DMs
  007_teacher_rls_policies.sql   - All RLS policies
```

---

## 19. Definition of Done (Complete Checklist)

### Frontend
- [ ] TeacherShell matches student app branding
- [ ] All screens implemented per wireframes
- [ ] Dark mode works consistently
- [ ] Mobile responsive design
- [ ] BrandLogo used everywhere (no inline logos)

### Backend
- [ ] All teacher_ tables created in n8n_content_creation
- [ ] RLS policies enforced
- [ ] API routes functional
- [ ] TypeScript types generated

### Teacher Features
- [ ] Teacher can register and login
- [ ] Role detection redirects correctly
- [ ] Module creation and publishing works
- [ ] Assessment with question banks works
- [ ] Grading with rubrics works
- [ ] Grade release controls work
- [ ] Announcements reach students
- [ ] Attendance tracking works

### Integration
- [ ] Student app sees published modules
- [ ] Student app receives notifications
- [ ] Student quiz renders from snapshot
- [ ] Student sees grades when released

---

End of Teacher App CLAUDE.md
