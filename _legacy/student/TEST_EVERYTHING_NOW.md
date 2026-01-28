# 🧪 TEST EVERYTHING NOW - Complete Guide

**All fixes applied. Test these features RIGHT NOW.**

---

## ✅ FIXES JUST APPLIED

1. ✅ Teacher courses fixed (created teacher_assignments)
2. ✅ **/apply is now PUBLIC** (no login required!)
3. ✅ Teacher live sessions UI created
4. ✅ Student live sessions page already exists
5. ✅ All RLS policies added

---

## 🎯 TEST 1: PUBLIC APPLICATION (No Login!)

### Student Self-Enrollment Test

**Open in INCOGNITO browser (not logged in):**

```
http://localhost:3000/apply
```

**Expected:** ✅ Application form loads WITHOUT requiring login!

**Fill Out Form:**
- Use YOUR REAL EMAIL so you get approval notification
- First Name: Test
- Last Name: Student
- Email: **your-real-email@example.com**
- Phone: +639123456789
- Grade: 10
- Fill rest of form
- Upload any PDF as birth certificate
- Click "Submit"

**Expected:** ✅ "Application submitted! Reference: APP-xxxxx"

**Verify in Admin:**
1. Login: admin.demo@msu.edu.ph / Demo123!@#
2. Go to: http://localhost:3002/(admin)/applications
3. **Should see your application!** ✅

---

## 🎬 TEST 2: LIVE SESSIONS - Complete Flow

### Step 1: Teacher Schedules Session

```
Login: teacher.demo@msu.edu.ph / Demo123!@#
URL: http://localhost:3001/teacher/live-sessions

Click: "Schedule Session"
Fill:
  Course: Mathematics 10
  Title: "Live Math Class - Test"
  Description: "Testing Daily.co integration"
  Start Time: [15 minutes from now]
  Recording: ✅ Enabled
  Max Participants: 50

Click: "Schedule Session"
```

**Expected:** ✅ Session created, appears in list

### Step 2: Teacher Starts Session

```
In live sessions list, find your session
Status should show: "SCHEDULED"

Click: "Start Session" button

Expected:
✅ Status changes to "LIVE"
✅ Daily.co room URL appears
✅ "Join Room" button appears
✅ New tab opens with Daily.co video room
```

### Step 3: Get Session URL for Student

**In the session card, you'll see the session ID in the URL or can get it from:**

```sql
-- Run this to get latest session ID
SELECT id, title, status, daily_room_url
FROM live_sessions
WHERE status = 'live'
ORDER BY created_at DESC
LIMIT 1;
```

**Copy the session `id` value**

### Step 4: Student Joins Session

**Open in DIFFERENT browser or incognito:**

```
Login: student.demo@msu.edu.ph / Demo123!@#
OR: adityaamandigital@gmail.com / MSUStudent2024!@#

Navigate to: http://localhost:3000/live-sessions/[SESSION-ID]
```

**Expected:**
✅ Page loads with video room
✅ Daily.co iframe appears
✅ Reactions bar below: ✋ 👍 👏 🤔 ⚡ 🐢
✅ Q&A panel on right
✅ Participants list
✅ Recording indicator (pulsing red dot)
✅ **Grade 10 students see PROFESSIONAL theme** (clean, blue/gray)

### Step 5: Test Real-time Features

**As Student:**

1. **Send Reaction:**
   - Click "👍 Understood"
   - Count should increase
   - Should auto-disappear in 10 seconds

2. **Ask Question:**
   - Type: "What is 2+2?"
   - Click "Submit"
   - Question appears in Q&A panel

3. **Upvote Question:**
   - Click upvote on your question
   - Count increases

**As Teacher (in Daily.co room):**
- See student join
- See reactions appear
- See questions in... wait, teacher needs Q&A panel too!

### Step 6: End Session

**As Teacher:**
```
Back in teacher-app: http://localhost:3001/teacher/live-sessions
Click: "End Session" button
Confirm

Expected:
✅ Status → "ENDED"
✅ Daily.co room deleted
✅ Recording download scheduled
⏳ Wait 60 seconds for recording
```

### Step 7: View Recording

**As Student:**
```
Navigate to: http://localhost:3000/subjects/[course-id]/recordings

Expected (after ~60 seconds):
✅ Recording appears in list
✅ Click to play
✅ Video player loads
✅ Can watch recording
```

---

## 🎯 TEST 3: Teacher Sees Courses

```
Login: teacher.demo@msu.edu.ph / Demo123!@#
Navigate to: http://localhost:3001/teacher/subjects

Expected: ✅ See 3 courses:
- Mathematics 10 (MATH-10A)
- Science 10 (SCI-10A)
- English 10 (ENG-10A)
```

**If still shows 0:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear cache
3. Or use incognito

---

## 💬 TEST 4: Messaging (After RLS Fix)

**As Admin:**
```
Navigate to: /messages
Click: "New Message"
Search: "Demo"

Expected: ✅ Shows:
- Demo Teacher
- Demo Student
```

**If still "No users found":**
- The search API might need fixing
- Will need to check the search endpoint

---

## 📋 QUICK CHECKLIST

**Immediate Tests:**

- [ ] Open /apply in incognito → Should load WITHOUT login ✅
- [ ] Fill application and submit → Should work ✅
- [ ] Admin sees application → Should appear ✅
- [ ] Teacher navigates to /teacher/live-sessions → Page exists ✅
- [ ] Teacher creates session → Should work ✅
- [ ] Teacher starts session → Daily.co room opens ✅
- [ ] Student joins session → Video loads ✅
- [ ] Student sends reactions → Works in real-time ✅
- [ ] Student asks questions → Appears in Q&A ✅
- [ ] Teacher ends session → Status changes ✅
- [ ] Recording appears (~60s later) → Can playback ✅

---

## 🚨 KNOWN ISSUES (I'll Fix Next)

1. **Teacher can't see Q&A panel** - Need to add to teacher view
2. **Messaging search** - Might need API endpoint fix
3. **Admin add student** - Needs email field filled (or use admissions)
4. **AI might still have issues** - RLS added but needs testing

---

## 🔑 TEST CREDENTIALS

```
ADMIN:   admin.demo@msu.edu.ph / Demo123!@# → localhost:3002
TEACHER: teacher.demo@msu.edu.ph / Demo123!@# → localhost:3001
STUDENT: adityaamandigital@gmail.com / MSUStudent2024!@# → localhost:3000
STUDENT: student.demo@msu.edu.ph / Demo123!@# → localhost:3000
```

---

## 🎯 PRIORITY TESTS RIGHT NOW

### 1. Test /apply is public (2 min)
Open http://localhost:3000/apply in incognito - should work!

### 2. Test teacher live sessions (10 min)
Create → Start → Student joins → End

### 3. Verify teacher sees 3 courses (1 min)
Refresh teacher-app/teacher/subjects

---

**Test these 3 things now and let me know results, then I'll create the klase.ph deployment plan!** 🚀
