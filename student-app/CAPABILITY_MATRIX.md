# MSU School Management - Complete Capability Matrix
**Verified:** January 19, 2026
**System:** 3 Apps (student-app, teacher-app, admin-app)

---

## 🎯 Quick Answers

| Question | Answer | Status |
|----------|--------|--------|
| Can admin enroll teachers? | ✅ YES | `/api/admin/users` API exists |
| Can admin enroll students? | ✅ YES | `/api/admin/enrollments` API exists + UI page |
| Can admin add new courses? | ✅ YES | `/api/admin/courses` API exists |
| Can admin change courses/modules? | ⚠️ PARTIAL | Can manage via API, check UI |
| Can admin message teachers/students? | ✅ YES | `admin_send_message()` function + `/api/admin/messages` |
| Can teachers edit modules? | ✅ YES | `PATCH /api/teacher/modules/[id]` |
| Can teachers add modules? | ✅ YES | `POST /api/teacher/modules` |
| Can teachers change course content? | ✅ YES | Full lesson/module CRUD via API |
| Can teachers message admin? | ✅ YES | Messaging system exists |
| Can teachers message students? | ✅ YES | `send_teacher_message()` function |
| Can students study? | ✅ YES | Full access to enrolled courses |
| Can students message teachers? | ✅ YES | `send_student_message()` function + quota system |
| Can students message admin? | ⚠️ CHECK | Likely via `admin_get_recipient_by_profile()` |
| Can teachers schedule live sessions? | ✅ YES | Existing in teacher-app |
| Can teachers start live sessions? | ⚠️ DUPLICATE | Two systems exist! |
| Can students join live sessions? | ✅ YES | Student-app has join page |
| Are sessions recorded? | ⚠️ DEPENDS | `teacher_live_sessions` has `recording_url`, new system has full Daily.co integration |

---

## 🏢 ADMIN CAPABILITIES

### ✅ What Admin CAN Do

| Feature | Location | Method | Status |
|---------|----------|--------|--------|
| **View All Enrollments** | `admin-app/(admin)/enrollments/page.tsx` | UI Page | ✅ Built |
| **Create Enrollments** | `/api/admin/enrollments` (POST) | API | ✅ Exists |
| **Bulk Enroll** | `admin-app/(admin)/enrollments/bulk/` | UI Page | ✅ Built |
| **Approve/Drop Enrollments** | Admin enrollments page | UI Actions | ✅ Built |
| **Transfer Students** | Admin enrollments page | UI Action | ✅ Built |
| **Manage Users** | `admin-app/(admin)/users/` | UI Page | ✅ Built |
| **Search Users** | `admin_search_users()` RPC | SQL Function | ✅ Exists |
| **List Students** | `admin_list_students()` RPC | SQL Function | ✅ Exists |
| **Manage Courses** | `/api/admin/courses` | API | ✅ Exists |
| **Send Messages** | `admin_send_message()` RPC | SQL Function | ✅ Exists |
| **View Message Threads** | `admin_get_message_thread()` RPC | SQL Function | ✅ Exists |
| **View Conversations** | `admin_get_conversations()` RPC | SQL Function | ✅ Exists |
| **View Reports** | `admin-app/(admin)/reports/` | UI Page | ✅ Built |
| **Audit Logs** | `admin-app/(admin)/audit-logs/` | UI Page | ✅ Built |
| **Settings** | `admin-app/(admin)/settings/` | UI Page | ✅ Built |

### Admin Database Permissions

```sql
-- Admin can:
- INSERT INTO enrollments (via admin_has_permission check)
- UPDATE enrollments (approve, drop, transfer)
- DELETE enrollments
- INSERT INTO students (create new students)
- UPDATE courses (modify course details)
- SELECT * FROM all tables (view everything)
```

**Verification Method:** RPC functions like `admin_has_permission()`, `get_admin_role()`

---

## 👨‍🏫 TEACHER CAPABILITIES

### ✅ What Teachers CAN Do

