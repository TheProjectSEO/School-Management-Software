# Foundational Data Dependencies Guide

## 🎯 Critical Question: What Must Exist BEFORE Enrollment?

**Answer:** Several foundational data structures must exist, or enrollment will fail or be incomplete.

---

## 📊 Complete Dependency Chain

```
LEVEL 0: NO DEPENDENCIES (Must exist first)
├─ 1. School (schools)
│  └─ Status: ✅ Usually exists
│
LEVEL 1: DEPENDS ON SCHOOL ONLY
├─ 2. Academic Years (academic_years) ⚠️ MISSING
│  └─ Status: ❌ Table might exist, but data missing
│
├─ 3. Grading Periods (grading_periods)
│  └─ Status: ⚠️ Partial (might exist but incomplete)
│
├─ 4. Letter Grade Scales (letter_grade_scales)
│  └─ Status: ❌ MISSING - Critical for grading
│
├─ 5. Academic Tracks (academic_tracks) ⚠️ MISSING
│  └─ Status: ❌ Needed for Senior High (STEM/ABM/HUMSS)
│
LEVEL 2: DEPENDS ON SCHOOL + SECTIONS
├─ 6. Sections (sections)
│  └─ Status: ⚠️ Partial (we just created script)
│
LEVEL 3: DEPENDS ON SCHOOL + SECTIONS
├─ 7. Courses (courses)
│  └─ Status: ❌ CRITICAL - Only 8% complete (6 of 72 courses)
│
LEVEL 4: DEPENDS ON SCHOOL + SECTIONS + COURSES
├─ 8. Enrollments (enrollments)
│  └─ Status: ⚠️ Can't work properly without #1-7
```

---

## 🔴 CRITICAL MISSING DATA

### 1. Academic Years (`academic_years`) ❌ MISSING

**Why Critical:**
- Enrollments table has `academic_year_id` field
- Report cards need academic year context
- Grade tracking needs academic year
- **Current Status:** Field exists in enrollments, but no academic years created

**Impact:**
- ✅ Enrollment can work without it (field might be nullable)
- ❌ Report cards won't show correct year
- ❌ Can't filter enrollments by year
- ❌ Grade history incomplete

**Fix:**
```sql
-- Create academic year
INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES (
  gen_random_uuid(),
  'YOUR_SCHOOL_ID',
  '2024-2025',
  '2024-08-01',
  '2025-05-31',
  true
);
```

---

### 2. Letter Grade Scales (`letter_grade_scales`) ❌ MISSING

**Why Critical:**
- Converts numeric grades (85) → letter grades (C)
- Required for GPA calculation
- Required for report cards
- **Current Status:** Table exists, but NO DATA

**Impact:**
- ✅ Enrollment works fine
- ❌ Can't calculate GPA
- ❌ Report cards show only numbers (no letter grades)
- ❌ Can't generate transcripts properly

**Fix:**
```sql
-- Create Philippine grading scale
INSERT INTO letter_grade_scales (school_id, letter, min_grade, max_grade, gpa_points)
VALUES
  ('SCHOOL_ID', 'A', 97, 100, 1.00),
  ('SCHOOL_ID', 'B+', 94, 96, 1.25),
  ('SCHOOL_ID', 'B', 91, 93, 1.50),
  ('SCHOOL_ID', 'C+', 88, 90, 1.75),
  ('SCHOOL_ID', 'C', 85, 87, 2.00),
  ('SCHOOL_ID', 'D', 80, 84, 2.25),
  ('SCHOOL_ID', 'E', 75, 79, 2.50),
  ('SCHOOL_ID', 'F', 0, 74, 5.00);
```

---

### 3. Academic Tracks (`academic_tracks`) ❌ MISSING

**Why Critical:**
- Senior High School has tracks: STEM, ABM, HUMSS, GA
- Sections should be linked to tracks
- Courses are track-specific
- **Current Status:** Table might not exist or has no data

**Impact:**
- ✅ Enrollment works for Junior High (no tracks)
- ❌ Can't properly organize Senior High sections
- ❌ Can't filter courses by track
- ❌ Missing track-specific course requirements

**Fix:**
```sql
-- Create academic tracks
INSERT INTO academic_tracks (id, school_id, name, code, description)
VALUES
  (gen_random_uuid(), 'SCHOOL_ID', 'Science, Technology, Engineering, and Mathematics', 'STEM', 'For students pursuing careers in science, engineering, mathematics, medicine, and technology'),
  (gen_random_uuid(), 'SCHOOL_ID', 'Accountancy, Business, and Management', 'ABM', 'For students interested in business, accounting, management, and entrepreneurship'),
  (gen_random_uuid(), 'SCHOOL_ID', 'Humanities and Social Sciences', 'HUMSS', 'For students pursuing social sciences, mass communication, education, and liberal arts'),
  (gen_random_uuid(), 'SCHOOL_ID', 'General Academic', 'GA', 'For students pursuing general academic track');
```

