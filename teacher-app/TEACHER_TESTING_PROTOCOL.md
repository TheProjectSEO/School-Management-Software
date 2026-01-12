# Teacher Portal - Automated Testing & Fix Protocol

## Setup

- **Start URL:** http://localhost:3001/teacher (or configured teacher port)
- **Test Credentials:**
  - Username: `teacher@msu.edu.ph`
  - Password: `Test123!@#`
  - Role: Teacher
- **Test Data Requirements:**
  - At least 2 assigned sections
  - At least 3 assigned subjects/courses
  - Sample students in sections
  - Mix of published and draft content
  - Pending submissions to grade

---

## Phase 1: Feature Audit

Test each teacher feature systematically using Playwright MCP and document findings.

### Authentication & Role Management

1. **Teacher Registration Flow**
   - Navigate to `/teacher/register` (or `/teacher-register`)
   - Test form validation:
     - Full Name field (badge icon)
     - Employee ID field (id_card icon)
     - Email field (mail icon)
     - School Selection dropdown (domain icon)
     - Department field (work icon)
     - Password + Confirm Password (lock icons)
     - Terms checkbox
   - Submit registration
   - Verify auth.user created
   - Verify teacher_profiles entry created
   - Check redirect to teacher dashboard

2. **Teacher Login Flow**
   - Navigate to `/teacher/login` (or `/login` with role detection)
   - Test email/employee ID login (person icon)
   - Test password field (lock icon)
   - Test "Remember me" checkbox
   - Verify "Forgot password" link
   - Submit and verify teacher_profiles check
   - Confirm redirect to `/teacher` (not student dashboard)
   - Verify session persistence across page refresh

3. **Role Detection & Security**
   - Verify teacher cannot access `/` (student routes)
   - Verify student cannot access `/teacher` routes
   - Test RLS enforcement (teacher only sees own school data)
   - Test assignment-based access control
   - Verify logout clears session and redirects properly

### Core Teacher Dashboard

4. **Teacher Home (`/teacher`)**
   - Verify welcome message with teacher name
   - Check "TODAY'S SESSIONS" widget:
     - Displays scheduled sessions for today
     - Shows session time and subject
     - "Live Now" badge for active sessions
     - "Join Session" button works
     - "In X hours" countdown displays
     - "Prepare" button for upcoming sessions
   - Check "GRADING INBOX" widget:
     - Shows count of pending submissions
     - "View All" link works
   - Check "PENDING RELEASES" widget:
     - Shows count of graded but unreleased assessments
     - "Release" button accessible
   - Check "DRAFT CONTENT" widget:
     - Shows count of unpublished modules
     - Link to review drafts works
   - Check "ATTENDANCE ALERTS" widget:
     - Shows absent student count for today
     - Link to attendance dashboard works
   - Verify no console errors
   - Test data refresh functionality
   - Verify responsive design (mobile/desktop)

### Class & Section Management

5. **My Classes (`/teacher/classes`)**
   - Verify section cards display:
     - Section name and grade level
     - Student count
     - Assigned subjects count
     - Section card is clickable
   - Test "[+ New Class]" button (if create permission exists)
   - Verify only assigned sections appear
   - Test section filtering/search (if exists)
   - Check empty state (no assignments)

6. **Section Dashboard (`/teacher/classes/[sectionId]`)**
   - Verify tabs render: [Roster] [Subjects] [Feed] [Attendance] [Schedule]
   - **Roster Tab:**
     - Student list displays with avatars
     - Student names visible
     - [Profile] and [Msg] buttons work
     - Sorting/filtering functional (if exists)
   - **Subjects Tab:**
     - Lists subjects assigned to this section
     - Subject cards clickable
     - Navigate to subject workspace
   - **Feed Tab:**
     - Announcements display chronologically
     - Pinned announcements show first
     - Post announcement button works
   - **Attendance Tab:**
     - Displays attendance overview
     - Links to detailed attendance view
   - **Schedule Tab:**
     - Shows class schedule
     - Displays upcoming sessions
   - Test breadcrumb navigation ("← Back to Classes")

### Subject & Content Management

7. **My Subjects (`/teacher/subjects`)**
   - Verify cross-section view of all assigned subjects
   - Subject cards display:
     - Subject name and code
     - Section(s) assigned
     - Module count
     - Draft/published status
   - Test subject card click navigation
   - Verify filtering by section (if exists)

8. **Subject Workspace (`/teacher/subjects/[subjectId]`)**
   - Verify tabs: [Modules] [Assessments] [Question Banks] [Rubrics]
   - **Modules Tab:**
     - Module list displays with status badges ([Published] [Draft])
     - Module order visible
     - [Edit] button for each module works
     - [+ Create Module] button functional
     - Published modules show green badge
     - Draft modules show gray badge with [Preview] [Publish] buttons
   - **Assessments Tab:**
     - Assessment list displays
     - Assessment type badges (Quiz, Assignment, Exam)
     - Due dates visible
     - Published/draft status clear
   - **Question Banks Tab:**
     - Question bank list displays
     - Bank names and question counts
     - Create new bank button works
   - **Rubrics Tab:**
     - Rubric templates list
     - Create rubric button functional
   - Test "[Generate Module with AI]" button (if implemented)

9. **Module Editor (`/teacher/subjects/[subjectId]/modules/[moduleId]`)**
   - Verify left panel: Module Settings
     - Title input field works
     - Description textarea works
     - Duration input (minutes) functional
   - Verify right panel: Preview Panel shows student view
   - **Lessons Section:**
     - Lesson list displays with order numbers
     - Lesson types show (video, reading, quiz)
     - [+ Add] button works
     - Drag-to-reorder works (if implemented)
     - Edit/delete lesson buttons functional
   - **Transcript Section:**
     - [Upload Recording] button works
     - [Generate from AI] button functional (if implemented)
     - [Edit] transcript editor opens
     - Status badge shows (Draft/Published)
     - Published timestamp displays (if published)
   - **Actions:**
     - [Save Draft] saves without publishing
     - [Preview] shows student view
     - [Publish] sets is_published=true and makes visible to students
   - Verify breadcrumb ("← Back to Subject")
   - Test unsaved changes warning (if implemented)

### Live Sessions & Attendance

10. **Live Session Room (`/teacher/live/[sessionId]`)**
    - Verify session loads for scheduled/live sessions
    - Check session header displays:
      - Session title
      - Section and subject
      - Scheduled time
      - Status (Scheduled, Live, Ended)
    - **Live Controls (if session is live):**
      - Start/End session buttons work
      - Video/audio controls functional
      - Screen share works (if implemented)
      - Chat panel displays (if implemented)
      - Participant list shows joined students
    - **Recording:**
      - Start/stop recording buttons work
      - Recording status indicator displays
      - Recording URL saved after session ends
    - **Presence Tracking:**
      - Student join/leave events logged
      - teacher_session_presence entries created
      - Duration calculated on leave
    - Test provider integration (Zoom, Meet, Teams, etc.)
    - Verify redirect when session hasn't started
    - Check error handling for invalid session IDs

11. **Attendance Dashboard (`/teacher/attendance`)**
    - Verify date selector works
    - Verify section dropdown filters correctly
    - Verify subject dropdown filters (if implemented)
    - **Attendance Table:**
      - Student avatars display
      - Student names visible
      - Status column shows: P (Present), L (Late), A (Absent), E (Excused)
      - Time In column shows login time (if auto-detected)
      - [Override] or [Change] button works for manual override
    - **Auto-detection indicators:**
      - Green icon for detected from presence/login
      - Manual override shows different icon/color
    - **Summary section:**
      - Present count accurate
      - Late count accurate
      - Absent count accurate
    - **Batch Actions:**
      - [Mark All Present] works
      - [Save Changes] persists updates
      - [Export to CSV] downloads attendance data
    - Test teacher_daily_attendance updates
    - Test teacher_attendance session linking

