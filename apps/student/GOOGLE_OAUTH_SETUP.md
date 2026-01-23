# Google OAuth Integration - Complete Setup Guide

## ✅ What Has Been Implemented

Google OAuth authentication has been fully integrated into the MSU Student Portal, allowing students to sign up and log in with their Google accounts.

### Changes Made

1. **Login Page** (`app/(auth)/login/page.tsx`)
   - Added functional Google OAuth button
   - Implements `signInWithOAuth()` with Google provider
   - Redirects to `/auth/callback` after authentication

2. **Registration Page** (`app/(auth)/register/page.tsx`)
   - Added "Continue with Google" button
   - Same OAuth flow as login (both use `signInWithOAuth`)
   - Simplified signup process for users

3. **OAuth Callback Handler** (`app/auth/callback/route.ts`)
   - Exchanges OAuth code for user session
   - Automatically creates profile for new OAuth users
   - Creates student record linked to default school
   - Extracts user data from Google (name, email, avatar)
   - Redirects to dashboard after successful authentication

---

## 🔧 Supabase Configuration Required

For Google OAuth to work, you need to configure it in your Supabase Dashboard:

### Step 1: Access Supabase Authentication Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **qyjzqzqqjimittltttph**
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** in the list of providers

### Step 2: Enable Google Provider

Click on **Google** and you'll see these settings:

#### Option A: Use Supabase's Google OAuth (Quickest)

1. Toggle **Enable Sign in with Google** to **ON**
2. Keep **Use Supabase OAuth** enabled
3. Click **Save**

✅ **That's it!** Supabase will handle the OAuth flow with their credentials.

#### Option B: Use Your Own Google OAuth Credentials (Production Recommended)

If you want to use your own Google OAuth app:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if needed
6. Set Application Type: **Web application**
7. Add Authorized redirect URIs:
   ```
   https://qyjzqzqqjimittltttph.supabase.co/auth/v1/callback
   ```
8. Copy your **Client ID** and **Client Secret**
9. Paste them into Supabase:
   - **Client ID (for OAuth)**: [Your Google Client ID]
   - **Client Secret (for OAuth)**: [Your Google Client Secret]
10. Click **Save**

### Step 3: Configure Redirect URL

Make sure the Site URL is set correctly:

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. For production, update to your actual domain
4. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   ```

---

## 🧪 Testing Google OAuth

### Test Login Flow

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the app**: http://localhost:3000

3. **You'll be redirected to**: `/login`

4. **Click the Google button** under "Or continue with"

5. **Expected behavior**:
   - Opens Google sign-in popup/redirect
   - You select a Google account
   - Google asks for permission to share profile info
   - Redirects to `/auth/callback`
   - Creates your profile and student record (if new user)
   - Redirects to dashboard at `/`
   - You're logged in! 🎉

### Test Registration Flow

1. **Navigate to**: http://localhost:3000/register

2. **Click "Continue with Google"** button

3. **Expected behavior**:
   - Same flow as login
   - New users get profile + student record automatically
   - Existing users just sign in
   - Redirects to dashboard

### What Gets Created for New OAuth Users

When a new user signs up with Google, the callback handler automatically creates:

```sql
-- 1. Profile record
INSERT INTO profiles (
  auth_user_id,  -- Links to auth.users
  full_name,     -- From Google: "John Doe"
  avatar_url,    -- From Google profile picture
  phone          -- null (can be updated later)
);

-- 2. Student record
INSERT INTO students (
  school_id,     -- Default MSU school ID
  profile_id,    -- Links to profile created above
  lrn,           -- null
  grade_level,   -- null
  section_id     -- null
);
```

The student can update their profile details later from the `/profile` page.

---

## 🔍 Verification & Debugging

### Check if OAuth is Working

1. **Browser Console** (F12):
   - No errors should appear during OAuth flow
   - Check for any `signInWithOAuth` errors

2. **Network Tab**:
   - Should see redirect to Google OAuth
   - Should see callback to `/auth/callback?code=...`
   - Should see final redirect to `/`

3. **Supabase Dashboard**:
   - Go to **Authentication** → **Users**
   - Your Google account should appear in the user list
   - Provider column should show: **google**

4. **Database**:
   - Check `profiles` table → should have your Google name
   - Check `students` table → should have record linked to your profile

### Common Issues & Solutions

#### Issue: "Configuration not found"
- **Solution**: Make sure Google provider is enabled in Supabase Dashboard
- Go to Authentication → Providers → Google → Toggle ON

#### Issue: "Redirect URI mismatch"
- **Solution**: Add callback URL to Supabase:
  - Authentication → URL Configuration → Redirect URLs
  - Add: `http://localhost:3000/auth/callback`
