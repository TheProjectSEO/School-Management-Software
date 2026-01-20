# Sections Setup Guide

## 🎯 Why Sections Are Required

**Sections are foundational data** - they must exist BEFORE you can:
- ✅ Approve student applications (students need a section assignment)
- ✅ Create enrollments (enrollments link students to sections)
- ✅ Assign courses to classes (courses are linked to sections)
- ✅ Manage class sizes and capacity

---

## 📋 Data Dependencies

### Setup Order (CRITICAL):

```
1. School (schools table)
   ↓
2. Sections (sections table) ← YOU ARE HERE
   ↓
3. Courses (courses table - linked to sections)
   ↓
4. Students (students table - assigned to sections)
   ↓
5. Enrollments (enrollments table - students enrolled in courses)
```

**If sections don't exist:**
- ❌ Application approval will fail (no section to assign)
- ❌ Students can't be enrolled in courses
- ❌ Courses can't be created (they need sections)

---

## 🛠️ How to Create Sections

### Option 1: Use the SQL Script (Recommended)

1. **Get your school_id:**
   ```sql
   SELECT id, name FROM schools LIMIT 1;
   ```

2. **Run the sections creation script:**
   ```bash
   # In Supabase SQL Editor, run:
   scripts/create-sections.sql
   ```

3. **Verify sections were created:**
   ```sql
   SELECT grade_level, name, capacity 
   FROM sections 
   ORDER BY grade_level, name;
   ```

### Option 2: Create Sections Manually via Admin Panel

If you have a sections management page:
1. Go to `/sections` or `/settings/sections`
2. Create sections for each grade level
3. Set capacity (e.g., 40 for junior high, 35 for senior high)

### Option 3: Create Sections via API

```bash
# Create a Grade 11 section
curl -X POST http://localhost:3002/api/admin/sections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grade 11 - STEM A",
    "grade_level": "11",
    "capacity": 35
  }'
```

---

## 📊 Required Sections by Grade Level

### Junior High (Grades 7-10)
- **Format:** "Grade [NUMBER] - Section [LETTER]"
- **Capacity:** 40 students per section
- **Example:** "Grade 10 - Section A"

### Senior High (Grades 11-12)
- **Format:** "Grade [NUMBER] - [TRACK] [LETTER]"
- **Capacity:** 35 students per section
- **Tracks:** STEM, ABM, HUMSS, GA (General Academic)
- **Example:** "Grade 11 - STEM A"

---

## 🔍 How to Check If Sections Exist

### Check sections for a specific grade:
```sql
SELECT id, name, grade_level, capacity 
FROM sections 
WHERE grade_level = '11'  -- or 'Grade 11'
ORDER BY name;
```

### Check all sections by grade level:
```sql
SELECT grade_level, COUNT(*) as section_count, SUM(capacity) as total_capacity
FROM sections
GROUP BY grade_level
ORDER BY grade_level;
```

### Check sections for your school:
```sql
SELECT s.grade_level, s.name, s.capacity, COUNT(st.id) as enrolled_students
FROM sections s
LEFT JOIN students st ON st.section_id = s.id
WHERE s.school_id = 'YOUR_SCHOOL_ID'
GROUP BY s.id, s.grade_level, s.name, s.capacity
ORDER BY s.grade_level, s.name;
```

---

## ⚠️ Common Issues

### Issue 1: "No sections found for this grade level"
**Cause:** No sections exist for that grade level in your school

**Solution:**
1. Run `scripts/create-sections.sql` to create default sections
2. Or manually create sections via admin panel
3. Verify sections exist: `SELECT * FROM sections WHERE grade_level = '11'`

### Issue 2: "Section not found" when approving
**Cause:** Section was deleted or doesn't belong to your school

**Solution:**
1. Check section exists: `SELECT * FROM sections WHERE id = 'SECTION_ID'`
2. Verify school_id matches: `SELECT school_id FROM sections WHERE id = 'SECTION_ID'`

### Issue 3: "Cannot create enrollment - section required"
**Cause:** Student doesn't have a section_id assigned

**Solution:**
1. Assign section during application approval
2. Or manually update student: `UPDATE students SET section_id = 'SECTION_ID' WHERE id = 'STUDENT_ID'`

---

## 🎓 Best Practices

1. **Create sections at the start of each school year**
   - Before accepting applications
   - Before creating courses

2. **Name sections consistently**
   - Junior High: "Grade [N] - Section [A-Z]"
   - Senior High: "Grade [N] - [TRACK] [A-Z]"

3. **Set realistic capacity**
   - Junior High: 35-40 students
   - Senior High: 30-35 students (smaller for specialized tracks)

4. **Create multiple sections per grade**
   - At least 2-3 sections per grade level
   - Allows for class size management

5. **Link courses to sections**
   - After creating sections, create courses for each section
   - This enables automatic enrollment during approval

---

## 📝 Quick Setup Checklist

- [ ] School exists in `schools` table
- [ ] Sections created for Grade 7
- [ ] Sections created for Grade 8
- [ ] Sections created for Grade 9
- [ ] Sections created for Grade 10
- [ ] Sections created for Grade 11 (all tracks)
- [ ] Sections created for Grade 12 (all tracks)
- [ ] Verified sections appear in admin panel
- [ ] Tested application approval with section selection

---

## 🚀 Next Steps After Creating Sections

1. **Create Courses for Each Section**
   - Each section needs courses (Math, Science, English, etc.)
   - Courses are linked to sections via `section_id`

2. **Test Application Approval**
   - Submit a test application
   - Approve it and select a section
   - Verify student is created and enrolled

3. **Verify Enrollments**
   - Check `/enrollments` page
   - Student should appear with all section courses

---

## 💡 Pro Tip

**Create a "Setup Wizard" or "Initial Setup" page** in your admin panel that:
1. Checks if sections exist
2. Offers to create default sections if missing
3. Guides admin through complete setup process

This prevents the "no sections found" issue from happening!
