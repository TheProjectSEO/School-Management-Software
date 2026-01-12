# Assessments & Submissions Migration Guide

## Overview
This migration populates the MSU Student Portal with comprehensive assessment data to give students realistic workloads and assignments to complete.

## What This Migration Creates

### 1. **5 New Courses** (Total: 10 courses)
New courses added:
- **Database Systems (CS 203)** - SQL, normalization, database design
- **Software Engineering Principles (CS 204)** - SDLC, Agile, testing
- **Panitikan ng Pilipinas (FIL 201)** - Filipino literature
- **Physics I: Mechanics (PHYS 101)** - Classical mechanics
- **Ethics and Moral Philosophy (PHIL 101)** - Ethical theories

Existing courses:
- Web Development Fundamentals (CS 201)
- Data Structures and Algorithms (CS 202)
- Philippine History and Government (GE 103)
- Calculus I (MATH 101)
- Technical Writing and Communication (ENG 201)

### 2. **28 Assessments** (2-3 per course)

#### Assessment Types:
- **10 Quizzes** - Timed, multiple choice, auto-graded
- **12 Assignments** - Homework, problem sets, essays
- **4 Projects** - Major portfolio pieces
- **2 Exams** - Midterm/final exams

#### Due Date Distribution:
- **Past Due**: 1 assignment (late submission scenario)
- **Due Soon (1-7 days)**: 8 assessments
- **Due Later (8-28 days)**: 19 assessments

### 3. **Quiz Questions** (~30 questions)

Quizzes include fully functional questions with:
- Multiple choice questions with 4 options each
- True/False questions
- Correct answers marked for auto-grading
- Explanations shown after submission
- Points assigned per question

**Quizzes with questions:**
- Spanish Colonial Period Quiz (5 questions, 50 points)
- Applications of Derivatives Quiz (3 questions, 60 points)
- Technical Writing Quiz (2 questions, 40 points)
- SQL Fundamentals Quiz (3 questions, 50 points)
- SDLC Quiz (2 questions, 40 points)
- Filipino Poetry Quiz (2 questions, 50 points)
- Newton's Laws Quiz (2 questions, 50 points)
- Ethical Theories Quiz (2 questions, 45 points)

### 4. **Submissions** (Multiple States)

Each student automatically gets sample submissions:

#### **Completed & Graded** (Past work):
- HTML Fundamentals Quiz: 45/50 (90%)
- Arrays and Lists Quiz: 38/40 (95%)
- Limits Practice Problems: 42/50 (84%)
- Spanish Colonial Period Quiz: 48/50 (96%) - with student answers

#### **Submitted (Awaiting Grading)**:
- Stack Implementation Assignment
- Technical Report Draft

#### **Pending (In Progress)**:
- Portfolio Project (started 2 days ago)
- SQL Quiz (started 1 hour ago)

### 5. **Notifications** (6 per student)

Students receive notifications about:
- New assignments posted
- Upcoming due dates
- Graded work available
- Late submission warnings
- Study tips and reminders

### 6. **Auto-Enrollment**

All existing and new students are automatically enrolled in all 10 courses.

## Database Schema Updates

### New Tables Created (from migration 007):
- `questions` - Quiz/exam questions
- `answer_options` - Multiple choice options
- `student_answers` - Student responses to questions

### Extended Tables:
- `assessments` - Added time_limit_minutes, instructions, max_attempts
- `submissions` - Added started_at, time_spent_seconds

## How to Apply This Migration

### Method 1: Using Supabase CLI (Recommended)
```bash
cd student-app
npx supabase db push
```

### Method 2: Using the provided script
```bash
cd student-app
./scripts/apply-assessments-migration.sh
```

### Method 3: Manual SQL execution
1. Copy the contents of `supabase/migrations/008_populate_assessments_and_submissions.sql`
2. Run in Supabase SQL Editor
3. Verify data was created

## Verification Queries

After applying, verify the data:

```sql
-- Check total counts
SELECT
  'Courses' as entity, COUNT(*) as count FROM courses
UNION ALL
SELECT 'Assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'Questions', COUNT(*) FROM questions
UNION ALL
SELECT 'Submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM enrollments;

-- Check assessment breakdown by type
SELECT type, COUNT(*)
FROM assessments
GROUP BY type
ORDER BY type;

-- Check submissions by status
SELECT status, COUNT(*)
FROM submissions
GROUP BY status
ORDER BY status;

-- Check upcoming assignments (next 7 days)
SELECT
  c.name as course,
  a.title,
  a.type,
  a.due_date,
  a.total_points
FROM assessments a
JOIN courses c ON c.id = a.course_id
WHERE a.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY a.due_date;
```

## What Students Will See

### Dashboard
- **Upcoming Assignments**: 8 due in the next week
- **In Progress**: 2 submissions being worked on
- **Recent Grades**: 4 graded assignments with scores
- **Notifications**: 6 alerts (3 unread)

### Assessments Page
- Total of 28 assessments across 10 courses
- Mix of pending, submitted, and graded work
- Clear due dates and point values
- Ability to start new quizzes

### Grades Page
- 4 completed assignments with scores and feedback
- Overall performance metrics
- Grade breakdown by course

### Quiz Taking Experience
Students can:
- Start timed quizzes
- Answer multiple choice questions
- See time remaining
- Submit and see results
- View explanations for answers