### Assessment & Question Bank Management

12. **Assessment Library (`/teacher/assessments`)**
    - Verify assessment list displays all created assessments
    - Filter by type (Quiz, Assignment, Exam) works
    - Filter by subject works
    - Filter by status (Published, Draft) works
    - Sort by due date, created date, etc. works
    - [+ Create Assessment] button navigates correctly
    - Assessment cards show:
      - Title
      - Type badge
      - Due date
      - Total points
      - Submission count
      - Published/draft status
    - Click assessment card to edit

13. **Assessment Builder (`/teacher/assessments/[assessmentId]`)**
    - Verify tabs: [Settings] [Questions] [Bank Rules] [Preview]
    - **Settings Tab:**
      - Type dropdown works (Quiz, Assignment, Exam)
      - Subject dropdown populated with assigned subjects
      - Title input functional
      - Due Date picker works
      - Time Limit input (minutes) functional
      - Max Attempts input works
      - "Allow resubmission" checkbox toggles
      - Rubric dropdown shows available rubrics
      - [Create New Rubric] link works
    - **Questions Tab (Manual Question Entry):**
      - Question list displays
      - [+ Add Question] button works
      - Question editor supports:
        - Multiple choice
        - True/False
        - Short answer
        - Essay
      - Point values editable
      - Correct answer selection works
      - Explanation field optional
      - Question order adjustable
    - **Bank Rules Tab (Randomization):**
      - [+ Add Bank Rule] button works
      - Bank selector shows available question banks
      - Pick count input (e.g., "10 questions")
      - Tag filter input/chips work
      - Difficulty filter (easy, medium, hard) works
      - [x] Shuffle questions checkbox toggles
      - [x] Shuffle choices checkbox toggles
      - Seed mode selector (Per Student, Per Attempt, Fixed) works
      - Multiple bank rules can be added
      - Rule deletion works
    - **Preview Tab:**
      - [Preview as Student] renders quiz as student would see
      - Questions display in correct order (or randomized)
      - Choices shuffle if enabled
      - Timer display (if time limit set)
    - **Actions:**
      - [Save Draft] works without publishing
      - [Publish] makes assessment visible to students
    - Verify breadcrumb navigation

14. **Question Bank Manager (`/teacher/assessments/[assessmentId]/banks` or `/teacher/question-banks`)**
    - Verify question bank list displays
    - Bank cards show:
      - Bank name
      - Question count
      - Tag cloud (if implemented)
      - Subject association
    - [+ Create Bank] button works
    - **Bank Detail View:**
      - Question list displays
      - Question preview shows question text and type
      - Point values visible
      - Difficulty badges show
      - Tags display
      - [+ Add Question] works
      - Bulk import questions (if implemented)
      - Edit question inline or modal
      - Delete question with confirmation
      - Duplicate question works (if implemented)
    - **Filtering:**
      - Filter by difficulty works
      - Filter by tag works
      - Search questions works

### Grading & Feedback

15. **Grading Inbox (`/teacher/submissions`)**
    - Verify tabs: Pending (X) | Graded (Y) | Released (Z)
    - **Pending Tab:**
      - Shows ungraded submissions
      - Submission cards display:
        - Student name and avatar
        - Assessment title
        - Section
        - Submitted timestamp (e.g., "2h ago", "1d ago")
        - [Grade Now] button
      - Checkbox for batch selection
      - Sort by due date, submission date, student name
      - Filter by subject, section, assessment type
    - **Graded Tab:**
      - Shows graded but unreleased submissions
      - Score displays on card
      - [Review] button to edit grade
      - [Release] button to publish grade
    - **Released Tab:**
      - Shows released submissions
      - Score and release date visible
      - [View] button to see details
    - **Batch Actions:**
      - [Grade Selected] opens multi-grade view (if implemented)
      - [Release Selected] releases multiple grades with confirmation
    - Verify count badges update on actions
    - Test empty states (no pending submissions)

16. **Submission Review (`/teacher/submissions/[submissionId]`)**
    - Verify split layout: Student Submission (left) | Grading Panel (right)
    - **Student Submission Panel:**
      - Student name and assessment title in header
      - Question-by-question display:
        - Question text
        - Student answer
        - For MCQ: Correct/Incorrect badge and auto-scored points
        - For essay/short answer: Text answer displayed
        - Correct answer shown (for review)
      - Total score calculation displayed
      - Submission timestamp
      - Attempt number (if multiple attempts allowed)
    - **Grading Panel:**
      - **If Rubric Attached:**
        - Rubric criteria list
        - Score input for each criterion (e.g., [4/5])
        - Total rubric score calculation
        - Rubric max score displayed
      - **Manual Score Entry (if no rubric):**
        - Points per question editable (for short answer/essay)
        - Total score updates automatically
      - **Feedback Section:**
        - [AI Draft] button generates feedback (if implemented)
        - Editable text area for teacher comments
        - Inline notes per question (if implemented)
        - Feedback tone suggestions (if implemented)
      - **Actions:**
        - [Save] saves grade without releasing
        - [Save & Next] saves and navigates to next submission
        - [Return to Student] releases grade and feedback immediately
        - [Release Grade] makes grade visible to student
    - Verify breadcrumb ("← Grading Inbox")
    - Test confirmation dialogs before release
    - Verify teacher_feedback entry created
    - Verify feedback.is_released controls student visibility

17. **Gradebook (`/teacher/gradebook`)**
    - Verify section selector dropdown
    - Verify subject selector dropdown
    - **Grade Table:**
      - Student names in rows
      - Assessment names in columns
      - Grade cells show scores or "—" for not submitted
      - Color coding for score ranges (if implemented):
        - Green: A (90-100)
        - Blue: B (80-89)
        - Yellow: C (70-79)
        - Orange: D (60-69)
        - Red: F (<60)
      - Click cell to view submission detail
    - **Summary Statistics:**
      - Class average per assessment
      - Student averages
      - Highest/lowest scores
    - **Filtering:**
      - Show only released grades
      - Show only graded (released + unreleased)
      - Show all (including pending)
    - **Export:**
      - [Export to CSV] downloads gradebook
      - [Export to PDF] generates PDF report (if implemented)
    - Verify calculation accuracy
    - Test sorting by student name, average, etc.

18. **Rubric Templates (`/teacher/rubrics`)**
    - Verify rubric template list displays
    - Rubric cards show:
      - Rubric title
      - Description
      - Criteria count
      - Max score
      - Associated subject (if any)
      - Created date
    - [+ Create Rubric] button works
    - **Rubric Builder:**
      - Title input
      - Description textarea
      - Course/subject selector (optional)
      - **Criteria Section:**
        - [+ Add Criterion] adds row
        - Criterion name input
        - Description/explanation input
        - Max points input
        - Delete criterion button
        - Reorder criteria (drag or arrows)
      - **Levels Section:**
        - Level name (e.g., "Excellent", "Good", "Fair", "Poor")
        - Point value per level
        - [+ Add Level] adds column
        - Delete level button
      - **Rubric Grid Preview:**
        - Shows criteria × levels matrix
        - Point values visible in cells
        - Total max score calculated
      - **Actions:**
        - [Save Template] saves rubric
        - [Save & Apply to Assessment] links to assessment
        - [Cancel] discards changes
    - Test duplicate rubric functionality (if implemented)
    - Test rubric from template when creating assessment

### Communication & Collaboration

