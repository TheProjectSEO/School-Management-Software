# Teacher Portal - Remaining Issues Requiring Manual Review

**Date:** January 1, 2026
**Status:** All Critical Issues Resolved ✅
**Remaining:** 1 Minor Issue + Recommendations for Future Development

---

## Critical

✅ **None remaining** - All 5 critical issues have been fixed!

---

## High Priority

✅ **None found** during initial testing

**Note:** High-priority issues will emerge when testing advanced workflows (module publishing, grading, live sessions) which require test data setup.

---

## Medium Priority

✅ **None found** during initial testing

---

## Low Priority

### ⚠️ Issue #1: Notification Unread Count RPC Function Returns 403
- **Feature:** Dashboard - Notification System
- **Current State:**
  - Dashboard loads and displays correctly
  - Console shows recurring error:
    ```
    Failed to load resource: 403 @ https://qyjzqzqqjimittltttph.supabase.co/rest/v1/rpc/get_unread_count
    ```
  - No visible UI impact (notification badge not showing, but may not be implemented yet)
- **Why Manual Review:**
  - **Unclear if Feature is Implemented:** Need to determine if notification system is fully built
  - **RPC Function May Not Exist:** Function `get_unread_count()` may not have been created
  - **Or Missing Permissions:** Function exists but lacks EXECUTE permission for authenticated role
  - **Design Decision Needed:** Should notifications be implemented now or in Phase 6 per CLAUDE.md?
- **Technical Details:**
  - Error is 403 Forbidden, not 404 Not Found
  - Suggests function exists but has permission issue
  - Or RLS on underlying table blocks the function
- **Investigation Steps:**
  1. Check if function exists:
     ```sql
     SELECT routine_name, routine_schema
     FROM information_schema.routines
     WHERE routine_schema = 'n8n_content_creation'
       AND routine_name = 'get_unread_count';
     ```
  2. If exists, check GRANT permissions:
     ```sql
     GRANT EXECUTE ON FUNCTION n8n_content_creation.get_unread_count() TO authenticated;
     ```
  3. If doesn't exist, either:
     - **Option A:** Remove API call from dashboard (if feature not ready)
     - **Option B:** Implement notification system (CLAUDE.md Phase 6)
- **Recommendation:**
  - **Short-term:** Add error handling to suppress console errors
    ```typescript
    try {
      const { data } = await supabase.rpc('get_unread_count')
      setUnreadCount(data || 0)
    } catch (err) {
      // Silently fail - notification badge won't show
      console.debug('Notifications not yet implemented')
    }
    ```
  - **Long-term:** Implement full notification system per CLAUDE.md Phase 6
- **Impact if Not Fixed:**
  - Console clutter (low priority)
  - No notification badge in UI (minor UX issue)
  - No functional blocking - teachers can use all features
- **Workaround:** Teachers won't see notification count badge
- **Estimated Effort:**
  - Quick fix (suppress error): 15 minutes
  - Full implementation: 2-3 days (Phase 6 work)

---

## Features Intentionally Not Implemented (Placeholders)

These features show "Coming Soon" placeholders and are expected:

### 1. Students Directory (`/teacher/students`)
- **Status:** Placeholder page exists
- **Message:** "This feature is currently under development. Check back soon!"
- **When to Implement:** After teacher assignment system is complete
- **Dependencies:**
  - Teacher assignments must link teacher to sections
  - Students table needs more data
  - Need filtering by section
  - Need student detail view
- **Estimated Effort:** 3-5 days
- **Priority:** Medium (teachers can see students via section roster instead)

### 2. Settings Page (`/teacher/settings`)
- **Status:** Placeholder page exists
- **Message:** "This feature is currently under development. Check back soon!"
- **When to Implement:** After core teaching workflows are stable
- **Features Needed:**
  - Profile editing (name, department, specialization)
  - Avatar upload
  - Password change
  - Notification preferences
  - Display preferences (dark mode toggle, timezone)
  - Email notification toggles
