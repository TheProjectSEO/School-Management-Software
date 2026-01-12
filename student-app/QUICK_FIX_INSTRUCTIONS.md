# 🔥 CRITICAL ISSUE #1 - QUICK FIX

## ✅ Code Fix: DONE
The code has been automatically fixed. No action needed.

## ⚠️ Database Fix: YOUR ACTION REQUIRED (2 minutes)

### Option 1: Via Supabase Dashboard (Recommended)

1. Open: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new

2. Copy this entire SQL block and paste it:

```sql
-- ============================================
-- FIX: Create Missing Student Data
-- ============================================
SET search_path TO "school software", public;

DO $$
DECLARE
  v_profile_id UUID;
  v_student_id UUID;
  v_auth_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Create or get profile
  SELECT id INTO v_profile_id
  FROM "school software".profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO "school software".profiles (auth_user_id, full_name)
    VALUES (v_auth_user_id, 'Demo Student')
    RETURNING id INTO v_profile_id;
    RAISE NOTICE 'Profile created: %', v_profile_id;
  ELSE
    RAISE NOTICE 'Profile exists: %', v_profile_id;
  END IF;

  -- Create or get student
  SELECT id INTO v_student_id
  FROM "school software".students
  WHERE profile_id = v_profile_id;

  IF v_student_id IS NULL THEN
    INSERT INTO "school software".students (school_id, profile_id, lrn, grade_level, section_id)
    VALUES (v_school_id, v_profile_id, '123456789012', 'College - 2nd Year', v_section_id)
    RETURNING id INTO v_student_id;
    RAISE NOTICE 'Student created: %', v_student_id;

    -- Create enrollments
    INSERT INTO "school software".enrollments (school_id, student_id, course_id)
    VALUES
      (v_school_id, v_student_id, 'c1111111-1111-1111-1111-111111111111'),
      (v_school_id, v_student_id, 'c2222222-2222-2222-2222-222222222222'),
      (v_school_id, v_student_id, 'c3333333-3333-3333-3333-333333333333'),
      (v_school_id, v_student_id, 'c4444444-4444-4444-4444-444444444444'),
      (v_school_id, v_student_id, 'c5555555-5555-5555-5555-555555555555')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Enrollments created';
  ELSE
    RAISE NOTICE 'Student exists: %', v_student_id;
  END IF;

  RAISE NOTICE '✅ DONE! Profile: % | Student: %', v_profile_id, v_student_id;
END $$;
```

3. Click **RUN**

4. You should see:
```
✅ DONE! Profile: <uuid> | Student: <uuid>
```

### Option 2: Via File (If you prefer)

1. The SQL is already in: `/scripts/create-demo-student-direct.sql`

2. Copy/paste that file's contents into Supabase SQL Editor

3. Click **RUN**

## Verify It Worked

```bash
npm run dev
```

Then login - you should see:
- ✅ No errors in console
- ✅ Student dashboard loads
- ✅ Profile shows "Demo Student"

## That's It!

The fix is complete once you run the SQL. The code changes are already applied.

---

**Need help?** See detailed docs:
- Technical details: `FIX_CRITICAL_ISSUE_1.md`
- Full summary: `CRITICAL_ISSUE_1_SUMMARY.md`
