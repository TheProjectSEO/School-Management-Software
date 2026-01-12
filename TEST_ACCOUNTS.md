# 🔐 Test Account Login Credentials

**Last Updated:** December 30, 2025
**Status:** ✅ All accounts verified and ready

---

## 🎓 STUDENT APP LOGIN

**URL:** http://localhost:3000

### Test Student Account (Primary)
```
Email:    student@test.com
Password: Test123!

Profile:
- Full Name: Juan Dela Cruz
- LRN: 123456789012
- Grade Level: 10
- Section: Grade 10 - Einstein
- School: Mindanao State University - Test Campus

Enrolled Courses:
- Introduction to Database Systems (CS-101)
  Teacher: Maria Santos
```

### Features You Can Test:
✅ Dashboard with enrollment summary
✅ My Subjects - See "Introduction to Database Systems"
✅ Assessments - Take quizzes and tests
✅ View grades and feedback
✅ Progress tracking
✅ Personal notes
✅ Download course materials
✅ Notifications
✅ Profile management

---

## 👨‍🏫 TEACHER APP LOGIN

**URL:** http://localhost:3001

### Test Teacher Account
```
Email:    teacher@test.com
Password: Test123!

Profile:
- Full Name: Maria Santos
- Employee ID: T-2024-001
- Department: Computer Science
- School: Mindanao State University - Test Campus

Teaching:
- Introduction to Database Systems (CS-101)
  Section: Grade 10 - Einstein
  Students Enrolled: 1
```

### Features You Can Test:
✅ Teacher dashboard
✅ Classes & sections management
✅ **Assessment Builder** (Phase 5 - NEW!)
  - Create quizzes with MCQ, True/False, Short Answer, Essay
  - Question bank integration
  - Drag-to-reorder questions
  - Save draft / Publish workflow
✅ **Grading Queue** (Phase 6 - NEW!)
  - Auto-graded MCQ/True-False (instant)
  - Manual review queue for essays
  - Priority-based ordering (essays first)
  - Batch grading support
✅ **Report Cards** (Phase 7)
  - View student report cards
  - Add subject-specific remarks
  - Submit for admin review
✅ Module editor
✅ Live sessions
✅ Attendance tracking
✅ Student messages
✅ Calendar

---

## 🔧 ADMIN APP LOGIN

**URL:** http://localhost:3002

### Test Admin Account
```
Email:    admin@test.com
Password: Test123!

Profile:
- Full Name: Admin Test User
- Role: School Administrator
- School: Mindanao State University - Test Campus
```

### Features You Can Test:
✅ **Admin Dashboard** (Phase 8 - NEW!)
  - Real-time statistics (students, teachers, courses)
  - Enrollment trends chart
  - Grade distribution chart
  - Attendance overview
  - Recent activity feed
✅ **User Management**
  - Students list (1 student: Juan Dela Cruz)
  - Teachers list (1 teacher: Maria Santos)
  - Add/edit/deactivate users
  - Import from CSV
  - Export to CSV/Excel/PDF
✅ **Enrollments**
  - Single enrollment
  - Bulk enrollment wizard
✅ **Reports**
  - Attendance reports with charts
  - Grades distribution reports
  - Progress tracking reports
  - Export functionality
✅ **Settings**
  - Academic years & grading periods
  - Grading scale (A+ to F)
  - Attendance policies
  - School information
✅ **Audit Logs**
  - Track all admin actions
  - Filter by type, date, entity

---

## 🧪 Complete Testing Workflow

### Test the Full Assessment Flow

**Step 1: Teacher Creates Assessment** (Teacher App)
```
1. Login: teacher@test.com / Test123!
2. Go to: http://localhost:3001/teacher/assessments
3. Click "Create Assessment"
4. Fill in:
   - Title: "Database Quiz 1"
   - Type: Quiz
   - Due Date: Tomorrow
   - Time Limit: 30 minutes
5. Switch to "Questions" tab
6. Click "Create New":
   - Question: "What does SQL stand for?"
   - Type: Multiple Choice
   - Choices: A) Structured Query Language ✓
              B) Simple Query Language
              C) Standard Query Language
              D) System Query Language
   - Points: 5
7. Click "Create New":
   - Question: "Explain database normalization"
   - Type: Essay
   - Points: 10
8. Click "Publish"
```