---

### 4. Grading Periods (`grading_periods`) ⚠️ PARTIAL

**Why Critical:**
- Required for grade entry (Q1, Q2, Q3, Q4)
- Required for report cards
- Required for GPA calculation
- **Current Status:** Might exist but incomplete

**Impact:**
- ✅ Enrollment works fine
- ❌ Can't enter grades (no periods to assign to)
- ❌ Can't generate report cards
- ❌ Can't track progress by quarter

**Fix:**
```sql
-- Create grading periods for current academic year
INSERT INTO grading_periods (school_id, name, academic_year, start_date, end_date, is_active)
VALUES
  ('SCHOOL_ID', 'First Quarter 2024-2025', '2024-2025', '2024-08-26', '2024-10-25', false),
  ('SCHOOL_ID', 'Second Quarter 2024-2025', '2024-2025', '2024-10-28', '2024-12-20', false),
  ('SCHOOL_ID', 'Third Quarter 2024-2025', '2024-2025', '2025-01-06', '2025-03-28', true),
  ('SCHOOL_ID', 'Fourth Quarter 2024-2025', '2024-2025', '2025-03-31', '2025-05-30', false);
```

---

### 5. Courses (`courses`) ❌ CRITICAL - 92% MISSING

**Why Critical:**
- Students can't enroll without courses
- Auto-enrollment during approval requires courses
- Teachers need courses to teach
- **Current Status:** Only 6 of 72 courses exist (8% complete)

**Impact:**
- ❌ **ENROLLMENT BREAKS** - No courses to enroll in
- ❌ Can't approve applications (no courses to auto-enroll)
- ❌ Teachers have nothing to teach
- ❌ Students see empty course list

**Fix:**
```sql
-- Run complete course catalog script
-- This creates 72 courses (8-10 per section × 9 sections)
\i scripts/msu-foundation-setup.sql
```

---

### 6. Sections (`sections`) ⚠️ PARTIAL

**Why Critical:**
- Students must be assigned to a section
- Courses are linked to sections
- **Current Status:** Only 3 sections exist, need 9+ (we just created script)

**Impact:**
- ❌ Can't approve applications (no section to assign)
- ❌ Can't create courses (courses need sections)
- ✅ **FIXED:** We created `scripts/create-sections.sql`

**Fix:**
```sql
-- Run sections creation script
\i scripts/create-sections.sql
```

---

## 📋 Complete Setup Checklist

### Phase 1: Foundation (Do FIRST)

- [ ] **School** (`schools`)
  - Status: ✅ Usually exists
  - Verification: `SELECT * FROM schools LIMIT 1;`

- [ ] **Academic Year** (`academic_years`)
  - Status: ❌ MISSING
  - Required: Yes (for proper enrollment tracking)
  - Script: `scripts/create-academic-year.sql` (needs to be created)

- [ ] **Grading Periods** (`grading_periods`)
  - Status: ⚠️ Partial
  - Required: Yes (for grades/report cards)
  - Script: `scripts/msu-foundation-setup.sql` (includes this)

- [ ] **Letter Grade Scales** (`letter_grade_scales`)
  - Status: ❌ MISSING
  - Required: Yes (for GPA/report cards)
  - Script: `scripts/msu-foundation-setup.sql` (includes this)

- [ ] **Academic Tracks** (`academic_tracks`)
  - Status: ❌ MISSING
  - Required: Yes (for Senior High)
  - Script: `scripts/create-academic-tracks.sql` (needs to be created)

### Phase 2: Structure (After Phase 1)

- [ ] **Sections** (`sections`)
  - Status: ⚠️ Partial
  - Required: Yes (for enrollment)
  - Script: `scripts/create-sections.sql` ✅ EXISTS

- [ ] **Courses** (`courses`)
  - Status: ❌ CRITICAL - 92% missing
  - Required: Yes (for enrollment)
  - Script: `scripts/msu-foundation-setup.sql` ✅ EXISTS

### Phase 3: Users (After Phase 2)

- [ ] **Teachers** (`school_profiles` + `teacher_profiles`)
  - Status: ✅ Can add
  - Required: No (enrollment works without teachers)
  - But: Courses need teachers for assignments

- [ ] **Students** (`school_profiles` + `students`)
  - Status: ✅ Can add
  - Required: Yes (for enrollment)
  - But: Need sections first

---

## 🚨 What Breaks If Missing

### Enrollment-Specific Dependencies

| Data | Enrollment Works? | What Breaks? |
|------|------------------|--------------|
| **School** | ❌ NO | Can't create enrollments |
| **Sections** | ❌ NO | Can't assign students to sections |
| **Courses** | ❌ NO | Nothing to enroll in |
| **Academic Year** | ⚠️ YES* | Can't track by year, report cards incomplete |
| **Grading Periods** | ⚠️ YES* | Can't enter grades, report cards broken |
| **Letter Grades** | ⚠️ YES* | GPA broken, report cards incomplete |
| **Academic Tracks** | ⚠️ YES* | Senior High organization broken |

