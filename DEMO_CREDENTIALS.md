# 🎓 MSU School OS - Demo Account Credentials

**Complete demo environment for pitching and demonstrations**

---

## 📊 Demo Data Summary

| Entity | Count |
|--------|-------|
| School | 1 (MSU Main Campus) |
| Teachers | 2 |
| Sections | 3 |
| Students | 12 (4 per section) |
| Courses | 6 (Math + Science per grade) |
| Modules | 24 |
| Lessons | 18 |
| Assessments | 7 |
| Questions | 9 |
| Submissions | 25 |
| Enrollments | 24 |
| Attendance Records | 60 (past 5 days) |
| Announcements | 5 |
| Direct Messages | 6 |
| Notifications | 31 |

---

## 🔐 Teacher Login Credentials

### Teacher App: http://localhost:3001

| Name | Email | Password | Department |
|------|-------|----------|------------|
| Dr. Juan Dela Cruz | `juan.delacruz@msu.edu.ph` | `TeacherMSU2024!@#SecurePassword` | Mathematics |
| Dr. Maria Santos-Cruz | `teacher@msu.edu.ph` | `TeacherMSU2024!@#SecurePassword` | Science |

**Dr. Juan Dela Cruz teaches:**
- Mathematics 1001 (Grade 10 - Einstein)
- Mathematics 1101 (Grade 11 - Newton)
- Mathematics 1201 (Grade 12 - Curie)

**Dr. Maria Santos-Cruz teaches:**
- Science 1001 (Grade 10 - Einstein)
- Science 1101 (Grade 11 - Newton)
- Science 1201 (Grade 12 - Curie)

---

## 👨‍🎓 Student Login Credentials

### Student App: http://localhost:3000

#### Grade 10 - Einstein Section

| Name | Email | Grade |
|------|-------|-------|
| Maria Santos | `maria.santos@student.msu.edu.ph` | 10 |
| Juan Reyes | `juan.reyes@student.msu.edu.ph` | 10 |
| Sofia Reyes | `maria.santos@msu.edu.ph` | 10 |
| Gabriel Ignacio | `test_1767625797064@example.com` | 10 |

#### Grade 11 - Newton Section

| Name | Email | Grade |
|------|-------|-------|
| Rosa Garcia | `rosa.garcia@student.msu.edu.ph` | 11 |
| Miguel Lopez | `miguel.lopez@student.msu.edu.ph` | 11 |
| Marco Villanueva | `warzonie@gmail.com` | 11 |
| Isabella Cruz | `testuser_1767628073886@todoapp.test` | 11 |

#### Grade 12 - Curie Section

| Name | Email | Grade |
|------|-------|-------|
| Anna Martinez | `anna.martinez@student.msu.edu.ph` | 12 |
| Carlos Fernandez | `carlos.fernandez@student.msu.edu.ph` | 12 |
| Elena Mendoza | `warzone@gmail.com` | 12 |
| Paolo Domingo | `warzonie12@gmail.com` | 12 |

> **Note:** Student passwords are set in Supabase Auth. Use the "Forgot Password" flow or check Supabase dashboard.

---

## 🏫 Admin Login Credentials

### Admin App: http://localhost:3002

| Role | Email | Notes |
|------|-------|-------|
| School Admin | Check Supabase Auth | Admin access to MSU Main Campus |

---

## 📚 Demo Content Details

### Courses Created

| Course | Grade | Teacher | Modules |
|--------|-------|---------|---------|
| Mathematics 1001 | 10 | Dr. Juan Dela Cruz | 4 |
| Mathematics 1101 | 11 | Dr. Juan Dela Cruz | 4 |
| Mathematics 1201 | 12 | Dr. Juan Dela Cruz | 4 |
| Science 1001 | 10 | Dr. Maria Santos-Cruz | 4 |
| Science 1101 | 11 | Dr. Maria Santos-Cruz | 4 |
| Science 1201 | 12 | Dr. Maria Santos-Cruz | 4 |

### Sample Modules (Per Course)

1. **Introduction to [Subject]** - Published
2. **Core Concepts** - Published
3. **Problem Solving** - Published
4. **Advanced Topics** - Draft (for demo of publishing flow)

### Assessments

| Assessment | Type | Grade | Total Points |
|------------|------|-------|--------------|
| Algebra Fundamentals Quiz | Quiz | 10 | 50 |
| Biology Introduction Quiz | Quiz | 10 | 40 |
| Linear Equations Assignment | Assignment | 10 | 100 |
| Advanced Algebra Test | Exam | 11 | 100 |
| Chemistry Lab Report | Assignment | 11 | 75 |
| Limits and Continuity Exam | Exam | 12 | 100 |
| Physics Problem Set | Assignment | 12 | 80 |

---

## 🎯 Demo Scenarios

### 1. Teacher Dashboard Demo
- Login as Dr. Juan Dela Cruz
- View dashboard with active courses and student counts
- Check grading inbox (pending submissions)
- View attendance summary

### 2. Student Learning Flow
- Login as Maria Santos (Grade 10)
- View enrolled courses
- Access published modules
- See notifications and announcements

### 3. Assessment & Grading Flow
- Teacher creates quiz
- Student submits answers
- Teacher grades submission
- Student sees released grade

### 4. Communication Demo
- View teacher announcements (school-wide and section-specific)
- Check direct messages between teacher and student
- Student notification feed

### 5. Attendance Management
- View daily attendance by section
- Mark students present/late/absent
- View attendance trends

---

## 🚀 Quick Start

```bash
# Terminal 1 - Student App
cd student-app
npm run dev  # http://localhost:3000

# Terminal 2 - Teacher App
cd teacher-app
npm run dev  # http://localhost:3001

# Terminal 3 - Admin App
cd admin-app
npm run dev  # http://localhost:3002
```

---

## ⚠️ Important Notes

1. **Schema**: All data is in the `"school software"` schema (with space)
2. **School ID**: `4fa1be18-ebf6-41e7-a8ee-800ac3815ecd` (MSU Main Campus)
3. **Auth**: Students/teachers must exist in Supabase Auth to login
4. **Refresh**: If data doesn't appear, ensure schema is exposed in Supabase API settings

---

## 🔧 Resetting Demo Data

To reset the demo environment, run the seed script again:
1. Go to Supabase SQL Editor
2. Run `teacher-app/seed-correct-schema.sql`
3. Restart the development servers

---

**Last Updated:** January 12, 2026