**Step 2: Student Takes Assessment** (Student App)
```
1. Login: student@test.com / Test123!
2. Go to: http://localhost:3000/assessments
3. Find "Database Quiz 1"
4. Click "Start Assessment"
5. Answer MCQ: Select "A) Structured Query Language"
6. Answer Essay: Write paragraph about normalization
7. Click "Submit Assessment"
```

**Step 3: Verify Auto-Grading** (Behind the scenes)
```
✅ MCQ question: Auto-graded instantly (5/5 points)
✅ Essay question: Queued for manual review
✅ Partial score: 5/15 points
✅ Status: "pending_review"
```

**Step 4: Teacher Grades Essay** (Teacher App)
```
1. Go to: http://localhost:3001/teacher/grading
2. See essay in queue (priority = 1, appears first)
3. Read student's normalization explanation
4. Award points: 8/10
5. Add feedback: "Good explanation! Include more examples."
6. Click "Submit Grade"
```

**Step 5: Student Views Results** (Student App)
```
1. Go to: http://localhost:3000/assessments
2. See "Database Quiz 1" - Status: Graded
3. Click to view details
4. See score: 13/15 (86.7%)
5. See grade: B
6. Read teacher feedback on essay
```

**Step 6: Admin Views Analytics** (Admin App)
```
1. Login: admin@test.com / Test123!
2. Dashboard shows:
   - 1 student enrolled
   - 1 teacher active
   - 1 course running
3. Go to Reports → Grades
4. See grade distribution chart
5. Export report to CSV
```

---

## 🔑 Password Reset (If Needed)

If you need to reset a password:

1. **Via Supabase Dashboard:**
   - Go to: https://qyjzqzqqjimittltttph.supabase.co
   - Authentication → Users
   - Find user by email
   - Click "..." → Send Password Recovery

2. **Or Update Directly:**
   ```sql
   -- In SQL Editor, run:
   UPDATE auth.users
   SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
   WHERE email = 'user@test.com';
   ```

---

## 📊 Test Data Summary

### School
- **Name:** Mindanao State University - Test Campus
- **ID:** aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee

### Section
- **Name:** Grade 10 - Einstein
- **Grade Level:** 10
- **ID:** cccccccc-0000-0000-0000-000000000001

### Course
- **Name:** Introduction to Database Systems
- **Code:** CS-101
- **Teacher:** Maria Santos
- **Section:** Grade 10 - Einstein
- **ID:** 9de9e835-4c82-4834-8c3f-3315ca871e8b

### Users
| Email | Password | Role | Name | Identifier |
|-------|----------|------|------|------------|
| admin@test.com | Test123! | School Admin | Admin Test User | ADMIN |
| teacher@test.com | Test123! | Teacher | Maria Santos | T-2024-001 |
| student@test.com | Test123! | Student | Juan Dela Cruz | LRN: 123456789012 |

---

## 🚀 Quick Start Commands

```bash
# Terminal 1 - Student App
cd student-app
npm run dev
# → http://localhost:3000

# Terminal 2 - Teacher App
cd teacher-app
npm run dev
# → http://localhost:3001

# Terminal 3 - Admin App
cd admin-app
npm run dev
# → http://localhost:3002
```

---

## ✅ All Phases Ready to Test

### Phase 5: Assessment Builder ✅
- Login as teacher
- Create assessment with question bank
- Use new question editor modal
- Drag-to-reorder questions

### Phase 6: Auto-Grading & Queue ✅
- Student takes quiz with MCQ + Essay
- MCQ auto-grades instantly
- Essay appears in teacher grading queue
- Teacher grades from queue

### Phase 7: Report Cards ✅
- Admin or teacher generates report cards
- Teacher adds remarks
- Submit for approval
- Download PDF

### Phase 8: Admin Dashboard ✅
- View real-time statistics
- Manage students and teachers
- View reports with charts
- Configure academic settings

---

## 🎉 System Ready!

All test accounts are configured and ready to use. You can now:

1. ✅ Login to all three apps
2. ✅ Test the complete assessment workflow
3. ✅ Test auto-grading and manual queue
4. ✅ Test report card generation
5. ✅ Test admin dashboard features

**Start testing the new features you just built!** 🚀
