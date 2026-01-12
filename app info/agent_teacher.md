# agent.md — Teacher Web App Plan (Next.js + Tailwind + Supabase) — Online School OS

Status: Student app done. This plan adds the **Teacher portal** so teachers can create/manage content and assessments, and students receive them in the student app.

Non-negotiable: **All new DB objects live in `n8n_content_creation` schema only. Nothing in `public`.**

---

## 1) Goals

### Primary outcomes
- Teachers can run an online class end-to-end:
  - Set up Program → Year/Grade → Section → Subject → Module
  - Create modules fast (AI-assisted)
  - Run live classes + publish recordings + transcript + notes
  - Create assessments (quiz/assignment/midterm/final) with **question banks + randomization**
  - Collect submissions, grade with rubrics, release results when ready
  - Send announcements/notifications (section-level and subject-across-sections)
  - Message students (direct) and manage a simple classroom feed/discussion
  - Track attendance (auto from login/presence + teacher override)

### Guardrails
- AI helps with drafts and busywork. Teachers approve publish, grades, and feedback.
- Role + school boundaries enforced by Supabase RLS.
- Single logo used everywhere via one BrandLogo component.

---

## 2) Scope

### Teacher must manage everything students see
- Subjects, modules, transcripts/notes, attachments
- Live class sessions + recordings
- Assessments: quizzes, assignments, projects, midterms, finals
- Notifications/announcements and release controls
- Submissions + grading + feedback
- Attendance + calendar
- Student roster + profiles (within teacher’s school scope)

---

## 3) Architecture

### Monorepo approach (recommended)
Same Next.js repo:
- `/(student)` already exists
- Add `/(teacher)` with its own layout and nav
Shared:
- `components/ui/*`
- `components/brand/BrandLogo.tsx` (single source of logo)
- `lib/supabase/*` (server/client)
- `types/supabase.ts` (generated)
Strict route protection by role.

### Supabase
- Use your existing project.
- **All tables/views/functions/policies created under** `n8n_content_creation`.
- Storage buckets:
  - `teacher_assets` (slides, PDFs, images)
  - `recordings` (live + uploaded)
  - `submissions` (student files)
  - `message_attachments` (optional)

---

## 4) Teacher route map (screens)

Public:
- `/teacher/login` (optional) or reuse `/login` with role redirect

Teacher shell:
- `/teacher` — Teacher Home (Today)
- `/teacher/classes` — My Classes (Program/Year/Section list)
- `/teacher/classes/[sectionId]` — Section Dashboard (feed, roster, attendance, schedule)
- `/teacher/classes/[sectionId]/subjects/[subjectId]` — Subject in Section (modules + assessments summary)
- `/teacher/subjects` — My Subjects (cross-section view)
- `/teacher/subjects/[subjectId]` — Subject Workspace (modules library + templates)
- `/teacher/subjects/[subjectId]/modules/[moduleId]` — Module Editor + Publishing
- `/teacher/live/[sessionId]` — Live Class Room (host/controls)
- `/teacher/assessments` — Assessment Library (templates + section instances)
- `/teacher/assessments/[assessmentId]` — Create/Edit Assessment (bank, randomization, settings)
- `/teacher/submissions` — Grading Inbox (needs review)
- `/teacher/submissions/[submissionId]` — Submission Review (rubric + feedback + return)
- `/teacher/gradebook` — Gradebook (by section/subject/assessment)
- `/teacher/messages` — Messaging (DM + section channels)
- `/teacher/calendar` — Calendar (sessions + deadlines + windows)
- `/teacher/attendance` — Attendance Dashboard (daily + session)
- `/teacher/students` — Students directory (teacher’s school scope)
- `/teacher/rubrics` — Rubric templates library
- `/teacher/settings` — Preferences (teacher-level)

P0 minimum: home, classes, section dashboard, subject workspace, module editor, assessments, grading inbox, messages, calendar, attendance.

---

## 5) Teacher UX rules (simple for non-tech teachers)

### Wizard-first setup
“Build my subject” is a 3-step flow:
1) Pick class (Program/Year/Section) + subject
2) Create modules (AI can draft)
3) Publish + schedule

### “Do it for me” actions (AI)
Always available:
- Draft modules from a topic list
- Create modules from uploaded files
- Generate transcript + clean lecture notes from recording
- Draft lesson plan for the next session
- Generate quiz from module content (with answer key)
- Draft rubric template
- Draft feedback per rubric (teacher approves)
- Draft announcement for the section

