# 🎯 MSU Setup Order - What to Create & When

**The Right Way to Set Up Your School Management System**

---

## 🚨 TL;DR - You MUST Create These IN ORDER:

```
1. SCHOOL → 2. GRADING PERIODS → 3. LETTER GRADES → 4. SECTIONS → 5. COURSES
                                                              ↓
6. TEACHERS → 7. ASSIGN TEACHERS TO COURSES
                                                              ↓
8. STUDENTS → 9. ENROLL STUDENTS IN COURSES
```

**If you skip any step, enrollment will break!**

---

## 📋 Detailed Setup Checklist

### ✅ STEP 1: Create School (ONE TIME ONLY)

**Table:** `schools`

```sql
INSERT INTO schools (id, name, slug, region, division, accent_color)
VALUES (
  '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
  'Mindanao State University - Main Campus',
  'msu-main',
  'Region X',
  'Marawi City',
  '#8B0000'
);
```

**Verification:**
```sql
SELECT * FROM schools WHERE name LIKE '%MSU%';
-- Should return 1 row
```

**Status:** ✅ Already exists

---

### ✅ STEP 2: Create Grading Periods

**Table:** `grading_periods`

```sql
INSERT INTO grading_periods (school_id, name, period_type, period_number, academic_year, start_date, end_date, is_current) VALUES
  ('SCHOOL_ID', 'First Quarter 2024-2025', 'quarter', 1, '2024-2025', '2024-08-26', '2024-10-25', false),
  ('SCHOOL_ID', 'Second Quarter 2024-2025', 'quarter', 2, '2024-2025', '2024-10-28', '2024-12-20', false),
  ('SCHOOL_ID', 'Third Quarter 2024-2025', 'quarter', 3, '2024-2025', '2025-01-06', '2025-03-28', true),
  ('SCHOOL_ID', 'Fourth Quarter 2024-2025', 'quarter', 4, '2024-2025', '2025-03-31', '2025-05-30', false);
```

**Why needed:**
- Report cards need grading periods
- Grade tracking by quarter/semester
- Academic calendar organization

**Verification:**
```sql
SELECT COUNT(*) FROM grading_periods WHERE school_id = 'SCHOOL_ID';
-- Should return 4 (for quarterly) or 2 (for semester)
```

**Status:** ✅ Already exists (2 semesters)

---

### ✅ STEP 3: Create Letter Grade Scale

**Table:** `letter_grade_scales`

```sql
INSERT INTO letter_grade_scales (school_id, letter, min_grade, max_grade, gpa_points) VALUES
  ('SCHOOL_ID', 'A', 97, 100, 1.00),
  ('SCHOOL_ID', 'B+', 94, 96, 1.25),
  ('SCHOOL_ID', 'B', 91, 93, 1.50),
  ('SCHOOL_ID', 'C+', 88, 90, 1.75),
  ('SCHOOL_ID', 'C', 85, 87, 2.00),
  ('SCHOOL_ID', 'D', 80, 84, 2.25),
  ('SCHOOL_ID', 'E', 75, 79, 2.50),
  ('SCHOOL_ID', 'F', 0, 74, 5.00);
```

**Why needed:**
- Convert numeric grades (85) to letter grades (C)
- Calculate GPA
- Generate report cards

**Verification:**
```sql
SELECT COUNT(*) FROM letter_grade_scales WHERE school_id = 'SCHOOL_ID';
-- Should return 8
```

**Status:** ❌ MISSING - Need to create

---

### ✅ STEP 4: Create Sections

**Table:** `sections`

```sql
-- Junior High (Grade 10)
INSERT INTO sections (school_id, name, grade_level, capacity) VALUES
  ('SCHOOL_ID', 'Grade 10 - Section A', '10', 40),
  ('SCHOOL_ID', 'Grade 10 - Section B', '10', 40),
  ('SCHOOL_ID', 'Grade 10 - Section C', '10', 40);

-- Senior High (Grade 11 - by track)
INSERT INTO sections (school_id, name, grade_level, capacity) VALUES
  ('SCHOOL_ID', 'Grade 11 - STEM A', '11', 35),
  ('SCHOOL_ID', 'Grade 11 - ABM A', '11', 35),
  ('SCHOOL_ID', 'Grade 11 - HUMSS A', '11', 35);

-- Senior High (Grade 12 - by track)
INSERT INTO sections (school_id, name, grade_level, capacity) VALUES
  ('SCHOOL_ID', 'Grade 12 - STEM A', '12', 35),
  ('SCHOOL_ID', 'Grade 12 - ABM A', '12', 35),
  ('SCHOOL_ID', 'Grade 12 - HUMSS A', '12', 35);
```

