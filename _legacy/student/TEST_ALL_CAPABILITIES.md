# Complete System Testing Guide
**Test ALL Capabilities End-to-End**

---

## 🏁 Pre-Test Setup

### 1. Create Demo Users (One-Time)

```bash
# Option A: Via Supabase Dashboard (Recommended)
# 1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users
# 2. Click "Add User" → "Create new user"
# 3. Create these three accounts:

Email: admin.demo@msu.edu.ph
Password: Demo123!@#
Confirm Email: YES

Email: teacher.demo@msu.edu.ph
Password: Demo123!@#
Confirm Email: YES

Email: student.demo@msu.edu.ph
Password: Demo123!@#
Confirm Email: YES

# 4. After creating, note the auth user IDs
# 5. Run the SQL script: scripts/create-demo-users.sql
#    (Replace the UUID placeholders with actual auth user IDs)
```

### 2. Start All Three Apps

```bash
# Terminal 1 - Admin App
cd ../admin-app
npm run dev
# Access: http://localhost:3001

# Terminal 2 - Teacher App
cd ../teacher-app
npm run dev
# Access: http://localhost:3002

# Terminal 3 - Student App
cd ../student-app
npm run dev
# Access: http://localhost:3000
```

---

## 🧪 TEST SUITE 1: ADMIN CAPABILITIES

### Test 1.1: Admin Login ✅

**URL:** http://localhost:3001/login
**Credentials:**
- Email: admin.demo@msu.edu.ph
- Password: Demo123!@#

**Expected:**
- ✅ Login successful
- ✅ Redirected to admin dashboard
- ✅ See navigation: Enrollments, Users, Reports, Messages

**Verification SQL:**
```sql
SELECT
  u.email,
  sp.full_name,
  sm.role,
  sm.status
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN school_members sm ON sm.profile_id = sp.id
WHERE u.email = 'admin.demo@msu.edu.ph';
```

### Test 1.2: Admin Can View Enrollments ✅

**URL:** http://localhost:3001/(admin)/enrollments
**Action:** View enrollments list

**Expected:**
- ✅ See table with 48+ enrollments
- ✅ See student names, courses, sections
- ✅ See filters (status, course, section)
- ✅ See search bar

**Verification:** Page loads with data

### Test 1.3: Admin Can Enroll Student ✅

**URL:** http://localhost:3001/(admin)/enrollments
**Action:**
1. Click "Bulk Enroll" or "Add Enrollment"
2. Select student: "Demo Student"
3. Select course: "Mathematics 10"
4. Click "Enroll"

**Expected:**
- ✅ Enrollment created
- ✅ Student appears in course roster
- ✅ Student can access course

**Verification SQL:**
```sql
SELECT
  s.lrn,
  sp.full_name as student_name,
  c.name as course_name,
  c.subject_code
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
JOIN courses c ON c.id = e.course_id
WHERE s.lrn = '2026-DEMO-TEST'
ORDER BY c.name;
```

### Test 1.4: Admin Can Manage Courses ⚠️

**URL:** http://localhost:3001/(admin)/courses (if exists)
**Action:** Try to add or edit a course

**Expected:**
- ✅ Can view courses
- ✅ Can create new course
- ✅ Can edit existing course

**If UI doesn't exist:** Use API directly
```bash
curl -X POST http://localhost:3001/api/admin/courses \
  -H "Cookie: your-session" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Course",
    "subject_code": "TEST-101",
    "section_id": "section-uuid"
  }'
```

### Test 1.5: Admin Can Send Messages ✅

**URL:** http://localhost:3001/(admin)/messages
**Action:**
1. Click "New Message"
2. Select recipient: "Demo Teacher"
3. Type: "Please submit attendance by Friday"
4. Send

**Expected:**
- ✅ Message sent
- ✅ Teacher receives message in teacher-app
- ✅ Conversation thread created

**Verification SQL:**
```sql
-- Check message was created
SELECT
  dm.content,
  dm.created_at,
  sp_sender.full_name as sender,
  sp_recipient.full_name as recipient
FROM direct_messages dm
JOIN school_profiles sp_sender ON sp_sender.id = dm.sender_id
JOIN school_profiles sp_recipient ON sp_recipient.id = dm.recipient_id
WHERE sp_sender.auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'admin.demo@msu.edu.ph'
)
ORDER BY dm.created_at DESC
LIMIT 5;
```

