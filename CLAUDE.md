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

### Known Bug Patterns & Past Errors

Recurring bugs are logged below in YAML format. **Always check this list before writing new code.**

```yaml
bugs:
  - id: BUG-001
    date: "2025-05-01"
    title: FK joins silently return 0 rows
    severity: critical
    pattern: |
      Supabase PostgREST FK joins (table!inner(...), table!fk_name(...))
      silently return empty arrays when FK constraints are missing in the DB.
    affected_files:
      - "multiple pages and API routes"
    fix: Always use flat column selects + separate queries. Never use FK joins.
    status: resolved-recurring
    notes: >
      This is the #1 recurring bug. See "Critical Bug Pattern: FK Joins"
      section above. Every new query must follow the flat-select pattern.

  - id: BUG-002
    date: "2025-06-01"
    title: Enrollment-only queries block section-assigned students
    severity: critical
    pattern: |
      Pages/APIs that query ONLY the `enrollments` table to verify student
      access will fail for Grade 1-6 students whose courses are assigned
      via their section (teacher_assignments) rather than explicit enrollment.
    affected_files:
      - "app/(dashboard)/student/subjects/[subjectId]/recordings/page.tsx"
      - "app/(dashboard)/student/live-sessions/page.tsx"
      - "any page that checks enrollments without section fallback"
    fix: |
      Use `studentHasCourseAccess()` from lib/dal/student.ts for access checks.
      Use `getStudentCourseIds()` from lib/dal/student.ts for course listing.
      Both check enrollments first, then fall back to teacher_assignments
      via the student's section_id.
    status: resolved
    notes: >
      Fixed in commit b6f26b6. The student dashboard subjects page already
      had the fallback, but recordings and live-sessions pages did not.
      Always use the DAL helpers instead of inline enrollment queries.

  - id: BUG-003
    date: "2025-06-01"
    title: Missing enrollment records for section-assigned students
    severity: high
    pattern: |
      bulkUpdateStudentSection() updated the student's section_id but did
      NOT create enrollment records for courses assigned to that section.
      This caused downstream features (messaging, attendance, grades,
      assessments) that query enrollments to miss these students entirely.
    affected_files:
      - "lib/dal/users.ts (bulkUpdateStudentSection)"
    fix: |
      bulkUpdateStudentSection() now auto-creates enrollment records for
      all courses assigned to the section via teacher_assignments.
      POST /api/admin/enrollments/sync-section endpoint added to backfill
      existing students missing enrollments.
    status: resolved
    notes: >
      Fixed in commit 4cd27ed. For existing data, call
      POST /api/admin/enrollments/sync-section (no body = all sections).

  - id: BUG-004
    date: "2025-02-16"
    title: Event handlers cannot be passed to Client Components (Next.js 15)
    severity: critical
    pattern: |
      Next.js 15 App Router error: "Event handlers cannot be passed to Client Component props"

      Server Components cannot pass onClick, onSubmit, onChange, or any event
      handlers as props to Client Components. This also includes passing functions
      that contain browser APIs (window, document, fetch, etc.) as props.

      Common error messages:
      - "Event handlers cannot be passed to Client Component props"
      - Shows the handler name in error: {onClick: function, onDownload: function}
      - Includes a digest number for tracking
    affected_files:
      - "app/(dashboard)/student/subjects/[subjectId]/modules/[moduleId]/page.tsx"
      - "components/student/lesson/LessonAttachments.tsx"
      - "Any Server Component passing event handlers to Client Components"
    fix: |
      Two solutions:

      1. Move event handler INTO the Client Component:
         - Remove the handler prop from component interface
         - Implement the handler directly inside the Client Component
         - Example: LessonAttachments now handles download tracking internally

      2. Extract interactive section to NEW Client Component:
         - Create new file with 'use client' directive
         - Move all interactive elements (buttons with onClick) to new component
         - Pass only data props (strings, numbers, objects) from Server Component
         - Example: PDFViewer.tsx extracted from module page.tsx

      General rules:
      - Server Components: Use for data fetching, layout, static content
      - Client Components: Use for interactivity (onClick, useState, useEffect)
      - Props from Server → Client: Only serializable data (no functions!)
      - Use 'use client' directive at TOP of client component files
    status: resolved-recurring
    notes: >
      Fixed in commits a30fb95 (PDFViewer), a9313a2 (LessonAttachments).
      This is a Next.js 15 breaking change from Next.js 13/14.
      Will recur whenever Server Components pass functions to Client Components.
      Always check: Is this a Server Component? Am I passing a function prop?

  - id: BUG-006
    date: "2026-02-16"
    title: Missing columns in school_profiles causing failed queries and "Unknown" names
    severity: high
    pattern: |
      The school_profiles table was missing critical columns (email, status) that
      were being referenced in queries. This caused:
      - PostgreSQL error: "column school_profiles.email does not exist"
      - All student names displayed as "Unknown"
      - Status filter completely non-functional
      - Search by email impossible

      The listStudents() function was querying columns that didn't exist in the
      database schema, causing the entire query to fail silently and return 0 rows.
    affected_files:
      - "lib/dal/admin.ts (listStudents function)"
      - "supabase database schema (school_profiles table)"
    fix: |
      1. Database Migration:
         - Created SQL migration: supabase/fix-school-profiles-columns.sql
         - Adds email column (TEXT) to school_profiles
         - Adds status column (TEXT) with default 'active'
         - Populates email from auth.users table
         - Adds CHECK constraint for status values
         - Safe to run multiple times (checks column existence)

      2. Query Fix:
         - Updated listStudents() to use FK join: school_profiles!students_profile_id_fkey
         - Selects: id, full_name, email, avatar_url, status
         - Filters search/status in code (not SQL) to avoid PostgREST OR errors
         - Transforms data with proper fallbacks (|| 'Unknown', || 'active')

      3. Search Implementation:
         - Fetch all students with section/grade filters applied in SQL
         - Apply search filter in JavaScript on: LRN, full_name, email
         - Apply status filter in JavaScript
         - Paginate after filtering

      SQL Migration Contents:
      - DO $$ blocks with IF NOT EXISTS checks for safety
      - UPDATE school_profiles SET email from auth.users
      - ALTER TABLE ADD CONSTRAINT for status validation
      - Verification query at end to confirm columns exist

      Run in Supabase SQL Editor to fix.
    status: resolved
    notes: >
      Fixed in commit [current]. This was actually two bugs:
      1. Missing database columns (fixed with SQL migration)
      2. Invalid PostgREST OR query syntax (fixed by filtering in code)

      The proper approach for complex filters with FK joins is:
      - Apply simple filters in SQL (section_id, grade_level)
      - Fetch related data via FK joins
      - Apply complex filters (search, status) in JavaScript
      - Paginate after all filtering

  - id: BUG-005
    date: "2025-02-16"
    title: Student form UX issues - validation, filters, and auto-population
    severity: medium
    pattern: |
      Multiple UX issues in the admin student management page:

      1. FK field using text input instead of dropdown:
         - Section field was <input type="text"> allowing invalid IDs
         - Caused FK constraint violations and "Invalid" errors on save

      2. Missing filter in filterOptions:
         - filterOptions array missing "sectionId" filter
         - Section dropdown filter in UI was non-functional
         - Search and filters appeared broken to users

      3. Incorrect placeholder text:
         - LRN placeholder showed "123456789012" (12 digits)
         - Actual format is "2026-MSU-0010" (year-institution-sequence)

      4. Manual data entry for auto-generated fields:
         - LRN should auto-increment from database, not manual entry
         - Phone number should pre-fill with "+63 " country code

    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx"
    fix: |
      1. Section field - Convert to dropdown (DONE in previous fix):
         - Change from <input type="text"> to <select>
         - Map sections array to options
         - Add default "Select Section (Optional)" option

      2. Add missing section filter:
         - Add sectionId to filterOptions array
         - Map sections to filter options: {value: id, label: "Name - Grade X"}

      3. LRN auto-increment:
         - Add generateNextLRN() function
         - Fetch all students, parse LRNs matching YYYY-MSU-#### format
         - Find max number for current year, generate next sequential
         - Auto-populate on modal open via useEffect

      4. Phone number pre-fill:
         - Set default formData.phone to "+63 "
         - Add onChange handler to preserve "+63 " prefix
         - Update reset logic to restore "+63 " default

      5. Update placeholder text:
         - Change LRN placeholder to "2026-MSU-0010"
    status: resolved
    notes: >
      Fixed in commit [current]. Multiple related UX issues addressed:
      - Section filter now works (added to filterOptions)
      - LRN auto-generates next number (2026-MSU-0001, 0002, etc.)
      - Phone pre-fills with +63 prefix
      - All search/filter dropdowns now functional

  - id: BUG-007
    date: "2026-02-16"
    title: Excel export returns disorganized JSON instead of proper .xlsx files
    severity: medium
    pattern: |
      Export routes had placeholder code returning JSON for Excel format instead
      of generating proper .xlsx files. This caused:
      - Excel downloads contained raw JSON text instead of spreadsheet data
      - Entries appeared disorganized and misaligned
      - No column headers or proper formatting
      - Data unusable in Excel, Google Sheets, etc.

      All three export routes (students, teachers, enrollments) had the same issue:
      Lines like "// For Excel and PDF, return JSON for now"
      Followed by: return NextResponse.json(exportData);
    affected_files:
      - "app/api/admin/users/students/export/route.ts"
      - "app/api/admin/users/teachers/export/route.ts"
      - "app/api/admin/enrollments/export/route.ts"
    fix: |
      Implement proper Excel generation using xlsx library (already installed):

      1. Import xlsx at top of file:
         import * as XLSX from "xlsx";

      2. Replace JSON return with Excel generation:
         if (format === "excel" || format === "xlsx") {
           const worksheet = XLSX.utils.json_to_sheet(exportData);
           const workbook = XLSX.utils.book_new();
           XLSX.utils.book_append_sheet(workbook, worksheet, "SheetName");

           const excelBuffer = XLSX.write(workbook, {
             type: "buffer",
             bookType: "xlsx"
           });

           return new NextResponse(excelBuffer, {
             status: 200,
             headers: {
               "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
               "Content-Disposition": `attachment; filename="export-${Date.now()}.xlsx"`
             }
           });
         }

      3. json_to_sheet() automatically:
         - Uses object keys as column headers
         - Formats data into rows
         - Creates proper Excel structure

      Pattern works for any export endpoint that returns tabular data.
    status: resolved
    notes: >
      Fixed in commit [current]. The xlsx library was already installed but
      never used. CSV exports were working correctly, but Excel was incomplete.
      All three export endpoints now properly generate .xlsx files with columns
      and headers. Frontend code already handled blob responses correctly,
      so no frontend changes were needed.

  - id: BUG-008
    date: "2026-02-16"
    title: DataTable row selection fails when using rowKey with non-numeric IDs
    severity: high
    pattern: |
      When DataTable component uses rowKey prop with non-numeric values (UUIDs,
      string IDs), row selection breaks because onRowSelectionChange treats
      selection keys as array indices instead of rowKey values.

      Symptoms:
      - Bulk actions show "No valid [items] selected" even when items are selected
      - selectedItems array contains undefined values
      - Checkboxes appear selected but actions fail

      Root cause:
      - TanStack Table with getRowId uses custom IDs as selection keys
      - Selection state: { "uuid-abc-123": true } not { "0": true }
      - Code did: data[parseInt("uuid-abc-123")] = data[NaN] = undefined
      - Should do: data.find(row => row.id === "uuid-abc-123")
    affected_files:
      - "components/admin/ui/DataTable.tsx"
      - "Any page using DataTable with rowKey and bulk actions"
    fix: |
      In DataTable's onRowSelectionChange handler:

      1. Check if rowKey is set
      2. If yes, use .find() to locate row by matching rowKey value
      3. If no, use parseInt(key) for array index
      4. Filter out any undefined results

      Code:
      ```typescript
      const selectedRows = Object.keys(newSelection)
        .filter((key) => newSelection[key])
        .map((key) => {
          if (rowKey) {
            return data.find((row) => String(row[rowKey]) === key);
          }
          return data[parseInt(key)];
        })
        .filter((row) => row !== undefined);
      ```
    status: resolved
    notes: >
      Fixed in commit [current]. This affected all bulk actions in admin
      students page (Change Grade, Move to Section, Deactivate). The bug
      only manifests when rowKey is set to a non-numeric field. Numeric
      rowKeys would work by coincidence if they match array indices.

  - id: BUG-009
    date: "2026-02-16"
    title: Student status updates not visible - only updating one of two tables
    severity: high
    pattern: |
      Student status updates (deactivate, suspend, etc.) were not appearing
      in the UI list view because the function only updated the students table,
      not the school_profiles table.

      The system has two places where student data is stored:
      - students table: enrollment-specific data (status, grade, section, LRN)
      - school_profiles table: profile data displayed in UI (full_name, email, status)

      List views query school_profiles.status, so updates to students.status
      alone won't show up. Both tables must be updated together.
    affected_files:
      - "lib/dal/users.ts (bulkUpdateStudentStatus)"
      - "Any function that updates student display data"
    fix: |
      When updating student data that affects UI display:

      1. First get the student's profile_id:
         const { data: student } = await supabase
           .from('students')
           .select('profile_id')
           .eq('id', studentId)
           .single();

      2. Update students table:
         await supabase
           .from('students')
           .update({ status, updated_at: new Date().toISOString() })
           .eq('id', studentId);

      3. Update school_profiles table:
         await supabase
           .from('school_profiles')
           .update({ status, updated_at: new Date().toISOString() })
           .eq('id', student.profile_id);

      This pattern applies to all fields shown in list views:
      - status (active/inactive/suspended/graduated/transferred)
      - full_name
      - email
      - phone
      - avatar_url

      The students → profile_id → school_profiles relationship must be
      maintained for both reads and writes.
    status: resolved
    notes: >
      Fixed in commit [current]. The bulkUpdateStudentStatus function now
      updates both tables. This is a common pattern in the codebase where
      display data (school_profiles) is separate from enrollment data
      (students/teachers). Always update both when modifying displayed fields.
```
