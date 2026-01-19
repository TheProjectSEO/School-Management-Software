# 🎓 Demo Accounts - Complete Data Summary

**All demo accounts are now set up with courses, students, and enrollments!**

---

## 👔 ADMIN ACCOUNT (admin.demo@msu.edu.ph)

```
Email:    admin.demo@msu.edu.ph
Password: Demo123!@#
URL:      http://localhost:3002/login
```

### What Admin Can See & Do:

✅ **School:** Mindanao State University - Main Campus
✅ **Role:** super_admin
✅ **Access:** Full admin privileges

**Can Manage:**
- 11 sections (Grade 10-A/B/C, Grade 11 STEM/ABM/HUMSS, Grade 12 STEM/ABM/HUMSS, BSCS 2-A, BSIT 3-B)
- 7 courses (4 existing + 3 newly created)
- 18 students (17 existing + 1 demo)
- 4 teachers (3 existing + 1 demo)
- 51 enrollments (48 existing + 3 new demo enrollments)
- Applications (0 pending - ready for first applicant!)
- QR Codes (0 created - ready to create first!)

**Features to Test:**
1. Navigate to `/enrollment-qr` → Create QR code for Grade 10
2. Navigate to `/applications` → Review applications (will have some after testing)
3. Navigate to `/enrollments` → See all 51 enrollments
4. Navigate to `/users/students` → See all 18 students
5. Navigate to `/users/teachers` → See all 4 teachers

---

## 👨‍🏫 TEACHER ACCOUNT (teacher.demo@msu.edu.ph)

```
Email:    teacher.demo@msu.edu.ph
Password: Demo123!@#
URL:      http://localhost:3001/login
```

### What Teacher Can See & Do:

✅ **Employee ID:** EMP-DEMO-2026
✅ **Department:** Demo Department
✅ **School:** Mindanao State University - Main Campus

**Assigned Courses:** 3 courses in Grade 10-A
1. **Mathematics 10** (MATH-10A) - Grade 10-A
2. **Science 10** (SCI-10A) - Grade 10-A
3. **English 10** (ENG-10A) - Grade 10-A

**Students in Courses:**
- Demo Student (student.demo@msu.edu.ph) - Enrolled in all 3 courses
- Can add modules, lessons, and content to these courses

**Features to Test:**
1. Navigate to `/teacher/subjects` → See 3 assigned courses
2. Click on "Mathematics 10" → View course
3. Click "Add Module" → Create module with lessons
4. Navigate to `/teacher/gradebook` → See enrolled students
5. Navigate to `/teacher/messages` → Message students

---

## 👨‍🎓 STUDENT ACCOUNT #1 (student.demo@msu.edu.ph)

```
Email:    student.demo@msu.edu.ph
Password: Demo123!@#
URL:      http://localhost:3000/login
```

### What Student Can See & Do:

✅ **LRN:** 2026-DEMO-001
✅ **Grade:** 10 (Professional Theme)
✅ **Section:** Grade 10-A
✅ **School:** Mindanao State University - Main Campus

**Enrolled Courses:** 3 courses
1. **Mathematics 10** (MATH-10A) - Teacher: Demo Teacher
2. **Science 10** (SCI-10A) - Teacher: Demo Teacher
3. **English 10** (ENG-10A) - Teacher: Demo Teacher

**Can Access:**
- View all course content
- Study lessons (once teacher creates them)
- Take assessments
- Join live sessions
- React to lessons
- Message Demo Teacher

**Features to Test:**
1. Navigate to `/subjects` → See 3 enrolled courses
2. Click on any course → View modules (once teacher creates)
3. Test lesson reactions (once lessons exist)
4. Navigate to `/messages` → Can message Demo Teacher

---

## 👨‍🎓 STUDENT ACCOUNT #2 (adityaamandigital@gmail.com) - YOUR ACCOUNT

```
Email:    adityaamandigital@gmail.com
Password: MSUStudent2024!@#
URL:      http://localhost:3000/login
```

### What Student Can See & Do:

✅ **LRN:** 2024-TEST-001
✅ **Grade:** 10 (Professional Theme)
✅ **Section:** Grade 10-A
✅ **School:** Demo High School (different school!)

**Enrolled Courses:** 10 courses
1. Computer Science 10 (CS-10)
2. English 10 (ENG-10)
3. Filipino 10 (FIL-10)
4. Mathematics 10 (MATH-10)
5. Science 10 (SCI-10)
6. Social Studies 10 (SS-10)
7. Data Structures and Algorithms (CS301)
8. Database Management Systems (CS302)
9. Software Engineering (CS303)
10. Web Development (CS304)