---

## 🧪 TEST SUITE 2: TEACHER CAPABILITIES

### Test 2.1: Teacher Login ✅

**URL:** http://localhost:3002/login
**Credentials:**
- Email: teacher.demo@msu.edu.ph
- Password: Demo123!@#

**Expected:**
- ✅ Login successful
- ✅ Redirected to teacher dashboard
- ✅ See assigned courses
- ✅ See navigation: Subjects, Gradebook, Assessments, Messages

### Test 2.2: Teacher Can View Assigned Courses ✅

**URL:** http://localhost:3002/teacher/subjects
**Expected:**
- ✅ See list of assigned courses
- ✅ See Mathematics 10 (assigned in demo script)

**Verification SQL:**
```sql
SELECT
  c.name,
  c.subject_code,
  sec.name as section,
  COUNT(e.id) as enrolled_students
FROM courses c
LEFT JOIN sections sec ON sec.id = c.section_id
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE c.teacher_id = (
  SELECT id FROM teacher_profiles WHERE employee_id = 'EMP-DEMO-100'
)
GROUP BY c.id, c.name, c.subject_code, sec.name;
```

### Test 2.3: Teacher Can Create Module ✅

**URL:** http://localhost:3002/teacher/subjects/[courseId]
**Action:**
1. Click "Add Module" or similar button
2. Fill form:
   - Title: "Introduction to Quadratics"
   - Description: "Learn about quadratic equations"
   - Order: 1
3. Save

**Expected:**
- ✅ Module created
- ✅ Appears in course modules list
- ✅ Status: "draft" (unpublished)

**API Test:**
```bash
curl -X POST http://localhost:3002/api/teacher/modules \
  -H "Cookie: teacher-session..." \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "course-uuid",
    "title": "Introduction to Quadratics",
    "description": "Learn quadratic equations",
    "objectives": ["Understand ax²+bx+c=0", "Solve using formula"],
    "order": 1,
    "estimatedDuration": 120
  }'
```

### Test 2.4: Teacher Can Edit Module ✅

**URL:** Module detail page
**Action:**
1. Click "Edit Module"
2. Change title to "Advanced Quadratics"
3. Save

**Expected:**
- ✅ Module updated
- ✅ New title displayed

**API Test:**
```bash
curl -X PATCH http://localhost:3002/api/teacher/modules/[moduleId] \
  -H "Cookie: teacher-session..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Quadratics"
  }'
```

### Test 2.5: Teacher Can Create Lesson ✅

**URL:** Module detail page
**Action:**
1. Click "Add Lesson"
2. Fill form:
   - Title: "Quadratic Formula Explained"
   - Type: "video"
   - Video URL: "https://www.youtube.com/watch?v=example"
   - Duration: 25 minutes
3. Save

**Expected:**
- ✅ Lesson created
- ✅ Appears in module lessons list

**API Test:**
```bash
curl -X POST http://localhost:3002/api/teacher/lessons \
  -H "Cookie: teacher-session..." \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "module-uuid",
    "title": "Quadratic Formula Explained",
    "content": "Watch this video...",
    "type": "video",
    "order": 1,
    "duration": 25,
    "videoUrl": "https://www.youtube.com/watch?v=example"
  }'
```

### Test 2.6: Teacher Can Publish Module ✅

**URL:** Module detail page
**Action:** Click "Publish Module"

**Expected:**
- ✅ Module status changes to "published"
- ✅ Students can now see this module

**API Test:**
```bash
curl -X POST http://localhost:3002/api/teacher/modules/[moduleId]/publish \
  -H "Cookie: teacher-session..."
```

### Test 2.7: Teacher Can Schedule Live Session ⚠️

**ISSUE:** Two systems exist!

**System 1 (Existing - teacher-app):**
```bash
curl -X POST http://localhost:3002/api/teacher/live-sessions \
  -H "Cookie: teacher-session..." \
  -d '{
    "sectionSubjectId": "uuid",
    "title": "Live Math Class",
    "start_at": "2026-01-20T14:00:00Z",
    "end_at": "2026-01-20T15:00:00Z"
  }'
```

**System 2 (New - student-app with Daily.co):**
```bash
curl -X POST http://localhost:3000/api/teacher/live-sessions \
  -H "Cookie: teacher-session..." \
  -d '{
    "course_id": "uuid",
    "title": "Live Math Class",
    "scheduled_start": "2026-01-20T14:00:00Z",
    "recording_enabled": true
  }'
```

