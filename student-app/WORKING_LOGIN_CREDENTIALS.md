# 🔑 Working Login Credentials - ALL 3 PLATFORMS

**Status:** ✅ All accounts created and verified
**Created:** January 19, 2026

---

## 👔 ADMIN ACCESS (Port 3001)

```
Email:    admin.demo@msu.edu.ph
Password: Demo123!@#
URL:      http://localhost:3001/login

Role:     School Administrator
Status:   ✅ Active
School:   Mindanao State University - Main Campus
```

**What You Can Do:**
- ✅ Review student applications (`/applications`)
- ✅ Create QR codes (`/enrollment-qr`)
- ✅ Approve/reject applications (auto-creates students!)
- ✅ Manage enrollments (`/enrollments`)
- ✅ Manage users (`/users`)
- ✅ Send messages to teachers/students (`/messages`)
- ✅ View reports (`/reports`)
- ✅ Audit logs (`/audit-logs`)

**Test the Complete Admissions Workflow:**
1. Login as admin
2. Go to `/enrollment-qr` → Create QR code
3. Go to `/applications` → Review pending applications
4. Click "Approve" → Watch student auto-enroll!

---

## 👨‍🏫 TEACHER ACCESS (Port 3002)

```
Email:    teacher.demo@msu.edu.ph
Password: Demo123!@#
URL:      http://localhost:3002/login

Role:     Teacher
Status:   ✅ Active
School:   Mindanao State University - Main Campus
Employee ID: EMP-DEMO-2026
```

**What You Can Do:**
- ✅ View assigned courses (`/teacher/subjects`)
- ✅ Create modules (`/teacher/subjects/[id]`)
- ✅ Add lessons (video, reading, quiz)
- ✅ Upload attachments
- ✅ Create assessments (`/teacher/assessments`)
- ✅ Enter grades (`/teacher/gradebook`)
- ✅ Take attendance (`/teacher/attendance`)
- ✅ Schedule live sessions (`/teacher/sessions`)
- ✅ Message students (`/teacher/messages`)
- ✅ View submissions (`/teacher/submissions`)

**Note:** Currently not assigned to any courses. You can assign via admin panel or SQL.

---

## 👨‍🎓 STUDENT ACCESS (Port 3000)

```
Email:    adityaamandigital@gmail.com
Password: [YOUR EXISTING PASSWORD - You know this!]
URL:      http://localhost:3000/login

Role:     Student
Status:   ✅ Active
LRN:      2024-TEST-001
Grade:    10 (Professional Theme)
Section:  Grade 10-A
Enrolled: 10 courses
```

**What You Can Do:**
- ✅ View enrolled courses (`/subjects`)
- ✅ Study lessons (92 lessons available)
- ✅ Watch video lessons
- ✅ React to lessons (👍💡😕❤️🎉)
- ✅ Take quizzes and assignments
- ✅ View grades (`/grades`)
- ✅ Join live sessions (`/live-sessions/[id]`)
- ✅ View recordings (`/subjects/[id]/recordings`)
- ✅ Send reactions in live class
- ✅ Ask questions in live class
- ✅ Message teachers (`/messages`)

---

## 🚀 QUICK START GUIDE

### Step 1: Start All Apps

```bash
# Terminal 1 - Admin App
cd admin-app
npm run dev
# Access at: http://localhost:3001

# Terminal 2 - Teacher App
cd teacher-app
npm run dev
# Access at: http://localhost:3002

# Terminal 3 - Student App
cd student-app
npm run dev
# Access at: http://localhost:3000
```

### Step 2: Login to Each

**Admin:**
- Go to: http://localhost:3001/login
- Email: `admin.demo@msu.edu.ph`
- Password: `Demo123!@#`
- ✅ You'll see admin dashboard

**Teacher:**
- Go to: http://localhost:3002/login
- Email: `teacher.demo@msu.edu.ph`
- Password: `Demo123!@#`
- ✅ You'll see teacher dashboard

**Student:**
- Go to: http://localhost:3000/login
- Email: `adityaamandigital@gmail.com`
- Password: [your password]
- ✅ You'll see subjects dashboard with 10 enrolled courses

---

## 🧪 TEST COMPLETE ADMISSIONS FLOW

### 1. Admin Creates QR Code

```bash
# Login as: admin.demo@msu.edu.ph
# Navigate to: http://localhost:3001/(admin)/enrollment-qr
# Click: "Create QR Code"
# Fill:
#   Name: "2024 Grade 10 General Admission"
#   Target Grades: 10
#   Max Applications: 100
# Save and note the QR code
```

### 2. Apply as Prospective Student

```bash
# Open in incognito/different browser
# Navigate to: http://localhost:3000/apply?qr=[YOUR-QR-CODE]
# Use YOUR REAL EMAIL so you'll receive the approval notification
# Fill form completely
# Upload any PDF as documents
# Submit
```