- **Estimated Effort:** 2-3 days
- **Priority:** Medium (can use Supabase dashboard for profile editing temporarily)

---

## Issues Blocked by Missing Test Data

The following issues **cannot be identified** without proper test data:

### 1. Module Publishing Flow
- **Requires:**
  - Teacher assigned to section via teacher_assignments
  - Course created for that section
  - Module creation form/page
  - Lesson editor
  - Transcript upload functionality
- **What to Test:**
  - Module creation from subject workspace
  - Lesson addition
  - Content upload to teacher_assets bucket
  - Transcript generation/cleanup
  - Publish button sets is_published=true
  - Published modules visible to students
  - Student progress tracking
- **Current Status:** ⚠️ Cannot test without data

### 2. Quiz with Randomization
- **Requires:**
  - Question banks created
  - Bank questions added
  - Assessment with bank rules
  - Students enrolled in course
- **What to Test:**
  - Question bank creation UI
  - Question editor (MCQ, True/False, Short Answer)
  - Assessment builder with bank rules
  - Randomization settings (shuffle, seed mode)
  - Quiz snapshot generation for students
  - Different questions per student
  - Auto-grading logic
- **Current Status:** ⚠️ Cannot test without data

### 3. Assignment with Rubric
- **Requires:**
  - Rubric templates created
  - Assignment published
  - Student submissions
- **What to Test:**
  - Rubric builder
  - Rubric criteria and levels
  - Apply rubric to assessment
  - Grading with rubric scoring
  - AI feedback drafting
  - Grade release controls
  - Student visibility of released grades
- **Current Status:** ⚠️ Cannot test without data

### 4. Live Session with Attendance
- **Requires:**
  - Video provider integration (Zoom, Meet, LiveKit, etc.)
  - Scheduled sessions
  - WebRTC or SDK setup
- **What to Test:**
  - Session scheduling UI
  - Join session button
  - Video/audio controls
  - Participant list
  - Presence tracking (join/leave events)
  - Recording start/stop
  - Attendance auto-population
  - Manual attendance override
- **Current Status:** ⚠️ Cannot test without video provider integration

### 5. Announcement to Notification
- **Requires:**
  - Students enrolled in sections
  - Notification creation logic implemented
- **What to Test:**
  - Announcement creation form
  - Scope selection (section, course, school)
  - Publish announcement
  - Notification entries created for students
  - Student sees notification in app
- **Current Status:** ⚠️ Cannot test without student accounts and enrollment

---

## Architectural Recommendations

### 1. Implement Comprehensive Seed Script
**Why:** Manual testing requires realistic data
**What to Create:**
```bash
scripts/seed-teacher-data.mjs
```
**Data to Seed:**
- 3 sections per school (different grade levels)
- 5 courses (Math, Science, English, Filipino, History)
- Link test teacher to 2 sections and 3 courses via teacher_assignments
- 15 students per section
- 10 modules per course
- 5 lessons per module
- 3 question banks with 20 questions each
- 5 published assessments
- 20 student submissions (mix of pending/graded/released)
- 3 rubric templates
- 5 scheduled live sessions
- 10 announcements (various scopes)

**Estimated Effort:** 1 day
**Priority:** High (enables comprehensive testing)

---

### 2. Create RPC Function for Notifications
**Current Error:** `403 @ /rest/v1/rpc/get_unread_count`
**Fix:**
```sql
CREATE OR REPLACE FUNCTION n8n_content_creation.get_unread_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM n8n_content_creation.notifications
  WHERE student_id IN (
    SELECT id FROM n8n_content_creation.students
    WHERE profile_id = n8n_content_creation.current_profile_id()
  )
  AND is_read = false;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION n8n_content_creation.get_unread_count() TO authenticated;
```

**Or Simpler:**
```typescript
// In dashboard component, replace RPC call with direct query
const { count } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('is_read', false)
```

**Estimated Effort:** 30 minutes
**Priority:** Low (cosmetic issue)