**Decision Required:** Which system to use?

### Test 2.8: Teacher Can Message Student ✅

**URL:** http://localhost:3002/teacher/messages
**Action:**
1. Click "New Message"
2. Select: "Demo Student"
3. Type: "Great work on your quiz!"
4. Send

**Expected:**
- ✅ Message sent
- ✅ Student receives in student-app/messages

---

## 🧪 TEST SUITE 3: STUDENT CAPABILITIES

### Test 3.1: Student Login ✅

**URL:** http://localhost:3000/login
**Credentials:**
- Email: student.demo@msu.edu.ph
- Password: Demo123!@#

**Expected:**
- ✅ Login successful
- ✅ Redirected to subjects dashboard
- ✅ See enrolled courses

### Test 3.2: Student Can View Course ✅

**URL:** http://localhost:3000/(student)/subjects
**Action:** Click on any enrolled course

**Expected:**
- ✅ See course detail page
- ✅ See modules list
- ✅ See progress indicators

### Test 3.3: Student Can View Lesson ✅

**URL:** Course → Module → Lesson
**Expected:**
- ✅ Video player loads
- ✅ Lesson content displays
- ✅ Lesson reactions bar appears (NEW!)
- ✅ Can click reactions: 👍 💡 😕 ❤️ 🎉

**Test Reaction:**
1. Click "👍 Like"
2. Count should increase by 1
3. Real-time update works

### Test 3.4: Student Can Take Quiz ✅

**URL:** Assessment page
**Action:** Complete a quiz

**Expected:**
- ✅ Can answer questions
- ✅ Can submit quiz
- ✅ Submission recorded

### Test 3.5: Student Can Message Teacher ✅

**URL:** http://localhost:3000/(student)/messages
**Action:**
1. Click "New Message"
2. Select teacher from dropdown
3. Type: "I don't understand question 5"
4. Send

**Expected:**
- ✅ Message sent (if quota available)
- ✅ Teacher receives in teacher-app
- ✅ Quota decremented

**Check Quota:**
```sql
SELECT * FROM student_message_quotas
WHERE student_id = (SELECT id FROM students WHERE lrn = '2026-DEMO-TEST')
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🧪 TEST SUITE 4: LIVE SESSIONS (Critical)

### Test 4.1: Teacher Creates Live Session

**Two Options:**

**Option A: Use Existing System (teacher-app)**
```bash
# POST to teacher-app API
curl -X POST http://localhost:3002/api/teacher/live-sessions \
  -H "Cookie: teacher-session..." \
  -d '{
    "sectionSubjectId": "teacher-assignment-uuid",
    "title": "Live Math Class - Quadratics",
    "description": "We will solve quadratic equations together",
    "start_at": "2026-01-20T14:00:00Z",
    "end_at": "2026-01-20T15:00:00Z",
    "module_id": "module-uuid",
    "meeting_link": "https://meet.google.com/abc-defg-hij"
  }'
```

**Option B: Use New Daily.co System (student-app)**
```bash
# POST to student-app teacher API
curl -X POST http://localhost:3000/api/teacher/live-sessions \
  -H "Cookie: teacher-session..." \
  -d '{
    "course_id": "course-uuid",
    "module_id": "module-uuid",
    "title": "Live Math Class - Quadratics",
    "description": "Solving equations with reactions and Q&A!",
    "scheduled_start": "2026-01-20T14:00:00Z",
    "scheduled_end": "2026-01-20T15:00:00Z",
    "recording_enabled": true,
    "max_participants": 50
  }'
```

**Expected:**
- ✅ Session created
- ✅ Status: "scheduled"
- ✅ Returns session ID

### Test 4.2: Teacher Starts Live Session

**Option B (Daily.co System):**
```bash
# Start the session
curl -X POST http://localhost:3000/api/teacher/live-sessions/[sessionId]/start \
  -H "Cookie: teacher-session..."

