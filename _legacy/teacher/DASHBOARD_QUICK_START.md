# Dashboard Quick Start Guide

## What Was Built

The teacher dashboard at `/app/teacher/page.tsx` now displays **real Supabase data** with 8 comprehensive widgets:

### Widgets Overview

| Widget | Purpose | Data Source |
|--------|---------|-------------|
| **Quick Stats** | Total students, active courses, pending submissions | Multi-table aggregate |
| **Today's Sessions** | Live and upcoming sessions for today | `teacher_live_sessions` |
| **Grading Inbox** | Recent pending submissions | `submissions` (status='submitted') |
| **Pending Releases** | Graded but not released assessments | `submissions` (status='graded') |
| **Draft Content** | Unpublished modules | `modules` (is_published=false) |
| **Attendance Alerts** | Students absent today | `teacher_daily_attendance` |
| **Upcoming Deadlines** | Assessments due in next 7 days | `assessments` (due_date) |
| **Recent Activity** | Recent submissions, enrollments, publishes | Multi-table activity feed |

## Files Created

### Data Access Layer
- `/lib/dal/dashboard.ts` - All dashboard data fetching functions (800+ lines)

### Components
- `/components/dashboard/StatsWidget.tsx` - Quick stats cards
- `/components/dashboard/TodaysSessionsWidget.tsx` - Live sessions
- `/components/dashboard/GradingInboxWidget.tsx` - Grading inbox
- `/components/dashboard/PendingReleasesWidget.tsx` - Pending releases
- `/components/dashboard/DraftContentWidget.tsx` - Draft content
- `/components/dashboard/AttendanceAlertsWidget.tsx` - Attendance alerts
- `/components/dashboard/UpcomingDeadlinesWidget.tsx` - Upcoming deadlines
- `/components/dashboard/RecentActivityWidget.tsx` - Activity feed
- `/components/dashboard/index.ts` - Barrel exports

### Pages
- `/app/teacher/page.tsx` - Main dashboard (updated with real data)

### Documentation
- `/DASHBOARD_IMPLEMENTATION.md` - Comprehensive implementation guide
- `/DASHBOARD_QUICK_START.md` - This file

## Key Features

### 1. Server-Side Rendering
All data fetching happens on the server using React Server Components:
```typescript
async function DashboardStats({ teacherId }: { teacherId: string }) {
  const stats = await getTeacherStats(teacherId)
  return <StatsWidget stats={stats} />
}
```

### 2. Suspense Boundaries
Each widget loads independently with loading states:
```tsx
<Suspense fallback={<WidgetLoading />}>
  <DashboardStats teacherId={teacherProfile.id} />
</Suspense>
```

### 3. Real-time Data
Dashboard fetches live data on every page load:
- Live session status
- Latest submissions
- Today's attendance
- Current date calculations

### 4. Responsive Design
Works on all screen sizes:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 2-3 columns

## DAL Functions Reference

All functions in `/lib/dal/dashboard.ts`:

```typescript
// Main dashboard functions
getTeacherStats(teacherId: string): Promise<TeacherStats>
getTodaysLiveSessions(teacherId: string): Promise<TodaysLiveSession[]>
getRecentPendingSubmissions(teacherId: string, limit?: number): Promise<RecentSubmission[]>
getGradedNotReleasedItems(teacherId: string): Promise<GradedNotReleasedItem[]>
getDraftModules(teacherId: string, limit?: number): Promise<DraftModule[]>
getTodaysAbsentStudents(teacherId: string): Promise<AbsentStudent[]>
getUpcomingDeadlines(teacherId: string, days?: number): Promise<UpcomingDeadline[]>
getRecentActivity(teacherId: string, limit?: number): Promise<ActivityItem[]>

// Helper functions (internal)
getTotalStudentsCount(courseIds: string[]): Promise<number>
getActiveCoursesCount(courseIds: string[]): Promise<number>
getPendingSubmissionsCount(courseIds: string[]): Promise<number>
getGradedNotReleasedCount(courseIds: string[]): Promise<number>
getDraftModulesCount(courseIds: string[]): Promise<number>
getSubmissionCountForAssessment(assessmentId: string): Promise<number>
getTimeAgo(timestamp: string): string
```

## Data Flow

```
User visits /teacher
    ↓
Server Component: getTeacherProfile()
    ↓
8 Parallel Data Fetches (with Suspense):
  - getTeacherStats()
  - getTodaysLiveSessions()
  - getRecentPendingSubmissions()
  - getGradedNotReleasedItems()
  - getDraftModules()
  - getTodaysAbsentStudents()
  - getUpcomingDeadlines()
  - getRecentActivity()
    ↓
Render Dashboard with Real Data
```

## Database Tables Used

The dashboard queries these Supabase tables:

**Core Tables:**
- `teacher_profiles` - Teacher data
- `teacher_assignments` - Teacher-course relationships
- `courses` - Course information
- `sections` - Section details
- `students` - Student data
- `profiles` - User profiles (names, avatars)

**Content Tables:**
- `modules` - Course modules (draft/published)
- `lessons` - Module lessons
- `teacher_notes` - Lecture notes
- `teacher_transcripts` - Module transcripts

