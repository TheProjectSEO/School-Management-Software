# MSU School Management System — Feature Documentation

> This document explains every feature in the system, what it does, who uses it, and how it connects to other roles.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Roles](#authentication--roles)
3. [Admin Dashboard](#admin-dashboard)
4. [Teacher Dashboard](#teacher-dashboard)
5. [Student Dashboard](#student-dashboard)
6. [Cross-Role Interactions](#cross-role-interactions)
7. [Real-Time Features](#real-time-features)

---

## System Overview

The MSU School Management System is a unified web application that serves three types of users — **Admins**, **Teachers**, and **Students** — in a single platform. It is built around the **Philippine DepEd K-12 curriculum structure** and supports everything from student enrollment to AI-generated progress reports.

### Core Technology
- **Frontend**: Next.js 15 App Router (React server + client components)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT with role-based access control (RBAC)
- **AI**: OpenAI GPT-4o for generative features
- **Video**: Daily.co for live class sessions
- **Styling**: TailwindCSS (MSU maroon `#7B1113` and gold `#FDB913`)

---

## Authentication & Roles

### How Login Works
Every user logs in at `/login` with their email and password. The system issues two tokens:
- **Access token** — valid for 15 minutes, stored in a secure httpOnly cookie
- **Refresh token** — valid for 7 days, auto-refreshes the access token silently

After login, the user is redirected to their role-specific dashboard automatically.

### The Three Roles

| Role | Dashboard | What they manage |
|---|---|---|
| **Admin** | `/admin` | The entire school — users, courses, enrollment, settings, reports |
| **Teacher** | `/teacher` | Their assigned classes — grades, attendance, content, assessments |
| **Student** | `/student` | Their own learning — subjects, assessments, grades, notes |

### Admin Sub-Roles
Admins have internal sub-roles with different permission levels:

| Sub-Role | Can Do |
|---|---|
| `super_admin` | Everything — full system access |
| `school_admin` | All school operations |
| `admin` | User management, enrollments, settings |
| `registrar` | Students, enrollments, applications |
| `support` | Read-only access for helping users |

---

## Admin Dashboard

The Admin is the **system controller**. Every user account, every course, every enrollment, and every setting flows through the admin.

---

### 1. Dashboard Overview (`/admin`)

**What it does:** The first page admins see. Shows a high-level snapshot of the school.

**Displays:**
- Total students, teachers, and active enrollments
- Enrollment trends chart (new students over time)
- Grade distribution (how many students per grade level)
- Attendance overview (school-wide attendance rate)
- Recent activity (latest applications, enrollments)

**Connects to:** All data in the system — it aggregates counts from `students`, `teacher_profiles`, `enrollments`, and `teacher_daily_attendance`.

---

### 2. Student Management (`/admin/users/students`)

**What it does:** Full control over every student account in the school.

**Features:**
- **List & Search** — find students by name, email, or LRN (Learner Reference Number). Filters for grade level, section, and status (active / inactive / suspended / graduated / transferred).
- **Add Student** — creates a login account + student profile. LRN is auto-generated (format: `YYYY-MSU-####`). Phone pre-fills with `+63` (Philippines).
- **Edit Student** — update any profile field. Changes sync to both the `students` table and `school_profiles` table so it appears correctly everywhere.
- **Bulk Actions** — select multiple students and:
  - **Change Grade + Section** — moves students to a new grade level AND assigns them to a matching section in one operation.
  - **Move to Section** — reassigns students within the same grade.
  - **Deactivate** — disables login access.
  - **Reactivate** — restores login access.
- **Import** — upload a CSV or Excel file to create many students at once.
- **Export** — download the full student list as CSV or Excel (`.xlsx`).

**How it connects:**
- When a student is assigned to a section, the system automatically creates **enrollment records** for all courses taught in that section (via `teacher_assignments`). This means the student immediately appears in the teacher's gradebook and attendance list.
- Deactivated students **cannot log in** but their grades and records are preserved.
- Changing a student's section auto-updates which teacher's classes they appear in.

---

### 3. Teacher Management (`/admin/users/teachers`)

**What it does:** Full control over every teacher account.

**Features:**
- **List & Search** — find teachers by name, email, or employee ID.
- **Add Teacher** — creates login + teacher profile. Employee ID is auto-generated (`T-YYYY-###`).
- **Edit Teacher** — update profile, subject specialization, status.
- **Course Assignments** — assign a teacher to specific courses and sections. This determines which classes appear on the teacher's dashboard.
- **Bulk Activate/Deactivate** — enable or disable multiple teacher accounts.
- **Import/Export** — same CSV/Excel functionality as students.

**How it connects:**
- A teacher only sees courses they are assigned to (via `teacher_assignments`). If admin removes an assignment, the course disappears from the teacher's dashboard.
- Students in a teacher's assigned section automatically appear in that teacher's gradebook, attendance, and messaging list.

---

### 4. Enrollment Management (`/admin/enrollments`)

**What it does:** Manages which students are enrolled in which courses.

**Features:**
- **View Enrollments** — see all student-course pairs with status (active, pending, dropped).
- **Bulk Enroll** — enroll multiple students into a course/section at once.
- **Approve/Reject** — change enrollment status for pending requests.
- **Drop Student** — remove a student from a course.
- **Transfer** — move a student from one course/section to another.
- **Sync Section** — if a student was assigned to a section but is missing enrollment records, this creates them automatically.
- **Export** — download enrollment data as CSV or Excel.

**How it connects:**
- Enrollment is the **bridge** between students and teachers. Without an enrollment record, a student won't appear in a teacher's class list and can't submit assessments or receive grades.
- The sync function fixes the common scenario where a student was added to a section but enrollment records weren't created.

---

### 5. Applications & Admissions (`/admin/applications`)

**What it does:** Handles new student applications from outside the school.

**The flow:**
1. Admin generates a **QR code** (or enrollment link).
2. Prospective student/parent scans the QR code on their phone.
3. They fill out an online application form with personal info, guardian details, academic history, and document uploads (birth certificate, report card, etc.).
4. Admin receives the application and reviews it.
5. Admin can **approve**, **reject**, or **request more documents**.
6. On approval, the system creates a student account automatically.

**AI Screening:** Admins can bulk-select applications and have AI pre-screen them — scoring completeness of documents, checking academic qualifications, and flagging incomplete submissions.

**How it connects:**
- QR codes are linked to specific grade levels and tracks (e.g., "Grade 11 STEM applications only").
- Approved applications automatically create a student account, which the admin can then assign to a section to complete enrollment.

---

### 6. Courses & Sections (`/admin/courses`, `/admin/sections`)

**What it does:** Defines the academic structure of the school.

**Courses:**
- Create subjects/courses with a name, subject code, and **DepEd subject type** (academic, MAPEH, TLE, etc.).
- Subject type determines how grades are calculated (different weight distributions for different subject types).

**Sections:**
- Create class sections (e.g., "Grade 10 - Section A").
- Set capacity and grade level.
- Assign an **advisory teacher** (homeroom teacher).
- Assign courses to the section — this tells the system which courses are taught in this section and by which teacher.

**How it connects:**
- Sections are the backbone of the student-teacher relationship. When a student is placed in a section, they inherit all courses assigned to that section.
- Course-to-section assignments with teacher create the `teacher_assignments` records that teachers use to access their classes.

---

### 7. Analytics & Reports (`/admin/reports`, `/admin/analytics`)

**What it does:** School-wide reporting and predictive analytics.

**Reports:**
- **Attendance Report** — school-wide attendance rates by grade, section, date range.
- **Grades Report** — grade distribution across subjects, failure rates, top performers.
- **Progress Report** — lesson completion rates across the school.

**Churn Prediction (AI):**
- Analyzes every student for **dropout risk** based on: attendance rate, grade trends, assignment completion, days since last activity.
- Assigns each student a risk score (0–100) and risk level (low / medium / high / critical).
- Suggests interventions: "Schedule parent meeting," "Assign peer tutor," etc.
- Admins can filter by grade level, section, or minimum risk level.

**How it connects:**
- Pulls live data from `teacher_daily_attendance`, `submissions`, and `student_progress`.
- Helps admins proactively reach out to at-risk students before they drop out.

---

### 8. Messaging (`/admin/messages`)

**What it does:** Admin-to-teacher and admin-to-student direct messaging.

**Features:**
- Start conversations with any teacher or student.
- Search conversation history.
- Real-time delivery — messages appear instantly without page refresh.
- Unread badge on the nav shows new message count.
- Browser notification when a new message arrives (if the tab is backgrounded).

**How it connects:**
- Teachers and students both have message inboxes on their dashboards. A message from admin appears in their inbox in real-time.

---

### 9. Settings (`/admin/settings`)

**What it does:** Configure the school's academic and operational setup.

**Sections:**
- **School Info** — name, logo, region, division, contact details.
- **Academic Years** — create/manage school years and semesters.
- **Grading Periods** — define Q1, Q2, Q3, Q4 with start/end dates.
- **Grading Scale** — define letter grades and their numeric thresholds.
- **DepEd Subject Types** — configure weight distributions for Written Work (WW), Performance Tasks (PT), and Quarterly Assessment (QA) per subject type.

**How it connects:**
- Grading periods are used by teachers when entering grades — they must select which quarter they are grading for.
- The DepEd weight config determines how a student's final grade is computed in the gradebook.

---

### 10. Enrollment QR Codes (`/admin/enrollment-qr`)

**What it does:** Generate scannable QR codes that open the application form.

**Features:**
- Create QR codes targeted at specific grade levels or tracks.
- Set expiry dates and maximum application limits.
- Track how many times the QR was scanned vs. how many applications were submitted.
- Download or share the QR image.

**How it connects:**
- When a QR code is scanned, it pre-fills the application form with the targeted grade level, making it easier for applicants.
- Scan count and application count are tracked automatically.

---

## Teacher Dashboard

The Teacher is the **classroom manager**. They own everything that happens inside their assigned courses — grades, content, assessments, and attendance.

---

### 1. My Classes (`/teacher/classes`)

**What it does:** The first thing teachers see — a list of all their assigned sections and courses.

**Displays:**
- Each section with student count.
- Quick links to gradebook, attendance, and assessments for each class.

**How it connects:**
- Only shows courses from `teacher_assignments`. If admin assigns a new course, it appears here immediately.

---

### 2. Gradebook (`/teacher/gradebook`)

**What it does:** The core grading tool. Teachers enter and manage student grades here.

**DepEd Grading System:**
The system follows the official Philippine DepEd grading formula:

| Component | Written Work (WW) | Performance Tasks (PT) | Quarterly Assessment (QA) |
|---|---|---|---|
| Academic subjects | 25% | 50% | 25% |
| MAPEH | 20% | 60% | 20% |
| TLE / EsP | 25% | 50% | 25% |

- Teachers enter scores for each component.
- The system computes the **Weighted Average** automatically.
- Weighted average is **transmuted** to the DepEd grading scale (e.g., 99.5–100 = 99, 98.4–99.4 = 98, etc.).
- The transmuted grade is the **Final Grade** seen on the report card.

**Bulk Grade Entry:**
- Spreadsheet-style view — teachers can tab between cells like Excel.
- Enter scores for all students in a component at once.

**Release Grades:**
- After entering grades, teachers must click **Release** to make them visible to students.
- Unreleased grades are not shown on the student dashboard.

**How it connects:**
- Released grades become visible on the **Student → Grades** page.
- Grades feed into **Report Cards** (generated per grading period).
- The admin's grade reports pull from the same grade data.

---

### 3. Assessments (`/teacher/assessments`)

**What it does:** Create, manage, and grade quizzes, assignments, and exams.

**Creating Assessments:**
- Set title, instructions, due date, total points, and assessment type (quiz / assignment / exam / project).
- Add questions: multiple choice, true/false, short answer, essay, file upload.
- **AI Quiz Generator** — describe a topic and let AI generate a complete quiz with questions and answer keys.
- Publish when ready — students can only see published assessments.

**Grading Submissions:**
- **Grading Queue** — see all submitted work sorted by date. Filter by status (pending, graded, flagged).
- Open a submission to see the student's answers.
- **Auto-grade** — multiple choice and true/false are graded instantly. Short answers can be AI-graded.
- Enter score and written feedback for essays and file uploads.
- Use **feedback templates** to quickly apply common comments.
- Flag submissions for a second review.

**How it connects:**
- When a teacher publishes an assessment, it appears on the **Student → Assessments** page.
- When a student submits, it enters the teacher's grading queue.
- After grading, the score and feedback become visible to the student.
- Scores can feed into the gradebook components (WW, PT, or QA).

---

### 4. Attendance (`/teacher/attendance`)

**What it does:** Mark and track daily attendance for each class.

**How it works:**
- Teacher opens attendance for a specific date and course.
- Marks each student as: **Present**, **Late**, **Absent**, or **Excused**.
- Submit saves the batch for that date.
- View attendance history — see attendance by date, student, or period.

**How it connects:**
- Attendance records are used in **Report Cards** (shows present/absent/late days and attendance rate).
- The admin's attendance report aggregates all teacher attendance records school-wide.
- The AI churn prediction uses attendance rate as a major risk factor.
- Students can view their own attendance history on their dashboard.

---

### 5. Course Content (`/teacher/subjects/[id]/modules`)

**What it does:** Teachers build the learning content that students consume.

**Structure:**
```
Course
└── Module (e.g., "Chapter 1: Introduction")
    └── Lesson (e.g., "1.1 What is Photosynthesis?")
        └── Attachments (PDF, DOCX, videos, links)
```

**Features:**
- Create modules with objectives and descriptions.
- Add lessons with rich text content.
- Upload attachments (PDF, Word documents, images, etc.).
- **AI Content Generator** — describe what you want and AI drafts the lesson content.
- **AI Content Improver** — paste existing content and AI rewrites it to be clearer.
- **Publish/Unpublish** — control when content becomes visible to students.

**How it connects:**
- Published modules and lessons appear on the **Student → Subjects** page.
- Student progress (which lessons they've completed) is tracked in `student_progress`.
- Lesson completion feeds into the AI churn prediction as an engagement signal.

---

### 6. Live Sessions (`/teacher/live-sessions`)

**What it does:** Schedule and run live video classes using Daily.co.

**Flow:**
1. Teacher creates a session — sets title, date, time, description, and which course it's for.
2. Students see the upcoming session on their dashboard.
3. At session time, teacher clicks **Start Session** — Daily.co creates a video room.
4. Students click **Join** — they enter the same video room.
5. Teacher ends the session when done.
6. **Transcribe** — after the session, AI (OpenAI Whisper + GPT) can generate a full transcript.
7. Recordings and transcripts are stored and accessible after the session.

**How it connects:**
- Scheduled sessions appear on **Student → Live Sessions**.
- Students can ask questions during the session (saved to the session record).
- Recordings appear in **Student → Subjects → Recordings** for later review.

---

### 7. Report Cards (`/teacher/report-cards`)

**What it does:** View, annotate, and submit student report cards for each grading period.

**Flow:**
1. After grades are entered and the grading period closes, a report card is generated per student.
2. Teacher opens the report card — sees all subject grades, GPA, attendance summary.
3. Teacher adds **remarks** (written comments per subject or overall).
4. **AI Progress Report Generator** — AI drafts a personalized 2–3 paragraph narrative based on the student's actual grade data, attendance, and recent activity.
5. Teacher reviews/edits the AI draft and saves as their remarks.
6. Teacher submits the report card for admin review.
7. Once approved, a PDF is generated and becomes available for download.

**How it connects:**
- Report card data comes from the gradebook (grades), attendance records, and student progress.
- After approval, students can view and download their report card from their dashboard.
- Parents can also receive report cards if email is configured.

---

### 8. AI Tools (`/teacher/ai`)

**What it does:** A suite of AI-powered tools to help teachers work faster.

| Tool | What it does |
|---|---|
| **Quiz Generator** | Enter a topic and grade level → AI creates a complete quiz |
| **Progress Report** | Select a student → AI writes their narrative report card |
| **Lesson Planner** | Describe a lesson → AI creates a full lesson plan with objectives, activities, and assessment ideas |
| **Content Improver** | Paste lesson content → AI rewrites it to be clearer and more engaging |
| **At-Risk Alerts** | AI identifies students showing signs of struggling based on grades, attendance, and engagement |

**How it connects:**
- All AI tools are powered by OpenAI GPT-4o.
- Results are drafts — teachers always review and edit before saving.
- At-risk alerts pull the same data as the admin churn prediction but scoped to the teacher's own students.

---

### 9. Messages (`/teacher/messages`)

**What it does:** Teacher-to-student and teacher-to-admin messaging.

**Features:**
- Start direct conversations with any student in their classes.
- **Class Announcements** — broadcast a message to all students in a section.
- Receive and reply to messages from students or admins.
- Message groups (group chats).
- Real-time delivery — messages appear without refreshing.

**How it connects:**
- Messages sent to students appear on the **Student → Messages** page instantly.
- Announcements appear as notifications on all students in that section.
- Teachers can receive messages from admins about school-wide updates.

---

## Student Dashboard

The Student is the **learner**. Their dashboard is focused on accessing content, completing work, tracking progress, and communicating with teachers.

---

### 1. My Subjects (`/student/subjects`)

**What it does:** The main hub — lists all courses the student is enrolled in.

**Shows for each course:**
- Course name and teacher name.
- Overall grade (if released).
- Progress percentage (how many lessons completed).
- Quick links to modules, assessments, and recordings.

**How it connects:**
- Only shows courses where an enrollment record exists.
- If the admin assigns the student to a section, courses appear here automatically.

---

### 2. Modules & Lessons (`/student/subjects/[id]/modules`)

**What it does:** Students access and consume the learning content teachers have published.

**Features:**
- Browse modules and lessons.
- Read lesson content and download attachments.
- **Mark as Complete** — students manually mark a lesson as done.
- Progress tracker shows percentage of lessons completed per module.
- **Study Notes** — students can write personal notes on any lesson. Notes are private (only the student sees them).

**How it connects:**
- Only shows **published** content. Draft content from the teacher is invisible here.
- Lesson completion is tracked and visible to teachers in the at-risk alerts.
- Completion rate feeds into the admin churn prediction analytics.

---

### 3. Assessments (`/student/assessments`)

**What it does:** Students see and complete all assessments assigned to them.

**Flow:**
1. Published assessment appears in the list with due date.
2. Student clicks **Start** — timer begins (if timed).
3. Student answers questions (multiple choice, short answer, essay, file upload).
4. Answers are **auto-saved** — if the browser closes, progress is not lost.
5. Student clicks **Submit**.
6. Multiple choice / true-false: graded instantly, score shown.
7. Essay / short answer: enters teacher's grading queue.
8. After teacher grades: student can see their score, feedback, and correct answers.

**How it connects:**
- Only shows assessments from courses the student is enrolled in.
- Submitted assessments enter the **Teacher → Grading Queue**.
- Graded scores can be visible to the teacher for gradebook entry.

---

### 4. Grades (`/student/grades`)

**What it does:** View academic performance across all courses.

**Shows:**
- Current grades per subject (Written Work, Performance Tasks, Quarterly Assessment).
- Computed Weighted Average and Transmuted Grade (DepEd scale).
- Grade history across grading periods.
- GPA with academic standing (Outstanding / Very Satisfactory / Satisfactory / etc.).

**How it connects:**
- Only shows **released** grades. If a teacher hasn't released grades yet, this page shows pending.
- Data comes directly from the teacher's gradebook entries.

---

### 5. Report Cards (`/student/report-cards`)

**What it does:** Students view their official report card once it's approved.

**Shows:**
- All subject grades for the grading period.
- Overall GPA and academic standing.
- Attendance summary (present, absent, late days, attendance rate).
- Teacher's written remarks.
- AI-generated narrative (if teacher used the AI progress report tool).
- **Download PDF** — generates a printable PDF of the report card.

**How it connects:**
- Only visible once the teacher submits it and admin approves it.
- Content comes from teacher gradebook entries, attendance records, and teacher remarks.

---

### 6. Attendance (`/student/attendance`)

**What it does:** Students can see their own attendance history.

**Shows:**
- Calendar view with color-coded days (present = green, absent = red, late = yellow, excused = blue).
- Summary: total present, absent, late, excused days.
- Attendance rate percentage.

**How it connects:**
- Data comes from teacher attendance entries. Students can only view, not edit.
- Attendance feeds into the report card attendance summary.

---

### 7. Live Sessions (`/student/live-sessions`)

**What it does:** Students see upcoming and past live video classes.

**Features:**
- **Upcoming sessions** — date, time, teacher, course.
- **Join** — click to enter the Daily.co video room at session time.
- **Ask a Question** — submit a question during the live session (teacher can see and answer).
- **View Recordings** — watch recorded sessions after they end.
- **View Transcripts** — read the AI-generated text transcript of a session.

**How it connects:**
- Sessions are created by teachers. Students see them automatically for courses they're enrolled in.
- Questions submitted by students are saved and visible to the teacher.
- Recordings are stored and remain accessible after the session.

---

### 8. Ask AI (`/student/ask-ai`)

**What it does:** A personal AI tutor that answers academic questions.

**Features:**
- Ask any academic question in natural language.
- AI answers with context awareness (knows the student's grade level and enrolled courses).
- Can paste a YouTube video URL — AI fetches the transcript and answers questions about the video content.
- Conversation history is preserved within a session.

**How it connects:**
- Powered by OpenAI GPT-4o.
- Context includes the student's grade level and subjects so answers are curriculum-appropriate.
- No teacher or admin can see the student's AI conversations (private).

---

### 9. Messages (`/student/messages`)

**What it does:** Students send and receive messages from teachers and peers.

**Features:**
- Direct messages from teachers appear here.
- Students can reply to teacher messages.
- Message peers (limited quota to prevent spam).
- Group chats for class discussions.
- Announcements from teachers appear as notifications.

**How it connects:**
- Messages are delivered in real-time.
- If the tab is open, a sound plays and a toast notification appears.
- If the browser is backgrounded, a browser push notification appears (if permission granted).

---

### 10. Profile (`/student/profile`)

**What it does:** Students view and edit their own profile.

**Editable fields:**
- Full name, phone number, address.
- Profile avatar (upload photo).

**Read-only:**
- LRN (Learner Reference Number) — set by admin.
- Grade level and section — set by admin.
- Email — set by admin.

---

## Cross-Role Interactions

This section shows the **complete flow** of how actions in one role affect other roles.

---

### Enrollment Flow
```
Admin creates student account
    → Admin assigns student to a section
        → System auto-creates enrollments for all section courses
            → Courses appear on Student dashboard
            → Student appears in Teacher's class list, gradebook, and attendance
```

---

### Grading Flow
```
Admin configures grading periods and DepEd weight settings
    → Teacher enters WW, PT, QA scores in gradebook
        → System computes weighted average and transmuted grade
            → Teacher releases grades
                → Grades become visible on Student → Grades page
                    → Report card is generated
                        → Teacher adds remarks (or uses AI to generate them)
                            → Teacher submits report card
                                → Admin approves
                                    → Student can view and download PDF
```

---

### Assessment Flow
```
Teacher creates assessment and publishes it
    → Assessment appears on Student → Assessments page
        → Student starts and submits
            → Submission enters Teacher → Grading Queue
                → Teacher grades (manually or with AI)
                    → Score + feedback visible to Student
                        → Score can be recorded in gradebook
```

---

### Content Flow
```
Teacher creates module → adds lessons → uploads attachments → publishes
    → Content appears on Student → Subjects → Modules
        → Student reads lesson and marks complete
            → Completion tracked in student_progress
                → Feeds into Teacher's at-risk alerts
                    → Feeds into Admin's churn prediction
```

---

### Live Session Flow
```
Teacher schedules session for a course
    → Session appears on Student → Live Sessions (for enrolled students)
        → Teacher starts session → Daily.co room is created
            → Students click Join → enter video room
                → Students can submit questions during session
                    → Teacher ends session
                        → Recording saved
                            → AI generates transcript
                                → Recording + transcript visible to students
```

---

### Admissions Flow
```
Admin creates enrollment QR code (targeted to a grade level)
    → Admin shares QR code / link publicly
        → Prospective student scans QR → fills application form
            → Application arrives in Admin → Applications
                → Admin reviews (or AI bulk-screens)
                    → Admin approves application
                        → Student account is created automatically
                            → Admin assigns student to a section
                                → Student can now log in
```

---

### Messaging Flow
```
Any user sends a message
    → Supabase realtime pushes it to recipient instantly
        → Recipient sees toast notification + sound
            → Unread badge updates on nav
                → If tab is hidden: browser push notification fires
```

---

### At-Risk / Churn Detection Flow
```
Student misses classes (teacher marks absent)
Student stops completing lessons
Student scores low on assessments

    → Teacher's At-Risk Alerts flag the student
    → Admin's Churn Prediction scores the student as high risk
        → Recommended interventions shown (call parent, assign tutor)
            → Admin or teacher reaches out via messaging
```

---

## Real-Time Features

These features update **live** without requiring a page refresh, powered by Supabase Realtime:

| Feature | Who sees it live |
|---|---|
| New message received | All recipients instantly |
| Unread message count badge | Admin, Teacher, Student nav |
| Assessment submission | Teacher grading queue updates |
| New application submitted | Admin notification count |
| Student joins live session | Teacher sees participant list update |
| Grade released | Student grades page updates |

---

## Key Database Relationships

Understanding these relationships helps explain why things work the way they do:

```
schools
 └── school_profiles (every user's display info — name, avatar)
      ├── students         → section_id → sections
      ├── teacher_profiles → teacher_assignments → courses + sections
      └── admins

enrollments: student_id + course_id (the bridge between students and courses)
teacher_assignments: teacher_profile_id + course_id + section_id

When student is assigned to section:
  → Find all teacher_assignments for that section
  → Create enrollment records for each course
  → Student now appears in teacher's class
```

---

*Last updated: 2026-02-28*