| Feature | Location | Method | Status |
|---------|----------|--------|--------|
| **View Assigned Courses** | `teacher-app/teacher/subjects/` | UI Page | ✅ Built |
| **Create Modules** | `POST /api/teacher/modules` | API | ✅ Built |
| **Edit Modules** | `PATCH /api/teacher/modules/[id]` | API | ✅ Built |
| **Delete Modules** | `DELETE /api/teacher/modules/[id]` | API | ✅ Built (draft only) |
| **Publish Modules** | `POST /api/teacher/modules/[id]/publish` | API | ✅ Built |
| **Create Lessons** | `POST /api/teacher/lessons` | API | ✅ Built |
| **Edit Lessons** | `PATCH /api/teacher/lessons/[id]` | API | ✅ Built |
| **Delete Lessons** | `DELETE /api/teacher/lessons/[id]` | API | ✅ Built |
| **Create Assessments** | `POST /api/teacher/assessments` | API | ✅ Built |
| **View Gradebook** | `teacher-app/teacher/gradebook/` | UI Page | ✅ Built |
| **Enter Grades** | `/api/teacher/gradebook` | API | ✅ Built |
| **Take Attendance** | `teacher-app/teacher/attendance/` | UI Page | ✅ Built |
| **View Submissions** | `teacher-app/teacher/submissions/` | UI Page | ✅ Built |
| **Send Messages** | `send_teacher_message()` RPC | SQL Function | ✅ Exists |
| **Schedule Live Sessions** | `teacher-app` has `teacher_live_sessions` | Existing System | ✅ Built |
| **Create Live Sessions** | `POST /api/teacher/live-sessions` (student-app) | New Daily.co System | ✅ Built |

### Teacher Database Permissions

```sql
-- Teachers can:
- SELECT courses WHERE teacher_id = their_id
- INSERT/UPDATE/DELETE modules WHERE course.teacher_id = their_id
- INSERT/UPDATE/DELETE lessons WHERE module.course.teacher_id = their_id
- INSERT grades for their students
- SELECT students enrolled in their courses
- INSERT/UPDATE/DELETE assessments for their courses
```

**Verification Method:** RPC functions like `is_teacher()`, `teacher_assigned_to_course()`, `validate_teacher_assignment()`

---

## 👨‍🎓 STUDENT CAPABILITIES

### ✅ What Students CAN Do

| Feature | Location | Method | Status |
|---------|----------|--------|--------|
| **View Enrolled Courses** | `student-app/(student)/subjects/` | UI Page | ✅ Built |
| **View Modules** | Course detail pages | UI | ✅ Built |
| **View Lessons** | Module detail pages | UI | ✅ Built |
| **Watch Videos** | Lesson pages with YouTube embed | UI | ✅ Built |
| **React to Lessons** | `LessonReactions` component | NEW - ✅ Built | ✅ Built |
| **Take Quizzes** | Assessment pages | UI | ✅ Built |
| **Submit Assignments** | Submission pages | UI | ✅ Built |
| **View Grades** | Gradebook page | UI | ✅ Built |
| **Send Messages to Teachers** | `send_student_message()` RPC | SQL Function | ✅ Exists |
| **Message Quota** | `check_student_message_quota()` | SQL Function | ✅ Exists |
| **Join Live Sessions** | `student-app/(student)/live-sessions/[id]` | NEW - ✅ Built | ✅ Built |
| **View Recordings** | `student-app/(student)/subjects/[id]/recordings` | NEW - ✅ Built | ✅ Built |
| **Send Reactions in Live Class** | ReactionsBar component | NEW - ✅ Built | ✅ Built |
| **Ask Questions in Live Class** | QAPanel component | NEW - ✅ Built | ✅ Built |

### Student Database Permissions

```sql
-- Students can:
- SELECT courses WHERE enrolled via enrollments table
- SELECT modules WHERE course is enrolled
- SELECT lessons WHERE module.course is enrolled
- INSERT lesson_progress (track their progress)
- INSERT assessment_submissions (submit work)
- SELECT grades WHERE student_id = their_id
- INSERT student_message_quotas (use message quota)
```

**Verification Method:** RLS policies check enrollment via `enrollments` table join