### Human approvals
- No AI output is visible to students until **Publish**.
- Grades/results are hidden until **Release**.
- Feedback draft is editable; teacher must confirm before return.

---

## 6) Data model (create in `n8n_content_creation` only)

Use existing schema where present; add only what’s missing. Names below are suggested.

### School + identities
- `schools`
- `user_roles` (user_id, school_id, role)
- `teacher_profiles`
- `student_profiles`

### Academic hierarchy
- `programs`
- `year_levels` (grade/year)
- `sections`
- `section_enrollments` (student_id, section_id, status)
- `subjects`
- `section_subjects` (section_id, subject_id, teacher_id)

### Modules + content
- `modules` (subject_id, title, order, status)
- `module_publish` (module_id, published_at, published_by)
- `content_assets` (owner_type, owner_id, asset_type, storage_path, meta_json)
- `transcripts` (module_id, source_type, text, timestamps_json, version, published_at)
- `teacher_notes` (module_id, rich_text, version, published_at)

### Live sessions + attendance
- `live_sessions` (section_subject_id, module_id nullable, start_at, end_at, provider, room_id, join_url, status)
- `session_presence_events` (session_id, student_id, joined_at, left_at, ping_count)
- `live_attendance` (session_id, student_id, status, detected_from_presence, manual_override, updated_by, updated_at)
- `daily_presence` (student_id, date, first_seen_at, last_seen_at, detected_from_login, manual_override, status)

### Assessments (template + override)
- `assessment_templates` (subject_id, type, title, instructions, default_settings_json, rubric_template_id)
- `assessment_instances` (template_id, section_subject_id, override_settings_json, open_at, close_at, time_limit, attempts, allow_resubmission, status)
- `question_banks` (subject_id, name, description)
- `questions` (bank_id, type, prompt, choices_json, answer_key_json, tags_json, difficulty)
- `assessment_bank_rules` (assessment_instance_id, bank_id, pick_count, tag_filter_json, shuffle_questions, shuffle_choices, seed_mode)

### Submissions + grading
- `submissions` (assessment_instance_id, student_id, status, attempt_no, submitted_at)
- `submission_versions` (submission_id, version_no, payload_json, file_paths_json, created_at)
- `rubric_templates` (title, scope_subject_id nullable, criteria_json, levels_json, created_by)
- `rubric_scores` (submission_id, rubric_template_id, scores_json, total_score, graded_by, graded_at)
- `feedback` (submission_id, teacher_comment, inline_notes_json, released_at, released_by)

### Messaging + feed + notifications
- `announcements` (scope_type: section|subject_multi_section, scope_ids_json, title, body, attachments_json, publish_at, created_by)
- `discussion_threads` (section_subject_id, title, created_by, created_at)
- `discussion_posts` (thread_id, created_by, body, attachments_json, created_at)
- `direct_messages` (school_id, from_user, to_user, body, attachments_json, created_at)
- `notifications` (to_user, type, entity_ref_json, payload_json, created_at, read_at)

---

## 7) RLS policy rules (summary)

All policies created for `n8n_content_creation.*` objects.

Teacher can:
- access rows within their `school_id`
- access section/subject data only where teacher is assigned in `section_subjects`
- create/edit/publish modules and assessments for their assignments
- read student submissions for their assessment instances
- grade and release results for their assessment instances
- send announcements to their sections and their subject-across-sections scope

Student can:
- read only enrolled section content
- submit only to their assigned assessment instances
- read only their own grades/feedback
- message only allowed teacher channels per school rules

---

## 8) Teacher → Student workflows (must function)

### A) Modules + transcript + notes
1) Teacher creates a module
2) Teacher uploads recording or runs live session
3) System generates transcript + draft notes
4) Teacher edits and clicks Publish
5) Student app displays module learning surface (transcript, notes, attachments)
6) Student progress updates as they learn

### B) Quiz (bank + randomization)
1) Teacher creates a question bank (or generates from module)
2) Teacher creates assessment template (quiz)
3) Teacher instantiates to one or more sections (override settings if needed)
4) Randomization rules set: pick N, tag filters, shuffle questions/choices, seed per student
5) Student quiz renders from a saved per-student snapshot
6) Auto-grade MCQ/TF
7) Teacher reviews and clicks Release (students can’t see result before release)

