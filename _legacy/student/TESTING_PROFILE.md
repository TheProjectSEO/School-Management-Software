# Quick Testing Guide - Profile Updates

## 🚀 Quick Start

### 1. Start the Application
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app
npm run dev
```

### 2. Open Browser
Navigate to: `http://localhost:3000`

### 3. Test the Profile Update Flow

#### Test Case 1: Successful Name Update
1. Login with test credentials
2. Navigate to `/profile`
3. Change name from "Test Student" to "Updated Name"
4. Click "Save Changes"
5. ✅ **Expected**: Success message appears, page refreshes, new name displays

#### Test Case 2: Successful Phone Update
1. Enter phone: `0917 123 4567`
2. Click "Save Changes"
3. ✅ **Expected**: Success message, data persists

#### Test Case 3: Phone Validation
Try these invalid formats:
- `123` → ❌ Should show error
- `abcd` → ❌ Should show error
- `0800 123 4567` → ❌ Should show error (not mobile)

Try these valid formats:
- `0917 123 4567` → ✅ Should accept
- `+639171234567` → ✅ Should accept
- `9171234567` → ✅ Should accept
- `0917-123-4567` → ✅ Should accept

#### Test Case 4: Name Validation
- Empty name → ❌ "Full name is required"
- Single character → ❌ "Full name must be at least 2 characters"
- Two+ characters → ✅ Should accept

#### Test Case 5: Cancel Button
1. Edit name to "Changed Name"
2. Click "Cancel"
3. ✅ **Expected**: Form resets to original value

#### Test Case 6: No Changes
1. Don't edit anything
2. ✅ **Expected**: Save button is disabled

## 🔍 Verification Points

### Client-Side Checks
Open browser DevTools (F12) and check:

1. **Console**: Should be error-free
2. **Network Tab**:
   - POST to `/api/profile/update` on save
   - Status: `200 OK` on success
   - Response includes updated profile data

### Server-Side Checks
Check terminal running `npm run dev`:

```bash
# Should see these logs on update:
Updating profile: { profileId: '...', updates: { full_name: '...', phone: '...' } }
Profile updated successfully: { id: '...', full_name: '...', ... }
```

### Database Checks
Open Supabase Dashboard > Table Editor > profiles:

```sql
SELECT id, full_name, phone, updated_at
FROM profiles
ORDER BY updated_at DESC
LIMIT 5;
```

✅ **Verify**: Your changes are reflected in the database

## 🧪 Testing Script

Run automated database structure test:

```bash
npx tsx scripts/test-profile-update.ts
```

**Expected Output:**
```
🧪 Testing Profile Update Functionality
=============================================================

📋 Step 1: Checking existing profiles...
✅ Found X profile(s)

📋 Step 2: Testing profile table structure...
✅ Profile table has correct structure

📋 Step 3: Testing update operation...
⚠️  RLS is active (expected behavior)

📋 Step 4: Verifying data types...
✅ All data types are correct

📋 Step 5: Checking students table relationship...
✅ Student record found and properly linked
```

## 📊 Common Test Scenarios

### Scenario A: New Student Profile
1. Register new student account
2. Go to profile
3. Fill in phone number
4. Save
5. ✅ Profile should update successfully

### Scenario B: Existing Profile Update
1. Login as existing student
2. Update name and phone
3. Save
4. Logout and login again
5. ✅ Changes should persist

### Scenario C: Multiple Updates
1. Update name, save
2. Update phone, save
3. Update both, save
4. ✅ All updates should work independently

### Scenario D: Concurrent Updates (Edge Case)
1. Open profile in two browser tabs
2. Update name in tab 1, save
3. Update phone in tab 2, save
4. ✅ Last update should win (expected behavior)

## 🐛 What to Look For

### ✅ Good Signs
- Success message appears after save
- Page refreshes automatically
- New data displays immediately
- Database reflects changes
- No console errors
- Network request returns 200

