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

  - id: BUG-010
    date: "2026-02-17"
    title: LRN field accepts invalid formats with letters and wrong digit counts
    severity: medium
    pattern: |
      The LRN (Learner Reference Number) input field had no validation,
      allowing users to enter invalid formats like:
      - "2026-MSU-0013a" (contains letter at end)
      - "2026-MSU-999" (only 3 digits instead of 4+)
      - "2026-msu-0013" (lowercase instead of uppercase)
      - "26-MSU-0013" (2-digit year instead of 4)

      This caused data inconsistency, search issues, and invalid student records.

      Standard LRN format: YYYY-MSU-#### where:
      - YYYY = 4-digit year (e.g., 2026)
      - MSU = literal uppercase text
      - #### = 4 or more digits (allows scaling beyond 9999)
    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx"
    fix: |
      Add real-time validation with visual feedback:

      1. Add validation state:
         const [lrnError, setLrnError] = useState("");

      2. Create validation function:
         const validateLRN = (lrn: string): boolean => {
           if (!lrn) {
             setLrnError("");
             return true; // Empty is OK (auto-generated)
           }

           const lrnPattern = /^\d{4}-MSU-\d{4,}$/;
           if (!lrnPattern.test(lrn)) {
             setLrnError("Invalid format. Must be YYYY-MSU-#### (e.g., 2026-MSU-0010, 2026-MSU-10000)");
             return false;
           }

           setLrnError("");
           return true;
         };

      3. Add real-time validation to input:
         <input
           value={formData.lrn}
           onChange={(e) => {
             const value = e.target.value;
             setFormData({ ...formData, lrn: value });
             validateLRN(value);
           }}
           className={lrnError ? "border-red-500" : "border-gray-300"}
         />
         {lrnError && <p className="text-red-500">{lrnError}</p>}

      4. Block submission if invalid:
         if (formData.lrn && !validateLRN(formData.lrn)) {
           alert("Please correct the LRN format before submitting");
           return;
         }

      Regex pattern: /^\d{4}-MSU-\d{4,}$/
      - \d{4}: Exactly 4 digits (year)
      - -MSU-: Literal uppercase text
      - \d{4,}: 4 or more digits (allows 10000+)
    status: resolved
    notes: >
      Fixed in commit [current]. The validation pattern uses {4,} (4 or more)
      instead of {4} (exactly 4) to allow the system to scale beyond 9999
      students per year. Real-time validation provides instant feedback with
      red border and error message. Form submission is blocked if format is
      invalid.

  - id: BUG-011
    date: "2026-02-17"
    title: Change Grade Level only updates grade, leaving invalid grade-section combinations
    severity: high
    pattern: |
      When changing a student's grade level using the "Change Grade Level"
      bulk action, the system only updated the grade_level field and left
      the student's section unchanged. This caused invalid data states:

      Example:
      - Student in "Grade 5 - Section A"
      - Admin changes grade to 6
      - Student now has grade_level=6 but section_id still points to Grade 5 Section A
      - Result: Invalid grade-section combination

      The modal warned "This will only change the grade level. Students will
      keep their current sections" which was the bug, not a feature.

      Root causes:
      - Modal only had grade selector, no section selector
      - No validation that section matches grade
      - API action "update_grade" only changed grade_level field
      - No enforcement of grade-section consistency
    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx (Change Grade modal)"
      - "app/api/admin/users/students/bulk-section/route.ts"
    fix: |
      Require section selection when changing grade:

      1. Add section selector to modal (filtered by grade):
         <select
           value={selectedSection}
           onChange={(e) => setSelectedSection(e.target.value)}
           disabled={!selectedGrade}
         >
           <option value="">
             {!selectedGrade ? "Select grade first..." : "Choose a section..."}
           </option>
           {sections
             .filter((section) => section.grade_level === selectedGrade)
             .map((section) => (
               <option key={section.id} value={section.id}>
                 {section.name} - Grade {section.grade_level}
               </option>
             ))}
         </select>

      2. Clear section when grade changes:
         onChange={(e) => {
           setSelectedGrade(e.target.value);
           setSelectedSection(""); // Reset section
         }}

      3. Require both fields for submission:
         disabled={!selectedGrade || !selectedSection}

      4. Add new API action to update both:
         if (action === "update_grade_and_section" && gradeLevel && sectionId) {
           const gradeResult = await bulkUpdateStudentGrade(studentIds, gradeLevel);
           if (!gradeResult.success) return NextResponse.json(gradeResult);

           const sectionResult = await bulkUpdateStudentSection(studentIds, sectionId);
           return NextResponse.json(sectionResult);
         }

      5. Update warning message:
         "Both grade level and section will be updated. Section must match the selected grade."

      Key principles:
      - Always update related fields together atomically
      - Filter dependent dropdowns by parent selection
      - Clear dependent field when parent changes
      - Validate consistency before submission
      - Use sequential updates with proper error handling
    status: resolved
    notes: >
      Fixed in commit [current]. The new implementation ensures grade and
      section are always consistent. The section dropdown is disabled until
      grade is selected, then shows only sections for that grade. Both fields
      are required and updated together. This prevents orphaned section
      assignments and maintains referential integrity.

  - id: BUG-012
    date: "2026-02-17"
    title: Bulk reactivation missing - inefficient workflow for reactivating multiple students
    severity: medium
    pattern: |
      The admin students list page had "Deactivate" bulk action but no
      corresponding "Reactivate" bulk action. Students could only be reactivated
      individually by opening each student's edit page and changing the status
      dropdown from "Inactive" to "Active".

      Individual reactivation existed but was inefficient:
      - Edit page: Status dropdown (Active/Inactive/Suspended/Graduated/Transferred)
      - To reactivate 10 students: open 10 edit pages, change 10 dropdowns, save 10 times
      - Time: ~2 minutes for 10 students

      Missing bulk functionality:
      - No "Reactivate" button in bulk actions (only "Deactivate" existed)
      - No bulk reactivate handler function
      - No bulk reactivate confirmation modal
      - Asymmetric UX: bulk deactivate exists but not bulk reactivate

      This is a common UX anti-pattern: implementing bulk operations for only
      one direction of a reversible action (deactivate) without the reverse.
    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx"
    fix: |
      Add complete reactivation feature mirroring deactivation:

      1. Add state for reactivate modal:
         const [showReactivateModal, setShowReactivateModal] = useState(false);

      2. Add reactivate handler (mirrors deactivate handler):
         const handleBulkReactivate = async () => {
           setActionLoading(true);
           try {
             const response = await fetch("/api/admin/users/students/bulk-status", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 studentIds: selectedStudents.map((s) => s.id),
                 status: "active", // ← Key difference
               }),
             });

             const result = await response.json();
             if (response.ok && result.success) {
               setShowReactivateModal(false);
               setSelectedStudents([]);
               fetchStudents();
             }
           } catch (error) {
             console.error("Failed to reactivate students:", error);
             alert("Failed to reactivate students. Please try again.");
           } finally {
             setActionLoading(false);
           }
         };

      3. Add Reactivate button to bulk actions:
         <button
           onClick={() => setShowReactivateModal(true)}
           className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
         >
           <span className="material-symbols-outlined text-base">check_circle</span>
           Reactivate
         </button>

      4. Add confirmation modal:
         <ConfirmModal
           isOpen={showReactivateModal}
           onClose={() => setShowReactivateModal(false)}
           onConfirm={handleBulkReactivate}
           title="Reactivate Students"
           message="Reactivated students will be able to log in and access the system again."
           confirmText="Reactivate"
           variant="info"
         />

      Design patterns:
      - Use green color for positive action (vs red for negative)
      - Use "check_circle" icon for activation (vs "block" for deactivation)
      - Same API endpoint, different status value
      - Consistent confirmation flow
    status: resolved
    notes: >
      Fixed in commit [current]. The reactivate feature uses the same API
      endpoint (/api/admin/users/students/bulk-status) as deactivation,
      just with status="active" instead of status="inactive". This ensures
      both operations update both the students and school_profiles tables
      correctly. Always implement both directions of reversible actions.

  - id: BUG-013
    date: "2026-02-17"
    title: Bulk action selection auto-clears after save - inefficient workflow
    severity: medium
    pattern: |
      After performing bulk actions (Change Grade, Move to Section, Deactivate,
      Reactivate), the student selection was automatically cleared, making the
      bulk action bar disappear. This forced users to re-select the same students
      for each subsequent action.

      All bulk action handlers followed this anti-pattern:
      ```typescript
      if (response.ok) {
        setShowModal(false);
        setSelectedStudents([]); // ❌ Auto-clear selection
        fetchStudents();
      }
      ```

      User impact:
      - Select 10 students
      - Perform action 1 (e.g., Change Grade) → Save
      - Selection clears automatically
      - Must re-select same 10 students for action 2
      - Perform action 2 (e.g., Move to Section) → Save
      - Selection clears again
      - Inefficient workflow for chained operations

      This violates the principle of user control - the system was making
      decisions about selection state instead of letting the user control it.
    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx (all bulk action handlers)"
    fix: |
      Remove automatic selection clearing from all bulk action success handlers.
      Let users explicitly control selection via "Clear Selection" button.

      Pattern for all handlers:
      ```typescript
      // Before (BAD):
      if (response.ok && result.success) {
        setShowModal(false);
        setSelectedStudents([]); // ❌ Auto-clear
        setSelectedGrade("");
        fetchStudents();
      }

      // After (GOOD):
      if (response.ok && result.success) {
        setShowModal(false);
        // Keep students selected so user can perform additional actions
        setSelectedGrade("");
        fetchStudents();
      }
      ```

      Apply to all bulk action handlers:
      - handleBulkDeactivate
      - handleBulkReactivate
      - handleBulkSectionUpdate
      - handleBulkGradeChange

      Only clear modal-specific state (selectedGrade, selectedSection).
      Never clear selectedStudents automatically.

      Benefits:
      - Selection persists after operations
      - Can chain multiple actions on same students
      - "Clear Selection" button provides explicit control
      - Fewer clicks, faster workflow
      - User controls selection state, not the system
    status: resolved
    notes: >
      Fixed in commit [current]. Selection now persists across bulk operations
      until the user explicitly clicks "Clear Selection". This enables efficient
      workflows like: select students → change grade → move section → deactivate,
      all without re-selecting. The "Clear Selection" button remains visible as
      long as students are selected, giving users explicit control.

  - id: BUG-014
    date: "2026-02-17"
    title: Add Student modal section dropdown not filtered by grade - shows all sections
    severity: high
    pattern: |
      In the "Add New Student" modal, when selecting a grade level (e.g., Grade 12),
      the Section dropdown displayed sections from ALL grade levels instead of
      filtering to show only sections for the selected grade.

      Example:
      - User selects "Grade 12"
      - Section dropdown shows:
        - Grade 10 sections (Section C, 10-A, 10-B, 10-C)
        - Grade 11 sections (ABM A, ABM B, GA A, HUMSS A, STEM A)
        - Grade 12 sections
      - User could accidentally select Grade 10 section for Grade 12 student
      - Results in invalid grade-section combination

      Root cause:
      - Section dropdown mapped all sections without filtering:
        {sections.map((section) => <option>...)}
      - No .filter() by grade_level
      - No dependency between grade dropdown and section dropdown
      - Change Grade modal already had correct filtering (BUG-011)
      - Inconsistent behavior between modals
    affected_files:
      - "app/(dashboard)/admin/users/students/page.tsx (Add Student modal)"
    fix: |
      Apply same filtering pattern as Change Grade modal (BUG-011):

      1. Clear section when grade changes:
         onChange={(e) => {
           setFormData({ ...formData, gradeLevel: e.target.value, sectionId: "" });
         }}

      2. Filter sections by selected grade:
         {sections
           .filter((section) => section.grade_level === formData.gradeLevel)
           .map((section) => (
             <option key={section.id} value={section.id}>
               {section.name} - Grade {section.grade_level}
             </option>
           ))}

      3. Disable section dropdown until grade selected:
         <select disabled={!formData.gradeLevel} ...>

      4. Show contextual placeholder:
         <option value="">
           {!formData.gradeLevel ? "Select grade first..." : "Select Section (Optional)"}
         </option>

      5. Warn if no sections available:
         {formData.gradeLevel &&
          sections.filter((s) => s.grade_level === formData.gradeLevel).length === 0 && (
           <p className="text-sm text-orange-500 mt-1">
             No sections available for Grade {formData.gradeLevel}
           </p>
         )}

      This ensures:
      - Section dropdown shows only relevant sections
      - Impossible to select wrong grade section
      - Clear user guidance through disabled state and placeholders
      - Consistent behavior across all grade-section pickers
    status: resolved
    notes: >
      Fixed in commit [current]. The Add Student modal now has the same
      grade-section filtering logic as the Change Grade modal. This prevents
      data integrity issues where students could be assigned to sections from
      different grade levels. The pattern should be applied to ALL forms where
      grade and section are both inputs: always filter section by grade, always
      clear section when grade changes, always disable section until grade selected.

  - id: BUG-015
    date: "2026-02-21"
    title: Search limited to single field, ignoring FK-joined data
    severity: critical
    pattern: |
      List views with FK joins that search only the primary table field
      (employee_id, LRN, etc.) ignore user-facing fields like full_name
      and email from the joined school_profiles table. This makes search
      unusable for end users who search by name, not ID.

      PostgREST .or() queries fail with FK-joined fields, so all searches
      must be moved to JavaScript after fetching.

      Example (Teachers):
      - User searches "Aditya Aman" (teacher's name)
      - SQL search only checks employee_id field: .ilike('employee_id', '%Aditya Aman%')
      - Employee ID is "T-2024-001", not "Aditya Aman"
      - Query returns 0 rows → "No teachers found"
      - But full_name in school_profiles is "Aditya Aman"

      Root cause:
      - PostgREST .or() fails with FK-joined fields
      - Developer limited search to single primary table field
      - Comment admitted limitation: "nested table search doesn't work with .or()"
      - Query never searches joined table fields (full_name, email)
    affected_files:
      - "lib/dal/admin.ts (listTeachers - FIXED Feb 21)"
      - "lib/dal/admin.ts (listStudents - FIXED Feb 16, same pattern as BUG-006)"
      - "Any future list views with search + FK joins"
    fix: |
      Apply JavaScript filtering pattern (same as BUG-006 student fix):

      1. Add all searchable fields to FK join select:
         school_profiles!fkey_name(id, full_name, email)

      2. Remove SQL .ilike() or .or() search filters:
         // DELETE: if (search) query = query.ilike('field', `%${search}%`);

      3. Fetch ALL records with simple filters (status, department):
         const { data, error } = await query;  // No .range(), no count

      4. Map data and add email to returned objects:
         full_name: (profile?.full_name as string) || 'Unknown',
         email: (profile?.email as string) || '',

      5. Filter in JavaScript across all user-facing fields:
         if (search) {
           const searchLower = search.toLowerCase();
           items = items.filter((item) => {
             return (
               item.primary_id.toLowerCase().includes(searchLower) ||
               item.full_name.toLowerCase().includes(searchLower) ||
               (item.email && item.email.toLowerCase().includes(searchLower))
             );
           });
         }

      6. Paginate after filtering in JavaScript:
         const total = items.length;
         const totalPages = Math.ceil(total / pageSize);
         const from = (page - 1) * pageSize;
         const to = from + pageSize;
         const paginatedItems = items.slice(from, to);

      Performance: Acceptable for < 10,000 records. For larger datasets,
      consider PostgreSQL full-text search (tsvector).
    status: resolved-recurring
    notes: >
      Fixed for teachers (Feb 21) and students (Feb 16). This is a systemic
      pattern. The pattern appears in both students and teachers. Future list
      views (enrollments, courses, sections, etc.) must use JS filtering from
      the start to avoid this bug. Related to BUG-001 (FK joins) and BUG-006
      (student search). Always search user-facing fields (name, email), not
      internal IDs (LRN, employee_id).
```