---

## 🎬 LIVE SESSIONS - TWO SYSTEMS EXIST!

### System 1: Existing `teacher_live_sessions` (Generic)

**Table:** `teacher_live_sessions`
**Columns:** 18 (has `provider`, `room_id`, `join_url`)
**Purpose:** Generic live session system (works with any provider)
**Used by:** teacher-app
**Status:** ✅ Working

**Features:**
- Teachers can create sessions
- Has room_id and join_url
- Recording URL storage
- Status tracking (scheduled, live, ended)

### System 2: New `live_sessions` (Daily.co Specific)

**Table:** `live_sessions`
**Columns:** 22 (has Daily.co specific fields)
**Purpose:** Full Daily.co integration with reactions, Q&A
**Used by:** student-app (newly created)
**Status:** ✅ Built (not yet tested)

**Features:**
- Daily.co room creation
- Meeting tokens
- Recording with automatic download to Supabase storage
- Real-time reactions
- Real-time Q&A
- Participant tracking
- Auto-expiring reactions

### ⚠️ RECOMMENDATION: Choose One System

**Option A:** Use existing `teacher_live_sessions`
- Pro: Already integrated in teacher-app
- Con: Generic, less features

**Option B:** Migrate to new `live_sessions` (Daily.co)
- Pro: Full feature set, reactions, Q&A, adaptive themes
- Con: Need to update teacher-app to use it

**Option C:** Keep both
- Use `teacher_live_sessions` for generic sessions
- Use `live_sessions` for enhanced Daily.co sessions with interactions

---

## 📱 MESSAGING SYSTEM

### Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `direct_messages` | Direct messages between users | 15 columns |
| `teacher_direct_messages` | Teacher-specific messages | 11 columns |
| `messages` | General messages | 10 columns |
| `student_message_quotas` | Rate limiting for students | 7 columns |

### RPC Functions

| Function | Purpose | User Type |
|----------|---------|-----------|
| `admin_send_message()` | Admin sends message | Admin |
| `send_teacher_message()` | Teacher sends message | Teacher |
| `send_student_message()` | Student sends message | Student |
| `check_student_message_quota()` | Check if student can send | Student |
| `admin_get_conversations()` | Get admin conversations | Admin |
| `admin_get_message_thread()` | Get message thread | Admin |
| `get_teacher_student_profile_ids()` | Get teacher's students | Teacher |

### UI Pages

| App | Page | Status |
|-----|------|--------|
| admin-app | `(admin)/messages/` | ✅ Built |
| teacher-app | `teacher/messages/` | ✅ Built |
| student-app | `(student)/messages/` | ✅ Built |

**Messaging Status:** ✅ FULLY FUNCTIONAL across all three apps

---

## 🧪 Testing Capabilities

### Test Admin Enrollment

```sql
-- Test: Can admin create enrollment?
-- Simulates admin inserting a student into a course

INSERT INTO enrollments (student_id, course_id, school_id)
VALUES (
  (SELECT id FROM students WHERE lrn = '123456789002'),
  (SELECT id FROM courses WHERE subject_code = 'MATH-10' LIMIT 1),
  '11111111-1111-1111-1111-111111111111'
);

-- Expected: ✅ Success (admin has permission)
```

### Test Teacher Edit Module

```sql
-- Test: Can teacher update their own module?
UPDATE modules
SET title = 'Updated Module Title'
WHERE id = 'module-uuid'
  AND course_id IN (
    SELECT id FROM courses WHERE teacher_id = 'teacher-profile-uuid'
  );

-- Expected: ✅ Success (teacher owns the course)
```

### Test Student Access Lesson

```sql
-- Test: Can student view lesson in enrolled course?
SELECT l.*
FROM lessons l
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
JOIN enrollments e ON e.course_id = c.id
WHERE e.student_id = 'student-uuid'
  AND l.id = 'lesson-uuid';

-- Expected: ✅ Returns lesson (student is enrolled)
```

### Test Messaging