### 🚨 Red Flags
- Error message: "Unauthorized" → Check login session
- Error message: "Profile not found" → Check profileId in database
- Error message: "Permission denied" → Check RLS policies
- Form not submitting → Check validation errors
- Changes not persisting → Check API route logs
- 500 errors → Check server terminal for details

## 📝 Test Data Examples

### Valid Test Data
```javascript
// Names
"John Doe"
"María González"
"李明"
"محمد"

// Philippine Mobile Numbers
"0917 123 4567"
"+63 917 123 4567"
"09171234567"
"917-123-4567"
"(0917) 123-4567"
```

### Invalid Test Data (Should Fail)
```javascript
// Names
""           // Empty
" "          // Only spaces
"J"          // Too short

// Phone Numbers
"123"        // Too short
"0800 12345" // Landline format
"12345678"   // No prefix
"abcdefgh"   // Non-numeric
"+1 555 1234" // Non-Philippine
```

## 🔐 Security Testing

### Test Authentication
1. Logout
2. Try to access `/profile` directly
3. ✅ Should redirect to `/login`

### Test Authorization
1. Login as Student A
2. Get profileId from browser DevTools
3. Logout, login as Student B
4. Try to update Student A's profile via API
5. ✅ Should get 403 Forbidden

### Test Input Sanitization
Try to inject HTML/JavaScript:
```javascript
// These should be escaped/sanitized
"<script>alert('xss')</script>"
"'; DROP TABLE profiles; --"
```
✅ Should save as plain text, not execute

## 🎯 Success Criteria

All these must be true:
- [x] Form loads with current profile data
- [x] Validation works on both client and server
- [x] Success message appears on save
- [x] Page refreshes with new data
- [x] Database updates persist
- [x] Error messages display for invalid input
- [x] Authorization prevents unauthorized updates
- [x] Loading states show during save
- [x] Cancel button resets form
- [x] Save button disabled when no changes

## 📞 Debugging Tips

### Issue: Form not saving
```bash
# Check these in order:
1. Browser console - any errors?
2. Network tab - request sent?
3. Server logs - any errors?
4. Supabase logs - RLS blocking?
```

### Issue: Validation not working
```javascript
// Add console.logs to ProfileForm.tsx:
console.log('Form data:', formData);
console.log('Errors:', errors);
console.log('Has changes:', hasChanges);
```

### Issue: Database not updating
```sql
-- Check Supabase directly:
SELECT * FROM profiles WHERE id = 'your-profile-id';

-- Check RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Get Detailed Logs
In `lib/dal/student.ts`, the console.log statements will show:
- What data is being sent to Supabase
- What error (if any) Supabase returns
- Whether the update succeeded

## 🎓 Learning Points

After testing, you should understand:
1. How form validation works (client + server)
2. How authentication is enforced
3. How authorization protects user data
4. How data flows from UI → API → Database
5. How errors are handled and displayed
6. How loading states improve UX

## ✅ Final Verification

Before considering testing complete:

```bash
# 1. Run automated test
npx tsx scripts/test-profile-update.ts

# 2. Manual test all scenarios above

# 3. Check Supabase dashboard
# → Table Editor → profiles
# → Recent updates should show

# 4. Check for console errors
# → Browser DevTools
# → Server terminal

# 5. Verify data persistence
# → Logout and login again
# → Changes should still be there
```

## 📚 Next Steps

After profile updates work:
1. Implement avatar upload functionality
2. Add more editable fields (DOB, address, etc.)
3. Create audit log for changes
4. Add real-time sync for concurrent edits
5. Implement optimistic UI updates

---

**Need Help?**
- Check: [PROFILE_UPDATE_FLOW.md](./PROFILE_UPDATE_FLOW.md)
- Review: [PROFILE_UPDATE_SUMMARY.md](./PROFILE_UPDATE_SUMMARY.md)
- Run: `npx tsx scripts/test-profile-update.ts`
