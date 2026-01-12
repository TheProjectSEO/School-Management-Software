# 🔐 Login Credentials for All Apps

**System:** MSU School Management Software
**Environment:** Development
**Last Updated:** December 30, 2025

---

## 📱 Student App Login

**URL:** http://localhost:3000

### Test Student Account
```
Email:    student@msu.edu.ph
Password: MSUStudent2024!
```

**What You Can Access:**
- Dashboard with quick stats
- My Subjects (enrolled courses)
- Assessments (quizzes, tests, assignments)
- Take assessments and view grades
- Progress tracking
- Personal notes
- Course downloads
- Notifications
- Profile management
- Help & support

**Alternative Test Student:**
```
Email:    student@test.com
Password: Test123! (or check with admin)
```

---

## 👨‍🏫 Teacher App Login

**URL:** http://localhost:3001

### Test Teacher Account
```
Email:    teacher@test.com
Password: Test123!
```

**Alternative:**
```
Email:    teacher@demo.school
Password: Test123!
```

**What You Can Access:**
- Teacher dashboard
- My Classes (sections you teach)
- Subject workspace
- **Assessment Builder** (NEW - Phase 5!)
  - Create quizzes with question banks
  - Multiple question types
  - Drag-to-reorder questions
- **Grading Queue** (NEW - Phase 6!)
  - Auto-graded MCQ/True-False
  - Manual review queue for essays
  - Priority-based ordering
- **Report Cards** (Phase 7)
  - View and manage student report cards
  - Add teacher remarks
  - Submit for review
- Live sessions
- Module editor
- Attendance tracking
- Messages
- Calendar

---

## 🔧 Admin App Login

**URL:** http://localhost:3002

### Test Admin Account
```
Email:    admin@test.com
Password: Test123!
```

**Alternative:**
```
Email:    testadmin@school.com
Password: Test123!
```

**What You Can Access:**
- **Admin Dashboard** (Phase 8!)
  - Real-time statistics
  - Enrollment trends
  - Grade distribution
  - Attendance overview
- **User Management**
  - Students list with filters
  - Teachers list with filters
  - Bulk activate/deactivate
  - Import from CSV
- **Enrollments**
  - Single enrollment
  - Bulk enrollment wizard
- **Reports**
  - Attendance reports
  - Grades reports
  - Progress reports
  - Export to CSV/Excel/PDF
- **Settings**
  - Academic years & grading periods
  - Grading scale configuration
  - Attendance policies
  - School information
- **Audit Logs**
  - Track all admin actions
  - Filter by type, date, entity

---

## 🆕 Creating New Test Users

### Create Student
```bash
cd student-app
npm run create-test-user
```

This creates:
- Email: student@msu.edu.ph
- Password: MSUStudent2024!

### Create Teacher (Manual via Supabase Dashboard)
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Email: newteacher@msu.edu.ph
4. Password: TeacherPass123!
5. Auto Confirm User: Yes

Then add to database:
```sql
-- Insert profile
INSERT INTO public.profiles (auth_user_id, full_name)
VALUES ('USER_ID_FROM_AUTH', 'New Teacher Name');

-- Add to school_members
INSERT INTO public.school_members (profile_id, school_id, role)
VALUES ('PROFILE_ID', 'SCHOOL_ID', 'teacher');

-- Create teacher profile
INSERT INTO public.teacher_profiles (profile_id, school_id, employee_id)
VALUES ('PROFILE_ID', 'SCHOOL_ID', 'T-2024-001');
```

### Create Admin (Manual via Supabase Dashboard)
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Email: newadmin@msu.edu.ph
4. Password: AdminPass123!
5. Auto Confirm User: Yes

Then add to database:
```sql
-- Insert profile
INSERT INTO public.profiles (auth_user_id, full_name)
VALUES ('USER_ID_FROM_AUTH', 'New Admin Name');

-- Add to school_members as admin
INSERT INTO public.school_members (profile_id, school_id, role)
VALUES ('PROFILE_ID', 'SCHOOL_ID', 'school_admin');
```

---

## 🔍 Verify Test Users Exist

### Check via Supabase Dashboard
1. Go to: https://qyjzqzqqjimittltttph.supabase.co
2. Navigate to: Authentication → Users
3. Look for:
   - student@msu.edu.ph
   - student@test.com
   - teacher@test.com
   - admin@test.com

### Check via SQL
```sql
SELECT
  u.email,
  u.email_confirmed_at,
  p.full_name,
  sm.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
LEFT JOIN public.school_members sm ON sm.profile_id = p.id
WHERE u.email LIKE '%@test.com' OR u.email LIKE '%@msu.edu.ph'
ORDER BY u.email;
```

---

## 🎯 Default Password for Test Accounts

If the standard test accounts exist but you don't know the password, they likely use:

**Standard Test Password:** `Test123!`

**Applies to:**
- admin@test.com
- teacher@test.com
- student@test.com

**If these don't work:**
1. Go to Supabase Dashboard
2. Authentication → Users
3. Find the user
4. Click "..." → Send Password Recovery
5. Or delete and recreate the user

---

## 🚨 Troubleshooting

### Issue: "Invalid login credentials"
**Solutions:**
1. Verify email is correct
2. Check if user exists in Supabase Dashboard
3. Try password reset via dashboard
4. Check if email confirmation is required:
   - Go to Authentication → Providers → Email
   - Set "Confirm email" to OFF for testing

### Issue: "User not found"
**Solution:**
Run the appropriate creation script or create manually via dashboard

### Issue: "Unauthorized" after login
**Solution:**
User exists in auth but missing profile/role:
1. Check `profiles` table has entry
2. Check `school_members` table has role
3. For teacher: Check `teacher_profiles` exists
4. For student: Check `students` exists

### Issue: Admin app shows "Access denied"
**Solution:**
Verify user has `school_admin` role in `school_members` table

---

## 📋 Quick Reference

| App | Port | Test Email | Password | Role |
|-----|------|------------|----------|------|
| **Student** | 3000 | student@msu.edu.ph | MSUStudent2024! | student |
| **Student** | 3000 | student@test.com | Test123! | student |
| **Teacher** | 3001 | teacher@test.com | Test123! | teacher |
| **Teacher** | 3001 | teacher@demo.school | Test123! | teacher |
| **Admin** | 3002 | admin@test.com | Test123! | school_admin |
| **Admin** | 3002 | testadmin@school.com | Test123! | school_admin |

---

## 🎓 Testing the New Features

### Test Assessment Builder (Teacher)
1. Login to teacher app
2. Navigate to `/teacher/assessments`
3. Click "Create Assessment"
4. Add MCQ and Essay questions
5. Save and publish

### Test Auto-Grading (Student + Teacher)
1. Student takes the quiz
2. MCQ auto-grades instantly
3. Essay goes to grading queue
4. Teacher grades from `/teacher/grading`
5. Final score updates

### Test Admin Dashboard
1. Login to admin app
2. View statistics on dashboard
3. Manage students/teachers
4. View reports
5. Configure academic settings

---

## 📞 Need Help?

If none of the test accounts work:

1. **Create fresh accounts via Supabase Dashboard**
   - Go to Authentication → Users → Add user
   - Use emails: admin@msu.edu.ph, teacher@msu.edu.ph, student@msu.edu.ph
   - Set password: Test123!
   - Auto-confirm: Yes

2. **Then run database setup**
   - Create profiles
   - Assign roles
   - Link to schools/sections

3. **Or use the registration pages**
   - Student: http://localhost:3000/register
   - Teacher: http://localhost:3001/teacher-register

---

**All credentials documented! Ready to login and test! 🚀**