19. **Announcements (`/teacher/announcements` or integrated in section dashboard)**
    - Verify announcement list displays
    - Announcement cards show:
      - Title
      - Excerpt/body preview
      - Scope badge (Section, Course, School)
      - Pinned icon (if pinned)
      - Publish date
      - Expiry date (if set)
    - [+ Create Announcement] button works
    - **Create/Edit Announcement:**
      - Scope selector (Section, Course, School)
      - Scope ID dropdown (which section/course/school)
      - Title input
      - Rich text editor for body
      - Attachment upload (JSONB stored)
      - [x] Pin announcement checkbox
      - Publish date picker (schedule for future)
      - Expiry date picker (optional)
      - [Save Draft] vs [Publish] buttons
    - **Student Notification Trigger:**
      - Verify notification created for each student in scope
      - Check notification entry in n8n_content_creation.notifications
    - Test edit announcement
    - Test delete announcement with confirmation
    - Test pinned announcements display first

20. **Messages (`/teacher/messages`)**
    - Verify split layout: Conversations (left) | Chat View (right)
    - **Conversations Panel:**
      - Direct message list displays
      - Student name and avatar
      - Last message preview
      - Timestamp (e.g., "10:30 AM", "Yesterday")
      - Unread badge/dot (if unread messages)
      - Sort by recent activity
      - [+ New Conversation] button works
    - **Channels Panel (if implemented):**
      - Section channels (e.g., "# Section A")
      - Subject channels (e.g., "# Math 101")
      - Channel unread indicators
    - **Chat View:**
      - Selected conversation header shows student name and section
      - Message bubbles display:
        - Sender (Student vs You)
        - Timestamp
        - Message body
        - Attachments (if any)
      - Auto-scroll to latest message
      - Read receipts (if implemented)
      - Typing indicator (if implemented)
    - **Message Composer:**
      - Text input area
      - Attachment button (upload files)
      - [Send] button posts message
      - Enter key sends message (Shift+Enter for new line)
    - **Direct Message Creation:**
      - Student selector/search
      - Compose message
      - Send creates teacher_direct_messages entry
    - Verify teacher_direct_messages table updates
    - Test search conversations (if implemented)
    - Test archive conversation (if implemented)

21. **Discussion Threads (`/teacher/discussions` or integrated in subject workspace)**
    - Verify thread list displays
    - Thread cards show:
      - Thread title
      - Post count
      - Latest activity timestamp
      - Pinned icon (if pinned)
      - Locked icon (if locked)
      - Created by (teacher or student)
    - [+ Create Thread] button works
    - **Thread Detail View:**
      - Thread title in header
      - Original post displays
      - Replies display in chronological order
      - Reply indentation for nested replies (if implemented)
      - Post author badge (Teacher vs Student)
      - Post timestamp
      - Attachments display and downloadable
      - [Reply] button on each post
      - Teacher can [Lock Thread] or [Pin Thread]
      - Teacher can delete inappropriate posts
    - **Create Thread:**
      - Title input
      - Body rich text editor
      - Attachment upload
      - [x] Pin thread checkbox (teacher only)
      - [Post] button creates thread
    - Verify teacher_discussion_threads and teacher_discussion_posts tables update
    - Test edit/delete own posts
    - Test is_teacher_post flag displays correctly

### Student Directory & Analytics

22. **Students Directory (`/teacher/students`)**
    - Verify student list scoped to teacher's sections
    - Student cards/rows show:
      - Avatar
      - Full name
      - LRN (Learner Reference Number)
      - Grade level
      - Section
      - Enrollment status
      - [Profile] button
      - [Message] button
    - **Filtering:**
      - Filter by section
      - Filter by grade level
      - Search by name or LRN
    - **Sorting:**
      - Sort by name (A-Z, Z-A)
      - Sort by section
    - Click student to view detail
    - **Student Detail View:**
      - Student info displayed
      - Enrolled courses list
      - Recent progress summary
      - Recent submissions
      - Attendance summary
      - [Send Message] quick action
      - [View Full Progress] link
    - Verify RLS prevents access to students outside assigned sections

23. **Calendar (`/teacher/calendar`)**
    - Verify calendar view renders (month, week, day views)
    - **Events Displayed:**
      - Scheduled live sessions
      - Assessment due dates
      - Class schedule
      - School events (if integrated)
    - Event cards show:
      - Event type icon
      - Title
      - Time
      - Subject/section
    - Click event to view details
    - **Create Event (if manual creation enabled):**
      - [+ Add Event] button works
      - Event type selector
      - Date and time pickers
      - Duration input
      - Recurrence options (if implemented)
      - [Save] creates event
    - Navigation between months/weeks works
    - Today indicator displays
    - View toggle (Month, Week, Day) functional
    - Export calendar (if implemented)

### AI-Powered Features

24. **AI Module Generator**
    - Navigate to subject workspace
    - Click [Generate Module with AI] button
    - **Input Form:**
      - Topic input (or topic list)
      - File upload (e.g., PDF, DOCX for context)
      - Duration target input
      - Learning objectives input (optional)
      - [Generate] button
    - **Generation Process:**
      - Loading indicator displays
      - AI generates module structure
      - Module, lessons, and draft content created
    - **Review Draft:**
      - Generated module appears as Draft
      - Teacher can edit title, description, lessons
      - Teacher can regenerate or modify
      - [Publish] when satisfied
    - Verify error handling (AI service down, rate limits)

25. **AI Transcript Cleanup**
    - Navigate to module editor with uploaded recording
    - System auto-generates transcript (or upload transcript file)
    - Click [Cleanup with AI] or [Edit Transcript]
    - **Cleanup Process:**
      - AI corrects grammar, punctuation, speaker labels
      - Removes filler words (um, uh, like)
      - Formats timestamps
      - Returns cleaned version
    - **Review:**
      - Side-by-side comparison (original vs cleaned)
      - Teacher can accept, edit, or reject changes
      - [Save Cleaned Version]
    - Verify teacher_transcripts entry updated
    - Test publish transcript flow

26. **AI Quiz Generator**
    - Navigate to assessment builder or question bank
    - Click [Generate Questions with AI]
    - **Input Form:**
      - Source selection (module, lesson, uploaded file)
      - Question count input (e.g., 10 questions)
      - Question types (MCQ, True/False, Short Answer)
      - Difficulty distribution (e.g., 3 easy, 5 medium, 2 hard)
      - [Generate] button
    - **Generation Process:**
      - AI analyzes source content
      - Generates questions with answer keys
      - Returns question list with explanations
    - **Review:**
      - Question preview displays
      - Teacher can edit question text
      - Teacher can modify choices/answers
      - Teacher can adjust points
      - [Add to Bank] or [Add to Assessment] saves
    - Verify questions added to teacher_bank_questions
    - Test regenerate if unsatisfied

27. **AI Rubric Generator**
    - Navigate to rubric builder
    - Click [Generate Rubric with AI]
    - **Input Form:**
      - Assignment description input
      - Learning objectives input
      - Max score input
      - Number of criteria input
      - [Generate] button
    - **Generation Process:**
      - AI creates rubric criteria and levels
      - Returns rubric template
    - **Review:**
      - Rubric grid displays
      - Teacher can edit criteria names
      - Teacher can adjust point values
      - Teacher can add/remove criteria or levels
      - [Save Template] creates rubric
    - Verify teacher_rubric_templates entry created
    - Test apply rubric to assessment

28. **AI Feedback Drafting**
    - Navigate to submission review
    - Click [AI Draft] in feedback section
    - **Generation Process:**
      - AI analyzes submission content
      - AI reviews rubric criteria (if attached)
      - AI reviews student's score
      - Generates constructive feedback draft
    - **Review:**
      - Draft feedback displays in text area
      - Teacher can edit, expand, or rewrite
      - [Use Draft] populates feedback field
      - [Regenerate] requests new draft
    - **Tone Options (if implemented):**
      - Encouraging
      - Constructive
      - Formal
      - Detailed
    - Verify teacher_feedback.ai_draft field saved
    - Test final feedback saves correctly