*Works for basic enrollment, but advanced features break

---

## 🎯 Recommended Setup Order

### Option 1: Complete Foundation (Recommended)

```bash
# Run this ONE script - creates everything:
\i scripts/msu-foundation-setup.sql

# Then create sections:
\i scripts/create-sections.sql

# Then create academic tracks (if not in foundation script):
\i scripts/create-academic-tracks.sql
```

**Creates:**
- ✅ School
- ✅ Grading Periods (4 quarters)
- ✅ Letter Grade Scales (8 grades)
- ✅ Sections (9 sections)
- ✅ Courses (72 courses)
- ⚠️ Academic Tracks (might need separate script)
- ⚠️ Academic Year (might need separate script)

### Option 2: Step-by-Step

```bash
# 1. School (usually exists)
SELECT * FROM schools;

# 2. Academic Year
\i scripts/create-academic-year.sql

# 3. Grading Periods
\i scripts/create-grading-periods.sql

# 4. Letter Grade Scales
\i scripts/create-letter-grade-scales.sql

# 5. Academic Tracks
\i scripts/create-academic-tracks.sql

# 6. Sections
\i scripts/create-sections.sql

# 7. Courses
\i scripts/create-complete-course-catalog.sql
```

---

## 🔍 How to Check What's Missing

### Check Academic Years:
```sql
SELECT COUNT(*) FROM academic_years WHERE school_id = 'YOUR_SCHOOL_ID';
-- Should return: 1+ (at least current year)
```

### Check Letter Grade Scales:
```sql
SELECT COUNT(*) FROM letter_grade_scales WHERE school_id = 'YOUR_SCHOOL_ID';
-- Should return: 8 (A, B+, B, C+, C, D, E, F)
```

### Check Academic Tracks:
```sql
SELECT COUNT(*) FROM academic_tracks WHERE school_id = 'YOUR_SCHOOL_ID';
-- Should return: 4 (STEM, ABM, HUMSS, GA)
```

### Check Grading Periods:
```sql
SELECT COUNT(*) FROM grading_periods WHERE school_id = 'YOUR_SCHOOL_ID';
-- Should return: 4 (for quarterly) or 2 (for semester)
```

### Check Sections:
```sql
SELECT grade_level, COUNT(*) 
FROM sections 
WHERE school_id = 'YOUR_SCHOOL_ID'
GROUP BY grade_level;
-- Should return: Grade 7-12 with multiple sections each
```

### Check Courses:
```sql
SELECT COUNT(*) FROM courses WHERE school_id = 'YOUR_SCHOOL_ID';
-- Should return: 72+ (complete curriculum)
```

---

## 💡 Key Insights

1. **Enrollment CAN work** with just School + Sections + Courses
   - But advanced features (grades, report cards) need the rest

2. **Academic Year** is often overlooked
   - Enrollments table has `academic_year_id` field
   - But it might be nullable, so enrollment works without it
   - However, filtering and reporting break

3. **Letter Grade Scales** are critical for grading
   - Enrollment works fine without them
   - But GPA calculation and report cards break

4. **Academic Tracks** are critical for Senior High
   - Junior High enrollment works without them
   - Senior High organization breaks without them

5. **Courses are THE MOST CRITICAL**
   - Without courses, enrollment is impossible
   - Currently only 8% complete (6 of 72 courses)

---

## 🚀 Next Steps

1. **Run foundation setup:**
   ```bash
   \i scripts/msu-foundation-setup.sql
   ```

2. **Create sections:**
   ```bash
   \i scripts/create-sections.sql
   ```

3. **Create missing foundational data:**
   - Academic Year (if not in foundation script)
   - Academic Tracks (if not in foundation script)

4. **Verify everything exists:**
   - Run all the "Check" queries above
   - Ensure all counts match expected values

5. **Test enrollment:**
   - Approve an application
   - Verify student is enrolled in all section courses
   - Check enrollments page shows the student

---

## 📝 Summary

**Critical for Enrollment:**
1. ✅ School
2. ✅ Sections
3. ✅ Courses

**Critical for Full Functionality:**
4. ⚠️ Academic Year
5. ⚠️ Grading Periods
6. ⚠️ Letter Grade Scales
7. ⚠️ Academic Tracks

**Current Status:**
- ✅ School: Exists
- ⚠️ Sections: Partial (script created)
- ❌ Courses: 92% missing (CRITICAL)
- ❌ Academic Year: Missing
- ⚠️ Grading Periods: Partial
- ❌ Letter Grade Scales: Missing
- ❌ Academic Tracks: Missing