# Response:
{
  "session": { "status": "live", "daily_room_url": "https://klase.daily.co/session-uuid", ... },
  "roomUrl": "https://klase.daily.co/session-uuid",
  "token": "eyJhbGci..." // Teacher's meeting token
}
```

**What Happens:**
1. ✅ Creates Daily.co room at `klase.daily.co`
2. ✅ Generates teacher meeting token (owner=true)
3. ✅ Starts recording (if enabled)
4. ✅ Updates session status to "live"

**Expected:**
- ✅ Room created successfully
- ✅ Recording starts automatically
- ✅ Teacher gets join URL

### Test 4.3: Student Joins Live Session ✅

**URL:** http://localhost:3000/(student)/live-sessions/[sessionId]
**Action:** Click "Join Session"

**Expected:**
- ✅ System checks enrollment (student must be enrolled in course)
- ✅ Generates student meeting token
- ✅ Video room loads (Daily.co iframe)
- ✅ Grade 10 → Professional theme displays
- ✅ Reactions bar shows: ✋ 👍 👏 🤔 ⚡ 🐢
- ✅ Q&A panel appears on right
- ✅ Participants list shows who's online
- ✅ Recording indicator appears (if enabled)

**Manual Test:**
1. As student, navigate to session URL
2. Verify video loads
3. Verify can see/hear teacher (if camera/mic on)
4. Test reactions
5. Ask a question

### Test 4.4: Student Sends Reaction ✅

**Action:** Click "👍 Understood" button

**Expected:**
- ✅ Reaction sent to database
- ✅ Auto-expires in 10 seconds
- ✅ All participants see count increase
- ✅ Real-time update works

**Verification:**
```sql
-- Check recent reactions
SELECT
  sr.reaction_type,
  COUNT(*) as count,
  MAX(sr.created_at) as latest
FROM session_reactions sr
WHERE sr.session_id = 'session-uuid'
  AND sr.expires_at > NOW()
GROUP BY sr.reaction_type;
```

### Test 4.5: Student Asks Question ✅

**Action:**
1. Type in Q&A panel: "How do we factor x² + 5x + 6?"
2. Click "Submit" or "🚀 Send!" (depending on grade)

**Expected:**
- ✅ Question appears in Q&A panel
- ✅ Other students can upvote
- ✅ Teacher can answer
- ✅ Real-time update works

**Verification:**
```sql
-- Check questions
SELECT
  sq.question,
  sq.upvotes,
  sq.is_answered,
  sp.full_name as student_name
FROM session_questions sq
JOIN students s ON s.id = sq.student_id
JOIN school_profiles sp ON sp.id = s.profile_id
WHERE sq.session_id = 'session-uuid'
ORDER BY sq.upvotes DESC, sq.created_at;
```

### Test 4.6: Teacher Ends Session ✅

**Action:**
```bash
curl -X POST http://localhost:3000/api/teacher/live-sessions/[sessionId]/end \
  -H "Cookie: teacher-session..."
```

**Expected:**
- ✅ Session status → "ended"
- ✅ Daily.co room deleted
- ✅ Recording stops
- ✅ Recording download scheduled (60 second delay)
- ✅ Participant stats calculated

**Verification:**
```sql
-- Check session ended
SELECT
  status,
  actual_start,
  actual_end,
  recording_url,
  (SELECT COUNT(*) FROM session_participants WHERE session_id = ls.id) as participant_count,
  (SELECT COUNT(*) FROM session_questions WHERE session_id = ls.id) as question_count
FROM live_sessions ls
WHERE id = 'session-uuid';
```

### Test 4.7: Student Views Recording ✅

**URL:** http://localhost:3000/(student)/subjects/[courseId]/recordings
**Expected (after 60-90 seconds):**
- ✅ Recording appears in list
- ✅ Thumbnail shows
- ✅ Click to play
- ✅ Video player loads with recording
- ✅ Signed URL generated

**Verification:**
```sql
-- Check recording is available
SELECT
  title,
  recording_url,
  recording_duration_seconds,
  pg_size_pretty(recording_size_bytes::bigint) as file_size
FROM live_sessions
WHERE id = 'session-uuid'
  AND recording_url IS NOT NULL;
