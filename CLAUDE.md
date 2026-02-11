# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server on port 3000
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript strict check (npx tsc --noEmit)
```

No test framework is configured. Validate changes with `npm run type-check` and `npm run lint`.

## Architecture

Next.js 15 App Router + Supabase (PostgreSQL) + TailwindCSS. Three role-based dashboards (admin, teacher, student) in a single unified app. JWT + RBAC authentication using `jose` (not Supabase Auth sessions).

### Directory Layout

- `app/(auth)/` — Login, register, forgot/reset password
- `app/(public)/` — Public marketing pages (about, contact, features, pricing, apply)
- `app/(dashboard)/admin|teacher|student/` — Role-gated pages (server components by default)
- `app/api/admin|teacher|student/` — Role-gated API route handlers
- `lib/auth/` — JWT (`jwt.ts`), RBAC (`rbac.ts`), permissions, session, requireTeacherAPI, requireStudentAPI
- `lib/supabase/` — Four Supabase clients (see below)
- `lib/dal/` — Data Access Layer (~30 files, typed Supabase queries). Admin auth (`requireAdminAPI`) lives here too.
- `lib/services/` — External services (Daily.co video, OpenAI AI)
- `components/auth/` — AuthProvider, RoleGuard
- `components/admin|teacher|student/` — Role-specific components
- `hooks/` — Client hooks (useAuth, usePermissions, useRole, useRealtime*, useTypingIndicator, usePresence, etc.)
- `types/` — Root-level shared types (`auth.ts`, `rbac.ts`)
- `supabase/migrations/` — SQL migration files

### Authentication Flow

Tokens are JWT (not Supabase sessions). Access token (15min) + refresh token (7d) stored in httpOnly cookies (`access_token`, `refresh_token`).

- **Middleware** (`middleware.ts`): Validates JWT, checks role for dashboard routes, checks permissions for API routes. Injects headers: `x-user-id`, `x-user-email`, `x-user-role`, `x-user-profile-id`, `x-user-school-id`, `x-user-permissions` (JSON array).
- **Server components**: Use `getCurrentUser()` from `lib/auth/session.ts` to read the JWT from cookies.
- **API routes**: Use role-specific auth helpers (see API Route Patterns below). These return `{ success, teacher/student/admin }` or `{ success: false, response }`.
- **Client components**: Use `useAuth()` hook from `AuthProvider`.

### Supabase Clients — When to Use Which

| Client | File | Key | Bypasses RLS | Use In |
|--------|------|-----|-------------|--------|
| Browser | `lib/supabase/client.ts` | anon | No | Client components |
| Server | `lib/supabase/server.ts` | anon + cookies | No | Server components |
| **Service** | `lib/supabase/service.ts` | service role | **Yes** | API routes, DAL functions |
| Admin | `lib/supabase/admin.ts` | service role | **Yes** | Auth operations, user management |

**Most API routes and DAL functions use the service client** (`createServiceClient()`) because RLS policies were designed around Supabase Auth sessions, not custom JWT. The service client bypasses RLS entirely.

### Critical Bug Pattern: FK Joins

**Supabase PostgREST FK joins silently return 0 rows when FK constraints don't exist in the database.** This is the #1 recurring bug in this codebase.

```typescript
// BAD — silently returns empty if FK constraint is missing
const { data } = await supabase
  .from('teacher_assignments')
  .select('*, courses!inner(name), sections!inner(grade_level)')
  .eq('teacher_profile_id', teacherId)

// GOOD — always works
const { data: assignments } = await supabase
  .from('teacher_assignments')
  .select('id, course_id, section_id')
  .eq('teacher_profile_id', teacherId)

// Then fetch related data separately
const { data: courses } = await supabase
  .from('courses')
  .select('id, name')
  .in('id', courseIds)
```

**Rule: Never use `table!inner(...)` or `table!fk_name(...)` FK joins. Always use flat column selects + separate queries.**

### Key Database Relationships

- `teacher_assignments` links teachers to courses: `teacher_profile_id` + `course_id`
- `enrollments` links students to courses: `student_id` + `course_id`
- `school_profiles` → `teacher_profiles` / `student_profiles` (via `profile_id`)
- `modules` belong to `courses` (via `course_id`)
- `lessons` belong to `modules` (via `module_id`)
- `live_sessions` belong to `courses` (via `course_id`) and teachers (via `teacher_profile_id`)

Use `enrollments` (not `students` table) to count students per course. Use `teacher_assignments` to verify teacher access to a course.

### Roles and Permissions

Defined in `lib/auth/permissions.ts`. Format: `resource:action` (e.g., `content:manage`, `subjects:view`).

- `super_admin`: wildcard `['*']`
- `admin`: users CRUD, enrollments, finance, reports, settings
- `teacher`: classes, grades, attendance, assessments, content, students
- `student`: subjects, assessments, grades, attendance, profile

API route permission mapping is in `API_ROUTE_PERMISSIONS` in the same file. Middleware enforces these automatically.

Admin has additional sub-roles (`super_admin`, `school_admin`, `admin`, `registrar`, `support`) with granular permissions defined in `lib/dal/admin.ts`.

### API Route Patterns

**Teacher API routes** — use `requireTeacherAPI()` from `lib/auth/requireTeacherAPI`:
```typescript
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const supabase = createServiceClient()
  // auth.teacher.teacherId → teacher_profile_id
  // auth.teacher.userId → auth.users.id
}
```

**Student API routes** — use `requireStudentAPI()` from `lib/auth/requireStudentAPI` (same pattern, `auth.student.studentId`).

**Admin API routes** — use `requireAdminAPI()` from `lib/dal/admin` (note: lives in DAL, not lib/auth):
```typescript
import { requireAdminAPI } from '@/lib/dal/admin'

export async function GET(req: NextRequest) {
  const auth = await requireAdminAPI('users:read') // optional permission check
  if (!auth.success) return auth.response
  // auth.admin.adminId, auth.admin.schoolId, auth.admin.role
}
```

Admin auth reads middleware-injected headers via `getUserFromHeaders()` (also exported from `lib/dal/admin`), unlike teacher/student which use `getCurrentUser()` from JWT cookies.

### DAL Pattern

DAL files in `lib/dal/` export typed async functions that use the service client. SSR pages call DAL functions directly. Client components call API routes which may also use DAL functions internally. Types are in `lib/dal/types.ts` and `lib/dal/types/`.

### Conventions

- Components: `PascalCase.tsx`; hooks: `useCamelCase.ts`; routes: `kebab-case`
- 2 spaces indentation
- Commits: conventional commits with scope — `feat(teacher):`, `fix(student):`, `fix(admin):`
- Styling: TailwindCSS utility-first. Custom colors: MSU maroon `#7B1113`, MSU gold `#FDB913`
- `_legacy/` folder contains old separate apps — do not use

### Environment Variables

Required: `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`

Optional: `DAILY_API_KEY` (video), `OPENAI_API_KEY` (AI), `RESEND_API_KEY` (email), `PAYMONGO_SECRET_KEY` / `PAYMONGO_PUBLIC_KEY` (payments)
