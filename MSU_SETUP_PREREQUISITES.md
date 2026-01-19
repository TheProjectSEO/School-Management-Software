# 🎓 MSU School Management - Setup Prerequisites & Order

**What Must Exist BEFORE Adding Students/Teachers**

---

## ⚠️ Current Problem

You're right! Currently we have:
- ✅ 12 courses exist (ad-hoc, incomplete)
- ❌ NO standard MSU course catalog
- ❌ Courses were created on-the-fly when needed
- ❌ Admins don't know what courses to assign teachers to

**This causes:**
- Confusion: "What course IDs do I use?"
- Inconsistency: Different sections have different courses
- Errors: Missing courses break enrollment flow

---

## ✅ The Correct Setup Order

### PHASE 1: FOUNDATIONAL DATA (Do This FIRST)
Must be created before anything else:

```
1. School Record
   ├─ Table: schools
   ├─ Must have: name, region, division
   └─ Status: ✅ Exists (MSU Main Campus)

2. Academic Year & Grading Periods
   ├─ Table: grading_periods
   ├─ Must have: academic_year, start_date, end_date
   └─ Status: ✅ Exists (2024-2025 school year)

3. Sections (Class Organization)
   ├─ Table: sections
   ├─ Must have: section per grade level
   └─ Status: ⚠️ Partial (only 3 sections for 3 grades)

4. COMPLETE COURSE CATALOG
   ├─ Table: courses
   ├─ Must have: ALL subjects for ALL grade levels
   └─ Status: ❌ MISSING - Only Math & Science exist!
```

### PHASE 2: STAFF (After Phase 1)
Can only be done after courses exist:

```
5. Add Teachers
   ├─ Tables: school_profiles + teacher_profiles
   ├─ Depends on: schools existing
   └─ Status: ✅ 3 teachers exist

6. Assign Teachers to Courses
   ├─ Table: teacher_assignments
   ├─ Depends on: teachers AND courses existing
   └─ Status: ⚠️ Partial (only Math & Science assigned)
```

### PHASE 3: STUDENTS (After Phase 1 & 2)
Can only be done after courses and teachers exist:

```
7. Add Students
   ├─ Tables: school_profiles + students
   ├─ Depends on: sections existing
   └─ Status: ✅ 17 students exist

8. Enroll Students in Courses
   ├─ Table: enrollments
   ├─ Depends on: students AND courses existing
   └─ Status: ⚠️ Partial (only Math & Science enrollments)
```

---

## ❌ What's Currently MISSING

### 1. Complete Course Catalog

**Current State:**
- Only 6 courses exist: Math 1001-1201, Science 1001-1201
- Missing: English, Filipino, Social Studies, Values Ed, MAPEH, TLE

**Should Have:**
```
Philippine High School Curriculum (Grades 10-12)

CORE SUBJECTS (Required):
├─ Mathematics (MATH)
├─ Science (SCI) - Biology, Chemistry, Physics
├─ English (ENG)
├─ Filipino (FIL)
├─ Araling Panlipunan / Social Studies (AP)
├─ Edukasyon sa Pagpapakatao / Values Ed (ESP)
├─ MAPEH (Music, Arts, PE, Health)
└─ Research (for Grade 11-12)

SPECIALIZED TRACKS (Senior High):
├─ STEM Track
│   ├─ Pre-Calculus
│   ├─ Basic Calculus
│   └─ General Physics
├─ ABM Track
│   ├─ Business Math
│   ├─ Applied Economics
│   └─ Business Finance
├─ HUMSS Track
│   ├─ Creative Writing
│   ├─ World Religions
│   └─ Philippine Politics
└─ TVL Track
    ├─ Technical courses
    └─ Livelihood courses
```

### 2. Standard Subject Templates

**Missing:** Subject templates that can be duplicated per grade/section

**Should Have:**
```sql
-- Example: Mathematics subject template
Subject: Mathematics
Code Pattern: MATH{grade}{section}
Grade 10: MATH1001, MATH1002, MATH1003 (per section)
Grade 11: MATH1101, MATH1102, MATH1103
Grade 12: MATH1201, MATH1202, MATH1203

-- Same pattern for all subjects
```

### 3. Department Structure

**Missing:** Department definitions

**Should Have:**
```
Departments:
├─ Mathematics Department
├─ Science Department
├─ Language Department (English & Filipino)
├─ Social Studies Department
├─ MAPEH Department
├─ TLE Department
└─ Senior High Specialized Tracks
```

### 4. School Settings & Policies

**Missing:** Basic school configuration

