# Seed Data - Quick Reference Card

## 60-Second Setup

```bash
1. Supabase → SQL Editor
2. Copy all of: seed-test-data.sql
3. Paste into editor
4. Click Run
5. Wait 30-60 seconds
6. Done!
```

---

## What You'll Get

### Teacher
- **Name**: Dr. Juan Dela Cruz
- **Email**: juan.delacruz@msu.edu.ph
- **ID**: EMP001
- **Courses**: 3 (Math 101, Math 201, Physics 101)

### Students (6 total)
- Maria Santos (Grade 10)
- Juan Reyes (Grade 10)
- Rosa Garcia (Grade 11)
- Miguel Lopez (Grade 11)
- Anna Martinez (Grade 12)
- Carlos Fernandez (Grade 12)

### Content
- 3 Sections (Grades 10, 11, 12)
- 3 Courses (all published)
- 6 Modules (all published)
- 18 Lessons (all published)
- 6 Transcripts + Notes
- 3 Question Banks (5 questions each)
- 3 Assessments (quizzes)

---

## Key IDs (Bookmark These)

| Item | ID |
|------|-----|
| School | 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd |
| Teacher | EMP001 |
| Grade 10 Section | "Einstein" |
| Grade 11 Section | "Newton" |
| Grade 12 Section | "Curie" |

---

## Verification (Copy & Run)

**Quick Check** (instant):
```sql
SELECT COUNT(*) as teachers FROM n8n_content_creation.teacher_profiles WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT COUNT(*) as students FROM n8n_content_creation.students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT COUNT(*) as courses FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
SELECT COUNT(*) as modules FROM n8n_content_creation.modules WHERE course_id IN (SELECT id FROM n8n_content_creation.courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd');
```

Expected: 1 teacher | 6 students | 3 courses | 6 modules

---

## Complete Data List

### Sections
1. Grade 10 - Einstein Section
2. Grade 11 - Newton Section
3. Grade 12 - Curie Section

### Students (by section)
**Grade 10 (Einstein)**
- Maria Santos (LRN: 1000000001)
- Juan Reyes (LRN: 1000000002)

**Grade 11 (Newton)**
- Rosa Garcia (LRN: 1000000003)
- Miguel Lopez (LRN: 1000000004)

**Grade 12 (Curie)**
- Anna Martinez (LRN: 1000000005)
- Carlos Fernandez (LRN: 1000000006)

### Courses (1 per section)
1. **Mathematics 101** (MATH101) → Grade 10
2. **Mathematics 201** (MATH201) → Grade 11
3. **Physics 101** (PHYS101) → Grade 12

### Modules (2 per course)
Each course has:
- Module 1: [Subject] - Part A
- Module 2: [Subject] - Part B

### Lessons (3 per module)
Each module has:
- Lesson 1: Concepts & Introduction
- Lesson 2: Worked Examples
- Lesson 3: Practice Problems

### Content per Module
- ✅ 3 Lessons (published)
- ✅ 1 Transcript (AI-generated)
- ✅ 1 Notes document

### Assessments (1 per course)
- **Type**: Quiz
- **Points**: 20
- **Time**: 30 minutes
- **Max Attempts**: 2
- **Questions**: 5 (randomized from bank)

---

## Testing Checklist

- [ ] Seed data applied
- [ ] Teacher profile created
- [ ] 3 sections visible
- [ ] 6 students enrolled
- [ ] 3 courses published
- [ ] 6 modules published
- [ ] All lessons available
- [ ] Transcripts accessible
- [ ] Question banks populated
- [ ] Assessments ready
- [ ] Randomization configured

---

## File Reference

| File | Purpose | Size |
|------|---------|------|
| **seed-test-data.sql** | Main seed script | 28 KB |
| **SEED_DATA_README.md** | Full guide & troubleshooting | 11 KB |
| **SEED_DATA_QUERIES.sql** | 50+ verification queries | 18 KB |
| **SEED_DATA_INDEX.md** | Documentation index | 15 KB |
| **QUICK_REFERENCE.md** | This file | 5 KB |

---

## Common Tasks