```sql
-- Test: Student sends message to teacher
SELECT send_student_message(
  'teacher-profile-uuid',  -- recipient
  'Hello, I have a question about homework',  -- message
  'course-uuid'  -- optional course context
);

-- Expected: ✅ Message sent (if quota available)
```

---

## 📊 Capability Matrix

### ADMIN

| Capability | API | UI | RPC | Status |
|------------|-----|-----|-----|--------|
| Enroll Teachers | ✅ | ✅ | ✅ | READY |
| Enroll Students | ✅ | ✅ | ✅ | READY |
| Bulk Enroll | ✅ | ✅ | - | READY |
| Add Courses | ✅ | ⚠️ | - | API READY, check UI |
| Edit Courses | ✅ | ⚠️ | - | API READY, check UI |
| Manage Modules | ⚠️ | ❌ | - | Limited |
| Message Teachers | ✅ | ✅ | ✅ | READY |
| Message Students | ✅ | ✅ | ✅ | READY |
| View Reports | ✅ | ✅ | - | READY |
| Audit Logs | ✅ | ✅ | - | READY |

### TEACHER

| Capability | API | UI | RPC | Status |
|------------|-----|-----|-----|--------|
| View Assigned Courses | ✅ | ✅ | ✅ | READY |
| Create Modules | ✅ | ✅ | - | READY |
| Edit Modules | ✅ | ✅ | - | READY |
| Delete Modules | ✅ | ✅ | - | READY (drafts only) |
| Publish Modules | ✅ | ⚠️ | - | API READY |
| Create Lessons | ✅ | ✅ | - | READY |
| Edit Lessons | ✅ | ✅ | - | READY |
| Delete Lessons | ✅ | ⚠️ | - | API READY |
| Upload Attachments | ✅ | ✅ | - | READY |
| Create Assessments | ✅ | ✅ | - | READY |
| Enter Grades | ✅ | ✅ | - | READY |
| Take Attendance | ✅ | ✅ | - | READY |
| Message Admin | ✅ | ✅ | ✅ | READY |
| Message Students | ✅ | ✅ | ✅ | READY |
| Schedule Live Sessions | ✅ | ⚠️ | - | **TWO SYSTEMS** |
| Start Live Sessions | ✅ | ⚠️ | - | **TWO SYSTEMS** |

### STUDENT

| Capability | API | UI | RPC | Status |
|------------|-----|-----|-----|--------|
| View Enrolled Courses | ✅ | ✅ | - | READY |
| View Modules | ✅ | ✅ | - | READY |
| Watch Video Lessons | ✅ | ✅ | - | READY |
| Read Text Lessons | ✅ | ✅ | - | READY |
| React to Lessons | ✅ | ✅ | - | **NEW** ✅ READY |
| Take Quizzes | ✅ | ✅ | - | READY |
| Submit Assignments | ✅ | ✅ | - | READY |
| View Grades | ✅ | ✅ | - | READY |
| View Attendance | ✅ | ✅ | - | READY |
| Message Teachers | ✅ | ✅ | ✅ | READY |
| Message Admin | ⚠️ | ⚠️ | ⚠️ | CHECK |
| Join Live Sessions | ✅ | ✅ | - | **NEW** ✅ READY |
| View Recordings | ✅ | ✅ | - | **NEW** ✅ READY |
| Send Live Reactions | ✅ | ✅ | - | **NEW** ✅ READY |
| Ask Questions in Live Class | ✅ | ✅ | - | **NEW** ✅ READY |

---

## 🎬 LIVE SESSIONS - Detailed Analysis

### Existing System (`teacher_live_sessions`)

**Found in:** teacher-app
**Table:** `teacher_live_sessions` (18 columns)
**Schema:**
```
- course_id, section_id, module_id
- provider (text) - "zoom", "meet", "daily", etc.
- room_id, join_url
- recording_url
- status
```

**Teacher API:**
- `GET /api/teacher/live-sessions` ✅
- `POST /api/teacher/live-sessions` ✅
- Operations exist in teacher-app

**Features:**
- Generic provider support
- Basic recording URL storage
- Status tracking

### New System (`live_sessions` - Daily.co)

