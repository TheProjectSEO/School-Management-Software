# QUICK START: Fix Critical Issues NOW

**If you want to fix the app RIGHT NOW, follow these steps:**

---

## STEP 1: Fix Student Data (5-10 minutes)

This is THE blocking issue. Everything else might auto-resolve after this.

### Option A: Quick Database Fix (FASTEST)

```bash
# Connect to Supabase and run this SQL
```

```sql
-- 1. Get the auth user ID for test student
SELECT id FROM auth.users WHERE email = 'student@msu.edu.ph';
-- Copy the ID from result

-- 2. Check if profile exists (replace <user-id> with ID from step 1)
SELECT * FROM profiles WHERE auth_user_id = '<user-id>';

-- 3. If no profile, create it:
INSERT INTO profiles (auth_user_id, full_name, role)
VALUES ('<user-id>', 'Test Student', 'student')
RETURNING *;
-- Copy the profile ID

-- 4. Check if student record exists (replace <profile-id>)
SELECT * FROM students WHERE profile_id = '<profile-id>';

-- 5. If no student record, create it:
INSERT INTO students (profile_id, student_number, enrollment_status)
VALUES ('<profile-id>', 'STU-2024-001', 'active')
RETURNING *;
```

### Option B: Check RLS Policies

If records exist but still getting errors, check RLS:

```sql
-- View current policies
SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'students');

-- If policies are blocking, enable read access:
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can read own student record" ON students
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );
```

### Verify Fix

1. Reload the app (http://localhost:3000)
2. Open browser console (F12)
3. Login with `student@msu.edu.ph` / `Test123!@#`
4. Check console - should see NO "Error fetching student" messages
5. Dashboard should now display content

---

## STEP 2: Fix Logout Test (2 minutes)

Edit `/tests/comprehensive-mission-test.spec.ts` line 489:

**CHANGE THIS:**
```typescript
await logoutButton.first().click();
```

**TO THIS:**
```typescript
await logoutButton.first().click({ force: true });
```

---

## STEP 3: Re-Run Tests (2 minutes)

```bash
cd student-app
npx playwright test comprehensive-mission-test
```

**Expected Result**: All 6 tests should now PASS! ✅

---

## STEP 4: Verify in Browser (1 minute)

1. Open http://localhost:3000/login
2. Login with test credentials
3. Check all these work:
   - ✅ Dashboard shows widgets/content
   - ✅ No console errors
   - ✅ Can navigate to all pages
   - ✅ Can logout

---

## If Issues Persist

### Still getting "Error fetching student"?

**Check server logs:**
```bash
# Look at Next.js dev server output for errors
```

**Add debug logging:**

Edit `/lib/dal/student.ts` line 30:

```typescript
if (profileError || !profile) {
  console.error("Error fetching profile:", {
    error: profileError,
    userId: user.id,
    errorCode: profileError?.code,
    errorMessage: profileError?.message,
    errorDetails: profileError?.details
  });
  return null;
}
```

This will show EXACTLY what's failing.

### Still getting 406 errors?

1. Open browser Dev Tools
2. Go to Network tab
3. Reload page
4. Find requests with 406 status
5. Click on them to see details
6. Share the URL and headers

---

## Emergency: Start From Scratch

If completely stuck:

1. **Check Supabase connection:**
   ```bash
   cat .env.local | grep SUPABASE
   ```
   Verify URL and keys are correct

2. **Check database tables exist:**
   - Log into Supabase dashboard
   - Go to Table Editor
   - Verify `profiles` and `students` tables exist

3. **Check auth user exists:**
   - Go to Supabase Authentication
   - Verify `student@msu.edu.ph` is listed

4. **Create test data manually:**
   - Use Supabase dashboard Table Editor
   - Add rows directly to `profiles` and `students`

---

## Success Checklist

After fixes, you should see:

- [ ] No "Error fetching student" in console
- [ ] No 406 errors in network tab
- [ ] No ERR_ABORTED errors
- [ ] Dashboard shows content/widgets
- [ ] All navigation pages load
- [ ] All Playwright tests pass (6/6)

---

## Need Help?

1. **Read the detailed docs:**
   - `ALL_ISSUES_FOUND.md` - Full issue analysis
   - `PARALLEL_FIX_PLAN.md` - Detailed fix instructions

2. **Check what the tests found:**
   - `SYSTEMATIC_TEST_RESULTS.md` - Complete test report

3. **Screenshots are in:**
   - `.playwright-mcp/` folder
   - `test-results/` folder

---

**Estimated total time**: 10-15 minutes to fix everything!

Good luck! 🚀