---

### 3. Add Error Boundaries to All Pages
**Why:** Prevent full page crashes like the EmptyState issue
**Implementation:**
```typescript
// components/ErrorBoundary.tsx
'use client'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6">{error.message}</p>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
      </Card>
    </div>
  )
}
```

Add `error.tsx` to each route segment:
```
app/teacher/error.tsx
app/teacher/assessments/error.tsx
app/teacher/submissions/error.tsx
... etc
```

**Estimated Effort:** 2-3 hours
**Priority:** Medium

---

### 4. Implement Loading States with Skeletons
**Why:** Better UX during data fetching
**Current:** Uses LoadingSpinner component (acceptable)
**Enhancement:** Use skeleton loaders for cards/lists

**Example:**
```typescript
// loading.tsx in route folders
export default function Loading() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <Card key={i} className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </Card>
      ))}
    </div>
  )
}
```

**Estimated Effort:** 1 day
**Priority:** Low (polish)

---

### 5. Add API Route Error Handling Middleware
**Why:** Consistent error responses across all API routes
**Implementation:**
```typescript
// lib/api/errorHandler.ts
export function withErrorHandler(handler: Function) {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error: any) {
      console.error('API Error:', error)

      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Usage in API routes
export const GET = withErrorHandler(async (req) => {
  // ... route logic
})
```

**Estimated Effort:** Half day
**Priority:** Medium

---

## Testing Gaps (Due to Lack of Test Data)

### Cannot Test Without Teacher Assignments
- Module editor
- Module publishing
- Assessment builder
- Question bank manager
- Grading interface
- Rubric templates
- Course-level features

### Cannot Test Without Student Enrollment
- Grading real submissions
- Grade release workflow
- Student roster in sections
- Messaging students
- Announcement notifications
- Progress tracking

### Cannot Test Without Video Provider
- Live session room
- Video/audio controls
- Recording functionality
- Real-time presence tracking
- Session-based attendance

---

## Recommendations by Priority

### P0 - Before Production (Must Do)
1. ✅ Fix schema configuration (DONE)
2. ✅ Fix RLS policies for registration (DONE)
3. ✅ Fix Server/Client component errors (DONE)
4. ⚠️ Create comprehensive seed data script
5. ⚠️ Implement or fix notification RPC function
6. ⚠️ Choose and integrate video provider for live sessions
7. ⚠️ Implement Students directory page
8. ⚠️ Implement Settings page (at minimum: profile edit, password change)

### P1 - First Update Post-Launch (Should Do)
1. Add error boundaries to all routes
2. Implement loading skeletons
3. Add API error handling middleware
4. Add rate limiting to public endpoints
5. Implement CAPTCHA for registration
6. Cross-browser testing
7. Mobile responsiveness testing
8. Accessibility audit with screen readers

### P2 - Future Enhancements (Nice to Have)
1. Offline mode support
2. PWA manifest for installability
3. Push notifications
4. Dark mode toggle in UI (currently follows system)
5. Export features (gradebook to Excel, attendance to PDF)
6. Bulk operations (grade multiple submissions at once)
7. Analytics dashboard for teacher insights
8. AI features (module generation, feedback drafting)

---

## Test Data Setup Script Needed

To enable comprehensive testing per TEACHER_TESTING_PROTOCOL.md, create:

### `/scripts/seed-complete-teacher-data.mjs`