## Assessment Details by Course

### Web Development (3 assessments)
1. **HTML Fundamentals Quiz** - Due in 3 days, 50 pts (COMPLETED: 45/50)
2. **Build a Portfolio** - Due in 14 days, 100 pts (IN PROGRESS)
3. **JavaScript Calculator** - Due in 21 days, 100 pts

### Data Structures (3 assessments)
1. **Arrays/Lists Quiz** - Due in 5 days, 40 pts (COMPLETED: 38/40)
2. **Implement a Stack** - Due in 7 days, 60 pts (SUBMITTED)
3. **Binary Tree Implementation** - Due in 14 days, 80 pts

### Philippine History (3 assessments)
1. **Pre-Colonial Essay** - OVERDUE, 80 pts
2. **Spanish Colonial Quiz** - Due in 6 days, 50 pts (COMPLETED: 48/50)
3. **Revolution Analysis** - Due in 18 days, 100 pts

### Calculus (3 assessments)
1. **Limits Practice** - Due in 4 days, 50 pts (COMPLETED: 42/50)
2. **Applications of Derivatives** - Due in 8 days, 60 pts
3. **Midterm Exam** - Due in 21 days, 100 pts

### Technical Writing (3 assessments)
1. **Technical Report Draft** - Due in 12 days, 75 pts (SUBMITTED)
2. **API Documentation** - Due in 15 days, 80 pts
3. **Technical Writing Quiz** - Due in 5 days, 40 pts

### Database Systems (3 assessments)
1. **SQL Quiz** - Due in 4 days, 50 pts (IN PROGRESS)
2. **Normalization Assignment** - Due in 9 days, 60 pts
3. **Database Design Project** - Due in 20 days, 100 pts

### Software Engineering (3 assessments)
1. **SDLC Quiz** - Due in 3 days, 40 pts
2. **Requirements Document** - Due in 16 days, 90 pts
3. **Testing Midterm** - Due in 25 days, 100 pts

### Filipino Literature (3 assessments)
1. **Filipino Poetry Quiz** - Due in 7 days, 50 pts
2. **Noli Me Tangere Analysis** - Due in 13 days, 80 pts
3. **Original Short Story** - Due in 22 days, 100 pts

### Physics (3 assessments)
1. **Newton's Laws Quiz** - Due in 5 days, 50 pts
2. **Kinematics Problem Set** - Due in 6 days, 60 pts
3. **Lab Report: Pendulum** - Due in 11 days, 70 pts

### Ethics & Philosophy (3 assessments)
1. **Ethical Theories Quiz** - Due in 4 days, 45 pts
2. **AI Ethics Case Study** - Due in 17 days, 85 pts
3. **Philosophy Midterm** - Due in 28 days, 100 pts

## Features Enabled

### For Students:
✅ View all assignments with due dates
✅ Take timed quizzes with multiple choice questions
✅ Submit assignments and track status
✅ See graded work with scores and feedback
✅ Get notifications about upcoming work
✅ Track progress across 10 courses
✅ See what's due soon vs. later
✅ Resume in-progress assignments

### For Teachers (Future):
✅ Assignment data ready for grading interface
✅ Quiz auto-grading already implemented
✅ Student submissions organized by status
✅ Performance analytics data available

## RLS (Row Level Security)

All tables have proper RLS policies:
- Students can only view their own submissions
- Students can only see questions for their enrolled courses
- Students can only create submissions for their assessments
- Quiz answers are properly secured

## Next Steps

After applying this migration:

1. **Test the Student Dashboard** - Should show upcoming work
2. **Test Quiz Taking** - Start and complete a quiz
3. **Test Submissions** - View graded work and feedback
4. **Test Notifications** - Check unread notifications
5. **Verify Enrollments** - All 10 courses should appear

## Rollback (If Needed)

To remove the created data:

```sql
-- WARNING: This will delete all assessment data
DELETE FROM student_answers;
DELETE FROM submissions;
DELETE FROM questions;
DELETE FROM answer_options;
DELETE FROM assessments WHERE created_at > NOW() - INTERVAL '1 day';
DELETE FROM enrollments WHERE course_id IN (
  'c6666666-6666-6666-6666-666666666666',
  'c7777777-7777-7777-7777-777777777777',
  'c8888888-8888-8888-8888-888888888888',
  'c9999999-9999-9999-9999-999999999999',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);
DELETE FROM courses WHERE id IN (
  'c6666666-6666-6666-6666-666666666666',
  'c7777777-7777-7777-7777-777777777777',
  'c8888888-8888-8888-8888-888888888888',
  'c9999999-9999-9999-9999-999999999999',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: The tables already exist from migration 007. This is fine, the migration will skip table creation.

### Issue: No submissions showing up
**Solution**: Check that students exist in the database. Run: `SELECT * FROM students;`

### Issue: Quizzes not working
**Solution**: Verify questions table exists: `SELECT COUNT(*) FROM questions;`

### Issue: RLS blocking access
**Solution**: Make sure the authenticated user has a profile and student record.

## Support

For issues or questions:
1. Check the Supabase logs: `npx supabase logs`
2. Verify RLS policies are enabled
3. Check that the migration ran successfully
4. Review the verification queries above

---

**Migration File**: `supabase/migrations/008_populate_assessments_and_submissions.sql`
**Created**: 2026-01-10
**Schema**: `school software` (public schema)