**Should Have:**
```sql
-- In school_settings table
- Grading scale (transmutation table)
- Passing grade threshold (75%)
- Maximum enrollments per student
- Class size limits
- Academic calendar settings
```

---

## 📋 PRE-REQUISITES CHECKLIST

Before adding any students or teachers, ensure these exist:

### ☑️ TIER 1: School Foundation
```
□ School record in schools table
  └─ name: "Mindanao State University - Main Campus"
  └─ id: Fixed UUID for consistency

□ School settings in school_settings table
  └─ Grading scale configuration
  └─ Academic policies

□ Academic calendar in grading_periods table
  └─ Current school year: 2024-2025
  └─ Grading periods: 1st Semester, 2nd Semester
  └─ Start and end dates defined
```

### ☑️ TIER 2: Academic Structure
```
□ Grade levels defined (10, 11, 12)

□ Sections created for each grade
  └─ Grade 10: Section A, B, C
  └─ Grade 11: Section A, B, C (or by track: STEM-A, ABM-A, etc.)
  └─ Grade 12: Section A, B, C (or by track)

□ Section capacity limits set
  └─ Typical: 40-45 students per section
```

### ☑️ TIER 3: Complete Course Catalog
```
□ CORE SUBJECTS for Grade 10:
  □ MATH1001 - Mathematics 10
  □ SCI1001 - Science 10 (Earth Science)
  □ ENG1001 - English 10
  □ FIL1001 - Filipino 10
  □ AP1001 - Araling Panlipunan 10
  □ ESP1001 - Values Education 10
  □ MAPEH1001 - MAPEH 10
  □ TLE1001 - TLE 10 (ICT/Home Ec/etc.)

□ CORE SUBJECTS for Grade 11:
  □ MATH1101 - General Mathematics
  □ SCI1101 - Earth and Life Science
  □ ENG1101 - Reading and Writing
  □ FIL1101 - Komunikasyon at Pananaliksik
  □ AP1101 - Understanding Culture & Society
  □ PE1101 - Physical Education 11
  □ RESEARCH1101 - Research 1

□ TRACK SUBJECTS for Grade 11:
  □ STEM: Pre-Calculus, General Physics, General Chemistry
  □ ABM: Business Math, Applied Economics, Organization
  □ HUMSS: Creative Writing, Disciplines & Ideas, World Religions
  □ TVL: Technical courses based on specialization

□ CORE SUBJECTS for Grade 12:
  □ MATH1201 - Statistics and Probability
  □ SCI1201 - Physical Science
  □ ENG1201 - 21st Century Literature
  □ FIL1201 - Pagbasa at Pagsusuri
  □ AP1201 - Philippine Politics & Governance
  □ PE1201 - Physical Education 12
  □ RESEARCH1201 - Research 2

□ TRACK SUBJECTS for Grade 12:
  □ STEM: Basic Calculus, General Biology, Chemistry/Physics
  □ ABM: Business Finance, Entrepreneurship, Applied Economics
  □ HUMSS: Trends & Networks, Community Engagement
  □ TVL: Advanced technical courses
```

### ☑️ TIER 4: Course Templates
```
□ Each course has:
  □ Standard name
  □ Unique subject code
  □ Assigned section
  □ Grade level
  □ School ID

□ Course metadata (optional):
  □ Description
  □ Prerequisites
  □ Units/hours
  □ Grading components
```

---

## 🚨 What's Breaking Your Current Flow

### Issue #1: Incomplete Course Catalog

**Problem:**
```
Admin wants to add Math teacher
→ Need to assign to courses
→ Only MATH1001, MATH1101, MATH1201 exist
→ What about English teacher? No ENG courses exist!
→ Can't assign → Teacher can't login properly
```

**Solution:**
Create COMPLETE course catalog FIRST before adding teachers.

### Issue #2: No Section-Course Template

**Problem:**
```
Admin creates new section "Grade 10-C"
→ Need to add all 8 core subjects for this section
→ Must manually create 8 course records
→ Easy to miss subjects → Incomplete enrollment
```

**Solution:**
Create a "subject template" that can be cloned for new sections.

### Issue #3: Missing Grading Scale

**Problem:**
```
Teacher gives numeric grade: 85
→ System needs to convert to letter grade: B
→ No grading_scale table or data exists
→ Can't generate report cards properly
```

**Solution:**
Create grading scale/transmutation table.

### Issue #4: No Department Management

**Problem:**
```
Teacher profile has "department" field
→ But no departments table exists
→ Just free-text entry → Inconsistent data
→ Can't filter/search by department properly
```

**Solution:**
Create departments table with standard department list.

---

## 🎯 The Correct Setup Sequence