```javascript
#!/usr/bin/env node
/**
 * Comprehensive Teacher Test Data Seed
 *
 * This script creates realistic test data for teacher app testing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'n8n_content_creation' } }
)

async function seedData() {
  console.log('🌱 Seeding teacher test data...\n')

  // 1. Create sections
  console.log('Creating sections...')
  const sections = await createSections()

  // 2. Create courses
  console.log('Creating courses...')
  const courses = await createCourses(sections)

  // 3. Link teacher to sections/courses
  console.log('Creating teacher assignments...')
  await createTeacherAssignments(teacherId, sections, courses)

  // 4. Create students
  console.log('Creating students...')
  const students = await createStudents(sections)

  // 5. Enroll students
  console.log('Enrolling students...')
  await enrollStudents(students, courses)

  // 6. Create modules and lessons
  console.log('Creating modules...')
  const modules = await createModules(courses)

  // 7. Create question banks
  console.log('Creating question banks...')
  const banks = await createQuestionBanks(courses)

  // 8. Create assessments
  console.log('Creating assessments...')
  const assessments = await createAssessments(courses, banks)

  // 9. Create submissions
  console.log('Creating submissions...')
  await createSubmissions(assessments, students)

  // 10. Create rubrics
  console.log('Creating rubric templates...')
  await createRubrics(courses)

  // 11. Create live sessions
  console.log('Creating live sessions...')
  await createLiveSessions(courses, sections)

  // 12. Create announcements
  console.log('Creating announcements...')
  await createAnnouncements(sections, courses)

  console.log('\n✅ Seed data created successfully!')
  console.log('\nTest with:')
  console.log('Email: juan.delacruz@msu.edu.ph')
  console.log('Password: TeacherMSU2024!@#SecurePassword\n')
}

seedData().catch(console.error)
```

**Estimated Effort:** 1 day to build comprehensive seed script
**Benefit:** Enables testing all 31 features in TEACHER_TESTING_PROTOCOL.md
**Priority:** HIGH - Blocking full testing

---

## Known Limitations (Acceptable for Current Stage)

### 1. Grading Queue Route Redirect
- **Observation:** Clicking "Grading Queue" redirects to login
- **Possible Cause:** Route `/teacher/grading` may not exist or has different protection
- **Action:** Verify route exists at `app/teacher/grading/page.tsx`
- **Impact:** Low if Submissions page serves same purpose
- **Note:** Found `app/teacher/grading/[itemId]/page.tsx` but no index page

**Recommendation:**
```typescript
// Either create app/teacher/grading/page.tsx
// Or redirect /teacher/grading to /teacher/submissions in middleware
```

### 2. Empty States Everywhere
- **Why:** New teacher account with no assignments
- **Expected:** All pages show empty states
- **Not a Bug:** Correct behavior for new teacher
- **Action Required:** Seed data + make teacher assignments

### 3. Stats Show "-" or "0"
- **Why:** No courses, students, or submissions yet
- **Expected:** Counts will populate when data exists
- **Not a Bug:** Correct behavior
- **Action Required:** Seed data

---

## Future Development Roadmap (Extracted from CLAUDE.md)

### Phase 1: Foundation ✅ COMPLETE
- ✅ Teacher app folder structure
- ✅ Shared tailwind config
- ✅ TeacherShell and TeacherSidebar
- ✅ Teacher registration flow
- ✅ Role detection

### Phase 2: Core Backend ✅ MOSTLY COMPLETE
- ✅ Teacher profile migrations
- ⚠️ Teacher DAL functions (some exist, need verification)
- ✅ RLS policies (basic policies in place, need full audit)
- ⚠️ API routes (some exist, many need creation)

### Phase 3: Content Management ⚠️ NOT TESTED
- ⚠️ Module Editor UI (page exists, needs test data)
- ⚠️ Transcript management
- ⚠️ Content asset uploads
- ⚠️ AI module generation

### Phase 4: Assessments ⚠️ NOT TESTED
- ⚠️ Question Bank Manager
- ⚠️ Assessment Builder
- ⚠️ Randomization engine
- ⚠️ Quiz snapshot generation

### Phase 5: Grading ⚠️ NOT TESTED
- ⚠️ Grading Inbox UI (exists, needs submissions)
- ⚠️ Rubric Builder
- ⚠️ AI feedback drafting
- ⚠️ Grade release workflow

### Phase 6: Communication ⚠️ NOT TESTED
- ⚠️ Announcements system (UI exists, needs testing)
- ⚠️ Direct messaging (UI exists, needs testing)
- ⚠️ Discussion threads
- ⚠️ Notification triggers