### Settings & Preferences

29. **Teacher Settings (`/teacher/settings`)**
    - Verify settings page loads
    - **Profile Section:**
      - Full name display and edit
      - Email display (not editable)
      - Employee ID display
      - Department display and edit
      - Specialization input
      - Avatar upload
      - [Update Profile] button saves changes
    - **Notification Preferences:**
      - Email notifications toggle
      - Push notifications toggle
      - Notification types checkboxes:
        - New submission
        - Student message
        - Announcement posted
        - Live session reminder
      - [Save Preferences] button
    - **Password Change:**
      - Current password input
      - New password input
      - Confirm new password input
      - Password strength indicator
      - [Change Password] button
    - **Display Preferences:**
      - Dark mode toggle (consistent with student app)
      - Timezone selector
      - Date format selector
      - [Save Preferences]
    - **Data Export (if implemented):**
      - [Export My Data] downloads teacher data
      - [Export Gradebook] downloads all grades
    - Verify form validation works
    - Verify success/error messages display
    - Test changes persist after logout/login

30. **Help & Documentation (`/teacher/help`)**
    - Verify help page loads
    - **Help Categories:**
      - Getting Started
      - Creating Content
      - Grading & Feedback
      - Communication
      - Attendance
      - AI Features
      - Troubleshooting
    - Click category to expand or navigate
    - **Search Functionality:**
      - Search bar works
      - Returns relevant articles
      - Highlights search terms
    - **Help Articles:**
      - Article displays with formatting
      - Images/screenshots show
      - Code blocks formatted (if applicable)
      - [Was this helpful?] feedback buttons
    - **Contact Support:**
      - Contact form available
      - Email support link works
      - Live chat widget (if implemented)
    - Verify external links open correctly

### Sign Out

31. **Sign Out Flow**
    - Click logout button in sidebar or header
    - Verify confirmation dialog (if implemented)
    - Verify session cleared from Supabase
    - Verify redirect to `/teacher/login` or `/login`
    - Verify cannot access protected teacher routes after logout
    - Verify student routes still protected
    - Test "Remember me" token cleared if logout

---

## Phase 2: Issue Documentation & Fix Execution

For every issue found in Phase 1, immediately proceed to fix using specialized agents.

### Agent Assignment Strategy

Create specialized agents for different issue categories in the teacher app:

#### **Teacher Auth Agent**
- **Handles:** Teacher registration, login, role detection, session management
- **Skills:** Next.js middleware, Supabase Auth, teacher_profiles table, role-based routing
- **Priority:** Critical
- **Key Files:**
  - `/app/(auth)/teacher-register/page.tsx`
  - `/app/(auth)/login/page.tsx`
  - `/middleware.ts`
  - `/lib/dal/teacher/auth.ts`

#### **Content Management Agent**
- **Handles:** Module editor, lesson creation, transcript management, content publishing
- **Skills:** Rich text editors, file uploads, Supabase Storage, module publishing flow
- **Priority:** Critical
- **Key Files:**
  - `/app/teacher/subjects/[subjectId]/modules/[moduleId]/page.tsx`
  - `/lib/dal/teacher/content.ts`
  - `/components/teacher/ModuleEditor.tsx`

#### **Assessment Agent**
- **Handles:** Assessment builder, question banks, randomization, quiz snapshots
- **Skills:** Form builders, JSON schema for questions, bank rules, randomization algorithms
- **Priority:** High
- **Key Files:**
  - `/app/teacher/assessments/[assessmentId]/page.tsx`
  - `/lib/dal/teacher/assessments.ts`
  - `/lib/services/quizRandomizer.ts`

#### **Grading Agent**
- **Handles:** Grading inbox, submission review, rubric scoring, grade release
- **Skills:** Rubric calculations, feedback forms, release controls, RLS for student visibility
- **Priority:** Critical
- **Key Files:**
  - `/app/teacher/submissions/page.tsx`
  - `/app/teacher/submissions/[submissionId]/page.tsx`
  - `/lib/dal/teacher/grading.ts`

#### **Live Session Agent**
- **Handles:** Live session room, video integration, attendance tracking, presence detection
- **Skills:** WebRTC, video SDK integration (Zoom, Meet, LiveKit), session state management
- **Priority:** High
- **Key Files:**
  - `/app/teacher/live/[sessionId]/page.tsx`
  - `/lib/services/liveSession.ts`
  - `/lib/dal/teacher/attendance.ts`

#### **Communication Agent**
- **Handles:** Announcements, messages, discussion threads, notifications
- **Skills:** Real-time messaging, notification triggers, rich text content
- **Priority:** High
- **Key Files:**
  - `/app/teacher/messages/page.tsx`
  - `/app/teacher/announcements/page.tsx`
  - `/lib/dal/teacher/communication.ts`

#### **Attendance Agent**
- **Handles:** Daily attendance, session attendance, auto-detection, manual overrides
- **Skills:** Attendance algorithms, presence tracking, date calculations, CSV export
- **Priority:** High
- **Key Files:**
  - `/app/teacher/attendance/page.tsx`
  - `/lib/dal/teacher/attendance.ts`
  - `/lib/services/attendanceTracker.ts`

#### **AI Features Agent**
- **Handles:** AI module generation, transcript cleanup, quiz generation, rubric generation, feedback drafting
- **Skills:** Anthropic API, prompt engineering, AI response parsing, draft management
- **Priority:** Medium
- **Key Files:**
  - `/app/api/teacher/ai/generate-module/route.ts`
  - `/app/api/teacher/ai/cleanup-transcript/route.ts`
  - `/app/api/teacher/ai/generate-quiz/route.ts`
  - `/lib/services/aiAssistant.ts`

#### **UI/Component Agent**
- **Handles:** TeacherShell, TeacherSidebar, cards, modals, forms, responsive design
- **Skills:** React components, Tailwind CSS, Material Symbols icons, dark mode
- **Priority:** Medium
- **Key Files:**
  - `/components/layout/TeacherShell.tsx`
  - `/components/layout/TeacherSidebar.tsx`
  - `/components/ui/*.tsx`
  - `/tailwind.config.js`

#### **Data & RLS Agent**
- **Handles:** Database queries, RLS policies, data access control, teacher assignments
- **Skills:** Supabase RLS, SQL, n8n_content_creation schema, teacher_assignments logic
- **Priority:** Critical
- **Key Files:**
  - `/lib/dal/teacher/*.ts`
  - `/supabase/migrations/*.sql`
  - RLS policies

#### **Calendar & Schedule Agent**
- **Handles:** Calendar view, event display, session scheduling, due dates
- **Skills:** Calendar libraries, date/time handling, recurring events
- **Priority:** Medium
- **Key Files:**
  - `/app/teacher/calendar/page.tsx`
  - `/lib/services/calendar.ts`

### Fix Workflow

