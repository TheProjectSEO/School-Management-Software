# Auto-Provisioning Guide

## Overview

Auto-provisioning ensures that every authenticated user automatically has a `profile` record and a `student` record created on their first login, regardless of authentication method (email/password, Google OAuth, etc.).

## Problem Solved

Previously, users who signed in with email/password would have an `auth.users` record but no corresponding `profile` or `student` record, causing database queries to fail and preventing access to the app.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

User Signs In (Email or OAuth)
        ↓
   Middleware Runs
        ↓
   Check if user is authenticated
        ↓
   YES → Auto-Provision User
        ↓
   ┌────────────────────────────────────┐
   │   autoProvisionUser() Function      │
   ├────────────────────────────────────┤
   │ 1. Check if profile exists          │
   │    → If NO: Create profile          │
   │                                     │
   │ 2. Check if student exists          │
   │    → If NO: Create student          │
   │                                     │
   │ 3. Return success/error             │
   └────────────────────────────────────┘
        ↓
   User accesses app normally
```

### Components

#### 1. **AUTO_PROVISION_USER.ts** (`/lib/auth/AUTO_PROVISION_USER.ts`)

The core provisioning logic. Contains:

- `autoProvisionUser()` - Main function that creates profile and student records
- `enrollInDefaultCourses()` - Optional function to enroll new students in courses

**Key Features:**
- Idempotent: Safe to call multiple times, only creates missing records
- Error handling: Partial failures don't block user access
- Logging: Comprehensive console logs for debugging
- Type-safe: Full TypeScript types with `ProvisionResult` interface

#### 2. **Middleware** (`/lib/supabase/middleware.ts`)

Updated to call auto-provisioning on every authenticated request.

**Why Middleware?**
- Runs on every page load for authenticated users
- Catches users who logged in before provisioning was implemented
- Works for all auth methods (email, OAuth, magic link)
- Non-blocking: Errors don't prevent app access

#### 3. **OAuth Callback** (`/app/auth/callback/route.ts`)

Already had provisioning for OAuth users. Now both paths use consistent logic.

## Implementation Details

### Profile Creation

When a profile doesn't exist, it's created with:

```typescript
{
  auth_user_id: userId,          // Links to auth.users
  full_name: <derived>,          // From metadata or email
  avatar_url: <optional>,        // From OAuth metadata
  phone: <optional>              // From metadata
}
```

**Name Priority:**
1. `user_metadata.full_name`
2. `user_metadata.name`
3. Email prefix (before @)
4. Fallback: "Student"

### Student Creation

When a student record doesn't exist, it's created with:

```typescript
{
  school_id: <default school>,   // First school in database (MSU)
  profile_id: <profile id>,      // Links to profiles table
  lrn: null,                     // Can be set later
  grade_level: null,             // Can be set later
  section_id: null               // Can be assigned later
}
```

## Database Schema

```sql
-- Profile linked to auth.users
profiles
├── id (UUID, PK)
├── auth_user_id (UUID, FK → auth.users.id)
├── full_name (TEXT)
├── phone (TEXT)
├── avatar_url (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Student linked to profile
students
├── id (UUID, PK)
├── school_id (UUID, FK → schools.id)
├── profile_id (UUID, FK → profiles.id)
├── lrn (TEXT)
├── grade_level (TEXT)
├── section_id (UUID, FK → sections.id)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Row Level Security (RLS)

The provisioning function uses the Supabase anon key, which is subject to RLS policies:

```sql
-- Profiles
- "Users can view own profile" - SELECT using auth.uid() = auth_user_id
- "Users can update own profile" - UPDATE using auth.uid() = auth_user_id

-- Students
- "Students can view own data" - SELECT using profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
```

**Note:** The middleware Supabase client needs to use the correct schema:

```typescript
db: {
  schema: "school software", // Must match server.ts
}
```

## Usage Examples

### Example 1: New Email/Password User

```typescript
// User signs up
POST /api/auth/signup
{
  email: "student@msu.edu.ph",
  password: "password123"
}

// On first page load → Middleware runs
// autoProvisionUser() is called
// → Profile created: { full_name: "student", auth_user_id: <uuid> }
// → Student created: { profile_id: <uuid>, school_id: <msu-id> }
// User can now access all pages
```

### Example 2: Existing OAuth User

```typescript
// User logs in with Google
// OAuth callback already provisions
// Middleware runs → Checks for profile/student
// → Already exists, no action taken
// User continues normally
```

### Example 3: Manual Provisioning Call

If you need to provision a user manually (e.g., in an API route):

```typescript
import { createClient } from "@/lib/supabase/server";
import { autoProvisionUser } from "@/lib/auth/AUTO_PROVISION_USER";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await autoProvisionUser(
    supabase,
    user.id,
    user.email,
    user.user_metadata
  );

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({
    profileId: result.profileId,
    studentId: result.studentId,
    isNewUser: result.isNewUser,
  });
}
```

## Optional: Default Course Enrollment

You can automatically enroll new students in default courses:

```typescript
import { autoProvisionUser, enrollInDefaultCourses } from "@/lib/auth/AUTO_PROVISION_USER";

// After provisioning
const provision = await autoProvisionUser(supabase, userId, email);

if (provision.success && provision.studentId && provision.isNewUser) {
  // Enroll in default courses
  await enrollInDefaultCourses(supabase, provision.studentId);
}
```

This will enroll students in:
- All courses for their school
- Section-specific courses if assigned
- Limited to 10 courses by default

## Testing

### Test New User Flow

1. **Create test user in Supabase Dashboard:**
   - Go to Authentication → Users
   - Click "Add User"
   - Email: `test@example.com`
   - Password: `test123456`

2. **Log in through the app:**
   - Visit `/login`
   - Enter credentials
   - Check console logs for provisioning messages

3. **Verify database:**
   ```sql
   -- Check profile was created
   SELECT * FROM profiles WHERE auth_user_id = '<user-id>';

   -- Check student was created
   SELECT s.* FROM students s
   JOIN profiles p ON s.profile_id = p.id
   WHERE p.auth_user_id = '<user-id>';
   ```

### Test Existing User Flow

1. Log in with an existing user
2. Check console - should NOT see "New user provisioned" message
3. Verify no duplicate records were created

### Check Logs

Development logs to watch for:

```bash
# New user provisioned
[Middleware] New user provisioned: {
  userId: '<uuid>',
  profileId: '<uuid>',
  studentId: '<uuid>'
}

# Existing user (no logs)
# User continues normally

# Error case
[Middleware] Auto-provision failed: <error message>
# User still gets access, but may have partial data
```

## Troubleshooting

### Issue: "Profile check failed"

**Cause:** RLS policy preventing read access

**Solution:** Verify RLS policies allow users to read their own profile:

```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);
```

### Issue: "Student creation failed"

**Cause:** Default school not found or RLS blocking insert

**Solution:**
1. Verify a school exists: `SELECT * FROM schools LIMIT 1;`
2. Check RLS allows students to be created (may need service role for initial creation)

### Issue: User stuck in redirect loop

**Cause:** Middleware failing to provision and blocking access

**Solution:**
- Check middleware logs for errors
- Manually create profile/student in database
- Verify schema is set correctly in middleware client

### Issue: "Schema not found"

**Cause:** Middleware using wrong schema

**Solution:** Ensure middleware client uses correct schema:

```typescript
const supabase = createServerClient(url, key, {
  db: { schema: "school software" }, // Must match your schema
  // ...
});
```

## Performance Considerations

### Is This Too Slow?

The middleware runs on **every authenticated request**, but:

✅ **Fast Checks:** Only does `SELECT` queries if records exist (most cases)
✅ **Cached:** Supabase caches results within the same request
✅ **Non-blocking:** Errors don't prevent page loads
✅ **Idempotent:** Safe to run repeatedly

### Optimization Options

If performance becomes an issue:

1. **Add caching:** Store provisioning status in session cookie
2. **Move to callback only:** Only provision in auth callback (not middleware)
3. **Use database trigger:** Create profile/student via PostgreSQL trigger

## Migration Notes

### Existing Users

Users who signed up before auto-provisioning will be automatically provisioned on their next login. No manual migration needed.

### Existing OAuth Users

OAuth users already have profiles/students (from callback). Middleware checks will find existing records and skip creation.

## Security Considerations

### Data Privacy

- Only creates records for authenticated users
- Uses RLS policies to restrict access
- No sensitive data in logs (only UUIDs)

### Authorization

- Uses anon key (not service role)
- Subject to all RLS policies
- Can't bypass security rules

### Error Handling

- Partial failures don't expose sensitive errors to users
- All errors logged server-side only
- Users can still access app even if provisioning fails partially

## Future Enhancements

Potential improvements:

1. **Email verification:** Only provision after email is verified
2. **Role selection:** Allow users to choose student/teacher on signup
3. **School selection:** Let users pick their school during registration
4. **Admin approval:** Require admin approval before creating student record
5. **Bulk provisioning:** Script to provision existing users in batch

## Related Files

- `/lib/auth/AUTO_PROVISION_USER.ts` - Core provisioning logic
- `/lib/supabase/middleware.ts` - Middleware integration
- `/app/auth/callback/route.ts` - OAuth provisioning
- `/lib/supabase/server.ts` - Server Supabase client
- `/supabase/migrations/00000000000001_create_schema.sql` - Database schema

## Support

If you encounter issues:

1. Check console logs for error messages
2. Verify database schema matches expectations
3. Test RLS policies with service role
4. Review this guide for common issues

---

**Last Updated:** 2026-01-12
**Version:** 1.0
**Status:** Production Ready ✅