### Phase 7: Attendance & Live ⚠️ PARTIALLY TESTED
- ✅ Daily attendance UI works
- ⚠️ Live session scheduling (needs provider)
- ⚠️ Presence detection (needs provider)
- ⚠️ Attendance override (UI exists, needs testing with data)

---

## Code Quality Improvements Recommended

### 1. TypeScript Strict Mode Violations
- **Issue:** Some components may have `any` types
- **Action:** Enable TypeScript strict mode and fix all errors
- **Command:** `npm run type-check`
- **Estimated Effort:** 1-2 days

### 2. ESLint Warnings
- **Issue:** Console logs in production code
- **Action:** Remove console.log, use proper logging library
- **Estimated Effort:** Half day

### 3. Missing PropTypes/Validation
- **Issue:** Component props not fully validated
- **Action:** Add Zod schemas for API routes and form validation
- **Estimated Effort:** 1 day

### 4. Duplicate Code
- **Issue:** Similar patterns across pages (empty states, stats cards)
- **Action:** Extract reusable components:
  - `<StatsCard />`
  - `<PageHeader />`
  - `<FilterBar />`
- **Estimated Effort:** Half day

---

## Documentation Gaps

### 1. API Documentation
- **Needed:** OpenAPI/Swagger docs for all API routes
- **Current:** No API documentation
- **Tool:** Use Swagger or Postman
- **Estimated Effort:** 1 day

### 2. Component Storybook
- **Needed:** Visual documentation for UI components
- **Current:** No component library docs
- **Tool:** Storybook
- **Estimated Effort:** 2-3 days

### 3. Teacher User Guide
- **Needed:** Step-by-step guides for teacher workflows
- **Current:** No user documentation
- **Format:** Markdown or video tutorials
- **Estimated Effort:** 3-5 days

---

## Deployment Checklist (Before Production)

### Environment
- [ ] Set up production Supabase project
- [ ] Configure environment variables
- [ ] Set up custom domain
- [ ] Configure SSL/TLS
- [ ] Set up CDN (Vercel/Cloudflare)

### Database
- [ ] Run all migrations in production
- [ ] Verify all RLS policies applied
- [ ] Audit RLS policies with security expert
- [ ] Set up database backups
- [ ] Create database indexes for performance
- [ ] Seed production schools data

### Security
- [ ] Enable Supabase Auth rate limiting
- [ ] Add CAPTCHA to registration
- [ ] Implement 2FA for teachers
- [ ] Security penetration test
- [ ] GDPR compliance review (if applicable)
- [ ] Data retention policies

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up performance monitoring (Vercel Analytics)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors

### Testing
- [ ] Complete all 31 features per protocol
- [ ] Test all E2E flows
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Load testing
- [ ] User acceptance testing with real teachers

---

## Summary

**Current State:** ✅ **CORE INFRASTRUCTURE SOLID**

**What Works:**
- ✅ Authentication and authorization
- ✅ Database schema correctly configured
- ✅ RLS policies secure registration
- ✅ Navigation and routing
- ✅ UI components render correctly
- ✅ Empty states guide new teachers
- ✅ Branding consistent with MSU identity

**What's Blocked:**
- ⚠️ Advanced workflows need test data
- ⚠️ Live sessions need video provider
- ⚠️ Notifications need RPC function or implementation

**Ready for:**
- ✅ Development team testing
- ✅ Adding test data
- ✅ Implementing remaining features
- ✅ Building content creation workflows

**Not Ready for:**
- ❌ Production deployment (missing features)
- ❌ Beta testing with real teachers (need full workflows)
- ❌ Load testing (need real usage patterns)

**Recommendation:** **Proceed with Phase 3-7 implementation** per CLAUDE.md, then rerun this test protocol with proper test data.

---

**Generated by:** Claude Code
**Analysis Date:** January 1, 2026
**Document Version:** 1.0