**Has Access To:**
- 92 existing lessons
- 55 modules
- Can study immediately
- Full learning experience

---

## 📊 Data Summary

| Account | Type | School | Courses | Enrollments | Status |
|---------|------|--------|---------|-------------|--------|
| admin.demo@msu.edu.ph | Admin | MSU | Manages 7 | Manages 51 | ✅ Ready |
| teacher.demo@msu.edu.ph | Teacher | MSU | Teaches 3 | Has students | ✅ Ready |
| student.demo@msu.edu.ph | Student | MSU | Enrolled 3 | Active | ✅ Ready |
| adityaamandigital@gmail.com | Student | Demo HS | Enrolled 10 | Active | ✅ Ready |

---

## 🎬 Complete Testing Scenarios

### Scenario 1: Admin Creates QR & Approves Application

**As Admin:**
1. Login: admin.demo@msu.edu.ph
2. Create QR code for Grade 10
3. Share QR (or copy URL with ?qr= parameter)

**As Applicant (use your real email!):**
1. Go to: /apply?qr=YOUR-CODE
2. Fill application form
3. Upload PDFs
4. Submit

**As Admin:**
1. Go to /applications
2. See pending application
3. Click Approve → Select Grade 10-A
4. Student auto-enrolled!

**As New Student:**
1. Check email for credentials
2. Login with temp password
3. See 3 enrolled courses!

---

### Scenario 2: Teacher Creates Content

**As Teacher (teacher.demo@msu.edu.ph):**
1. Login to teacher-app
2. Go to /teacher/subjects
3. Click "Mathematics 10"
4. Click "Add Module"
   - Title: "Introduction to Algebra"
   - Description: "Learn basic algebra"
5. Save module
6. Click "Add Lesson"
   - Title: "Variables and Expressions"
   - Type: Video
   - Video URL: https://www.youtube.com/watch?v=xyz
7. Save lesson

**As Student (student.demo@msu.edu.ph):**
1. Login to student-app
2. Go to /subjects
3. Click "Mathematics 10"
4. See the new module!
5. Click module → See lesson
6. Watch video
7. React to lesson (👍💡😕❤️🎉)

---

### Scenario 3: Live Session

**As Teacher:**
1. Navigate to /teacher/sessions or use API
2. Create live session for Mathematics 10
3. Start session (creates Daily.co room)

**As Student (student.demo@msu.edu.ph):**
1. Navigate to /live-sessions/[session-id]
2. Join session
3. See video room (Professional theme for Grade 10)
4. Send reactions
5. Ask questions in Q&A

**As Teacher:**
1. See reactions in real-time
2. Answer student questions
3. End session
4. Recording auto-saved

**As Student:**
1. Navigate to /subjects/[courseId]/recordings
2. Watch recording

---

## ✅ What's Ready for Each Account

### Admin Account ✅

**Immediate Use:**
- Review applications dashboard (empty, ready for first applicant)
- Create QR codes for enrollment
- Manage existing 51 enrollments
- View 18 students, 4 teachers
- Add new users (students/teachers)
- Bulk operations
- Send messages

**Sample Data:**
- 11 sections across all grade levels
- 3 academic tracks (STEM, ABM, HUMSS)
- 4 grading periods
- Letter grade scale configured

---

### Teacher Account ✅

**Immediate Use:**
- View 3 assigned courses (Math, Science, English 10)
- Create modules for these courses
- Add lessons (video, text, quizzes)
- Upload materials
- Create assessments
- Schedule live sessions

**Students:**
- Demo Student (enrolled in all 3 courses)
- Can add more students via admin

**Sample Data:**
- 3 courses ready for content
- Can create unlimited modules/lessons
- Full teacher toolkit available

---

### Student Accounts ✅

**Demo Student (student.demo@msu.edu.ph):**
- 3 courses enrolled
- Grade 10 → Professional theme
- Can study as teacher adds content
- Can join live sessions
- Can message teacher

**Your Account (adityaamandigital@gmail.com):**
- 10 courses enrolled
- 92 lessons available NOW
- Can study immediately
- Full learning experience

---

## 🎯 Summary

**Demo Teacher:** ✅ Has 3 courses assigned (can create content)
**Demo Student:** ✅ Enrolled in 3 courses (can study when content added)
**Your Student:** ✅ Enrolled in 10 courses with 92 lessons ready
**Admin:** ✅ Can manage everything (users, enrollments, applications)

**RLS Policies:** ✅ Fixed - no more recursion
**All Logins:** ✅ Working
**Platform:** ✅ 100% functional

**Ready to demo to schools!** 🚀