```
For each feature tested:
  IF feature is working:
    ✅ Mark as PASS in audit report
    Continue to next feature

  ELSE IF issue found:
    1. Document issue details:
       - Feature name
       - Issue description
       - Error messages/console logs
       - Expected behavior (per CLAUDE.md flow)
       - Actual behavior
       - Screenshot/video (if UI issue)

    2. Determine severity:
       - Critical: Blocks core teacher workflow (grading, publishing, attendance)
       - High: Major feature broken (live sessions, assessments)
       - Medium: UX degradation (sorting, filtering, UI polish)
       - Low: Minor polish needed (icon alignment, tooltips)

    3. Determine agent type:
       - Match issue to agent specialty
       - Load teacher app context and CLAUDE.md specs
       - Provide relevant file paths

    4. Spawn appropriate agent:
       - Invoke Task tool with subagent_type
       - Pass issue context and expected behavior from CLAUDE.md
       - Include database schema for RLS/data issues
       - Reference teacher-specific flows (module publishing, grade release, etc.)

    5. Agent implements fix:
       - Read CLAUDE.md for requirements
       - Analyze root cause
       - Read relevant files
       - Implement solution following project patterns
       - Ensure n8n_content_creation schema prefix
       - Verify RLS policies enforced
       - Match student app branding (colors, fonts, icons)

    6. Verify fix with Playwright:
       - Re-run test for this feature
       - Check console for new errors
       - Verify fix doesn't break related features
       - Test cross-role impacts (student app visibility)

    7. Document resolution:
       - Files modified
       - Database changes (migrations)
       - Why this approach aligns with CLAUDE.md
       - Any manual steps needed

    8. Update status:
       ✅ Mark as FIXED in audit report
       OR
       ⚠️ Mark as NEEDS MANUAL REVIEW if:
          - Requires architectural decision
          - Affects multiple systems
          - Needs product input on behavior
```

### Critical Test Scenarios (End-to-End Flows)

After individual features pass, test these critical teacher workflows:

#### E2E Flow 1: Module Publishing
```
1. Teacher logs in
2. Navigates to My Subjects > Math 101
3. Clicks [+ Create Module]
4. Enters module title, description, duration
5. Adds 3 lessons (video, reading, quiz)
6. Uploads recording
7. System generates transcript (or manual upload)
8. Teacher edits transcript
9. Clicks [Publish Transcript]
10. Clicks [Publish Module]
11. Verify module.is_published = true in DB
12. Verify student can see module in their learning surface
13. Verify student progress tracked when accessed
```

#### E2E Flow 2: Quiz with Randomization
```
1. Teacher creates question bank with 20 questions
2. Creates quiz assessment
3. Adds bank rule: Pick 10 questions, shuffle questions and choices
4. Publishes quiz
5. Student starts quiz
6. Verify quiz_snapshot created with randomized questions
7. Student submits quiz
8. Verify MCQ auto-graded
9. Teacher reviews in grading inbox
10. Teacher clicks [Release Grade]
11. Verify feedback.is_released = true
12. Verify student sees score and feedback
```

#### E2E Flow 3: Assignment with Rubric
```
1. Teacher creates rubric template (4 criteria, 3 levels each)
2. Creates assignment assessment
3. Links rubric to assignment
4. Publishes assignment
5. Student submits text + file attachment
6. Submission appears in teacher grading inbox
7. Teacher grades using rubric (scores each criterion)
8. AI drafts feedback
9. Teacher edits feedback
10. Teacher clicks [Release Grade]
11. Verify rubric_scores and feedback entries created
12. Verify student sees score, rubric breakdown, and feedback
```

#### E2E Flow 4: Live Session with Attendance
```
1. Teacher schedules live session for Section A, Math 101
2. Session appears in dashboard "TODAY'S SESSIONS"
3. Teacher clicks [Join Session]
4. Live room loads, video/audio initialized
5. Student joins session
6. Verify teacher_session_presence entry created (joined_at)
7. Teacher conducts class (simulated or actual)
8. Student leaves session
9. Verify teacher_session_presence entry updated (left_at, duration)
10. Teacher ends session, stops recording
11. Recording URL saved
12. Navigate to Attendance Dashboard
13. Verify teacher_attendance auto-populated with "Present" for student
14. Teacher overrides one student to "Late" with notes
15. Verify manual_override = true in DB
16. Clicks [Save Changes]
17. Verify attendance data persists
```

#### E2E Flow 5: Announcement to Notification
```
1. Teacher creates announcement for Section A
2. Enters title and body
3. Pins announcement
4. Clicks [Publish]
5. Verify announcement in DB with scope_type='section', scope_id=section_id
6. Verify notification created for each student in Section A
7. Student logs in to student app
8. Verify notification badge shows count
9. Student clicks notification
10. Student sees announcement detail
```

---

## Phase 3: Final Deliverables

Generate these markdown files in the project root:

### 1. `teacher-audit-report.md`

```markdown
# Teacher Portal - Audit Report
**Date:** [Current Date]
**Tester:** Claude Code with Playwright MCP
**Test Duration:** [Total time]

## Summary
- Total Features Tested: 31
- ✅ Passing: X
- ❌ Issues Found: Y
- 🔧 Fixed: Z
- ⚠️ Needs Manual Review: N

## Critical Flows Tested
- [✅/❌] Module Publishing Flow
- [✅/❌] Quiz with Randomization
- [✅/❌] Assignment with Rubric
- [✅/❌] Live Session with Attendance
- [✅/❌] Announcement to Notification

## Detailed Results

### ✅ Passing Features

#### Authentication & Role Management
- [✅] Teacher Registration Flow
- [✅] Teacher Login Flow
- [✅] Role Detection & Security

#### Dashboard & Classes
- [✅] Teacher Home Dashboard
- [✅] My Classes List
- [✅] Section Dashboard

[Continue for all features...]

### 🔧 Fixed Issues

#### [Feature Name] - [Severity]
- **Issue:** [Description]
- **Root Cause:** [Analysis]
- **Expected Behavior (per CLAUDE.md):** [Quote from spec]
- **Actual Behavior:** [What happened]
- **Fix Applied:** [What was changed]
- **Files Modified:**
  - `path/to/file1.tsx` - [Changes made]
  - `path/to/api/route.ts` - [Changes made]
  - `supabase/migrations/XXX.sql` - [Schema change]
- **Database Changes:**
  - Added column: `teacher_feedback.is_released`
  - Added RLS policy: [Policy name]
- **Verification:** ✅ Tested and confirmed working
  - [Specific test steps]
- **Screenshots:** [Before/After if applicable]
- **Cross-App Impact:** [Did this affect student app?]

[Repeat for each fixed issue...]

### ⚠️ Needs Manual Review

#### [Feature Name] - [Severity]
- **Issue:** [Description]
- **Why Manual Review:** [Complexity/architectural decision needed/product input required]
- **Current State:** [What works, what doesn't]
- **Options Considered:**
  1. [Option A] - Pros/Cons
  2. [Option B] - Pros/Cons
- **Recommendation:** [Suggested approach with rationale]
- **Impact if Not Fixed:** [User impact, workarounds]
- **Estimated Effort:** [If estimable]

## Console Errors Log
**Timestamp** | **Feature** | **Error Message** | **Severity** | **Status**
--- | --- | --- | --- | ---
[Time] | Module Editor | Cannot read property 'id' | High | ✅ Fixed
[Time] | Grading Inbox | 403 Forbidden on API call | Critical | ✅ Fixed

## Network Failures
**Endpoint** | **Status Code** | **Error** | **Status**
--- | --- | --- | ---
`/api/teacher/modules` | 500 | Internal Server Error | ✅ Fixed
`/api/teacher/submissions/[id]/grade` | 403 | Forbidden | ✅ Fixed

## Database Issues
- **Missing Table:** `teacher_rubric_templates` - ✅ Created via migration
- **RLS Policy Gap:** Students could see unreleased grades - ✅ Added policy
- **Schema Prefix Missing:** Some tables in `public` instead of `n8n_content_creation` - ✅ Migrated

## Performance Notes
- Module Editor loads in 800ms (acceptable)
- Grading Inbox loads in 1.2s with 50 submissions (acceptable)
- Live Session join time: 2.5s (needs optimization)
- Quiz snapshot generation: 400ms for 50 questions (acceptable)

## Accessibility Notes
- [✅] All forms have proper labels
- [⚠️] Modal focus trap not working
- [✅] Keyboard navigation functional
- [✅] Screen reader announcements present

## Cross-Browser Testing (if performed)
- **Chrome:** ✅ All features working
- **Firefox:** ✅ All features working
- **Safari:** ⚠️ Video playback issue in live session
- **Edge:** ✅ All features working

## Mobile Testing (if performed)
- **iOS Safari:** [Results]
- **Android Chrome:** [Results]
- **Responsive Design:** [Results]

## Security Findings
- [✅] RLS policies enforced on all teacher tables
- [✅] Teacher cannot access other schools' data
- [✅] Teacher cannot access unassigned sections/courses
- [✅] Student grades hidden until `is_released = true`
- [⚠️] [Any security concerns]

## Recommendations for Next Steps
1. [High-priority item]
2. [Medium-priority item]
3. [Low-priority item]
```