**Assessment Tables:**
- `assessments` - Assessments/quizzes
- `submissions` - Student submissions
- `student_answers` - Submission answers

**Session Tables:**
- `teacher_live_sessions` - Live sessions
- `teacher_session_presence` - Student presence
- `teacher_attendance` - Session attendance
- `teacher_daily_attendance` - Daily attendance

**Activity Tables:**
- `enrollments` - Student enrollments

## Usage Examples

### Adding a New Widget

1. **Create DAL function** in `/lib/dal/dashboard.ts`:
```typescript
export async function getMyNewData(teacherId: string) {
  const supabase = await createClient()
  // Query logic
  return data
}
```

2. **Create widget component** in `/components/dashboard/MyWidget.tsx`:
```typescript
'use client'
export default function MyWidget({ data }: { data: MyData }) {
  return <Card>{/* Widget UI */}</Card>
}
```

3. **Add to dashboard** in `/app/teacher/page.tsx`:
```typescript
async function MyDataWidget({ teacherId }: { teacherId: string }) {
  const data = await getMyNewData(teacherId)
  return <MyWidget data={data} />
}

// In main component:
<Suspense fallback={<WidgetLoading />}>
  <MyDataWidget teacherId={teacherProfile.id} />
</Suspense>
```

### Customizing Widget Order

Edit the grid in `/app/teacher/page.tsx`:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Reorder these as needed */}
  <Suspense><TodaysSessions /></Suspense>
  <Suspense><GradingInbox /></Suspense>
  {/* ... */}
</div>
```

### Changing Widget Limits

Modify DAL function calls:
```typescript
// Show more pending submissions
const submissions = await getRecentPendingSubmissions(teacherId, 5) // was 3

// Show more days of deadlines
const deadlines = await getUpcomingDeadlines(teacherId, 14) // was 7
```

## Testing the Dashboard

### 1. With Real Data
Prerequisites:
- Teacher account in `teacher_profiles`
- Teacher assignments in `teacher_assignments`
- Some course data

Visit: `http://localhost:3000/teacher`

### 2. Test Each Widget

**Stats Widget:**
- Create enrollments → Check total students
- Publish courses → Check active courses
- Submit assignments → Check pending count

**Sessions Widget:**
- Create session with today's date
- Set status to 'live' → Should show LIVE NOW
- Add join_url → Join button should appear

**Grading Inbox:**
- Create submissions with status='submitted'
- Should appear in recent list
- Click → Should link to grading page

**Pending Releases:**
- Grade submissions (status='graded')
- Should group by assessment
- Show count badge

**Draft Content:**
- Create modules with is_published=false
- Should list draft modules
- Show last edited time

**Attendance Alerts:**
- No attendance record for today → Student appears absent
- Create attendance with status='absent' → Should show

**Upcoming Deadlines:**
- Create assessments with due_date in next 7 days
- Should show countdown badges
- Urgency colors: red (0-1d), yellow (2-3d), blue (4+d)

**Recent Activity:**
- Create submission → Should appear
- Enroll student → Should appear
- Publish module → Should appear

## Performance Tips

### 1. Database Indexes
Ensure these indexes exist:
```sql
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_modules_published ON modules(is_published);
CREATE INDEX idx_attendance_date ON teacher_daily_attendance(date);
CREATE INDEX idx_assessments_due_date ON assessments(due_date);
```

### 2. RLS Policies
Dashboard queries respect Row Level Security:
- Teachers only see their own courses
- Teachers only see students in their sections
- Teachers only see their own sessions

### 3. Caching
Next.js automatically caches server component data.
To revalidate on every request:
```typescript
export const revalidate = 0 // in page.tsx
```

## Troubleshooting

### Dashboard shows "No data"
1. Check teacher has assignments: `SELECT * FROM teacher_assignments WHERE teacher_profile_id = ?`
2. Check courses exist: `SELECT * FROM courses WHERE id IN (...)`
3. Check RLS policies allow access

### "LIVE NOW" not showing
1. Check session scheduled_start <= now
2. Check session scheduled_end >= now (if set)
3. Check status != 'cancelled'

### Attendance alerts always empty
1. Verify `teacher_daily_attendance` is populated
2. Check date column matches today's date
3. Review attendance detection logic

### Slow loading
1. Check database indexes
2. Reduce widget limits (show fewer items)
3. Use database query analyzer to find slow queries

## Next Steps

After dashboard is working:

1. **Build Missing Routes:**
   - `/teacher/assessments/grade/{submissionId}` - Grading interface
   - `/teacher/assessments?tab=release` - Release grades
   - `/teacher/content/modules/{moduleId}` - Module editor

2. **Add Real-time Features:**
   - WebSocket for live session updates
   - Auto-refresh on new submissions
   - Push notifications

3. **Enhance Widgets:**
   - Add filters (by course, date)
   - Add sorting options
   - Add export/print features

4. **Mobile Optimization:**
   - Test on actual mobile devices
   - Optimize touch targets
   - Add swipe gestures

## Support

For questions or issues:
- Review `/DASHBOARD_IMPLEMENTATION.md` for detailed documentation
- Check Supabase database schema in `/supabase/migrations/`
- Review existing DAL patterns in `/lib/dal/teacher.ts` and `/lib/dal/assessments.ts`
