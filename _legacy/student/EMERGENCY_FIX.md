# 🆘 EMERGENCY FIX - 30 Seconds

The issue: SQL constraint error.

## Quick Fix:

### Copy and paste THIS into Supabase SQL Editor:

```sql
SET search_path TO "school software", public;

DO $$
DECLARE
  v_profile_id UUID := '44d7c894-d749-4e15-be1b-f42afe6f8c27';
  v_student_id UUID;
BEGIN
  SELECT id INTO v_student_id FROM "school software".students WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    INSERT INTO "school software".students (school_id, profile_id, lrn, grade_level, section_id)
    VALUES ('00000000-0000-0000-0000-000000000001', v_profile_id, '202400123456', 'Grade 11', '22222222-2222-2222-2222-222222222222')
    RETURNING id INTO v_student_id;
    RAISE NOTICE 'Student created: %', v_student_id;
  ELSE
    RAISE NOTICE 'Student exists: %', v_student_id;
  END IF;
END $$;
```

### Then:
1. Click RUN
2. Refresh browser
3. Dashboard should work!

---

**Or use the fixed file:**
`FINAL_MASTER_POPULATION_SCRIPT.sql` (now updated with fix)
