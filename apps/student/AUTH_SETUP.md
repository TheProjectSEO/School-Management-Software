# MSU Student App - Authentication Setup Guide

## Overview

The MSU Student App uses **Supabase Authentication** with SSR (Server-Side Rendering) support for Next.js App Router. This guide covers the complete authentication setup, testing, and troubleshooting.

## Architecture

### Authentication Flow

```
User Login → Supabase Auth → Session Cookie → Middleware Check → Protected Routes
```

### Key Components

1. **Client-Side Auth** (`/lib/supabase/client.ts`)
   - Used in Client Components
   - Handles browser-based auth operations (login, register, logout)

2. **Server-Side Auth** (`/lib/supabase/server.ts`)
   - Used in Server Components and Server Actions
   - Reads/validates session from cookies
   - Uses custom schema: `"school software"`

3. **Middleware** (`/middleware.ts` + `/lib/supabase/middleware.ts`)
   - Runs on every request
   - Validates session
   - Redirects unauthenticated users to `/login`
   - Redirects authenticated users away from auth pages

4. **Auth Pages**
   - `/app/(auth)/login/page.tsx` - Login form
   - `/app/(auth)/register/page.tsx` - Registration form

5. **Logout API** (`/app/api/auth/logout/route.ts`)
   - Server-side logout endpoint
   - Clears Supabase session

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Creating Test Users

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qyjzqzqqjimittltttph`
3. Navigate to **Authentication** → **Users**
4. Click **Add User** → **Create new user**
5. Enter:
   - **Email**: `student@msu.edu.ph`
   - **Password**: `MSUStudent2024!`
   - **Auto Confirm User**: ✅ (check this box)
6. Click **Create user**

### Method 2: Using the Registration Page

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/register`
3. Fill out the registration form:
   - Full Name: `Test Student`
   - Student ID: `2024-0001`
   - Email: `student@msu.edu.ph`
   - Password: `MSUStudent2024!`
   - Confirm Password: `MSUStudent2024!`
4. Check "I agree to the Terms of Service and Privacy Policy"
5. Click **Create Account**

**Note**: If email confirmation is enabled in Supabase, you'll need to:
- Disable email confirmation in Supabase Dashboard → Authentication → Providers → Email → Confirm email: OFF
- OR check the confirmation email in Supabase → Authentication → Users → click user → copy confirmation link

### Method 3: Using Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace with your desired email/password):

```sql
-- Create user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'student@msu.edu.ph',
  crypt('MSUStudent2024!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test Student","student_id":"2024-0001"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create identity
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id::text,
  id,
  format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'student@msu.edu.ph';
```

## Test Users

Here are the test credentials you can use:

| Email | Password | Full Name | Student ID |
|-------|----------|-----------|------------|
| `student@msu.edu.ph` | `MSUStudent2024!` | Test Student | 2024-0001 |

## Testing the Authentication Flow

### 1. Test Login Flow

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:3000
```

**Expected Behavior**:
1. ✅ Redirected to `/login` (not authenticated)
2. ✅ Login page displays with MSU logo and form
3. ✅ Enter: `student@msu.edu.ph` / `MSUStudent2024!`
4. ✅ Click "Log In"
5. ✅ Redirected to `/` (dashboard)
6. ✅ Sidebar shows user name and role
7. ✅ Can navigate to protected routes

### 2. Test Logout Flow

1. ✅ Click "Log Out" in sidebar
2. ✅ Redirected to `/login`
3. ✅ Cannot access protected routes without logging in again

### 3. Test Protected Routes

Try accessing these URLs without logging in:

- `http://localhost:3000/` → Redirects to `/login` ✅
- `http://localhost:3000/subjects` → Redirects to `/login` ✅
- `http://localhost:3000/profile` → Redirects to `/login` ✅

After logging in, all routes should be accessible.

### 4. Test Auth Page Redirects

When logged in, try accessing:

- `http://localhost:3000/login` → Redirects to `/` ✅
- `http://localhost:3000/register` → Redirects to `/` ✅

## Authentication Code Files

### Client-Side Supabase Client
**File**: `/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server-Side Supabase Client
**File**: `/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SCHEMA_NAME = "school software";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
      db: {
        schema: SCHEMA_NAME,
      },
    }
  );
}
```

### Middleware
**File**: `/lib/supabase/middleware.ts`

- Validates user session on every request
- Redirects to `/login` if not authenticated
- Redirects to `/` if authenticated user tries to access auth pages

## Troubleshooting

### Issue: "Invalid login credentials"

**Solution**:
1. Verify user exists in Supabase Dashboard → Authentication → Users
2. Check email is confirmed (email_confirmed_at should have a date)
3. Reset password in Supabase Dashboard if needed

### Issue: "Redirected to /login even after logging in"

**Solution**:
1. Check browser console for errors
2. Verify `.env.local` has correct Supabase URL and anon key
3. Clear browser cookies and try again
4. Check middleware logs: `console.log('User:', user)` in middleware.ts

### Issue: "Cannot access protected routes"

**Solution**:
1. Ensure middleware is running (check matcher config)
2. Verify session cookie is being set (check Application → Cookies in DevTools)
3. Test auth status: Add console.log in middleware to debug

### Issue: "User data not showing in sidebar"

**Solution**:
1. Check user metadata in Supabase Dashboard → Authentication → Users
2. Ensure `full_name` is set in `raw_user_meta_data`
3. Update user metadata if needed:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "Test Student"}'::jsonb
WHERE email = 'student@msu.edu.ph';
```

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use Row Level Security (RLS)** - Enforce authorization at database level
3. **Validate on server** - Never trust client-side checks alone
4. **Use HTTPS in production** - Required for secure cookies
5. **Enable MFA** - For admin accounts in production

## Next Steps

After authentication is working:

1. ✅ Set up database schema for student data
2. ✅ Create RLS policies for students table
3. ✅ Add profile editing functionality
4. ✅ Implement password reset flow
5. ✅ Add email verification (optional)

## API Routes

### POST `/api/auth/logout`

Logs out the current user and clears the session.

**Request**: No body required

**Response**:
```json
{
  "success": true
}
```

## Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Verify environment variables are loaded
npm run dev | grep SUPABASE
```

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