### C) Assignment with rubric + resubmission policy
1) Teacher creates assignment template + attaches a reusable rubric
2) Teacher instantiates per section and sets resubmission allowed or not
3) Student submits (file/text/photo/audio/video link)
4) Submission appears in Grading Inbox
5) Teacher grades with rubric; AI suggests feedback draft
6) Teacher returns feedback and releases score when ready

### D) Announcements + notifications
- Teacher sends to section or to subject-across-sections
- Students get notification + feed entry + deep link to target screen

### E) Attendance
- Login-based daily presence (auto)
- Live session presence events determine session attendance (auto)
- Teacher can override per student per session

---

## 9) Live class hosting plan

Two-track delivery:

### Track 1 (quick): External provider link
- Store Zoom/Meet URL in `live_sessions.join_url`
- App renders a “Join” CTA and tracks join clicks

### Track 2 (native): Live video in your app
Use a WebRTC provider with rooms + recording:
- LiveKit / Daily / Twilio Video / Agora

Store:
- `provider`, `room_id`
- recording asset in Storage
- transcript generated after recording is available

Start Track 1 for speed, add Track 2 next.

---

## 10) AI for teachers (time-saving, teacher approves)

P0:
- Module builder from topics/files/recordings
- Transcript cleanup + notes generation
- Quiz generation from module with answer key + tags
- Rubric generator (reusable templates)
- Feedback drafting aligned to rubric
- Lesson plan generator for next session
- Announcement drafting

Rules:
- Teacher reviews before publish/return/release
- AI outputs are stored as drafts with a version history

---

## 11) Teacher screens: required content

### Teacher Home
- Today’s sessions
- Submissions to grade
- Pending releases
- Attendance exceptions
- Draft content awaiting publish

### Section Dashboard
- Roster with quick student profile
- Attendance (today + sessions)
- Feed (announcements + discussion)
- Upcoming schedule
- Subject list

### Subject Workspace
- Modules list + publish state
- Create module (AI or manual)
- Assessment templates library
- Question banks
- Rubric templates

### Module Editor
- Title, objectives/outcomes
- Attachments + recordings
- Transcript editor + publish controls
- Notes editor + publish controls
- Preview student view
- “Generate quiz from this module”

### Assessment Builder
- Template vs instance settings
- Question bank rules + randomization
- Attempts, windows, resubmission policy
- Rubric selection (written)
- Preview and publish

### Grading Inbox
- Filters: section/subject/assessment
- Rubric grading UI
- AI feedback suggestion box
- Return feedback + Release grade toggles
- Batch operations

### Messages
- Direct messages
- Section channels + teacher-only channel (optional)

### Calendar + Attendance dashboards
- Create/edit sessions
- Attendance summaries
- Overrides + notes
- Export

---

## 12) Claude Code multi-agent plan

Agent 1 — Teacher shell + role gating + BrandLogo
Agent 2 — Classes/Sections/Roster + student profiles
Agent 3 — Subject workspace + module editor + publishing
Agent 4 — Live sessions + native/external integration plumbing + attendance
Agent 5 — Assessments (templates + instances) + banks + randomization
Agent 6 — Submissions + grading inbox + rubrics + release controls
Agent 7 — Announcements + notifications + messages + discussion
Agent 8 — Supabase mapping + migrations + RLS (schema = `n8n_content_creation` only)

PR checks:
- No `public.*` objects added
- Screens match HTML flows
- Logo consistent everywhere

---

## 13) “No public schema” enforcement

- Every migration explicitly uses `n8n_content_creation.` prefix
- Automated repo grep in CI:
  - disallow `create table public`
  - disallow `create function public`
  - disallow `alter table public`
- SQL review step before merge

---

## 14) Definition of Done (Teacher portal)

Teacher can:
- manage Program/Year/Section/Subject/Module
- create modules with AI, publish transcripts/notes
- host or link live classes, record and post
- build quizzes with bank + randomization
- create assignments with reusable rubrics
- accept submissions with versioning and resubmission rules
- grade with rubric + AI feedback drafts (approve)
- control release of results
- send announcements to section or subject-across-sections
- message students directly
- track attendance automatically and override

All data shows correctly in the student app.

End.