### STEP 1: Run Foundation Setup (ONE TIME)

```sql
-- This creates everything you need BEFORE adding users
\i scripts/msu-foundation-setup.sql

-- Creates:
-- ✅ 1 School (MSU Main Campus)
-- ✅ 9 Sections (Grade 10 A-C, Grade 11 STEM/ABM/HUMSS, Grade 12 STEM/ABM/HUMSS)
-- ✅ 60+ Courses (complete curriculum for all grades/sections)
-- ✅ 4 Grading periods (Q1-Q4 for 2024-2025)
-- ✅ Grading scale (75-100 → letter grades)
-- ✅ 8 Departments
```

### STEP 2: Add Teachers

```sql
-- NOW you can add teachers because courses exist!
-- Admin knows exactly what courses to assign

-- Example: Add Math teacher
\i scripts/admin-add-teacher.sql  -- Creates teacher
\i scripts/admin-assign-teacher.sql  -- Assign to ALL Math courses automatically
```

### STEP 3: Add Students

```sql
-- NOW you can add students because:
-- ✅ Sections exist
-- ✅ Courses exist for their section
-- ✅ Teachers are assigned

\i scripts/admin-add-student.sql  -- Creates student + auto-enrolls in section courses
```

---

## 📊 What Tables Need Data BEFORE Enrollment

### Priority 1: MUST EXIST (or nothing works)
1. ✅ `schools` - At least 1 school record
2. ❌ `departments` - **MISSING TABLE** (need to create)
3. ✅ `grading_periods` - Current academic year periods
4. ❌ `grading_scales` - **EXISTS but no data** for letter grades

### Priority 2: SHOULD EXIST (or limited functionality)
5. ✅ `sections` - At least 1 section per grade level
6. ❌ `courses` - **INCOMPLETE** - Only Math & Science exist
7. ❌ `subject_templates` - **MISSING TABLE** (for easy course creation)

### Priority 3: NICE TO HAVE (improves UX)
8. ❌ `school_calendar` - **MISSING** - Holidays, events
9. ❌ `behavior_codes` - **EXISTS but empty** - Conduct policies
10. ❌ `attendance_policies` - **MISSING** - Late/absence rules

---

## 🔨 Creating Missing Prerequisites

### Missing #1: Departments Table

```sql
-- Check if exists
SELECT * FROM information_schema.tables
WHERE table_name = 'departments';

-- If doesn't exist, we'll use teacher_profiles.department as TEXT
-- OR create a proper departments table:

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  head_teacher_id UUID REFERENCES teacher_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, name)
);

-- Insert standard departments
INSERT INTO departments (school_id, name, code) VALUES
  ('SCHOOL_ID', 'Mathematics Department', 'MATH'),
  ('SCHOOL_ID', 'Science Department', 'SCI'),
  ('SCHOOL_ID', 'Language Department', 'LANG'),
  ('SCHOOL_ID', 'Social Studies Department', 'SOCSCI'),
  ('SCHOOL_ID', 'MAPEH Department', 'MAPEH'),
  ('SCHOOL_ID', 'TLE Department', 'TLE'),
  ('SCHOOL_ID', 'Senior High STEM', 'STEM'),
  ('SCHOOL_ID', 'Senior High ABM', 'ABM');
```

### Missing #2: Complete Course Catalog

**Currently exists:** Only 6 courses (Math 1001-1201, Sci 1001-1201)

**Should exist:** 60+ courses for complete curriculum

```sql
-- Philippine DepEd K-12 Curriculum for Grades 10-12

-- GRADE 10 CORE SUBJECTS (8 subjects × 3 sections = 24 courses)
INSERT INTO courses (id, school_id, section_id, name, subject_code) VALUES
  -- Section A
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'Mathematics 10', 'MATH1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'Science 10', 'SCI1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'English 10', 'ENG1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'Filipino 10', 'FIL1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'Araling Panlipunan 10', 'AP1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'Values Education 10', 'ESP1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'MAPEH 10', 'MAPEH1001-A'),
  (gen_random_uuid(), 'SCHOOL_ID', 'SECTION_10A_ID', 'TLE-ICT 10', 'TLE1001-A');

-- Repeat for sections B and C...

-- GRADE 11 CORE + STEM TRACK (10 subjects × 2 sections = 20 courses)
-- GRADE 12 CORE + STEM TRACK (10 subjects × 2 sections = 20 courses)

-- TOTAL: ~64 courses for 3 grades × 3 sections
```

### Missing #3: Grading Scale Data