**Why needed:**
- Students must be assigned to a section
- Courses are created per section
- Class size management

**Verification:**
```sql
SELECT grade_level, COUNT(*) as sections
FROM sections
WHERE school_id = 'SCHOOL_ID'
GROUP BY grade_level;
-- Should return: Grade 10: 3, Grade 11: 3, Grade 12: 3
```

**Status:** ⚠️ Partial - Only 3 sections exist (Grade 10-12 Einstein/Newton/Curie)

---

### ❌ STEP 5: Create COMPLETE Course Catalog

**Table:** `courses`

**This is what's MISSING and breaking your flow!**

**Current:** Only 6 courses (Math & Science for 3 grades)
**Should Have:** 72 courses (8-10 subjects × 9 sections)

```
Grade 10 Section A: 8 courses (Math, Sci, Eng, Fil, AP, ESP, MAPEH, TLE)
Grade 10 Section B: 8 courses
Grade 10 Section C: 8 courses
Grade 11 STEM: 10 courses (7 core + 3 STEM specialized)
Grade 11 ABM: 10 courses (7 core + 3 ABM specialized)
Grade 11 HUMSS: 10 courses (7 core + 3 HUMSS specialized)
Grade 12 STEM: 10 courses
Grade 12 ABM: 10 courses
Grade 12 HUMSS: 10 courses

TOTAL: 72 courses
```

**Why needed:**
- Teachers need courses to be assigned to
- Students need courses to enroll in
- Can't create courses ad-hoc when adding teacher

**Quick Script:**
```bash
scripts/msu-foundation-setup.sql  # Creates all 72 courses automatically
```

**Status:** ❌ CRITICAL - Only 8% complete (6 of 72 courses exist)

---

### ⏸️ STEP 6: Add Teachers (After Steps 1-5)

**Table:** `school_profiles` + `teacher_profiles`

**Now you can add teachers because:**
- ✅ School exists
- ✅ Sections exist
- ✅ ALL courses exist
- ✅ You know exactly what courses to assign

**Quick Script:**
```bash
scripts/admin-add-teacher.sql
```

**Assignment Example:**
```sql
-- Assign Math teacher to ALL Math courses across all grades
INSERT INTO teacher_assignments (teacher_profile_id, course_id, section_id, school_id)
SELECT
  'TEACHER_ID',
  c.id,
  c.section_id,
  c.school_id
FROM courses c
WHERE c.subject_code LIKE 'MATH%'  -- All Math courses
AND c.school_id = 'SCHOOL_ID';
```

---

### ⏸️ STEP 7: Assign Teachers to Courses (After Step 6)

**Table:** `teacher_assignments`

**Quick Script:**
```bash
scripts/admin-assign-teacher.sql
```

**Use Cases:**
```sql
-- Use Case 1: Assign to all courses in ONE subject
WHERE c.subject_code LIKE 'MATH%'

-- Use Case 2: Assign to all courses in ONE section
WHERE c.section_id = 'SECTION_ID'

-- Use Case 3: Assign to all courses in ONE grade
WHERE c.subject_code LIKE 'MATH10%'  -- All Grade 10 Math
```

---

### ⏸️ STEP 8: Add Students (After Steps 1-7)

**Table:** `school_profiles` + `students`

**Now you can add students because:**
- ✅ School exists
- ✅ Sections exist with capacity
- ✅ Courses exist for enrollment

**Quick Script:**
```bash
scripts/admin-add-student.sql
```

**Auto-assigns:**
- Student's section based on grade level
- Student's grade level
- Generates or accepts LRN

---

### ⏸️ STEP 9: Enroll Students (After Step 8)

**Table:** `enrollments`

**Automatic enrollment:**
```sql
-- When student is added to section, auto-enroll in ALL section courses
INSERT INTO enrollments (student_id, course_id, school_id)
SELECT
  'STUDENT_ID',
  c.id,
  c.school_id
FROM courses c
WHERE c.section_id = (SELECT section_id FROM students WHERE id = 'STUDENT_ID');
```

