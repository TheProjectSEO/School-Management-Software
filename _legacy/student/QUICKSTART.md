# MSU Student App - Quick Start Guide

## Get Started in 3 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Environment Variables

The `.env.local` file should already contain:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Log In

Use these test credentials:

```
Email: student@msu.edu.ph
Password: MSUStudent2024!
```

**First time?** The test user was already created for you during setup!

If you need to create the user again:

```bash
npm run create-test-user
```

## What You Get

After logging in, you can access:

- **Dashboard** (`/`) - Student home with quick stats
- **My Subjects** (`/subjects`) - View enrolled subjects
- **Assessments** (`/assessments`) - View and take assessments
- **Progress** (`/progress`) - Track learning progress
- **Notes** (`/notes`) - Personal notes
- **Downloads** (`/downloads`) - Course materials
- **Notifications** (`/notifications`) - System notifications
- **Profile** (`/profile`) - Edit your profile
- **Help** (`/help`) - Get help and support

## Features Working

✅ **Authentication**
- Login with email/password
- Registration (creates new student account)
- Session management with cookies
- Auto-redirect for protected routes
- Logout functionality

✅ **Protected Routes**
- Middleware checks authentication on every request
- Automatic redirect to `/login` if not authenticated
- Automatic redirect to `/` if already logged in (from auth pages)

✅ **User Profile**
- Displays user name in sidebar
- Shows student role
- Edit profile functionality

## Testing Checklist

### Test Login Flow
1. ✅ Open `http://localhost:3000` → Redirects to `/login`
2. ✅ Enter credentials: `student@msu.edu.ph` / `MSUStudent2024!`
3. ✅ Click "Log In" → Redirects to dashboard
4. ✅ Sidebar shows "Test Student" and role

### Test Protected Routes
1. ✅ Navigate to `/subjects` → Loads successfully
2. ✅ Navigate to `/profile` → Shows profile form
3. ✅ All sidebar links work

### Test Logout
1. ✅ Click "Log Out" in sidebar
2. ✅ Redirected to `/login`
3. ✅ Try to access `/` → Redirected back to `/login`

### Test Registration (Optional)
1. ✅ Go to `/register`
2. ✅ Fill out form with new email
3. ✅ Create account → Redirects to dashboard

## Project Structure

```
student-app/
├── app/
│   ├── (auth)/              # Public auth routes
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── (student)/           # Protected student routes
│   │   ├── page.tsx         # Dashboard
│   │   ├── subjects/        # Subjects pages
│   │   ├── assessments/     # Assessments
│   │   ├── progress/        # Progress tracking
│   │   ├── notes/           # Notes
│   │   ├── downloads/       # Downloads
│   │   ├── notifications/   # Notifications
│   │   ├── profile/         # Profile
│   │   └── help/            # Help & Support
│   └── api/
│       └── auth/
│           └── logout/      # Logout endpoint
├── components/
│   ├── brand/
│   │   └── BrandLogo.tsx    # MSU logo component
│   └── layout/
│       ├── AppShell.tsx     # Main layout wrapper
│       ├── Sidebar.tsx      # Sidebar navigation
│       └── MobileNav.tsx    # Mobile navigation
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server Supabase client
│   │   └── middleware.ts    # Auth middleware
│   └── dal/                 # Data access layer
│       ├── student.ts
│       ├── subjects.ts
│       ├── assessments.ts
│       ├── notifications.ts
│       └── downloads.ts
├── middleware.ts            # Route protection
└── scripts/
    └── create-test-user.mjs # User creation script
```

## Need More Details?

See the comprehensive authentication guide:

📖 **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Complete authentication documentation

## Common Issues

### Issue: Can't log in
**Solution**: Verify the test user exists in Supabase Dashboard → Authentication → Users

### Issue: Redirected to login after logging in
**Solution**: Clear browser cookies and try again

### Issue: Test user doesn't exist
**Solution**: Run `npm run create-test-user`

## Next Steps

1. ✅ Set up database schema for student data
2. ✅ Implement subject enrollment
3. ✅ Add assessment functionality
4. ✅ Build progress tracking
5. ✅ Integrate real student data

## Support

Need help? Check the `/help` page in the app or see `AUTH_SETUP.md` for detailed troubleshooting.
