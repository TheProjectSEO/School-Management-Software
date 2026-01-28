# Playwright Login Test - Error Report

**Test Date:** December 31, 2025
**Test Status:** ✅ Login Successful | ❌ Multiple Critical Errors After Login

---

## 🎯 Test Results Summary

### ✅ Successful
- **Authentication:** User successfully logged in with `student@msu.edu.ph`
- **JWT Token:** Supabase auth token generated successfully
- **Redirection:** User redirected from `/login` to `/` (dashboard)
- **UI Rendering:** Dashboard page rendered with navigation and user info

### ❌ Critical Errors Found

## 🔴 Error #1: Database Schema Mismatch (HIGHEST PRIORITY)

**Error Message:**
```
Error fetching profile: Server {
  code: PGRST116,
  details: The result contains 0 rows,
  hint: null,
  message: Cannot coerce the result to a single JSON object
}
```

**HTTP Status:** `406 Not Acceptable`

**Failing Request:**
```
GET https://qyjzqzqqjimittltttph.supabase.co/rest/v1/profiles
?select=id&auth_user_id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```

**Root Cause:**
1. Code is querying `profiles` table with filter `auth_user_id=eq.{userId}`
2. But `user_profiles` table doesn't have an `auth_user_id` column
3. Table structure is: `id`, `email`, `full_name`, `avatar_url`, `created_at`, `updated_at`

**Impact:**
- **CRITICAL** - Infinite loop causing 50+ failed requests per second
- App continuously fails to fetch user profile
- Browser performance degraded
- Supabase API rate limits will be hit quickly

---

## 🔴 Error #2: Infinite Request Loop

**Occurrence:** 50+ times in ~3 seconds

**Pattern:**
```
/login → redirect → / → fetch profile → fail → retry → fail → retry...
```

**Requests in Loop:**
```
[GET] /login?_rsc=1hg4i => [307] Temporary Redirect
[GET] / => [200] OK
[GET] /rest/v1/profiles?... => [406] Not Acceptable
(repeats infinitely)
```

**Root Cause:**
- Failed profile fetch triggers component re-render
- Re-render triggers new profile fetch
- No error boundary or retry limit

**Impact:**
- Browser memory leak
- Excessive Supabase API calls
- Poor user experience

---

## 🟡 Error #3: Missing Logo File

**Error:** `404 (Not Found)`

**Request:** `GET http://localhost:3000/brand/logo.png`

**Impact:**
- Broken image on login page
- Console warning about modified width/height

---

## 🟡 Error #4: Missing Favicon

**Error:** `404 (Not Found)`

**Request:** `GET http://localhost:3000/favicon.ico`

**Impact:**
- Minor - no custom favicon shown in browser tab

---

## 🟡 Error #5: Missing Autocomplete Attribute

**Warning:**
```
Input elements should have autocomplete attributes (suggested: "current-password")
```

**Impact:**
- Accessibility issue
- Password managers may not work properly
- SEO/Lighthouse score reduction

---

## 📊 Network Analysis

### Successful Requests
- ✅ Fonts from Google Fonts CDN
- ✅ Supabase auth token endpoint (`/auth/v1/token`)
- ✅ User session validation (`/auth/v1/user`)
- ✅ Next.js pages and static assets

### Failed Requests (406 Error)
- ❌ `/rest/v1/profiles?select=id&auth_user_id=eq.{id}` (repeated 50+ times)

---

## 🔍 Root Cause Analysis

### Issue #1: Wrong Column Name in Query

**Expected:**
```typescript
// Code is trying to query:
.from('profiles')
.select('id')
.eq('auth_user_id', userId)  // ❌ This column doesn't exist
```

**Actual Table Schema:**
```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Solution:**
```typescript
// Should be:
.from('user_profiles')  // Correct table name
.select('*')
.eq('id', userId)  // Match by user ID directly
```

---

## 🛠️ Recommended Fixes

### Priority 1: Fix Database Schema Mismatch
**File:** Find component fetching profile (likely in layout or dashboard)
**Change:** Update query from `auth_user_id` to `id`
**Table:** Rename from `profiles` to `user_profiles` OR create view

### Priority 2: Add Error Boundary
**File:** Root layout or dashboard component
**Add:** Error boundary with retry limit to prevent infinite loops

### Priority 3: Add Logo File
**File:** `/public/brand/logo.png`
**Action:** Add missing logo or update component to use correct path

### Priority 4: Add Autocomplete Attributes
**File:** `/app/(auth)/login/page.tsx`
**Line:** Password input (~line 122)
**Add:** `autoComplete="current-password"`

---

## 📝 Code Files to Investigate

1. **Profile Fetching Logic** (PRIORITY 1)
   - Search for: `auth_user_id`
   - Likely in: `app/layout.tsx`, `app/page.tsx`, or `lib/` directory

2. **Logo Component**
   - Search for: `/brand/logo.png`
   - Fix in: `components/brand/BrandLogo.tsx` or similar

3. **Login Form**
   - File: `app/(auth)/login/page.tsx`
   - Add autocomplete attributes

---

## 🚨 Immediate Actions Required

1. **STOP THE INFINITE LOOP** - Fix the profile query urgently
2. **Database Migration** - Add `auth_user_id` column OR update all queries to use `id`
3. **Add Error Handling** - Prevent infinite retries
4. **Test Again** - Verify fixes with Playwright

---

## 📌 Next Steps

1. Find all files querying `profiles` table with `auth_user_id`
2. Update to match actual database schema
3. Add proper error boundaries
4. Re-run Playwright test to verify fixes
5. Check Supabase dashboard for API usage (may have hit rate limits)

---

**Generated by:** Claude Code with Playwright MCP
**Browser:** Chromium (isolated instance)
**Test Duration:** ~5 seconds
**Total Errors Logged:** 50+ (same error repeated)