### 3. Admin Approves Application

```bash
# Login as: admin.demo@msu.edu.ph
# Navigate to: http://localhost:3001/(admin)/applications
# You'll see: 1 pending application
# Click to view details
# Click "Approve"
# Select section: "Grade 10-A"
# Confirm
```

### 4. Check Your Email

```
# Check the email you used in step 2
# Subject: "You're approved!"
# Body contains:
#   - Welcome message
#   - Login credentials (temp password)
#   - Login URL
```

### 5. Login as Newly Enrolled Student

```bash
# Navigate to: http://localhost:3000/login
# Email: [your email from step 2]
# Password: [from approval email, format: MSU-abc12345!]
# You'll see:
#   - 6+ enrolled courses (auto-enrolled!)
#   - Can access all lessons
#   - Can join live sessions
```

---

## 📊 EXISTING ACCOUNTS (Also Work)

### Teachers (Password Unknown - Reset via Supabase)

| Email | Name | Courses |
|-------|------|---------|
| juan.delacruz@msu.edu.ph | Dr. Juan Dela Cruz | 3 courses |
| teacher@msu.edu.ph | Dr. Maria Santos-Cruz | 3 courses |
| teacher@test.com | Demo Teacher | 0 courses |

**To use these:** Reset password in Supabase Dashboard or use demo account above

### Students (Password Unknown - Reset via Supabase)

| Email | Name | LRN | Grade | Enrollments |
|-------|------|-----|-------|-------------|
| juan.reyes@student.msu.edu.ph | Juan Reyes | 123456789002 | 10 | 2 |
| maria.santos@msu.edu.ph | Sofia Reyes | 123456789007 | 10 | 2 |
| miguel.lopez@student.msu.edu.ph | Miguel Lopez | 123456789004 | 11 | 2 |
| rosa.garcia@student.msu.edu.ph | Rosa Garcia | 123456789003 | 11 | 2 |

**To use these:** Reset password in Supabase Dashboard or use your main account

---

## 🔑 YOUR MAIN ACCOUNT (Best for Testing)

```
STUDENT ACCOUNT (Works Now - You Know the Password!)
======================================================
Email:    adityaamandigital@gmail.com
Password: [Your existing password]
URL:      http://localhost:3000/login

LRN:      2024-TEST-001
Grade:    10 (Professional Theme)
Section:  Grade 10-A
Enrolled: 10 courses

What you can test:
- View all 10 enrolled courses
- Watch 92 video lessons
- React to lessons
- Take quizzes
- View grades
- Message teachers
- Join live sessions
- View recordings
```

---

## 🔐 HOW TO RESET PASSWORDS

### Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users
2. Search for email (e.g., "juan.delacruz@msu.edu.ph")
3. Click on the user
4. Click "Reset Password via Email" or "Update user" to set password directly

### Via SQL (Quick for demos)

```sql
-- Send password reset email
SELECT auth.send_password_recovery_email('user@example.com');

-- Student will receive email with reset link
```

---

## 📋 COMPLETE ACCESS SUMMARY

### ✅ READY TO USE NOW

| Role | Email | Password | URL | Features |
|------|-------|----------|-----|----------|
| **ADMIN** | admin.demo@msu.edu.ph | Demo123!@# | :3001 | Applications, QR codes, Enrollments |
| **TEACHER** | teacher.demo@msu.edu.ph | Demo123!@# | :3002 | Modules, Lessons, Grades, Live sessions |
| **STUDENT** | adityaamandigital@gmail.com | [Yours] | :3000 | Study, Live class, Reactions, Messages |

### 🔧 SCHEMA FIX APPLIED

Both admin-app and teacher-app now correctly use **"public"** schema (was causing the startup errors).

**Fixed Files:**
- ✅ `admin-app/lib/supabase/client.ts`
- ✅ `admin-app/lib/supabase/server.ts`
- ✅ `admin-app/lib/supabase/service.ts`
- ✅ `teacher-app/lib/supabase/client.ts`
- ✅ `teacher-app/lib/supabase/server.ts`

**Apps should now start without errors!**

---

## 🎊 YOU NOW HAVE:

✅ **Working admin login** → admin.demo@msu.edu.ph / Demo123!@#
✅ **Working teacher login** → teacher.demo@msu.edu.ph / Demo123!@#
✅ **Working student login** → adityaamandigital@gmail.com / [your password]

✅ **Schema issues fixed** - Apps will start properly
✅ **Resend API key configured** - Emails will send
✅ **All admissions features deployed** - Complete workflow ready

---

## 🚀 START TESTING NOW!

```bash
# Start all three apps:

Terminal 1: cd admin-app && npm run dev    # Port 3001
Terminal 2: cd teacher-app && npm run dev  # Port 3002
Terminal 3: cd student-app && npm run dev  # Port 3000

# Login with credentials above and test!
```

**All apps should start without schema errors now!** 🎉