**Quick Script:** Already included in `admin-add-student.sql`

---

## 🎯 Quick Start Command

**Run this ONE command to set up everything:**

```bash
# In Supabase SQL Editor:
\i scripts/msu-foundation-setup.sql
```

**This creates:**
- ✅ MSU Main Campus school
- ✅ 9 sections (3 per grade level)
- ✅ 72 courses (complete Philippine curriculum)
- ✅ 4 grading periods
- ✅ 8 letter grade scales

**After this:**
- Admin can add teachers → Assign to existing courses
- Admin can add students → Auto-enroll in section courses
- No more "what course should I create?" confusion

---

## 📊 What Currently Exists vs. What's Needed

| Item | Current | Needed | Status |
|------|---------|--------|--------|
| Schools | 1 (MSU Main) | 1 | ✅ Good |
| Sections | 3 (partial) | 9 (3 per grade) | ⚠️ Need 6 more |
| Courses | 6 (Math & Sci only) | 72 (all subjects) | ❌ Need 66 more |
| Grading Periods | 2 (semesters) | 4 (quarters) or 2 | ✅ Good |
| Letter Grades | 0 | 8 (A-F scale) | ❌ MISSING |
| Teachers | 3 | Unlimited | ✅ Can add more |
| Students | 17 | Unlimited | ✅ Can add more |

---

## ❌ What's Breaking Right Now

### Problem 1: Incomplete Course Catalog

**Scenario:**
```
Admin: "I want to add an English teacher"
System: "What courses should I assign them to?"
Admin: "English courses"
System: "No English courses exist!"
Admin: "Oh... let me create English courses first"
System: "You need to create 9 English courses (one per section)"
Admin: "This is tedious and error-prone!"
```

**Solution:**
Run `msu-foundation-setup.sql` to create ALL courses at once.

### Problem 2: No Grading Scale

**Scenario:**
```
Teacher gives grade: 85
System needs to show: "C" on report card
System looks up: letter_grade_scales table
Result: Empty! No data!
Report card shows: Just "85" (no letter grade)
```

**Solution:**
Run `msu-foundation-setup.sql` to create grading scale.

### Problem 3: Section-Course Mismatch

**Scenario:**
```
Student is in: "Grade 10 - Section A"
Student enrolls in: Mathematics 10
Course exists but: Only for "Grade 10 - Section B"
Result: Student can't access course (wrong section)
```

**Solution:**
Create courses for ALL sections, not just one.

---

## 🎓 Philippine DepEd K-12 Standard Subjects

### Grade 10 (Junior High - Final Year)

All sections must have these 8 subjects:

1. **Mathematics 10** - Pattern Recognition, Algebra
2. **Science 10** - Earth Science, Astronomy
3. **English 10** - Literature, Composition
4. **Filipino 10** - Panitikan, Gramatika
5. **Araling Panlipunan 10** - Philippine History, Economics
6. **Edukasyon sa Pagpapakatao 10** - Values, Ethics
7. **MAPEH 10** - Music, Arts, PE, Health (combined)
8. **TLE 10** - ICT, Home Economics, or Industrial Arts

### Grade 11 (Senior High - 1st Year)

All tracks must have these 7 CORE subjects:

1. **General Mathematics** - Business Math, Consumer Math
2. **Earth and Life Science** - Biology, Geology
3. **Reading and Writing** - Academic Writing
4. **Komunikasyon at Pananaliksik** - Research in Filipino
5. **Understanding Culture, Society & Politics** - Sociology, Anthropology
6. **Physical Education & Health 11**
7. **Practical Research 1** - Introduction to Research

PLUS 3 specialized subjects based on track:

**STEM:** Pre-Calculus, General Physics 1, General Chemistry 1
**ABM:** Business Math, Applied Economics, Organization & Management
**HUMSS:** Creative Writing, World Religions, Disciplines & Ideas in Social Sciences

### Grade 12 (Senior High - 2nd Year)

Same pattern: 7 core + 3 specialized per track

---

## 🔧 Your Current Database Status

### What EXISTS ✅