### 2. `teacher-fixes-implemented.md`

```markdown
# Teacher Portal - Fixes Implementation Log

**Date:** [Current Date]
**Total Fixes:** [Count]

---

## Critical Fixes (Blocking Core Teacher Workflows)

### ✅ Fix #1: Module Publishing Fails to Update is_published Flag
- **Feature:** Module Editor - Publish Flow
- **Impact:** Teachers cannot publish modules, students cannot see content
- **Severity:** Critical
- **Root Cause:** API route missing database update for `modules.is_published`
- **Changes Made:**
  - **Modified:** `/app/api/teacher/modules/[id]/publish/route.ts`
    - Added Supabase update query: `UPDATE n8n_content_creation.modules SET is_published = true WHERE id = $1`
    - Added error handling for failed publish
    - Added success response with updated module data
  - **Modified:** `/lib/dal/teacher/content.ts`
    - Added `publishModule(moduleId)` function
    - Included RLS check for teacher ownership
  - **Modified:** `/components/teacher/ModuleEditor.tsx`
    - Added loading state to [Publish] button
    - Added success toast notification
    - Added error toast with retry option
- **Database Changes:** None (schema already correct)
- **Testing:**
  - Created test module with 3 lessons
  - Clicked [Publish] button
  - Verified `is_published = true` in database
  - Verified module appears in student app
  - Verified student can access lessons
- **Verification:** ✅ E2E Module Publishing Flow passes
- **Commit:** `feat: fix module publishing API route`

---

### ✅ Fix #2: Grade Release Not Updating is_released Flag
- **Feature:** Grading - Grade Release
- **Impact:** Students see grades before teacher releases them (RLS bypass)
- **Severity:** Critical (Data privacy issue)
- **Root Cause:** Missing update to `teacher_feedback.is_released` column in release API
- **Changes Made:**
  - **Modified:** `/app/api/teacher/submissions/[id]/release/route.ts`
    - Added transaction to update both `submissions.status` and `teacher_feedback.is_released`
    - Added `released_at` timestamp
    - Added `released_by` teacher profile ID
  - **Modified:** `/lib/dal/teacher/grading.ts`
    - Added `releaseGrade(submissionId, teacherProfileId)` function
  - **Added:** `/supabase/migrations/008_fix_grade_release_rls.sql`
    - Updated RLS policy on `teacher_feedback`:
      ```sql
      CREATE POLICY "Students can only view released feedback"
      ON n8n_content_creation.teacher_feedback
      FOR SELECT
      USING (
        is_released = true
        AND submission_id IN (
          SELECT id FROM n8n_content_creation.submissions
          WHERE student_id IN (
            SELECT id FROM n8n_content_creation.students
            WHERE profile_id IN (
              SELECT id FROM n8n_content_creation.profiles
              WHERE auth_user_id = auth.uid()
            )
          )
        )
      );
      ```
- **Database Changes:**
  - Applied migration `008_fix_grade_release_rls.sql`
  - Verified RLS policy with test queries
- **Testing:**
  - Created test submission and graded it
  - Verified student cannot see grade (403 on API call)
  - Teacher clicked [Release Grade]
  - Verified `is_released = true` in database
  - Verified student can now see grade and feedback
- **Verification:** ✅ E2E Assignment with Rubric Flow passes
- **Cross-App Impact:** Student app now correctly hides unreleased grades
- **Commit:** `fix(critical): enforce grade release RLS policy`

---

## High Priority Fixes (Major Functionality)

### ✅ Fix #3: Question Bank Randomization Not Working
- **Feature:** Assessment Builder - Bank Rules
- **Impact:** All students see same questions in same order (defeats purpose)
- **Severity:** High
- **Root Cause:** Quiz snapshot generation not reading bank rules from database
- **Changes Made:**
  - **Modified:** `/lib/services/quizRandomizer.ts`
    - Fixed query to fetch `teacher_assessment_bank_rules`
    - Implemented per-student seed generation
    - Added shuffle algorithm for questions and choices
    - Added tag and difficulty filtering
  - **Modified:** `/app/api/teacher/assessments/[id]/start/route.ts`
    - Added check if snapshot already exists for student+attempt
    - Generate snapshot on first access, not on publish
    - Store snapshot in `teacher_student_quiz_snapshots`
  - **Added:** Test cases in `/lib/services/quizRandomizer.test.ts`
    - Test shuffle consistency with same seed
    - Test different seeds for different students
    - Test tag filtering
    - Test difficulty filtering
- **Database Changes:** None (schema already correct)
- **Testing:**
  - Created bank with 20 questions
  - Created quiz with rule: Pick 10, shuffle both
  - Student A started quiz → Got questions [3,7,1,9,...]
  - Student B started quiz → Got questions [12,5,18,2,...]
  - Verified different questions for each student
  - Verified same snapshot on quiz re-entry
- **Verification:** ✅ E2E Quiz with Randomization Flow passes
- **Commit:** `feat: implement question bank randomization`

---

[Continue for each high-priority fix...]

---

## Medium Priority Fixes (UX Improvements)

### ✅ Fix #4: Attendance Table Not Sorting by Name
- **Feature:** Attendance Dashboard
- **Impact:** Hard to find students in large sections
- **Severity:** Medium (UX degradation)
- **Root Cause:** Missing `ORDER BY` clause in attendance query
- **Changes Made:**
  - **Modified:** `/lib/dal/teacher/attendance.ts`
    - Added `.order('full_name', { ascending: true })` to query
  - **Modified:** `/app/teacher/attendance/page.tsx`
    - Added column header click to toggle sort direction
    - Added sort indicator icons (↑ ↓)
    - Added state management for sort column and direction
- **Testing:**
  - Loaded attendance page with 30 students
  - Verified default sort by name A-Z
  - Clicked header to toggle Z-A
  - Verified sort persists on filter changes
- **Verification:** ✅ Attendance Dashboard feature passes
- **Commit:** `improvement: add sorting to attendance table`

---

[Continue for each medium-priority fix...]

---

## Low Priority Fixes (Polish & Minor Issues)

### ✅ Fix #5: Rubric Template Card Missing Created Date
- **Feature:** Rubric Templates
- **Impact:** Can't tell which rubric is newest
- **Severity:** Low
- **Root Cause:** Component not rendering `created_at` field
- **Changes Made:**
  - **Modified:** `/components/teacher/RubricCard.tsx`
    - Added date formatting utility
    - Added "Created on [date]" text below title
    - Styled in muted gray color
- **Testing:**
  - Created 3 rubric templates on different dates
  - Verified date displays on each card
  - Verified date format matches app standard
- **Verification:** ✅ Rubric Templates feature passes
- **Commit:** `polish: show created date on rubric cards`

---

[Continue for each low-priority fix...]

---

## Fixes Summary

**By Severity:**
- Critical: 2 fixed, 0 remaining
- High: 5 fixed, 1 remaining (needs manual review)
- Medium: 8 fixed, 2 remaining
- Low: 6 fixed, 3 remaining

**By Category:**
- Authentication: 0 issues
- Content Management: 4 fixed
- Assessments: 3 fixed
- Grading: 2 fixed
- Live Sessions: 1 fixed, 1 remaining
- Communication: 2 fixed
- Attendance: 1 fixed
- AI Features: 2 fixed, 1 remaining
- UI/UX: 6 fixed, 4 remaining

**Database Migrations Created:**
1. `008_fix_grade_release_rls.sql` - RLS policy for grade release
2. `009_add_attendance_indexes.sql` - Performance indexes for attendance queries

**Total Files Modified:** 47
**Total Lines Changed:** +1,247 / -523
**Total Time:** [If tracked]
```

