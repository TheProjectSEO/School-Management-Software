# Applications vs Enrollments: Complete Guide

## 🎯 Quick Answer

**Applications** and **Enrollments** are **two different things**:

- **Applications** = Admission process (before student exists)
- **Enrollments** = Course enrollments (after student exists, which courses they take)

When you approve an application, it **DOES** create enrollments automatically, but only if a section is assigned.

---

## 📋 The Complete Flow

### Step 1: Application (Student fills form)
```
Student fills /apply form
    ↓
Creates record in: student_applications table
    ↓
Status: "submitted"
    ↓
Admin sees it in: /applications page
```

**What's in Applications:**
- Personal information (name, email, phone, address)
- Academic information (grade applying for, track preference)
- Documents (birth certificate, report card, etc.)
- Status: submitted → under_review → approved/rejected

---

### Step 2: Approval (Admin approves application)
```
Admin clicks "Approve" in /applications
    ↓
System automatically creates:
    1. Auth user account (for login)
    2. school_profiles record (user profile)
    3. students record (student record)
    ↓
IF section_id is provided:
    4. Auto-enrolls in ALL courses for that section
    ↓
Updates application status to "approved"
Links student_id to application
```

**What happens:**
- ✅ Student can now login
- ✅ Student record exists in `students` table
- ✅ **IF section assigned**: Student is enrolled in all section courses
- ✅ Application status changes to "approved"

---

### Step 3: Enrollments (Course enrollments)
```
Enrollments = Which courses a student is taking
    ↓
Stored in: enrollments table
    ↓
Shown in: /enrollments page
```

**What's in Enrollments:**
- Student name
- Course name (e.g., "Mathematics", "Science", "English")
- Section name (e.g., "Grade 10-A")
- Status: pending → active → completed → dropped
- Enrollment date

---

## 🔍 Why Your Approved Application Might Not Show in Enrollments

### Reason 1: No Section Assigned
**Problem:** When approving, if no `sectionId` is provided, the student is created but NOT enrolled in any courses.

**Solution:** When approving, you need to:
1. Assign a section to the student
2. The system will then auto-enroll them in all courses for that section

**Check:** Look at the approve API - it only creates enrollments if `student.section_id` exists:
```typescript
if (student.section_id) {
  // Auto-enroll in section courses
  const sectionCourses = await supabase
    .from("courses")
    .select("id")
    .eq("section_id", student.section_id);
  
  await supabase.from("enrollments").upsert(
    sectionCourses.map((c) => ({
      student_id: student.id,
      course_id: c.id,
      school_id: student.school_id,
    }))
  );
}
```

### Reason 2: Section Has No Courses
**Problem:** The section exists but has no courses assigned to it.

**Solution:** 
1. Go to Courses/Sections management
2. Assign courses to the section
3. Then approve the application (or manually enroll the student)

### Reason 3: Enrollment Status Filter
**Problem:** The enrollments page might be filtering by status (e.g., only showing "active" enrollments).

**Solution:** Check the filter dropdown in `/enrollments` - make sure it's set to "All statuses" or includes "pending".

---

## 📊 What Each Page Shows

### `/applications` Page
**Purpose:** Review incoming student applications

**Shows:**
- Applications waiting for review
- Applications that have been approved/rejected
- Application details (personal info, documents, status)

**Actions:**
- Approve → Creates student + enrollments (if section provided)
- Reject → Marks application as rejected
- Request Info → Asks student for more documents

**After Approval:**
- Application stays here with "approved" status
- Student record is created
- Enrollments are created (if section provided)

---

### `/enrollments` Page
**Purpose:** Manage which courses students are enrolled in

**Shows:**
- Student name
- Course name
- Section name
- Enrollment status (pending/active/completed/dropped)
- Enrollment date

**Actions:**
- Approve enrollment (if status is "pending")
- Transfer to different section
- Drop enrollment

**What it's for:**
- Managing course enrollments for existing students
- Transferring students between sections
- Dropping students from courses
- Bulk enrolling multiple students in a course

---

## 🔄 Bulk Enrollment Explained

**Bulk Enrollment** = Enrolling multiple existing students into a course at once

**Use Case:**
- You have 50 students already in the system
- You want to enroll all of them in "Mathematics Grade 10"
- Instead of enrolling one-by-one, you use bulk enrollment

**How it works:**
1. Go to `/enrollments/bulk`
2. Select a course (e.g., "Mathematics Grade 10")
3. Select a section (e.g., "Grade 10-A")
4. Select multiple students from the list
5. Click "Enroll"
6. System creates enrollments for all selected students

**Key Point:** Bulk enrollment is for **existing students**, not applications. Students must already exist in the `students` table.

---

## ✅ Summary: The Two-Step Process

### Step 1: Application → Student
```
Application (student_applications)
    ↓ [Admin Approves]
Student (students table)
```

### Step 2: Student → Course Enrollments
```
Student (students table)
    ↓ [Auto-enroll if section provided, OR manual enrollment]
Enrollments (enrollments table)
```

---

## 🛠️ How to Fix Your Current Situation

### If Approved Application Doesn't Show in Enrollments:

**Option 1: Check if Section Was Assigned**
1. Go to `/users/students/[studentId]`
2. Check if student has a `section_id`
3. If not, assign a section

**Option 2: Manually Enroll the Student**
1. Go to `/enrollments`
2. Click "Bulk Enroll" or create single enrollment
3. Select the student
4. Select the course(s)
5. Enroll them

**Option 3: Check Enrollment Filters**
1. Go to `/enrollments`
2. Make sure filter is set to "All statuses"
3. Search for the student's name

---

## 📝 Database Tables Reference

### `student_applications`
- Application data (before approval)
- Status: submitted, under_review, approved, rejected
- Links to `students` table after approval via `student_id`

### `students`
- Student record (created after approval)
- Has `section_id` (which section/class they're in)
- Links to `school_profiles` via `profile_id`

### `enrollments`
- Course enrollments (which courses a student takes)
- Links `student_id` + `course_id` + `section_id`
- Status: pending, active, completed, dropped

### `courses`
- Course/subject definitions (e.g., "Mathematics", "Science")
- Can be linked to a `section_id` (section-specific courses)

---

## 🎓 Real-World Example

**Scenario:** New student "Juan" applies for Grade 10

1. **Juan fills application form** (`/apply`)
   - Creates record in `student_applications`
   - Status: "submitted"
   - Shows in `/applications`

2. **Admin approves application** (`/applications`)
   - Creates `students` record for Juan
   - Assigns Juan to "Grade 10-A" section
   - Auto-enrolls Juan in all Grade 10-A courses:
     - Mathematics
     - Science
     - English
     - Social Studies
   - Creates 4 records in `enrollments` table
   - Application status → "approved"

3. **Juan can now login**
   - Sees his enrolled courses
   - Can access course materials
   - Can submit assignments

4. **Admin can manage enrollments** (`/enrollments`)
   - See all course enrollments
   - Transfer Juan to different section
   - Drop Juan from a course
   - Add Juan to additional courses

---

## ❓ Common Questions

**Q: Why doesn't my approved application show in enrollments?**
A: Either no section was assigned during approval, or the section has no courses.

**Q: What's the difference between Applications and Enrollments?**
A: Applications = admission process. Enrollments = course enrollments.

**Q: Can I enroll a student without approving their application?**
A: No, student must exist first (application must be approved).

**Q: What is bulk enrollment for?**
A: Enrolling multiple existing students into a course at once.

**Q: Do I need to manually enroll after approving?**
A: Only if no section was assigned, or if you want to add additional courses.
