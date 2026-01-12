# 🌱 How to Seed Test Data (2 Steps)

## Step 1: Expose Schema in Supabase (If Not Done Yet)

**Go to:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api

**Find:** "Exposed schemas" field

**Add:** `"school software"` to the list

**Save** and wait 2 minutes

---

## Step 2: Run Seed Data SQL

**File:** `teacher-app/seed-correct-schema.sql`

### How to Run:

1. **Open Supabase Dashboard:**
   https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

2. **Click:** SQL Editor (in left sidebar)

3. **Click:** "+ New query"

4. **Copy the entire file:**
   ```bash
   # On Mac/Linux
   cat teacher-app/seed-correct-schema.sql | pbcopy

   # Or just open and copy manually
   ```

5. **Paste** into SQL Editor

6. **Click:** "Run" button (or press Cmd/Ctrl + Enter)

7. **Wait:** 5-10 seconds

8. **Check Results:**
   - Should show multiple result sets
   - Last result shows summary with counts:
     - sections: 3
     - courses: 5-8
     - students: 6
     - enrollments: 18+
     - teacher_assignments: 5-8

---

## What Gets Created

### Sections (3)
- Grade 10 - Einstein
- Grade 11 - Newton
- Grade 12 - Curie

### Courses (5-8)
- Mathematics 1001 (Grade 10)
- Mathematics 1101 (Grade 11)
- Mathematics 1201 (Grade 12)
- Science 1001 (Grade 10)
- Science 1101 (Grade 11)

### Students (6)
- **Grade 10:** Maria Santos, Juan Reyes
- **Grade 11:** Rosa Garcia, Miguel Lopez
- **Grade 12:** Anna Martinez, Carlos Fernandez

### Teacher Assignments
- Dr. Juan Dela Cruz assigned to ALL sections and courses

### Enrollments
- Each student enrolled in courses for their section (3+ courses per student)

### Modules & Lessons
- 2 modules per course
- 3 lessons per module
- All published (visible to students)

---

## After Seeding - Test It Works

### Test Teacher App:

```bash
cd teacher-app
npm run dev
```

**Login:** juan.delacruz@msu.edu.ph / TeacherMSU2024!@#SecurePassword

**Then check:**
1. Dashboard → Should show "Active Courses: 5-8"
2. My Classes → Should show 3 sections with student counts
3. My Subjects → Should show 5-8 courses
4. Messages → "New Message" → Should show 6 students in dropdown! ✅

### Test Student App:

```bash
cd ../student-app
npm run dev
```

**Create a student account** or login as one of these (if passwords set):
- maria.santos@msu.edu.ph
- juan.reyes@msu.edu.ph
- etc.

**Then check:**
1. Dashboard → Should show enrolled courses
2. My Classes → Should show 3-5 courses
3. Learning → Should see published modules

---

## Verification Queries (Optional)

**Run in Supabase SQL Editor to double-check:**

```sql
-- Check teacher assignments
SELECT
  p.full_name as teacher,
  sec.name as section,
  c.name as course
FROM "school software".teacher_assignments ta
JOIN "school software".teacher_profiles tp ON ta.teacher_profile_id = tp.id
JOIN "school software".profiles p ON tp.profile_id = p.id
JOIN "school software".sections sec ON ta.section_id = sec.id
JOIN "school software".courses c ON ta.course_id = c.id
WHERE p.full_name = 'Dr. Juan Dela Cruz';

-- Should show 5-8 rows

-- Check students per section
SELECT
  sec.name as section,
  COUNT(s.id) as student_count
FROM "school software".sections sec
LEFT JOIN "school software".students s ON sec.id = s.section_id
WHERE sec.school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
GROUP BY sec.id, sec.name;

-- Should show:
-- Grade 10 - Einstein: 2
-- Grade 11 - Newton: 2
-- Grade 12 - Curie: 2
```

---

## Troubleshooting

**Error: "permission denied for table sections"**
→ Schema not exposed yet. Do Step 1 first.

**Error: "relation does not exist"**
→ Wrong schema. Verify seed-correct-schema.sql uses "school software"

**No data appears in apps:**
→ Check schema in lib/supabase/client.ts is "school software"

**Students not showing in Messages:**
→ Check teacher_assignments were created. Run verification query above.

---

## Quick Fix If Something Goes Wrong

**Delete all test data:**
```sql
DELETE FROM "school software".enrollments WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
DELETE FROM "school software".students WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
DELETE FROM "school software".teacher_assignments WHERE teacher_profile_id IN (
  SELECT id FROM "school software".teacher_profiles WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
);
DELETE FROM "school software".modules WHERE course_id IN (
  SELECT id FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'
);
DELETE FROM "school software".courses WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
DELETE FROM "school software".sections WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
```

**Then rerun:** seed-correct-schema.sql

---

**Time Required:** 2 minutes to paste and run
**Result:** Full teacher-student data connection ready for testing! 🎉
