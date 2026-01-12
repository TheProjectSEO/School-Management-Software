# ✅ SIMPLE: Just Paste This One SQL File

**File:** `teacher-app/seed-correct-schema.sql` (UPDATED - ambiguous column fixed)

---

## 📋 What to Do (1 Minute)

### 1. Open SQL Editor
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

Click: **SQL Editor** → **+ New query**

---

### 2. Copy the Seed File

**Mac Terminal:**
```bash
cd teacher-app
cat seed-correct-schema.sql | pbcopy
```

**Or:** Open `teacher-app/seed-correct-schema.sql` and copy all (Cmd+A, Cmd+C)

---

### 3. Paste and Run

1. **Paste** into SQL Editor
2. **Click "Run"** (or Cmd+Enter)
3. **Wait** ~10 seconds
4. **Check last result** should show:
   ```
   sections: 3
   courses: 5
   students: 6
   enrollments: 10+
   teacher_assignments: 5
   ```

---

### 4. Test Teacher App

**Refresh:** http://localhost:3001

**Login:** juan.delacruz@msu.edu.ph / TeacherMSU2024!@#SecurePassword

**Go to:** Messages → + New Message

**SHOULD SEE: 6 students!** ✅

If you see students → SUCCESS! 🎉

---

## ✅ What Was Fixed

- ✅ Schools already exist (no need to create)
- ✅ Fixed ambiguous "id" column error (now uses tp.id)
- ✅ File ready to paste and run

---

**Just paste and run!** One file, one minute, done! 🚀
