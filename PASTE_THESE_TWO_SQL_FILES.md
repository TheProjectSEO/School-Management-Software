# ⚡ PASTE THESE 2 SQL FILES (In Order)

**Why 2 files?** Schools table was empty, need to create schools first.

---

## File 1: Create Schools (30 seconds)

**Open:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph (SQL Editor)

**File:** `teacher-app/01-create-schools-first.sql`

**Copy → Paste → Run**

**Expected result:**
```
3 rows returned
- MSU - Main Campus
- MSU - Iligan Institute of Technology
- MSU - Tawi-Tawi College of Technology
```

---

## File 2: Seed Test Data (30 seconds)

**Same SQL Editor** (don't close it)

**File:** `teacher-app/seed-correct-schema.sql`

**Copy → Paste → Run**

**Expected result:**
```
=== SUMMARY ===
sections: 3
courses: 5
students: 6
enrollments: 12+
teacher_assignments: 5
```

---

## ✅ Then Test Teacher App

**Refresh:** http://localhost:3001

**Login:** juan.delacruz@msu.edu.ph / TeacherMSU2024!@#SecurePassword

**Go to:** Messages → + New Message

**Should see:** 6 students! 🎉

---

## Quick Copy-Paste Commands

```bash
# Terminal - Copy File 1
cd teacher-app
cat 01-create-schools-first.sql | pbcopy

# (Paste in SQL Editor, run, then...)

# Copy File 2
cat seed-correct-schema.sql | pbcopy

# (Paste in SQL Editor, run)
```

---

**Total time:** 2 minutes
**Result:** Fully connected teacher ↔ student apps!
