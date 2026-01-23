# Profile Update Flow - Complete Documentation

## Overview
This document explains the end-to-end flow for updating student profiles in the MSU Student Portal.

## Architecture

### File Structure
```
student-app/
├── app/
│   ├── (student)/
│   │   └── profile/
│   │       ├── page.tsx              # Server component - fetches data
│   │       └── ProfileForm.tsx       # Client component - form UI
│   └── api/
│       └── profile/
│           └── update/
│               └── route.ts          # API endpoint handler
└── lib/
    └── dal/
        └── student.ts                # Database access layer
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PAGE LOAD                                                    │
│    app/(student)/profile/page.tsx                               │
│                                                                  │
│    Server Component:                                            │
│    - Calls getCurrentStudent() from DAL                         │
│    - Fetches student + profile data from Supabase              │
│    - Passes profileData to ProfileForm client component        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. USER INTERACTION                                             │
│    app/(student)/profile/ProfileForm.tsx                        │
│                                                                  │
│    Client Component:                                            │
│    - User edits full_name or phone                             │
│    - Client-side validation:                                    │
│      • Full name: required, min 2 chars                        │
│      • Phone: optional, Philippine format                      │
│    - Save button becomes enabled when changes detected         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FORM SUBMISSION                                              │
│    ProfileForm.tsx → handleSave()                               │
│                                                                  │
│    - Validates form data                                        │
│    - Shows loading state                                        │
│    - POST to /api/profile/update with:                         │
│      {                                                          │
│        profileId: string,                                       │
│        full_name: string,                                       │
│        phone: string                                            │
│      }                                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. API ROUTE PROCESSING                                         │
│    app/api/profile/update/route.ts                              │
│                                                                  │
│    Server-side validation:                                      │
│    - Validates profileId exists                                 │
│    - Validates full_name (not empty, min 2 chars)              │
│    - Validates phone format (Philippine numbers)               │
│                                                                  │
│    Authorization:                                               │
│    - Gets authenticated user from Supabase session             │
│    - Verifies user owns the profile being updated              │
│    - Returns 401/403 if unauthorized                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. DATABASE UPDATE                                              │
│    lib/dal/student.ts → updateStudentProfile()                  │
│                                                                  │
│    Supabase update:                                             │
│    - Updates profiles table                                     │
│    - Sets full_name, phone, updated_at                         │
│    - WHERE id = profileId                                       │
│    - Returns updated profile or null                           │
│                                                                  │
│    RLS Policy enforces:                                         │
│    - User can only update their own profile                    │
│    - auth.uid() = profiles.auth_user_id                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE & UI UPDATE                                         │
│                                                                  │
│    Success path:                                                │
│    - API returns { success: true, profile: {...} }             │
│    - ProfileForm shows success message                          │
│    - router.refresh() reloads server data                      │
│    - Page displays updated name/phone                          │
│                                                                  │
│    Error path:                                                  │
│    - API returns { error: "..." } with status code             │
│    - ProfileForm shows error message                           │
│    - Form remains in edit state                                │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### profiles table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
```

