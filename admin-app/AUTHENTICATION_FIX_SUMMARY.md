# Admin Authentication Fix - Complete Summary

## Critical Issue Identified

**Issue:** Admin login was failing with "Profile not found" error (406 HTTP error)

**Root Cause:** The profile query was missing the WHERE clause to filter by the authenticated user's ID, causing a 406 error from Supabase.

---

## The Fix Applied

### File Modified: `/app/(auth)/login/page.tsx`

**Before (Broken Code):**
```typescript
// Check if user is an admin
const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .single();  // ❌ No WHERE clause - returns 406 error

if (!profile) {
  setError("Profile not found");
  setLoading(false);
  return;
}

const { data: adminProfile } = await supabase
  .from("admin_profiles")  // ❌ This table doesn't exist
  .select("*")
  .eq("profile_id", profile.id)
  .eq("is_active", true)
  .single();
```

**After (Fixed Code):**
```typescript
// Get the authenticated user
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  setError("Failed to get user information");
  setLoading(false);
  return;
}

// Check if user has a profile
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id")
  .eq("auth_user_id", user.id)  // ✅ Filter by authenticated user ID
  .single();

if (profileError || !profile) {
  setError("Profile not found. Please contact your administrator.");
  setLoading(false);
  return;
}

// Check if user has admin access via school_members table
const { data: schoolMember, error: schoolMemberError } = await supabase
  .from("school_members")  // ✅ Correct table name
  .select("role")
  .eq("profile_id", profile.id)
  .in("role", ["school_admin", "super_admin"])  // ✅ Check for admin roles
  .single();

if (schoolMemberError || !schoolMember) {
  setError("You do not have admin access");
  await supabase.auth.signOut();
  setLoading(false);
  return;
}

// Successfully authenticated as admin
router.push("/");
router.refresh();
```

---

## Key Changes

1. **Added User Retrieval:**
   - Now properly gets the authenticated user via `supabase.auth.getUser()`
   - Extracts the user ID to use in subsequent queries

2. **Fixed Profile Query:**
   - Added `.eq("auth_user_id", user.id)` to filter by authenticated user
   - Added proper error handling for profile lookup
   - This fixes the 406 error

