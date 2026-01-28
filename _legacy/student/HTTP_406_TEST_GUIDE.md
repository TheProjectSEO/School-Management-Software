# HTTP 406 Fix - Testing Guide

Quick guide to verify the HTTP 406 errors have been resolved.

---

## Quick Test (2 minutes)

### 1. Open Developer Tools
- Press `F12` or `Cmd+Option+I` (Mac)
- Go to **Network** tab
- Enable **Preserve log** checkbox

### 2. Login and Navigate
```
1. Login as student
2. Go to Dashboard
3. Go to Notes page
4. Go to Profile page
```

### 3. Check Results
**Success Criteria**: ✅ Zero entries with status `406` in Network tab

**Filter for errors**: Type `status-code:406` in Network filter box

---

## Detailed Test (10 minutes)

### Test 1: Notes API
1. Navigate to Notes page
2. Click "Create New Note"
3. Fill in title and content
4. Click "Save"
5. Edit the note
6. Delete the note

**Check**: All API calls return `200` or `201` status

### Test 2: Profile API
1. Navigate to Profile page
2. Update your name
3. Update your phone
4. Upload an avatar
5. Delete the avatar

**Check**: All API calls return `200` status

### Test 3: Dashboard Data
1. Navigate to Dashboard
2. Wait for all data to load
3. Check grades section
4. Check progress section
5. Check announcements

**Check**: No 406 errors, all sections load properly

### Test 4: Realtime Connection
1. Open Console tab in DevTools
2. Look for "Error fetching profile" or "Error fetching student"
3. Check RealtimeProvider logs

**Check**: No error messages about profiles or students

---

## Common Scenarios to Test

### Scenario 1: Fresh Login
**Purpose**: Test RealtimeProvider initialization

1. Clear browser cache and cookies
2. Login fresh
3. Check Network tab for 406 errors on first load

**Expected**: No 406 errors

### Scenario 2: Page Refresh
**Purpose**: Test all API endpoints

1. On any page, press `Cmd+R` or `F5`
2. Check Network tab

**Expected**: No 406 errors on refresh

### Scenario 3: Multiple Page Navigation
**Purpose**: Test repeated API calls

1. Navigate: Dashboard → Notes → Profile → Dashboard
2. Do this 3 times
3. Check Network tab

**Expected**: No accumulated 406 errors

---

## What to Look For

### ✅ Good Signs
- All API calls return `200`, `201`, `400`, `401`, `403`, `404`, or `500`
- No `406` status codes anywhere
- Console shows meaningful error messages (if any)
- Pages load quickly without hanging
- No infinite request loops

### ❌ Bad Signs
- Any `406` status code in Network tab
- Console errors about "Cannot coerce to single JSON object"
- Pages hanging or loading indefinitely
- Repeated identical API calls
- "Not Acceptable" errors

---

## Browser Console Commands

### Check for 406 errors in console
```javascript
// Run this in Console tab
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/'))
  .filter(r => {
    // This is a simplified check
    return r.transferSize === 0; // May indicate failed request
  })
  .map(r => r.name);
```

### Monitor API calls
```javascript
// Run this to log all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Response:', response.status, args[0]);
      return response;
    });
};
```

---

## Error Code Reference

| Code | Meaning | Should See | Should NOT See |
|------|---------|------------|----------------|
| 200 | OK | ✅ Common | - |
| 201 | Created | ✅ For new resources | - |
| 400 | Bad Request | ✅ For invalid input | - |
| 401 | Unauthorized | ✅ When not logged in | - |
| 403 | Forbidden | ✅ For RLS denials | - |
| 404 | Not Found | ✅ For missing resources | - |
| 406 | Not Acceptable | ❌ NEVER | This was the bug! |
| 500 | Server Error | ✅ For unexpected errors | - |

---

## Automated Test Script

Save as `test-406-errors.js` and run in Console:

```javascript
// Test for 406 errors
async function test406Errors() {
  console.log('🧪 Testing for HTTP 406 errors...');

  const startTime = Date.now();
  const errors = [];

  // Monitor fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response.status === 406) {
      errors.push({
        url: args[0],
        status: response.status,
        timestamp: new Date().toISOString()
      });
      console.error('❌ HTTP 406 found:', args[0]);
    }
    return response;
  };

  // Wait for 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Restore original fetch
  window.fetch = originalFetch;

  // Report results
  const duration = Date.now() - startTime;
  console.log(`\n📊 Test Results (${duration}ms):`);

  if (errors.length === 0) {
    console.log('✅ PASS - No HTTP 406 errors detected!');
  } else {
    console.error(`❌ FAIL - Found ${errors.length} HTTP 406 errors:`);
    console.table(errors);
  }

  return errors;
}

// Run test
test406Errors();
```

---

## Reporting Issues

If you find any 406 errors, report with:

### Required Information
1. **URL** that returned 406
2. **Request payload** (if any)
3. **User role** (student/teacher)
4. **Steps to reproduce**
5. **Screenshot** of Network tab
6. **Console logs**

### Example Report
```
URL: /api/notes
Method: GET
Status: 406
User: Student (ID: abc-123)
Steps:
  1. Login as student
  2. Navigate to Notes page
  3. See 406 error

Screenshot: [attach]
Console: [attach logs]
```

---

## Quick Fixes

If you see 406 errors after this fix:

### 1. Clear Cache
```bash
# Hard refresh
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### 2. Check Environment
- Verify `.env.local` has correct Supabase URL
- Check Supabase project is running
- Verify RLS policies are applied

### 3. Restart Dev Server
```bash
npm run dev
# or
yarn dev
```

---

## Success Criteria

✅ **Zero HTTP 406 errors** across all pages
✅ **All API endpoints** return proper status codes
✅ **Console logs** show meaningful errors (if any)
✅ **No infinite loops** or hanging requests
✅ **Fast page loads** without delays

---

**If all tests pass**: The HTTP 406 fix is successful! 🎉

**If tests fail**: Check `HTTP_406_FIX_SUMMARY.md` for troubleshooting steps.
