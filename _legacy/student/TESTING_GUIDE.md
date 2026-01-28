# MSU Student App - Authentication Testing Guide

## Quick Test (5 Minutes)

This guide will help you verify that authentication is working correctly.

### Prerequisites
- Dev server running: `npm run dev`
- Test user created: `npm run create-test-user`

---

## Test 1: Login Flow (2 min)

### Step 1: Access the App
1. Open browser (Chrome/Firefox recommended)
2. Navigate to: `http://localhost:3000`

**Expected Result:**
- ✅ Automatically redirected to `/login`
- ✅ MSU logo visible at top
- ✅ Login form displays

**Screenshot markers:**
- University name "Mindanao State University"
- "Student Portal Login" subtitle
- Email input with person icon
- Password input with lock icon
- "Log In" button

### Step 2: Enter Invalid Credentials
1. Email: `wrong@example.com`
2. Password: `wrongpassword`
3. Click "Log In"

**Expected Result:**
- ✅ Error message appears in red box
- ✅ Message: "Invalid login credentials"
- ✅ Form remains visible
- ✅ Still on `/login` page

### Step 3: Enter Valid Credentials
1. Email: `student@msu.edu.ph`
2. Password: `MSUStudent2024!`
3. Click "Log In"

**Expected Result:**
- ✅ Loading state shows "Logging in..."
- ✅ Redirect to `/` (dashboard)
- ✅ Sidebar appears on left
- ✅ User name "Test Student" visible in sidebar
- ✅ Role "Student" visible under name

---

## Test 2: Protected Routes (1 min)

### Test Access to Protected Pages

With user logged in, click each sidebar link:

1. ✅ Dashboard (`/`) - Should load
2. ✅ My Subjects (`/subjects`) - Should load
3. ✅ Assessments (`/assessments`) - Should load
4. ✅ Progress (`/progress`) - Should load
5. ✅ Notes (`/notes`) - Should load
6. ✅ Downloads (`/downloads`) - Should load
7. ✅ Notifications (`/notifications`) - Should load (badge shows "2")
8. ✅ Profile (`/profile`) - Should load with edit form
9. ✅ Help (`/help`) - Should load

**Expected Result for ALL pages:**
- ✅ Page loads successfully
- ✅ Sidebar remains visible
- ✅ User name still shows in sidebar
- ✅ No redirect to login

---

## Test 3: Logout Flow (1 min)

### Step 1: Click Logout
1. Scroll to bottom of sidebar
2. Click "Log Out" button (with logout icon)

**Expected Result:**
- ✅ Immediately redirected to `/login`
- ✅ Login form visible again
- ✅ No user data in view
- ✅ Session cleared

### Step 2: Try Accessing Protected Route
1. In URL bar, type: `http://localhost:3000/`
2. Press Enter

**Expected Result:**
- ✅ Redirected back to `/login`
- ✅ Cannot access dashboard without logging in

---

## Success Criteria

✅ **All tests pass** means authentication is working correctly!

You should be able to:
1. ✅ Log in with valid credentials
2. ✅ Access all protected routes when logged in
3. ✅ Log out successfully
4. ✅ Be redirected to login when accessing protected routes while logged out
5. ✅ Session persists on page refresh
6. ✅ See user name in sidebar

---

**Happy Testing! 🎉**