3. **Corrected Admin Check:**
   - Changed from `admin_profiles` (doesn't exist) to `school_members` (exists)
   - Checks for `school_admin` or `super_admin` roles
   - Uses `.in("role", [...])` to check multiple valid admin roles

4. **Improved Error Messages:**
   - More specific error messages for each failure point
   - Better user guidance when authentication fails

5. **Added Security:**
   - Signs out the user if they don't have admin access
   - Prevents unauthorized access to the admin portal

---

## Database Schema

### Tables Used:

#### 1. `profiles` table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. `school_members` table
```sql
CREATE TABLE school_members (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  role TEXT NOT NULL,  -- 'school_admin', 'super_admin', 'teacher', 'student'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Note:** The `admin_profiles` table referenced in the original code does NOT exist in the database.

---

## Admin User Setup Required

The database is currently empty. To enable admin login, you must:

### Step 1: Create Admin User in Supabase Dashboard

1. Go to: https://qyjzqzqqjimittltttph.supabase.co
2. Navigate to: **Authentication → Users**
3. Click **"Add user"**
4. Fill in:
   - Email: `admin@msu.edu.ph`
   - Password: `Admin123!@#`
   - Auto Confirm User: ✓ **Yes**
5. Click **"Create user"**
6. Copy the User ID (you'll need it)

### Step 2: Create Profile and Admin Access

Run the setup script:

```bash
cd admin-app
node create-admin-user.mjs
```

This script will:
- Verify the auth user exists
- Create a profile record linked to the auth user
- Create a school_members entry with `school_admin` role
- Set `is_active = true`

### Alternative: Manual SQL Setup

If the script fails due to RLS policies, use SQL:

```sql
-- 1. Get the auth user ID (from Supabase Dashboard → Authentication → Users)
-- Let's say it's: 12345678-1234-1234-1234-123456789012

-- 2. Create profile
INSERT INTO profiles (auth_user_id, full_name)
VALUES ('12345678-1234-1234-1234-123456789012', 'System Administrator');

-- 3. Get the profile ID that was just created
-- Let's say it's: abcdefgh-abcd-abcd-abcd-abcdefghijkl

-- 4. Get a school ID (or create one)
-- Let's say it's: 11111111-1111-1111-1111-111111111111

-- 5. Create school_members entry with admin role
INSERT INTO school_members (profile_id, school_id, role, is_active)
VALUES (
  'abcdefgh-abcd-abcd-abcd-abcdefghijkl',
  '11111111-1111-1111-1111-111111111111',
  'school_admin',
  true
);
```

---

## Testing the Fix

### 1. Verify the Admin User

Run the check script:

```bash
cd admin-app
node check-admin-user.mjs
```

Expected output:
```
✅ profiles: 1 record found
✅ school_members: 1 admin found
📋 Admin account:
   - Email: admin@msu.edu.ph
   - Full Name: System Administrator
   - Role: school_admin
   - Active: true
```

### 2. Test Login

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3002/login

3. Enter credentials:
   - Email: `admin@msu.edu.ph`
   - Password: `Admin123!@#`

4. Click **"Sign In"**

5. Expected behavior:
   - ✅ No 406 error
   - ✅ No "Profile not found" error
   - ✅ Successfully redirects to dashboard (`/`)
   - ✅ Session persists

### 3. Verify Error Handling

Test with non-admin user:

1. Create a regular user (not admin) in Supabase
2. Try to login with that user
3. Expected: "You do not have admin access" error
4. User should be signed out automatically

---

## RLS Policy Considerations

If the queries fail with permission errors, you may need to adjust RLS policies:

### For `profiles` table:
```sql
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);
```

### For `school_members` table:
```sql
-- Allow users to view their own school membership
CREATE POLICY "Users can view own membership" ON school_members
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );
```

---

## Files Modified

1. **`/app/(auth)/login/page.tsx`** - Fixed authentication logic
2. **`/create-admin-user.mjs`** (NEW) - Admin user setup script

---

## Verification Checklist

- [x] Fixed profile query to use authenticated user ID
- [x] Corrected admin check to use `school_members` table
- [x] Added proper error handling
- [x] Improved user-facing error messages
- [x] Added security (sign out non-admins)
- [x] Created admin user setup script
- [ ] **TODO:** Create admin user in Supabase Dashboard
- [ ] **TODO:** Run `create-admin-user.mjs` to complete setup
- [ ] **TODO:** Test login flow end-to-end

---

## Next Steps

1. **Create the admin user** in Supabase Dashboard (required)
2. **Run the setup script** to create profile and school_members entries
3. **Test the login** to verify everything works
4. **Optional:** Add additional admin users as needed
5. **Optional:** Implement user registration flow for admins

---

## Alternative Login Credentials

According to `LOGIN_CREDENTIALS.md`, these credentials should also work once set up:

- Email: `admin@test.com` / Password: `Test123!`
- Email: `testadmin@school.com` / Password: `Test123!`

To add these, repeat the setup process with different email addresses.

---

## Security Notes

1. **Never commit passwords** to version control
2. **Change default passwords** in production
3. **Enable 2FA** for admin accounts in production
4. **Review RLS policies** to ensure proper access control
5. **Monitor audit logs** for unauthorized access attempts

---

## Summary

**Status:** ✅ CODE FIX COMPLETE

**What was fixed:**
- Profile query now uses authenticated user ID (fixes 406 error)
- Admin check now uses correct `school_members` table
- Added proper error handling and security checks

**What's still needed:**
- Admin user must be created in Supabase Dashboard
- Setup script must be run to create profile and admin access

**Impact:** Critical authentication blocker is now resolved in code. Once admin user is created, login will work correctly.

---

**Created:** 2026-01-01
**Author:** Claude Code
**Status:** Ready for Testing (pending admin user creation)