### 3. `teacher-remaining-issues.md`

```markdown
# Teacher Portal - Remaining Issues Requiring Manual Review

**Date:** [Current Date]

---

## Critical

*None remaining* ✅

---

## High Priority

### ⚠️ Issue #1: Live Session Video Integration Needs Provider Selection
- **Feature:** Live Session Room (`/teacher/live/[sessionId]`)
- **Current State:**
  - Basic session scheduling works
  - Session metadata saves correctly
  - No video/audio integration implemented
- **Why Manual Review:**
  - **Architectural Decision Required:** Need to choose video provider (Zoom, Google Meet, Microsoft Teams, LiveKit, Daily, custom WebRTC)
  - **Product Input Needed:** Budget, scalability requirements, feature set needed
  - **Integration Complexity:** Each provider has different SDK, pricing, features
- **Options Considered:**
  1. **Zoom SDK**
     - **Pros:** Widely known, reliable, feature-rich
     - **Cons:** Expensive, complex SDK, requires Zoom account for all users
     - **Estimated Effort:** 2-3 weeks integration
  2. **LiveKit (Open Source)**
     - **Pros:** Open source, flexible, full control, WebRTC-based
     - **Cons:** Requires self-hosting or LiveKit Cloud, more setup complexity
     - **Estimated Effort:** 3-4 weeks (includes infrastructure setup)
  3. **Daily.co**
     - **Pros:** Simple API, reasonable pricing, good for education
     - **Cons:** Less known, vendor lock-in
     - **Estimated Effort:** 1-2 weeks integration
  4. **Custom WebRTC**
     - **Pros:** Full control, no vendor lock-in
     - **Cons:** Complex to build, requires signaling server, TURN servers
     - **Estimated Effort:** 4-6 weeks
- **Recommendation:**
  - **For MVP:** Use **Daily.co** - fastest to implement, good education features, reasonable cost
  - **For Long-term:** Migrate to **LiveKit** if scalability/cost becomes issue
- **Impact if Not Fixed:**
  - Teachers cannot conduct live classes
  - Attendance auto-detection from presence won't work
  - Recording feature unavailable
- **Workaround:** Teachers can use external Zoom/Meet and manually paste join links
- **Next Steps:**
  1. Confirm budget and provider preference with stakeholders
  2. Create provider integration plan
  3. Implement chosen SDK
  4. Test with real teachers and students
  5. Document setup instructions

---

## Medium Priority

### ⚠️ Issue #2: AI Feedback Drafting Needs Prompt Tuning
- **Feature:** AI Feedback Drafting
- **Current State:**
  - API endpoint functional
  - AI generates feedback
  - Feedback is generic and not always helpful
- **Why Manual Review:**
  - **Prompt Engineering Needed:** Requires iterative testing with real teacher feedback
  - **Quality Control:** Need teacher feedback on AI output quality
  - **Context Depth:** May need to include more context (student history, rubric criteria weighting)
- **Current Prompt:**
  ```
  You are a helpful teaching assistant. Review this student submission and provide constructive feedback.

  Submission: {content}
  Score: {score}/{maxScore}
  Rubric: {rubricCriteria}
  ```
- **Improvements Needed:**
  - Add tone customization (encouraging, constructive, formal)
  - Include student's past performance context
  - Reference specific rubric criteria in feedback
  - Suggest actionable improvement steps
  - Vary feedback length based on submission complexity
- **Recommendation:**
  1. Collect sample teacher feedback (good examples)
  2. Create few-shot prompt with examples
  3. Add tone parameter to API
  4. A/B test with teachers
  5. Iterate based on feedback
- **Impact if Not Fixed:**
  - Teachers won't use AI draft feature
  - Time savings not realized
  - Feature seen as "unhelpful"
- **Workaround:** Teachers can manually write all feedback (current process)
- **Estimated Effort:** 1 week (prompt engineering + testing)

---

### ⚠️ Issue #3: Gradebook Export Lacks Formatting Options
- **Feature:** Gradebook Export to CSV/PDF
- **Current State:**
  - CSV export works
  - PDF export not implemented
  - CSV has minimal formatting
- **Why Manual Review:**
  - **Requirements Unclear:** What formatting do teachers need?
  - **PDF Library Choice:** Multiple options (jsPDF, Puppeteer, serverless PDF service)
  - **Design Needed:** PDF layout, branding, headers/footers
- **Current CSV Output:**
  ```
  Student Name,LRN,Quiz 1,Assignment 2,Exam 3,Average
  John Doe,123456,85,90,88,87.67
  Jane Smith,789012,92,95,90,92.33
  ```
- **Improvements Needed:**
  - Add school logo to PDF
  - Include teacher name, subject, section
  - Color-code grade ranges in PDF
  - Add summary statistics
  - Include date range
  - Customizable column selection
- **Recommendation:**
  1. Survey teachers on export needs
  2. Create PDF mockup
  3. Choose PDF library (suggest Puppeteer for flexibility)
  4. Implement PDF template
  5. Add export options modal (column selection, format, etc.)
- **Impact if Not Fixed:**
  - Teachers must manually format exports
  - Time-consuming for report cards
  - Unprofessional appearance for parent reports
- **Workaround:** Teachers can export CSV and format in Excel
- **Estimated Effort:** 1 week

---

## Low Priority

### ⚠️ Issue #4: Calendar View Missing Drag-to-Reschedule
- **Feature:** Calendar
- **Current State:**
  - Events display correctly
  - Month/week/day views work
  - Cannot drag events to reschedule
- **Why Manual Review:**
  - **Library Choice:** Need to evaluate calendar libraries (FullCalendar, react-big-calendar, custom)
  - **UX Complexity:** Drag-drop needs confirmation dialogs, conflict detection
  - **Permissions:** Not all events can be rescheduled (past events, locked events)
- **Recommendation:**
  - Use **FullCalendar** (most feature-complete)
  - Add drag-to-reschedule for live sessions only (not assessments, which have dependencies)
  - Add confirmation dialog on reschedule
  - Send notification to students when session rescheduled
- **Impact if Not Fixed:**
  - Teachers must delete and recreate events to reschedule
  - Slightly annoying UX, not blocking
- **Workaround:** Edit event details to change date/time
- **Estimated Effort:** 3-4 days

---

### ⚠️ Issue #5: Module Editor Missing Auto-Save
- **Feature:** Module Editor
- **Current State:**
  - Manual save works
  - No auto-save functionality
  - Risk of losing work if browser crashes
- **Why Manual Review:**
  - **Technical Decision:** Debounce interval (how often to auto-save?)
  - **UX Design:** How to indicate auto-save status (saving, saved, error)?
  - **Conflict Resolution:** What if teacher edits in two tabs?
- **Recommendation:**
  - Implement auto-save with 30-second debounce
  - Save to local draft, not publish
  - Show "Saving..." / "Saved at 3:45 PM" indicator
  - Warn on multi-tab editing
  - Add "Restore unsaved draft" on re-entry
- **Impact if Not Fixed:**
  - Teachers may lose work
  - Frustration if browser crashes
  - Not critical but would improve confidence
- **Workaround:** Teachers manually click [Save Draft] frequently
- **Estimated Effort:** 2-3 days

---

### ⚠️ Issue #6: Discussion Threads Missing Real-Time Updates
- **Feature:** Discussion Threads
- **Current State:**
  - Posts display correctly
  - New posts require page refresh to see
  - No real-time updates
- **Why Manual Review:**
  - **Technical Decision:** WebSocket vs polling vs Supabase Realtime
  - **Scalability:** Real-time can be resource-intensive
  - **Complexity:** May require infrastructure changes
- **Recommendation:**
  - Use **Supabase Realtime subscriptions** (already have Supabase)
  - Subscribe to `teacher_discussion_posts` table
  - Update UI when new post detected
  - Add "New messages" banner with scroll-to option
  - Limit subscriptions to active thread only (not all threads)
- **Impact if Not Fixed:**
  - Slightly annoying for active discussions
  - Teachers must refresh page
  - Not critical for async discussions
- **Workaround:** Manual refresh or poll every 30 seconds
- **Estimated Effort:** 2 days

---

## Recommendations

### Architectural Improvements
1. **Implement Comprehensive Error Boundaries:** Add error boundaries to each major route to catch and display user-friendly errors
2. **Add Request Caching Layer:** Use React Query or SWR for better data fetching and caching
3. **Optimize Bundle Size:** Code-split heavy components (ModuleEditor, GradingInbox)
4. **Add Performance Monitoring:** Integrate Vercel Analytics or similar
5. **Implement Offline Mode:** Use service workers for basic offline functionality

### Code Quality
1. **Add Unit Tests:** Coverage for DAL functions, utility functions, quiz randomizer
2. **Add Integration Tests:** Test critical API routes (publish, grade, release)
3. **Add E2E Tests:** Playwright tests for critical flows (see Phase 1 scenarios)
4. **TypeScript Strict Mode:** Enable and fix all type errors
5. **ESLint Rules:** Add stricter rules for consistency

### Security
1. **Add Rate Limiting:** Protect API routes from abuse
2. **Add CSRF Protection:** Implement CSRF tokens for state-changing operations
3. **Audit RLS Policies:** Third-party security audit recommended
4. **Add Audit Logging:** Log all grade changes, releases, publishes
5. **Implement 2FA:** For teacher accounts (optional but recommended)

### Documentation
1. **Add Inline Code Comments:** For complex logic (quiz randomizer, rubric calculator)
2. **Generate API Docs:** Use Swagger/OpenAPI for API routes
3. **Create Teacher User Guide:** Step-by-step guides for each feature
4. **Create Video Tutorials:** Screen recordings for complex workflows
5. **Add Developer Onboarding:** README for new developers joining project

### Future Features (Not in Current Scope)
1. **Bulk Grading:** Grade multiple submissions at once
2. **Grade Curves:** Apply curves to assessment scores
3. **Peer Review:** Student-to-student feedback feature
4. **Plagiarism Detection:** Integration with Turnitin or similar
5. **Analytics Dashboard:** Insights on student performance trends
6. **Mobile App:** Native iOS/Android teacher app
7. **Offline Grading:** Download submissions, grade offline, sync later
8. **Voice-to-Text:** Speak feedback instead of typing

---

## Prioritization Matrix

**Fix Now (Before Launch):**
- None (all critical fixed)

**Fix in First Update (Week 1-2 Post-Launch):**
- Live Session Video Integration
- AI Feedback Prompt Tuning
- Gradebook PDF Export

**Fix in Second Update (Month 1-2 Post-Launch):**
- Module Editor Auto-Save
- Calendar Drag-to-Reschedule
- Discussion Real-Time Updates

**Backlog (Future):**
- All architectural improvements
- All future features
- All documentation enhancements
```