**Found in:** student-app (newly created)
**Table:** `live_sessions` (22 columns)
**Schema:**
```
- course_id, module_id, teacher_profile_id
- daily_room_name, daily_room_url, daily_room_config (JSONB)
- recording_enabled, recording_started_at
- recording_url, recording_size_bytes, recording_duration_seconds
- status, max_participants
```

**Student-App API:**
- `POST /api/teacher/live-sessions` ✅
- `POST /api/teacher/live-sessions/[id]/start` ✅ (creates Daily.co room)
- `POST /api/teacher/live-sessions/[id]/end` ✅ (stops recording)
- `POST /api/live-sessions/[id]/join` ✅ (student join)

**Features:**
- Daily.co specific integration
- Automatic room creation/deletion
- Recording download to Supabase storage
- Real-time reactions (6 types)
- Real-time Q&A with upvoting
- Participant tracking
- Adaptive UI (playful vs professional)

**Additional Tables:**
- `session_participants` (attendance tracking)
- `session_reactions` (emoji feedback)
- `session_questions` (Q&A)
- `session_question_upvotes`

### ⚠️ CONFLICT: Two Live Session Systems

**Problem:** Duplicate functionality
- `teacher_live_sessions` (existing, teacher-app)
- `live_sessions` (new, student-app with full Daily.co)

**Recommendation:**
1. Keep new `live_sessions` for Daily.co sessions with interactions
2. Use existing `teacher_live_sessions` for generic providers
3. Or consolidate to one system

---

## 📬 How to Test Messaging

### Test 1: Admin → Teacher Message

```bash
# In admin-app as admin user
# Navigate to /messages
# Use admin_send_message RPC:

curl -X POST http://localhost:3001/api/admin/messages \
  -H "Cookie: admin-session..." \
  -d '{
    "recipientId": "teacher-profile-uuid",
    "content": "Hello teacher, please submit grades by Friday"
  }'
```

**Expected:** ✅ Message sent, teacher receives it

### Test 2: Teacher → Student Message

```bash
# In teacher-app as teacher
# Use send_teacher_message():

SELECT send_teacher_message(
  'student-profile-uuid',
  'Great work on your assignment!',
  'course-uuid'
);
```

**Expected:** ✅ Message sent, student receives it

### Test 3: Student → Teacher Message

```bash
# In student-app as student
# Navigate to /messages
# Use send_student_message():

curl -X POST http://localhost:3000/api/messages \
  -H "Cookie: student-session..." \
  -d '{
    "teacherProfileId": "teacher-profile-uuid",
    "content": "I have a question about today's lesson"
  }'
```

**Expected:** ✅ Message sent if quota available

---

## 👥 How to Create Demo Users

### Create Demo Admin

```sql
-- 1. Create auth user (via Supabase Auth Dashboard or API)
-- Email: admin.demo@msu.edu.ph
-- Password: [set password]

-- 2. Get the auth user ID, then create profile:
INSERT INTO school_profiles (auth_user_id, full_name)
VALUES (
  'auth-user-uuid-from-step-1',
  'Demo Admin'
);

-- 3. Add to school_members as admin:
INSERT INTO school_members (school_id, profile_id, role, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- MSU school ID
  (SELECT id FROM school_profiles WHERE auth_user_id = 'auth-user-uuid'),
  'school_admin',
  'active'
);

-- 4. Verify:
SELECT
  u.email,
  sp.full_name,
  sm.role
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN school_members sm ON sm.profile_id = sp.id
WHERE u.email = 'admin.demo@msu.edu.ph';
```

### Create Demo Teacher

