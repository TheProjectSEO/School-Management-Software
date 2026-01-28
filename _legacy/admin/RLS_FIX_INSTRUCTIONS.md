# Fix Admin RLS Policy - Quick Instructions

**Problem:** Infinite recursion in admin_profiles RLS policy
**Solution:** Run SQL to replace policy with non-recursive version
**Time:** 1 minute

---

## Steps

### 1. Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new
```

Or:
- Go to Supabase Dashboard
- Click "SQL Editor" in left sidebar
- Click "New Query"

### 2. Copy the SQL Script
Open file: `FIX_ADMIN_RLS_POLICY.sql`

Or copy this:
```sql
-- Set schema
SET search_path TO "school software";

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles are viewable by authenticated users" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles viewable by all authenticated" ON admin_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_profiles;

-- Create NEW policy WITHOUT recursion
CREATE POLICY "Authenticated users can view their admin profile"
ON admin_profiles
FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT p.id
    FROM profiles p
    WHERE p.auth_user_id = auth.uid()
  )
);
```

### 3. Run the SQL
- Paste the SQL into the editor
- Click "Run" button (or press Cmd+Enter)
- Wait for "Success" message

### 4. Verify the Fix
Run this test in terminal:
```bash
cd admin-app
node test-admin-login.mjs
```

**Expected output:**
```
✅ Authentication SUCCESS
✅ Get user SUCCESS
✅ Profile lookup SUCCESS
✅ Admin verification SUCCESS  ← Should work now!
✅ ADMIN LOGIN TEST PASSED!
```

---

## What This Does

**Problem:**
The old RLS policy was checking `admin_profiles` table while querying `admin_profiles`, causing infinite loop.

**Solution:**
New policy checks `profiles` table instead (no recursion), then allows access to matching `admin_profiles` records.

**Why It's Safe:**
- Still enforces security (users only see their own admin profile)
- Uses `profiles` table for user lookup (no circular dependency)
- Maintains proper authentication check via `auth.uid()`

---

## Troubleshooting

### Still getting recursion error?
- Make sure ALL old policies were dropped
- Run the DROP statements separately first
- Verify with: `SELECT * FROM pg_policies WHERE tablename = 'admin_profiles';`

### Getting permission denied?
- Make sure you're logged in to Supabase Dashboard
- Check you have admin access to the project
- Try refreshing the page

---

**After this fix, proceed with:**
1. ✅ Test admin login (should pass)
2. ✅ Seed test data
3. ✅ Test admin features
4. ✅ Cross-app connectivity testing
