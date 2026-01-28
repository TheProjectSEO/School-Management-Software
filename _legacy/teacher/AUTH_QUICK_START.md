# Authentication Quick Start Guide

Fast reference for working with teacher authentication in the MSU Teacher App.

## Setup (First Time)

1. **Environment Variables**
```bash
cp .env.local.example .env.local
# Add your Supabase credentials
```

2. **Run Migrations**
```bash
cd supabase
supabase db push
```

3. **Install Dependencies**
```bash
npm install
```

## Common Tasks

### Protect a Server Component

```typescript
import { requireTeacher } from '@/lib/auth/teacher'

export default async function MyPage() {
  const teacher = await requireTeacher() // Auto-redirects if not authenticated

  return <div>Welcome {teacher.profile.full_name}</div>
}
```

### Get Teacher Data (Optional)

```typescript
import { getCurrentTeacher } from '@/lib/auth/teacher'

export default async function MyPage() {
  const teacher = await getCurrentTeacher() // Returns null if not authenticated

  if (!teacher) {
    return <div>Please log in</div>
  }

  return <div>Welcome {teacher.profile.full_name}</div>
}
```

### Client-Side Auth State

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function MyComponent() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (!user) return <div>Loading...</div>

  return <div>Email: {user.email}</div>
}
```

### Manual Logout

```typescript
const handleLogout = async () => {
  const response = await fetch('/api/auth/logout', { method: 'POST' })
  if (response.ok) {
    router.push('/login')
  }
}
```

## Route Protection Cheatsheet

| Route Pattern | Access | Redirect |
|--------------|--------|----------|
| `/login` | Unauthenticated only | `/teacher` if teacher, `/` if student |
| `/teacher-register` | Unauthenticated only | Same as login |
| `/teacher/*` | Teachers only | `/login` |
| `/` (student routes) | Students only | `/login` |

## Database Queries

### Get Teacher with School

```typescript
const { data: teacher } = await supabase
  .from('teacher_profiles')
  .select(`
    *,
    profile:profiles!teacher_profiles_profile_id_fkey(*),
    school:schools!teacher_profiles_school_id_fkey(*)
  `)
  .eq('profile_id', profileId)
  .single()
```

### Check if User is Teacher

```typescript
const { data: teacherProfile } = await supabase
  .from('teacher_profiles')
  .select('id')
  .eq('profile_id', profileId)
  .eq('is_active', true)
  .maybeSingle()

const isTeacher = !!teacherProfile
```

### Get All Schools

```typescript
const { data: schools } = await supabase
  .from('schools')
  .select('id, name, slug')
  .order('name')
```

## Troubleshooting

**Problem**: "No role assigned" error on login
- **Solution**: User needs either `teacher_profiles` or `students` record

**Problem**: Redirected to login on teacher routes
- **Solution**: Check `is_active = true` in `teacher_profiles`

**Problem**: Session not persisting
- **Solution**: Check middleware matcher pattern, verify cookies

**Problem**: School dropdown empty
- **Solution**: Ensure schools exist in database, check RLS policies

## Schema Reference

```sql
-- Core auth tables in n8n_content_creation schema

profiles (
  id uuid,
  auth_user_id uuid → auth.users(id),
  full_name text,
  avatar_url text
)

teacher_profiles (
  id uuid,
  profile_id uuid → profiles(id),
  school_id uuid → schools(id),
  employee_id text,
  department text,
  is_active boolean
)

schools (
  id uuid,
  name text,
  slug text,
  logo_url text
)
```

## Testing Commands

```bash
# Start dev server
npm run dev

# Check types
npx tsc --noEmit

# Test login flow
# 1. Navigate to /login
# 2. Enter test credentials
# 3. Verify redirect to /teacher

# Test registration
# 1. Navigate to /teacher-register
# 2. Fill form with test data
# 3. Verify profile creation in Supabase dashboard
```

## RLS Policy Examples

```sql
-- Teachers can view own profile
CREATE POLICY "Teachers can view own profile"
ON n8n_content_creation.teacher_profiles
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM n8n_content_creation.profiles
    WHERE auth_user_id = auth.uid()
  )
);

-- Teachers can update own profile
CREATE POLICY "Teachers can update own profile"
ON n8n_content_creation.teacher_profiles
FOR UPDATE
USING (
  profile_id IN (
    SELECT id FROM n8n_content_creation.profiles
    WHERE auth_user_id = auth.uid()
  )
);
```

## Common Gotchas

1. **Schema Prefix**: Always use `n8n_content_creation.` prefix in queries
2. **is_active Check**: Always filter by `is_active = true` for teachers
3. **maybeSingle() vs single()**: Use `maybeSingle()` when record may not exist
4. **Cookie Issues**: Clear cookies if testing auth flows repeatedly
5. **RLS Policies**: Queries fail silently if RLS blocks access

## Quick Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [CLAUDE.md](./CLAUDE.md) - Full project spec

---

**Last Updated**: 2025-12-28