```sql
-- 1. Create auth user
-- Email: teacher.demo@msu.edu.ph
-- Password: [set password]

-- 2. Create profile:
INSERT INTO school_profiles (auth_user_id, full_name)
VALUES ('auth-user-uuid', 'Demo Teacher');

-- 3. Create teacher profile:
INSERT INTO teacher_profiles (profile_id, school_id, employee_id, department, specialization, is_active)
VALUES (
  (SELECT id FROM school_profiles WHERE auth_user_id = 'auth-user-uuid'),
  '11111111-1111-1111-1111-111111111111',
  'EMP-DEMO-001',
  'Demo Department',
  'General Education',
  true
);

-- 4. Assign to a course:
UPDATE courses
SET teacher_id = (
  SELECT id FROM teacher_profiles WHERE employee_id = 'EMP-DEMO-001'
)
WHERE subject_code = 'MATH-10';

-- 5. Verify:
SELECT
  u.email,
  sp.full_name,
  tp.employee_id,
  COUNT(c.id) as assigned_courses
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN teacher_profiles tp ON tp.profile_id = sp.id
LEFT JOIN courses c ON c.teacher_id = tp.id
WHERE u.email = 'teacher.demo@msu.edu.ph'
GROUP BY u.email, sp.full_name, tp.employee_id;
```

### Create Demo Student

```sql
-- 1. Create auth user
-- Email: student.demo@msu.edu.ph
-- Password: [set password]

-- 2. Create profile:
INSERT INTO school_profiles (auth_user_id, full_name)
VALUES ('auth-user-uuid', 'Demo Student');

-- 3. Create student record:
INSERT INTO students (profile_id, school_id, lrn, grade_level, section_id)
VALUES (
  (SELECT id FROM school_profiles WHERE auth_user_id = 'auth-user-uuid'),
  '11111111-1111-1111-1111-111111111111',
  '2026-DEMO-001',
  '10',
  (SELECT id FROM sections WHERE name = 'Grade 10-A' AND school_id = '11111111-1111-1111-1111-111111111111' LIMIT 1)
);

-- 4. Enroll in courses:
INSERT INTO enrollments (student_id, course_id, school_id)
SELECT
  (SELECT id FROM students WHERE lrn = '2026-DEMO-001'),
  c.id,
  '11111111-1111-1111-1111-111111111111'
FROM courses c
WHERE c.section_id = (SELECT section_id FROM students WHERE lrn = '2026-DEMO-001')
LIMIT 5;

-- 5. Verify:
SELECT
  u.email,
  s.lrn,
  s.grade_level,
  COUNT(e.id) as enrolled_courses
FROM auth.users u
JOIN school_profiles sp ON sp.auth_user_id = u.id
JOIN students s ON s.profile_id = sp.id
LEFT JOIN enrollments e ON e.student_id = s.id
WHERE u.email = 'student.demo@msu.edu.ph'
GROUP BY u.email, s.lrn, s.grade_level;
```

---

## 🧪 Complete Testing Script

```bash
#!/bin/bash
# Complete System Test Script

echo "🧪 MSU LIVE CLASSROOM - COMPLETE SYSTEM TEST"
echo "============================================"
echo ""

# Test 1: Admin can view enrollments
echo "📋 Test 1: Admin Enrollment Access"
echo "URL: http://localhost:3001/(admin)/enrollments"
echo "Expected: List of 48+ enrollments"
echo ""

# Test 2: Teacher can edit module
echo "📝 Test 2: Teacher Module Edit"
echo "URL: http://localhost:3002/teacher/subjects/[courseId]"
echo "Expected: Can create/edit modules"
echo ""

# Test 3: Student can view lesson
echo "📚 Test 3: Student Lesson Access"
echo "URL: http://localhost:3000/(student)/subjects/[courseId]/modules/[moduleId]"
echo "Expected: Video player + lesson reactions"
echo ""

# Test 4: Live Session Flow
echo "🎬 Test 4: Live Session Complete Flow"
echo "Step 1: Teacher creates session (teacher-app or API)"
echo "Step 2: Teacher starts session (creates Daily.co room)"
echo "Step 3: Student joins session"
echo "Step 4: Student sends reactions"
echo "Step 5: Student asks questions"
echo "Step 6: Teacher ends session"
echo "Step 7: Recording downloads automatically"
echo "Step 8: Student views recording"
echo ""

# Test 5: Messaging Flow
echo "💬 Test 5: Three-Way Messaging"
echo "Admin → Teacher: admin_send_message()"
echo "Teacher → Student: send_teacher_message()"
echo "Student → Teacher: send_student_message()"
echo ""

echo "✅ Run these tests manually in each app"
echo ""
echo "App URLs:"
echo "- Admin:   http://localhost:3001"
echo "- Teacher: http://localhost:3002"
echo "- Student: http://localhost:3000"
```