```sql
-- Check if letter_grade_scales table exists and has data
SELECT * FROM letter_grade_scales
WHERE school_id = 'SCHOOL_ID';

-- If empty, insert standard Philippine grading scale
INSERT INTO letter_grade_scales (school_id, letter, min_grade, max_grade, gpa_points) VALUES
  ('SCHOOL_ID', 'A', 97, 100, 1.00),
  ('SCHOOL_ID', 'B+', 94, 96, 1.25),
  ('SCHOOL_ID', 'B', 91, 93, 1.50),
  ('SCHOOL_ID', 'C+', 88, 90, 1.75),
  ('SCHOOL_ID', 'C', 85, 87, 2.00),
  ('SCHOOL_ID', 'D', 80, 84, 2.25),
  ('SCHOOL_ID', 'E', 75, 79, 2.50),
  ('SCHOOL_ID', 'F', 0, 74, 5.00);  -- Failing
```

---

## 📝 MSU Standard Course Catalog

### Grade 10 (Junior High - 4th Year)

| Subject Code | Subject Name | Department | Weekly Hours | Units |
|--------------|--------------|------------|--------------|-------|
| MATH1001 | Mathematics 10 | Math | 5 | 5.0 |
| SCI1001 | Science 10 (Earth Science) | Science | 5 | 5.0 |
| ENG1001 | English 10 | Language | 5 | 5.0 |
| FIL1001 | Filipino 10 | Language | 5 | 5.0 |
| AP1001 | Araling Panlipunan 10 | Social Studies | 4 | 4.0 |
| ESP1001 | Edukasyon sa Pagpapakatao 10 | Values Ed | 2 | 2.0 |
| MAPEH1001 | MAPEH 10 | MAPEH | 4 | 4.0 |
| TLE1001 | Technology & Livelihood Ed 10 | TLE | 4 | 4.0 |

**Total:** 8 core subjects = 34 units per week

### Grade 11 (Senior High - 1st Year)

#### Core Subjects (All Tracks)
| Subject Code | Subject Name | Weekly Hours | Units |
|--------------|--------------|--------------|-------|
| MATH1101 | General Mathematics | 4 | 4.0 |
| SCI1101 | Earth and Life Science | 4 | 4.0 |
| ENG1101 | Reading and Writing | 4 | 4.0 |
| FIL1101 | Komunikasyon at Pananaliksik | 4 | 4.0 |
| AP1101 | Understanding Culture, Society & Politics | 4 | 4.0 |
| PE1101 | Physical Education & Health 11 | 2 | 2.0 |
| RESEARCH1101 | Research 1 / Practical Research | 2 | 2.0 |

#### STEM Track (add to core)
| Subject Code | Subject Name | Weekly Hours | Units |
|--------------|--------------|--------------|-------|
| STEM1101 | Pre-Calculus | 4 | 4.0 |
| STEM1102 | General Physics 1 | 4 | 4.0 |
| STEM1103 | General Chemistry 1 | 4 | 4.0 |

#### ABM Track (add to core)
| Subject Code | Subject Name | Weekly Hours | Units |
|--------------|--------------|--------------|-------|
| ABM1101 | Business Math | 4 | 4.0 |
| ABM1102 | Applied Economics | 4 | 4.0 |
| ABM1103 | Organization and Management | 4 | 4.0 |

### Grade 12 (Senior High - 2nd Year)

Same pattern as Grade 11 but with 1201-1203 codes.

---

## 🔧 What You Need to Do RIGHT NOW

### IMMEDIATE ACTION REQUIRED:

1. **Create complete MSU course catalog**
   - Define all 60+ courses for Grades 10-12
   - Assign subject codes
   - Link to sections

2. **Create missing prerequisite data:**
   - Letter grade scales
   - Departments (if needed)
   - School policies in settings

3. **THEN add teachers:**
   - Assign to pre-existing courses
   - Clear list of what courses they'll teach

4. **THEN add students:**
   - Enroll in pre-existing courses
   - Automatic based on section

---

## 📦 Solution: Foundation Setup Script

I'll create a complete foundation setup script that:

1. ✅ Creates MSU Main Campus school (if not exists)
2. ✅ Creates 9 sections (10-A/B/C, 11-STEM/ABM/HUMSS, 12-STEM/ABM/HUMSS)
3. ✅ Creates 64 courses (complete Grade 10-12 curriculum)
4. ✅ Creates grading periods for 2024-2025
5. ✅ Creates letter grade scale
6. ✅ Sets up school settings

**After running this script ONCE:**
- Admins can add teachers and assign to existing courses
- Admins can add students and auto-enroll in section courses
- No more confusion about "what course ID to use"

---

**Creating the foundation script now...**