### Task: Verify Teacher Setup
```sql
SELECT p.full_name, tp.employee_id, tp.department
FROM n8n_content_creation.teacher_profiles tp
JOIN n8n_content_creation.profiles p ON tp.profile_id = p.id
WHERE tp.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
```

### Task: List All Students
```sql
SELECT p.full_name, s.lrn, sec.name as section
FROM n8n_content_creation.students s
JOIN n8n_content_creation.profiles p ON s.profile_id = p.id
JOIN n8n_content_creation.sections sec ON s.section_id = sec.id
WHERE s.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
ORDER BY p.full_name;
```

### Task: Check Course Content
```sql
SELECT c.name, c.subject_code, s.grade_level,
       COUNT(DISTINCT m.id) as modules,
       COUNT(DISTINCT e.student_id) as enrolled
FROM n8n_content_creation.courses c
JOIN n8n_content_creation.sections s ON c.section_id = s.id
LEFT JOIN n8n_content_creation.modules m ON c.id = m.course_id
LEFT JOIN n8n_content_creation.enrollments e ON c.id = e.course_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY c.name, c.subject_code, s.grade_level;
```

### Task: View Assessments
```sql
SELECT a.title, a.type, a.total_points, a.time_limit_minutes,
       c.name as course_name
FROM n8n_content_creation.assessments a
JOIN n8n_content_creation.courses c ON a.course_id = c.id
WHERE a.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
```

### Task: Check Question Banks
```sql
SELECT qb.name, c.name as course_name, COUNT(bq.id) as questions
FROM n8n_content_creation.teacher_question_banks qb
JOIN n8n_content_creation.courses c ON qb.course_id = c.id
LEFT JOIN n8n_content_creation.teacher_bank_questions bq ON qb.id = bq.bank_id
WHERE c.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY qb.name, c.name;
```

---

## Troubleshooting Quick Answers

**Q: Script failed with "relation does not exist"**
A: Run migrations first (001-013). Check your migrations folder.

**Q: No data appears after running**
A: Check school_id exists: `SELECT * FROM n8n_content_creation.schools WHERE id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';`

**Q: I need to clear and restart**
A: Can't easily delete cascaded data. Create new school ID instead.

**Q: Auth users missing for login**
A: Create auth users in Supabase Auth. Placeholder IDs won't work for login.

**Q: Where are my verification results?**
A: Scroll up in SQL Editor console. Script outputs details as it runs.

---

## Testing Workflows

### Workflow 1: Module Publishing ✅
- Navigate to `/teacher/subjects`
- All 6 modules are published
- Click any module to see lessons + transcript + notes

### Workflow 2: Student Content ✅
- Login as any student
- See enrolled course
- View published modules and lessons

### Workflow 3: Assessments ✅
- Student starts quiz
- Quiz generates 5 random questions
- Student submits answers
- Teacher sees in grading inbox

### Workflow 4: Grading ✅
- Teacher goes to `/teacher/submissions`
- Reviews student answers
- Grades submission
- Releases score to student

### Workflow 5: Attendance ⚠️
- Teacher can manually track attendance
- No auto-detection until live sessions added

### Workflow 6: Messaging ⚠️
- Direct messaging structure ready
- Need to implement UI

---

## Schema Location

All data lives in: **`n8n_content_creation`** schema

(NOT in `public` schema)

---

## Important Notes

⚠️ **Teacher Auth ID**: Placeholder (00000000-0000-0000-0000-000000000001)
- Won't work for actual login
- Update with real auth_user_id when creating auth user

⚠️ **Student Auth IDs**: Generated randomly
- Update with real auth_user_ids for student login

⚠️ **School ID**: Must match your existing school
- Current: 4fa1be18-ebf6-41e7-a8ee-800ac3815ecd
- Change before running if different

---

## One More Time: Setup Steps

```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. New Query
4. Copy: seed-test-data.sql (all)
5. Paste into editor
6. Run
7. Wait for completion message
8. Done!
```

---

**Questions?** See SEED_DATA_README.md

**Need queries?** See SEED_DATA_QUERIES.sql

**Full documentation?** See SEED_DATA_INDEX.md

---

*Last Updated: January 12, 2026*