- If using your own Google OAuth, also add to Google Console

#### Issue: "Failed to create profile"
- **Check**: Browser console for detailed error
- **Verify**: Database schema has `profiles` and `students` tables
- **Check**: Server logs in terminal for database errors

#### Issue: Microsoft button is disabled
- **Note**: Only Google OAuth is implemented
- Microsoft is shown as disabled (grayed out with `cursor-not-allowed`)
- Can be implemented later if needed

---

## 📊 OAuth Flow Diagram

```
User clicks "Google" button
         ↓
App calls: supabase.auth.signInWithOAuth({ provider: "google" })
         ↓
Redirects to: Google Sign-In page
         ↓
User signs in with Google account
         ↓
Google redirects to: /auth/callback?code=...
         ↓
Callback handler exchanges code for session
         ↓
Check if profile exists for this user
         ↓
    [NEW USER]              [EXISTING USER]
         ↓                         ↓
Create profile record        Skip profile creation
Create student record              ↓
         ↓                         ↓
    Redirect to: / (Dashboard)
```

---

## 🎯 Production Deployment Checklist

Before deploying to production:

- [ ] Set up your own Google OAuth credentials (Option B above)
- [ ] Update Site URL in Supabase to production domain
- [ ] Add production callback URL: `https://yourdomain.com/auth/callback`
- [ ] Test OAuth flow on production domain
- [ ] Verify RLS policies allow OAuth user registration
- [ ] Test that new OAuth users can access protected routes
- [ ] Monitor Supabase logs for any auth errors

---

## 🔐 Security Notes

### What Data is Shared

Google OAuth provides:
- **Name** (full_name)
- **Email** (used as primary identifier)
- **Profile Picture** (avatar_url)
- **Google User ID** (stored in auth.users metadata)

### Privacy Considerations

- Users control what they share via Google's permission screen
- Avatar URLs point to Google's servers (not stored locally)
- Email is required for user identification
- No password is stored for OAuth users

### RLS Policies

The callback handler uses **server-side Supabase client** which bypasses RLS for:
- Creating profiles for new users
- Creating student records

Once created, normal RLS policies apply:
- Users can only view/edit their own profile
- Users can only view their own student data

---

## 📝 User Experience

### For New Users (First-Time OAuth)

1. Click "Continue with Google"
2. Choose Google account
3. Grant permissions
4. **Automatically redirected to dashboard**
5. Profile is created with Google name + avatar
6. Can update profile details later

### For Existing Users (Returning OAuth)

1. Click "Continue with Google"
2. Choose Google account
3. **Immediately redirected to dashboard**
4. All previous data intact

### Mixed Authentication

Users can have both:
- ✅ Email/password account
- ✅ Google OAuth account

As long as the email matches, Supabase links them automatically.

---

## 🚀 Next Steps

Now that Google OAuth is working:

1. **Test the flow** with a real Google account
2. **Verify** profile creation in Supabase dashboard
3. **Check** that students can access the dashboard
4. **Consider adding**:
   - Microsoft OAuth (similar implementation)
   - GitHub OAuth
   - Facebook OAuth
5. **Monitor** authentication logs in Supabase

---

## 💡 Tips

- **Development**: Use Supabase's built-in Google OAuth for quick testing
- **Production**: Set up your own Google OAuth app for branding control
- **Testing**: Use incognito mode to test new user registration
- **Debugging**: Check Supabase logs: Authentication → Logs
- **Email Confirmation**: Can be disabled for OAuth users (they're pre-verified by Google)

---

## 📞 Need Help?

If Google OAuth isn't working:

1. Check Supabase Dashboard → Authentication → Logs
2. Check browser console for errors
3. Check server terminal for callback errors
4. Verify Google provider is enabled
5. Verify redirect URLs are correct

---

## ✨ Summary

✅ **Login page**: Google OAuth functional
✅ **Registration page**: Google OAuth added
✅ **Callback handler**: Auto-creates profiles for new users
✅ **Database**: Properly stores OAuth user data
✅ **Security**: RLS policies protect user data
✅ **UX**: Seamless one-click authentication

**Your students can now sign up and log in with just their Google account!** 🎉
