# 🚀 MSU School OS - Complete Setup Guide

**Everything you need to get all three apps working**

---

## ⚡ Quick Start (10 Minutes Total)

### Part 1: Expose Schema (2 minutes)

1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api
2. Find: "Exposed schemas" field
3. Add: `"school software"` to the list
4. Save and wait 2 minutes

**See:** `QUICK_FIX.md` for detailed steps

---

### Part 2: Seed Test Data (2 minutes)

1. Open: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph (SQL Editor)
2. Click: "+ New query"
3. Copy entire file: `teacher-app/seed-correct-schema.sql`
4. Paste and click "Run"
5. Verify: Last result shows counts (sections: 3, courses: 5-8, students: 6)

**See:** `SEED_DATA_INSTRUCTIONS.md` for detailed steps

---

### Part 3: Start All Apps (1 minute each)

```bash
# Terminal 1
cd student-app
npm run dev  # Port 3000

# Terminal 2
cd teacher-app
npm run dev  # Port 3001

# Terminal 3
cd admin-app
npm run dev  # Port 3002
```

---

### Part 4: Test It Works (5 minutes)

**Teacher App (localhost:3001):**
- Login: juan.delacruz@msu.edu.ph / TeacherMSU2024!@#SecurePassword
- Dashboard → Should show "Active Courses: 5-8"
- My Classes → Should show 3 sections
- Messages → Click "New Message" → Should show 6 students! ✅

**Student App (localhost:3000):**
- Register as new student or login as:
  - maria.santos@msu.edu.ph (Grade 10)
  - rosa.garcia@msu.edu.ph (Grade 11)
- Dashboard → Should show enrolled courses
- Learning → Should see published modules

---

## 📁 All Files Created for You

### In Parent Folder (`School management Software/`)

1. **`SCHEMA_MASTER_README.md`** ← Start here for schema info
2. **`SCHEMA_REFERENCE.md`** - Detailed reference
3. **`SCHEMA_SETUP_CHECKLIST.md`** - Step-by-step setup
4. **`QUICK_FIX.md`** ← Quick schema exposure instructions
5. **`SEED_DATA_INSTRUCTIONS.md`** ← How to seed data
6. **`COMPLETE_SETUP_GUIDE.md`** ← THIS FILE
7. **`setup-all-apps-schema.sh`** - Automated config (already run)
8. **`EXPOSE_SCHEMA_DASHBOARD_GUIDE.md`** - Detailed dashboard guide

### In teacher-app/

9. **`seed-correct-schema.sql`** ← Run this to seed data
10. **`UNIVERSAL_SCHEMA_CONFIG.md`** - Schema guide for this app
11. **`SUPABASE_MCP_SCHEMA_RULES.md`** - MCP usage rules
12. **`SCHEMA_GUIDE.md`** - Detailed schema explanation
13. **`.env.schema`** - Schema documentation
14. **`scripts/verify-schema.mjs`** - Automated verification
15. **`TEACHER_TESTING_PROTOCOL.md`** - Full testing protocol
16. **`teacher-audit-report.md`** - Test results
17. **`teacher-fixes-implemented.md`** - Fixes applied
18. **`teacher-remaining-issues.md`** - Outstanding items

### In student-app/ (auto-configured)

19. **`UNIVERSAL_SCHEMA_CONFIG.md`**
20. **`.env.schema`**
21. **`scripts/verify-schema.mjs`**
22. Updated `lib/supabase/client.ts` and `server.ts`

### In admin-app/ (auto-configured)

23. **`UNIVERSAL_SCHEMA_CONFIG.md`**
24. **`.env.schema`**
25. **`scripts/verify-schema.mjs`**
26. Updated `lib/supabase/client.ts` and `server.ts`

---

## 🎯 What You Can Test After Setup

### Teacher App → Student App Flow

**1. Module Publishing:**
- Teacher: Create module in My Subjects
- Teacher: Add lessons
- Teacher: Click "Publish"
- Student: See new module in Learning section ✅

**2. Messaging:**
- Teacher: Messages → New Message → Select student
- Teacher: Send message
- Student: See message in inbox ✅

**3. Assignment Creation:**
- Teacher: Create assignment
- Teacher: Publish to section
- Student: See assignment in My Assessments ✅

**4. Grading:**
- Student: Submit assignment
- Teacher: See submission in Grading Inbox
- Teacher: Grade and release
- Student: See grade and feedback ✅

---

## 🔧 Troubleshooting

### Issue: Apps Still Show "No students found"

**Cause:** Schema not exposed yet or wrong schema in config

**Fix:**
1. Verify schema exposed (Part 1)
2. Check `lib/supabase/client.ts` uses `"school software"`
3. Restart dev server
4. Run: `npm run verify-schema`

### Issue: Seed Script Fails

**Error:** "permission denied for table sections"
**Fix:** Expose schema first (Part 1), then run seed script again

**Error:** "relation does not exist"
**Fix:** Check seed SQL uses `"school software".table_name` format

### Issue: Students Don't See Courses

**Cause:** Modules not published or enrollments missing

**Fix:**
```sql
-- Check enrollments
SELECT * FROM "school software".enrollments
WHERE school_id = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

-- Check published modules
SELECT * FROM "school software".modules
WHERE is_published = true;
```

---

## 📊 Expected Results After Seeding

### Teacher App Dashboard:
```
Total Students: 6
Active Courses: 5-8
Pending Submissions: 0
```

### My Classes:
```
Grade 10 - Einstein (2 students)
Grade 11 - Newton (2 students)
Grade 12 - Curie (2 students)
```

### My Subjects:
```
Mathematics 1001 (2 modules, 6 lessons)
Mathematics 1101 (2 modules, 6 lessons)
Science 1001 (2 modules, 6 lessons)
... (5-8 total courses)
```

### Messages → New Message:
```
Students dropdown shows:
- Maria Santos (Grade 10)
- Juan Reyes (Grade 10)
- Rosa Garcia (Grade 11)
- Miguel Lopez (Grade 11)
- Anna Martinez (Grade 12)
- Carlos Fernandez (Grade 12)
```

---

## ✅ Success Criteria

**You know it worked when:**

✅ `npm run verify-schema` passes in all three apps
✅ Teacher dashboard shows student count > 0
✅ My Classes shows 3 sections with students
✅ Messages dropdown shows 6 students
✅ Student app shows enrolled courses when logged in

---

## 🎯 Next Steps After Seeding

1. **Test Content Creation:**
   - Create a new module in teacher app
   - Add lessons
   - Publish
   - Log in as student and verify it appears

2. **Test Assessment Flow:**
   - Create quiz in teacher app
   - Assign to section
   - Student takes quiz
   - Teacher grades
   - Student sees grade

3. **Complete Full Testing:**
   - Run through all 31 features in `TEACHER_TESTING_PROTOCOL.md`
   - Document any issues
   - Generate final audit report

---

## 🆘 Need Help?

**Files to Check:**
- Schema issues → `SCHEMA_MASTER_README.md`
- Seed data issues → `SEED_DATA_INSTRUCTIONS.md`
- Quick fix → `QUICK_FIX.md`
- Testing → `TEACHER_TESTING_PROTOCOL.md`

**Verification:**
```bash
# Check schema config
npm run verify-schema

# Check seeded data
# Open Supabase SQL Editor and run:
SELECT COUNT(*) FROM "school software".students;
-- Should return: 6
```

---

**Total Time:** 10 minutes
**Result:** Fully connected teacher-app ↔ student-app ready for testing! 🎉