### students table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  lrn TEXT,
  grade_level TEXT,
  section_id UUID REFERENCES sections(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Validation Rules

### Client-side (ProfileForm.tsx)
1. **Full Name**
   - Required field
   - Minimum 2 characters
   - Trimmed before submission
   - Error displayed inline

2. **Phone**
   - Optional field
   - If provided, must match Philippine format: `^(\+63|0)?9\d{9}$`
   - Accepts: `0917 123 4567`, `+639171234567`, `9171234567`
   - Spaces/hyphens/parentheses stripped before validation
   - Error displayed inline

### Server-side (API route + DAL)
1. **Profile ID**
   - Required
   - Must exist in database
   - User must own the profile (RLS check)

2. **Full Name**
   - Required if provided
   - Minimum 2 characters after trimming
   - Cannot be empty string

3. **Phone**
   - Same validation as client-side
   - Validated even if user bypasses client validation

## Error Handling

### Client Errors (400-499)
- **400 Bad Request**: Invalid data format or validation failure
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User doesn't own the profile
- **404 Not Found**: Profile doesn't exist

### Server Errors (500-599)
- **500 Internal Server Error**: Database error or unexpected failure
- Detailed error logged to server console
- Generic error message shown to user

### Error Display
- Validation errors: Red border + inline message below field
- API errors: Alert banner at top of form
- Success: Green banner with checkmark icon

## Loading States

1. **Initial Load**: Skeleton or loading spinner (handled by parent page)
2. **Saving**:
   - Button shows spinning icon + "Saving..." text
   - Form inputs remain enabled (user can still edit)
   - Save/Cancel buttons disabled
3. **Success**: Brief success message, then page refresh

## Testing Checklist

### Manual Testing Steps
1. ✅ Login as a student user
2. ✅ Navigate to /profile page
3. ✅ Verify current name and phone display correctly
4. ✅ Edit full name to new value
5. ✅ Click "Save Changes"
6. ✅ Verify success message appears
7. ✅ Verify page refreshes with new name
8. ✅ Check Supabase dashboard - confirm update persisted
9. ✅ Edit phone to valid format (e.g., "0917 123 4567")
10. ✅ Save and verify update
11. ✅ Edit phone to invalid format (e.g., "123")
12. ✅ Verify validation error appears
13. ✅ Try to save with empty name
14. ✅ Verify validation prevents save
15. ✅ Click "Cancel" - verify form resets to original values

### Database Verification
```sql
-- Check profiles table
SELECT id, full_name, phone, updated_at
FROM profiles
WHERE auth_user_id = '<user-auth-id>';

-- Check student linkage
SELECT s.*, p.full_name, p.phone
FROM students s
JOIN profiles p ON s.profile_id = p.id
WHERE p.auth_user_id = '<user-auth-id>';
```

### Automated Testing Script
Run the test script to verify database connectivity and structure:
```bash
npx tsx scripts/test-profile-update.ts
```

## Troubleshooting

### Issue: Profile update fails silently
**Solution**: Check browser console and server logs
- Server logs show detailed Supabase errors
- Check RLS policies allow update
- Verify profileId matches authenticated user

### Issue: Validation errors don't show
**Solution**: Check client-side state management
- Ensure `errors` state updates on input change
- Verify error clearing logic in onChange handlers

### Issue: Page doesn't refresh after save
**Solution**: Check router.refresh() timing
- Currently delayed by 500ms for better UX
- Ensure no errors in console blocking refresh

### Issue: Phone validation too strict
**Solution**: Update regex pattern in both:
- `/app/(student)/profile/ProfileForm.tsx` (line 50)
- `/app/api/profile/update/route.ts` (line 31)

### Issue: Updates work locally but not in production
**Solution**: Verify environment variables
- `NEXT_PUBLIC_SUPABASE_URL` set correctly
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- RLS policies enabled in production Supabase project

## Future Enhancements

### Avatar Upload
- Add file upload input with preview
- Upload to Supabase Storage bucket
- Update `avatar_url` field
- Handle image optimization and constraints

### Additional Fields
- Date of birth
- Guardian contact information
- Emergency contacts
- Mailing address

### Real-time Updates
- Use Supabase Realtime subscriptions
- Show updates if admin changes profile
- Optimistic UI updates

### Audit Trail
- Create `profile_updates` table
- Log all changes with timestamp
- Show update history to user

## Security Considerations

1. **Row Level Security (RLS)**: Enforced at database level
2. **Session-based Auth**: Supabase handles authentication
3. **Server-side Validation**: Never trust client input
4. **HTTPS Required**: All API calls encrypted
5. **Rate Limiting**: Consider adding to prevent abuse
6. **Input Sanitization**: Phone/name fields validated and trimmed

## Performance Considerations

1. **Server Components**: Profile page uses RSC for faster initial load
2. **Client Components**: Only interactive form is client-side
3. **Optimistic Updates**: Could be added for instant UI feedback
4. **Caching**: Next.js caches server component data automatically
5. **Revalidation**: `router.refresh()` triggers revalidation of cached data