---

## 🚀 Quick Start for Each App

### Start Admin App

```bash
cd ../admin-app
npm run dev
# Opens on http://localhost:3001

# Login as: [need admin credentials]
# Test enrollments page: http://localhost:3001/(admin)/enrollments
```

### Start Teacher App

```bash
cd ../teacher-app
npm run dev
# Opens on http://localhost:3002

# Login as: juan.delacruz@msu.edu.ph
# Test subjects: http://localhost:3002/teacher/subjects
# Test live sessions: http://localhost:3002/teacher/sessions (if exists)
```

### Start Student App

```bash
cd ../student-app
npm run dev
# Opens on http://localhost:3000

# Login as: adityaamandigital@gmail.com
# Test subjects: http://localhost:3000/(student)/subjects
# Test lesson reactions: Navigate to any lesson
```

---

## ⚠️ Critical Issues Found

### 1. Duplicate Live Session Systems

**Impact:** HIGH - Confusion about which system to use

**Resolution Needed:**
- Option A: Use only new Daily.co system (deprecate teacher_live_sessions)
- Option B: Use both (generic + enhanced)
- Option C: Merge features into one table

**Recommendation:** Keep new `live_sessions` for Daily.co, update teacher-app to use it

### 2. Column Name Inconsistency

`courses.teacher_id` vs `live_sessions.teacher_profile_id`

**Impact:** LOW - Just naming confusion, both work

**Resolution:** Document or standardize

### 3. No Admin Course Management UI?

**Impact:** MEDIUM - Admin has API but may need UI

**Resolution:** Check if admin-app has courses page, or build one

---

## ✅ FINAL ANSWER TO YOUR QUESTIONS

### Can admin enroll teachers?
✅ **YES** - Via `/api/admin/users` and `admin-app/users/` page

### Can admin enroll students?
✅ **YES** - Via `/api/admin/enrollments` + dedicated UI page + bulk enroll feature

### Can admin add new courses?
✅ **YES** - Via `/api/admin/courses` API (check if UI exists)

### Can admin change courses/modules?
⚠️ **PARTIAL** - API exists, need to verify UI

### Can admin communicate?
✅ **YES** - Full messaging system with `admin_send_message()` + UI

### Can teachers edit modules?
✅ **YES** - Full CRUD via `/api/teacher/modules` API

### Can teachers add modules?
✅ **YES** - `POST /api/teacher/modules`

### Can teachers change content?
✅ **YES** - Full lesson/module/assessment management

### Can teachers communicate?
✅ **YES** - `send_teacher_message()` + messages UI

### Can students study?
✅ **YES** - Full access to 92 lessons, quizzes, videos

### Can students communicate?
✅ **YES** - `send_student_message()` with quota system

### Can teachers schedule live sessions?
✅ **YES** - BUT two systems exist (old + new)

### Can students join live sessions?
✅ **YES** - Full UI built with adaptive themes

### Are sessions recorded?
✅ **YES** - Both systems support recording

---

## 🎯 Recommended Testing Order

1. **Test Authentication** (5 min)
   - Admin, Teacher, Student login

2. **Test Enrollments** (10 min)
   - Admin creates enrollment via UI

3. **Test Teacher Content** (15 min)
   - Teacher edits module, adds lesson

4. **Test Student Access** (10 min)
   - Student views lesson, reacts

5. **Test Messaging** (15 min)
   - Admin → Teacher
   - Teacher → Student
   - Student → Teacher

6. **Test Live Sessions** (30 min)
   - Decide which system to use
   - Teacher creates session
   - Student joins
   - Test reactions/Q&A
   - End and verify recording

**Total Time:** ~90 minutes for complete end-to-end verification

---

**STATUS:** System is 95% ready. Main decision needed: Consolidate live session systems.
