# Admin Login Fix - Quick Start Guide

## What Was Wrong?

The admin login was failing with **"Profile not found"** error because the code was querying the database without filtering by the authenticated user's ID.

## What Was Fixed?

✅ **File:** `/app/(auth)/login/page.tsx`

The profile query now correctly filters by the authenticated user:

```typescript
// ✅ FIXED: Now uses user.id to filter
const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("auth_user_id", user.id)  // This was missing!
  .single();
```

Admin check now uses the correct `school_members` table instead of non-existent `admin_profiles`:

```typescript
// ✅ FIXED: Uses correct table
const { data: schoolMember } = await supabase
  .from("school_members")  // Was: "admin_profiles"
  .select("role")
  .eq("profile_id", profile.id)
  .in("role", ["school_admin", "super_admin"])
  .single();
```

---

## How to Test the Fix

### Quick Test (3 steps):

1. **Create admin user in Supabase Dashboard:**
   - Go to: https://qyjzqzqqjimittltttph.supabase.co
   - Authentication → Users → Add user
   - Email: `admin@msu.edu.ph`
   - Password: `Admin123!@#`
   - Auto confirm: ✓ Yes
   - Click "Create user"

2. **Run the setup script:**
   ```bash
   cd admin-app
   node create-admin-user.mjs
   ```

3. **Test login:**
   - Start dev server: `npm run dev`
   - Go to: http://localhost:3002/login
   - Login with: `admin@msu.edu.ph` / `Admin123!@#`
   - Should redirect to dashboard ✅

---

## Expected Behavior

### Before Fix:
- ❌ Login → 406 error in network tab
- ❌ "Profile not found" error message
- ❌ Cannot access admin portal

### After Fix:
- ✅ Login succeeds
- ✅ No network errors
- ✅ Redirects to dashboard
- ✅ Session persists

---

## Troubleshooting

### Issue: "Profile not found" still appearing
**Solution:** Admin user hasn't been created yet. Follow step 1 above.

### Issue: "You do not have admin access"
**Solution:** User exists but doesn't have admin role. Run the setup script (step 2).

### Issue: Script says "Admin user does not exist"
**Solution:** Create the user manually in Supabase Dashboard first (step 1), then run script again.

### Issue: RLS permission errors
**Solution:** The setup script might need Service Role key instead of anon key. Use SQL directly:

```sql
-- Get auth user ID from Supabase Dashboard
-- Replace USER_ID below with the actual ID

-- Create profile
INSERT INTO profiles (auth_user_id, full_name)
VALUES ('USER_ID', 'System Administrator')
RETURNING id;

-- Create admin access (replace PROFILE_ID and SCHOOL_ID)
INSERT INTO school_members (profile_id, school_id, role, is_active)
VALUES ('PROFILE_ID', 'SCHOOL_ID', 'school_admin', true);
```

---

## What Changed in the Code?

**3 key changes:**

1. **Added user retrieval:**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   ```

2. **Fixed profile query:**
   ```typescript
   .eq("auth_user_id", user.id)  // Added this filter
   ```

3. **Corrected admin table:**
   ```typescript
   .from("school_members")  // Was: "admin_profiles"
   ```

---

## Files Changed

- ✅ `/app/(auth)/login/page.tsx` - Fixed authentication logic
- ✅ `/create-admin-user.mjs` - New setup script
- ✅ `/AUTHENTICATION_FIX_SUMMARY.md` - Detailed documentation
- ✅ `/QUICK_FIX_GUIDE.md` - This file

---

## Need More Help?

See **AUTHENTICATION_FIX_SUMMARY.md** for:
- Complete code changes
- Database schema details
- RLS policy information
- Security considerations

---

**Status:** ✅ Fix Complete - Ready to Test

**Next Step:** Create admin user in Supabase Dashboard → Run setup script → Test login