---

## Execution Instructions for Claude Code

### Step 1: Setup
1. Navigate to teacher-app directory
2. Verify development server is running (or start it)
3. Verify Playwright MCP is available
4. Review CLAUDE.md thoroughly
5. Prepare test data (create test accounts, seed data if needed)

### Step 2: Execute Phase 1 - Systematic Testing
1. Start with Authentication & Role Management
2. For each feature:
   - Navigate using Playwright browser tools
   - Verify data loads (use browser_snapshot to inspect)
   - Check console for errors (use browser_console_messages)
   - Test interactions (buttons, forms, links)
   - Validate against CLAUDE.md specs
   - Document findings in real-time
3. Mark each feature as ✅ PASS or ❌ ISSUE
4. For issues, immediately proceed to Phase 2

### Step 3: Execute Phase 2 - Fix Issues
1. For each issue identified:
   - Categorize severity (Critical, High, Medium, Low)
   - Determine agent type (Auth, Content, Assessment, etc.)
   - Use TodoWrite to create fix task
   - Spawn appropriate agent via Task tool
   - Agent reads CLAUDE.md, analyzes code, implements fix
   - Verify fix with Playwright re-test
   - Document resolution
2. Mark issue as ✅ FIXED or ⚠️ NEEDS MANUAL REVIEW

### Step 4: Execute E2E Flow Tests
1. Test all 5 critical flows defined in Phase 2
2. Verify cross-app integration (teacher ↔ student)
3. Verify database state after each flow
4. Document any flow-level issues

### Step 5: Generate Phase 3 Deliverables
1. Create `teacher-audit-report.md` with all findings
2. Create `teacher-fixes-implemented.md` with all fixes
3. Create `teacher-remaining-issues.md` with manual review items
4. Include statistics, summaries, recommendations

### Step 6: Final Summary
Provide concise summary:
- Total features tested
- Total issues found
- Total issues fixed
- Issues needing manual review
- Confidence level for launch (Ready / Needs Work / Blockers)
- Estimated time to resolve remaining issues

---

## Success Criteria

- ✅ All 31 teacher features tested
- ✅ All Critical issues fixed
- ✅ All High-priority issues fixed or documented
- ✅ All 5 E2E flows pass
- ✅ No RLS policy gaps
- ✅ No schema prefix violations (all tables in `n8n_content_creation`)
- ✅ Student app not broken by teacher app changes
- ✅ All deliverable files generated
- ✅ Clean console (no errors)
- ✅ Accessible (keyboard nav, screen readers)
- ✅ Responsive (mobile/tablet/desktop)

---

## Notes for Claude Code

### Conservative Approach
- If a fix might have unintended consequences → Document for manual review
- If architectural decision needed → Document options and ask
- If cross-app impact unclear → Test student app too

### Pattern Consistency
- All fixes must follow existing patterns in codebase
- Match student app branding (colors, fonts, icons, spacing)
- Reuse shared components where possible
- Follow CLAUDE.md specs exactly

### Testing Rigor
- Re-run Playwright tests after each fix
- Test related features (don't break something else)
- Test as different roles (teacher, student, admin if exists)
- Verify database state with SQL queries

### Documentation Quality
- Every fix needs clear rationale
- Link to CLAUDE.md section for reference
- Include before/after for UI changes
- List all files modified with descriptions

### Git Workflow (if enabled)
- Meaningful commit messages following convention
- One fix per commit (atomic commits)
- Reference issue numbers if using issue tracker

---

**End of Teacher Testing Protocol**

This protocol ensures comprehensive, systematic testing and fixing of all teacher portal features while maintaining quality, security, and consistency with project specifications.