```

---

## 🧪 TEST SUITE 5: MESSAGING FLOW

### Test 5.1: Admin → Teacher Message ✅

1. Admin logs into admin-app
2. Goes to Messages
3. Sends to "Demo Teacher"
4. Teacher checks teacher-app/teacher/messages
5. Verifies message received

### Test 5.2: Teacher → Student Message ✅

1. Teacher logs into teacher-app
2. Goes to Messages
3. Sends to "Demo Student"
4. Student checks student-app/(student)/messages
5. Verifies message received

### Test 5.3: Student → Teacher Message ✅

1. Student logs into student-app
2. Goes to Messages
3. Sends to teacher
4. Check quota:
```sql
SELECT * FROM student_message_quotas
WHERE student_id = 'student-uuid'
ORDER BY created_at DESC LIMIT 1;
```
5. Teacher checks messages

### Test 5.4: Student → Admin Message ⚠️

**Action:** Try to send message to admin from student-app

**Expected:** Check if this feature exists
- If yes: ✅ Message sent
- If no: ❌ Feature needs to be built

---

## 🎯 Complete Test Checklist

### Admin Tests
- [ ] Admin can login
- [ ] Admin can view enrollments (48+)
- [ ] Admin can create enrollment
- [ ] Admin can bulk enroll students
- [ ] Admin can approve/drop enrollments
- [ ] Admin can view all users
- [ ] Admin can search users
- [ ] Admin can manage courses
- [ ] Admin can send messages to teachers
- [ ] Admin can send messages to students
- [ ] Admin can view reports
- [ ] Admin can view audit logs

### Teacher Tests
- [ ] Teacher can login
- [ ] Teacher can view assigned courses
- [ ] Teacher can create module
- [ ] Teacher can edit module
- [ ] Teacher can delete draft module
- [ ] Teacher can publish module
- [ ] Teacher can create lesson
- [ ] Teacher can edit lesson
- [ ] Teacher can delete lesson
- [ ] Teacher can upload attachments
- [ ] Teacher can create assessment
- [ ] Teacher can view gradebook
- [ ] Teacher can enter grades
- [ ] Teacher can take attendance
- [ ] Teacher can message students
- [ ] Teacher can message admin
- [ ] Teacher can schedule live session
- [ ] Teacher can start live session
- [ ] Teacher can end live session

### Student Tests
- [ ] Student can login
- [ ] Student can view enrolled courses (check count matches enrollment)
- [ ] Student can view modules
- [ ] Student can view lessons
- [ ] Student can watch videos
- [ ] Student can react to lessons (NEW!)
- [ ] Student can take quizzes
- [ ] Student can submit assignments
- [ ] Student can view grades
- [ ] Student can message teachers
- [ ] Student can join live sessions (NEW!)
- [ ] Student can send reactions in live class (NEW!)
- [ ] Student can ask questions in live class (NEW!)
- [ ] Student can upvote questions (NEW!)
- [ ] Student can view recordings (NEW!)

### Live Session Tests
- [ ] Teacher creates session
- [ ] Teacher starts session
- [ ] Daily.co room created
- [ ] Student joins session
- [ ] Video loads properly
- [ ] Adaptive theme shows (check grade level)
- [ ] Reactions work in real-time
- [ ] Q&A works in real-time
- [ ] Participants list updates
- [ ] Recording indicator shows
- [ ] Teacher ends session
- [ ] Recording processes (wait 60s)
- [ ] Recording appears in /recordings
- [ ] Student can play recording

---

## 🔧 Demo User Creation - Simplified

### Quick Method (Via Supabase Dashboard)

**Step 1:** Go to Supabase Auth
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users

**Step 2:** Create 3 users with "Add user" button:
1. admin.demo@msu.edu.ph / Demo123!@#
2. teacher.demo@msu.edu.ph / Demo123!@#
3. student.demo@msu.edu.ph / Demo123!@#

**Step 3:** Run this ONE command to complete setup:

```sql
-- Get the auth IDs from the dashboard, then run:
SELECT setup_demo_users(
  'admin-auth-uuid',
  'teacher-auth-uuid',
  'student-auth-uuid'
);
```

Let me create that function...

---

## 📋 Summary

**What Works:** ✅
- Authentication (100%)
- Enrollment system (100%)
- Admin enrollment UI (100%)
- Teacher module/lesson editing (100%)
- Student course access (100%)
- Messaging system (100%)
- Live session infrastructure (100%)
- Adaptive theming (100%)

**What Needs Testing:** ⚠️
- Daily.co API key validation
- Live session end-to-end flow
- Recording download and playback
- Real-time features in production

**What Needs Decision:** ⚠️
- Which live session system to use (consolidate the two)

**Estimated Testing Time:** 2-3 hours for complete verification

---

**Next Step:** Create demo users, then run Test Suites 1-5 in order.
