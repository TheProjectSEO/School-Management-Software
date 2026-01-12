# ✅ SIMPLE: Just Paste This SQL

## 🎯 What to Do (2 Minutes)

### Step 1: Open Supabase SQL Editor
**Click this link:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

Then click: **SQL Editor** in left sidebar → **+ New query**

---

### Step 2: Copy the Seed SQL

**File location:**
```
teacher-app/seed-correct-schema.sql
```

**On Mac:**
```bash
cd teacher-app
cat seed-correct-schema.sql | pbcopy
```

**Or:** Just open the file and press Cmd+A, Cmd+C

---

### Step 3: Paste and Run

1. **Paste** into SQL Editor (the text box)
2. **Click "Run"** button (or press Cmd+Enter)
3. **Wait** 5-10 seconds
4. **Check results** - Should show multiple tables with:
   ```
   === SUMMARY ===
   sections: 3
   courses: 5
   students: 6
   enrollments: 12+
   teacher_assignments: 5
   ```

---

### Step 4: Refresh Teacher App

```bash
# If dev server is running, just refresh browser
# Or restart:
cd teacher-app
npm run dev
```

**Then:**
1. Login: juan.delacruz@msu.edu.ph / TeacherMSU2024!@#SecurePassword
2. Go to **Messages**
3. Click **"+ New Message"**
4. **Should see 6 students!** ✅

---

## ✅ Success Indicators

**You know it worked when:**

✅ SQL Editor shows results (not errors)
✅ Last result shows "sections: 3, students: 6"
✅ Teacher app Messages → New Message shows students
✅ My Classes shows 3 sections
✅ Dashboard shows "Active Courses: 5"

---

## ❌ If It Fails

**Error: "permission denied"**
→ RLS policies might be blocking. Try with service role key in .env.local

**Error: "relation does not exist"**
→ Schema not exposed yet. Double-check Supabase Dashboard → Settings → API

**Error: "duplicate key"**
→ Data already exists. This is OK! Skip to Step 4 (refresh app)

---

**That's it!** Just paste and run. No scripts needed. 🎉