```
✅ School: MSU Main Campus
✅ Sections: 3 (but incomplete - need 9)
✅ Grading Periods: 2 semesters for 2024-2025
✅ Students: 17
✅ Teachers: 3
✅ Enrollments: 48
✅ Teacher Assignments: 10
```

### What's MISSING ❌

```
❌ COURSES: Only 6 of 72 exist (92% missing!)
   - Exists: Math & Science for 3 grades
   - Missing: English, Filipino, AP, ESP, MAPEH, TLE
   - Missing: STEM/ABM/HUMSS specialized courses

❌ LETTER GRADE SCALES: 0 of 8 needed
   - Can't convert 85 → "C"
   - Can't calculate GPA properly
   - Report cards show only numbers

❌ SECTIONS: Only 3 of 9 needed
   - Exists: Einstein, Newton, Curie (1 per grade)
   - Missing: Multiple sections per grade
   - Missing: Track-based sections for Grade 11-12
```

---

## 🚀 How to Fix Everything

### OPTION 1: Automated Setup (Recommended)

```bash
# Run in Supabase SQL Editor
\i scripts/msu-foundation-setup.sql
```

**Time:** 5 seconds
**Creates:** Everything you need automatically

### OPTION 2: Manual Setup

```bash
# 1. Create sections
\i scripts/create-sections.sql

# 2. Create complete course catalog
\i scripts/create-msu-courses.sql

# 3. Create grading scales
\i scripts/create-grading-scales.sql
```

**Time:** 15 minutes
**Risk:** Human error, typos in course names

---

## 📋 After Foundation Setup

### NOW You Can (In This Order):

**1. Add Teachers:**
```bash
# Create auth user in Supabase Dashboard
# Then run:
\i scripts/admin-add-teacher.sql
```

**2. Assign Teachers to Courses:**
```sql
-- Example: Assign to all Math courses
INSERT INTO teacher_assignments (teacher_profile_id, course_id, section_id, school_id)
SELECT 'TEACHER_ID', c.id, c.section_id, c.school_id
FROM courses c
WHERE c.subject_code LIKE 'MATH%';
-- Automatically assigns to ALL Math courses (9 courses if 9 sections exist)
```

**3. Add Students:**
```bash
# Create auth user in Supabase Dashboard
# Then run:
\i scripts/admin-add-student.sql
# Auto-enrolls in all section courses (8-10 courses automatically)
```

---

## 🎯 Recommended: Run Foundation Setup Now

### Current State:
```
❌ 92% of courses missing
❌ No grading scale
⚠️ Incomplete sections
→ Can't add teachers properly
→ Can't enroll students properly
→ Report cards don't work
```

### After Running msu-foundation-setup.sql:
```
✅ 100% of courses exist
✅ Grading scale configured
✅ All sections created
→ Add teachers: Just assign to existing courses
→ Add students: Auto-enroll in section courses
→ Everything works!
```

---

## 🔍 Dependencies Visualization

```
BEFORE YOU CAN ADD STUDENTS:
├─ School must exist ✅
├─ Grading periods must exist ✅
├─ Sections must exist ⚠️ (partial)
├─ Courses must exist ❌ (only 8% complete)
└─ Letter grades must exist ❌ (missing)

BEFORE YOU CAN ADD TEACHERS:
├─ School must exist ✅
├─ Courses must exist ❌ (only 8% complete)
└─ Sections must exist ⚠️ (partial)

BEFORE YOU CAN ENROLL STUDENTS:
├─ Students must exist ✅
├─ Courses must exist ❌ (only 8% complete)
└─ Same school_id for student & course ✅

BEFORE YOU CAN ASSIGN TEACHERS:
├─ Teachers must exist ✅
├─ Courses must exist ❌ (only 8% complete)
└─ Same school_id for teacher & course ✅
```

---

## ⚡ CRITICAL: Run Foundation Setup Before Your Next Demo

**Current situation:**
- ✅ Student app is deployed
- ✅ Auth is fixed
- ❌ Only Math & Science courses exist
- ❌ Can't demonstrate full curriculum
- ❌ Can't add English/Filipino teachers

**Recommended action:**
1. Run `scripts/msu-foundation-setup.sql` RIGHT NOW
2. Creates complete 72-course catalog
3. Then add more teachers for other subjects
4. Then add more students
5. Demo will show complete school system!

---

**NEXT:** Run `msu-foundation-setup.sql` to create foundation data!
