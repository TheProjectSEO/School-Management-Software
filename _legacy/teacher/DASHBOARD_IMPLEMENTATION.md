# Teacher Dashboard Implementation

## Overview

The teacher dashboard has been transformed from mock data to a comprehensive, data-driven command center that fetches real data from Supabase. It displays live sessions, grading inbox, pending releases, draft content, attendance alerts, upcoming deadlines, and recent activity.

## Architecture

### Server Components (Data Fetching)
All dashboard widgets use React Server Components for optimal performance:
- Data fetching happens on the server
- No client-side data fetching overhead
- Automatic parallel data loading with Suspense
- SEO-friendly rendering

### Client Components (Interactivity)
Widget UI components are client-side for interactivity:
- Click handlers for buttons
- Dynamic styling based on data
- Responsive hover states

## File Structure

```
/app/teacher/page.tsx                 # Main dashboard page (Server Component)
/lib/dal/dashboard.ts                  # Data Access Layer for dashboard
/components/dashboard/
  ├── index.ts                         # Barrel export
  ├── StatsWidget.tsx                  # Quick stats cards
  ├── TodaysSessionsWidget.tsx         # Live sessions for today
  ├── GradingInboxWidget.tsx           # Pending submissions
  ├── PendingReleasesWidget.tsx        # Graded but not released
  ├── DraftContentWidget.tsx           # Unpublished modules
  ├── AttendanceAlertsWidget.tsx       # Absent students today
  ├── UpcomingDeadlinesWidget.tsx      # Assessments due soon
  └── RecentActivityWidget.tsx         # Recent activity feed
```

## Data Access Layer (DAL)

### `/lib/dal/dashboard.ts`

All dashboard data fetching functions:

#### 1. **getTeacherStats(teacherId)**
Returns quick stats for header:
- Total Students (across all courses)
- Active Courses (published only)
- Pending Submissions (submitted but not graded)
- Graded Not Released (graded but not returned)
- Draft Modules (unpublished content)

**Database Tables Used:**
- `teacher_assignments` - Get teacher's courses
- `enrollments` - Count students
- `courses` - Count active courses
- `submissions` - Count pending/graded
- `modules` - Count drafts

#### 2. **getTodaysLiveSessions(teacherId)**
Returns live sessions scheduled for today:
- Session title, time, status
- Section and course name
- Join URL for live sessions
- `is_live_now` flag (based on current time)
- `minutes_until_start` for upcoming sessions

**Database Tables Used:**
- `teacher_live_sessions` - Get sessions
- `sections` - Section details
- `courses` - Course details

**Logic:**
- Filter by today's date range
- Exclude cancelled sessions
- Check if session is currently live (scheduled_start <= now <= scheduled_end)

#### 3. **getRecentPendingSubmissions(teacherId, limit)**
Returns recent ungraded submissions:
- Student name and LRN
- Assessment title and type
- Submission timestamp
- Time ago (human-readable)

**Database Tables Used:**
- `submissions` - Get submissions with status='submitted'
- `students` - Student details
- `profiles` - Student names
- `assessments` - Assessment details

#### 4. **getGradedNotReleasedItems(teacherId)**
Returns assessments with graded submissions not released:
- Assessment ID and title
- Course name
- Count of graded submissions
- Latest graded timestamp

**Database Tables Used:**
- `submissions` - Get submissions with status='graded'
- `assessments` - Assessment details
- `courses` - Course details

**Logic:**
- Groups by assessment ID
- Counts graded submissions per assessment

#### 5. **getDraftModules(teacherId, limit)**
Returns unpublished modules:
- Module title
- Course name
- Last edited timestamp
- Time ago

**Database Tables Used:**
- `modules` - Get modules with is_published=false
- `courses` - Course details

#### 6. **getTodaysAbsentStudents(teacherId)**
Returns students who haven't logged in today:
- Student name and LRN
- Section name
- Last seen timestamp

**Database Tables Used:**
- `teacher_assignments` - Get teacher's sections
- `students` - Get students in sections
- `profiles` - Student names
- `teacher_daily_attendance` - Check today's attendance

**Logic:**
- Queries today's date from `teacher_daily_attendance`
- Returns students with no attendance record or status='absent'

#### 7. **getUpcomingDeadlines(teacherId, days)**
Returns assessments due in next N days:
- Assessment title and type
- Course name
- Due date
- Days until due (countdown)
- Submission count

**Database Tables Used:**
- `assessments` - Get assessments with due_date
- `courses` - Course details
- `submissions` - Count submissions

**Logic:**
- Filter due_date between now and now + N days
- Calculate days remaining

#### 8. **getRecentActivity(teacherId, limit)**
Returns recent activity feed:
- Activity type (submission, enrollment, module_published, message)
- Description
- Timestamp
- Time ago
- Metadata (IDs for linking)

**Database Tables Used:**
- `submissions` - Recent submissions
- `enrollments` - Recent enrollments
- `modules` - Recently published modules

**Logic:**
- Fetches from multiple tables
- Combines and sorts by timestamp
- Returns most recent N items

## Dashboard Widgets

### 1. StatsWidget
**Props:** `{ stats: TeacherStats }`

Displays three cards:
- Total Students (blue)
- Active Courses (green)
- Pending Submissions (orange, highlighted if > 0)

**Styling:** Grid layout (1 col mobile, 3 cols desktop)

### 2. TodaysSessionsWidget
**Props:** `{ sessions: TodaysLiveSession[] }`

Features:
- Shows sessions in chronological order
- LIVE NOW badge (green) for active sessions
- Join button for live sessions with join_url
- Prepare button for upcoming sessions
- Time display with countdown

**Empty State:** "No sessions scheduled for today"

### 3. GradingInboxWidget
**Props:** `{ recentSubmissions: RecentSubmission[], totalPending: number }`

Features:
- Shows total pending count prominently
- Lists last 3 submissions
- Links to grading page
- "All caught up!" state when pending = 0

**Links:** `/teacher/assessments/grade/{submissionId}`

### 4. PendingReleasesWidget
**Props:** `{ items: GradedNotReleasedItem[] }`

Features:
- Shows count of assessments ready to release
- Lists assessments with graded count
- Badge showing number of graded submissions
- Release button linking to assessments tab

**Links:** `/teacher/assessments?tab=release`

### 5. DraftContentWidget
**Props:** `{ drafts: DraftModule[], totalCount: number }`

Features:
- Shows last 2 draft modules
- Draft badge (yellow)
- Last edited time
- "+N more drafts" footer if totalCount > 2

**Links:** `/teacher/content/modules/{moduleId}`

### 6. AttendanceAlertsWidget
**Props:** `{ absentStudents: AbsentStudent[] }`

Features:
- Red alert styling when students are absent
- Count badge
- List of absent students
- Link to attendance page

**Links:** `/teacher/attendance`

**Empty State:** "All students present today" (green checkmark)

### 7. UpcomingDeadlinesWidget
**Props:** `{ deadlines: UpcomingDeadline[] }`

Features:
- Urgency badges (red: 0-1 days, yellow: 2-3 days, blue: 4+ days)
- Shows TODAY/TOMORROW for imminent deadlines
- Submission count per assessment
- Links to assessment details

**Links:** `/teacher/assessments/{assessmentId}`

### 8. RecentActivityWidget
**Props:** `{ activities: ActivityItem[] }`

Features:
- Icon per activity type (color-coded)
- Activity description
- Time ago timestamp
- Last 5 activities across all types

**Activity Types:**
- `submission` - Blue, assignment_turned_in icon
- `enrollment` - Green, person_add icon
- `module_published` - Purple, publish icon
- `message` - Orange, mail icon

## Dashboard Layout

```
┌─────────────────────────────────────────────┐
│  Welcome Header + Date                      │
└─────────────────────────────────────────────┘
┌─────────┬─────────┬─────────┐
│ Students│ Courses │ Pending │  Quick Stats
└─────────┴─────────┴─────────┘
┌────────────────┬────────────────┐
│ Today's        │ Grading        │
│ Sessions       │ Inbox          │
├────────────────┼────────────────┤
│ Pending        │ Draft          │
│ Releases       │ Content        │
├────────────────┼────────────────┤
│ Upcoming       │ Recent         │
│ Deadlines      │ Activity       │
└────────────────┴────────────────┘
┌─────────────────────────────────────────────┐
│ Attendance Alerts (Full Width)              │
└─────────────────────────────────────────────┘
```

## Performance Optimizations

### 1. Suspense Boundaries
Each widget is wrapped in Suspense:
- Independent loading states
- Parallel data fetching
- No blocking render

### 2. Server Components
- All data fetching on server
- Reduced client bundle size
- Automatic request deduplication

### 3. Database Indexes
All DAL queries use indexed columns:
- `teacher_assignments(teacher_profile_id)`
- `submissions(status, assessment_id)`
- `modules(is_published, course_id)`
- `teacher_daily_attendance(student_id, date)`
- `assessments(due_date, course_id)`

### 4. Parallel Queries
DAL functions use `Promise.all()` for parallel queries:
```typescript
const [students, courses, submissions] = await Promise.all([
  getTotalStudentsCount(courseIds),
  getActiveCoursesCount(courseIds),
  getPendingSubmissionsCount(courseIds)
])
```

## Helper Functions

### getTimeAgo(timestamp)
Converts timestamp to human-readable format:
- "Just now" (< 1 min)
- "5m ago" (< 1 hour)
- "3h ago" (< 24 hours)
- "2d ago" (< 7 days)
- Full date (>= 7 days)

## Database Schema Reference

### Key Tables

**teacher_live_sessions:**
- Stores scheduled and live sessions
- Links to courses, sections, modules
- Tracks status (scheduled, live, ended, cancelled)

**teacher_daily_attendance:**
- Daily attendance tracking
- Automatically updated on student login
- Manual override capability

**submissions:**
- Student assessment submissions
- Status: submitted → graded → returned
- Links to assessments, students

**modules:**
- Course content modules
- Published/draft status
- Versioning support

## Integration Points

### Routes Referenced
- `/teacher/assessments?tab=grading` - Grading inbox
- `/teacher/assessments?tab=release` - Release grades
- `/teacher/assessments/{id}` - Assessment details
- `/teacher/assessments/grade/{submissionId}` - Grade submission
- `/teacher/content/modules/{moduleId}` - Edit module
- `/teacher/attendance` - Attendance management

### Missing Routes (To Implement)
These routes are referenced but not yet built:
- `/teacher/assessments/grade/{submissionId}` - Grading interface
- `/teacher/assessments?tab=release` - Release grades interface
- `/teacher/content/modules/{moduleId}` - Module editor

## Testing Checklist

- [ ] Dashboard loads with real teacher profile
- [ ] Stats widget shows correct counts
- [ ] Live sessions display with correct LIVE NOW status
- [ ] Grading inbox shows pending submissions
- [ ] Pending releases groups by assessment
- [ ] Draft modules show unpublished content
- [ ] Attendance alerts show today's absent students
- [ ] Upcoming deadlines show next 7 days
- [ ] Recent activity combines all sources
- [ ] Loading states work for each widget
- [ ] Empty states display correctly
- [ ] Links navigate to correct pages
- [ ] Responsive layout works on mobile/tablet/desktop

## Future Enhancements

1. **Real-time Updates:**
   - WebSocket for live session status
   - Auto-refresh pending submissions
   - Notifications for new activity

2. **Filtering/Sorting:**
   - Filter by course
   - Filter by date range
   - Sort recent activity

3. **Customization:**
   - Widget visibility toggles
   - Reorderable dashboard
   - Custom date ranges

4. **Analytics:**
   - Week-over-week comparisons
   - Grading velocity metrics
   - Student engagement trends

5. **Export:**
   - PDF dashboard report
   - CSV data export
   - Email digest

## Troubleshooting

### No data showing?
- Check `teacher_assignments` table has records
- Verify teacher profile exists
- Check RLS policies allow teacher access

### Attendance alerts not working?
- Verify `teacher_daily_attendance` is being populated
- Check student login tracking is enabled
- Review date filtering logic

### Live sessions not showing?
- Check `teacher_live_sessions` has today's sessions
- Verify scheduled_start is today
- Check status is not 'cancelled'

## Related Documentation

- `/lib/dal/teacher.ts` - Teacher profile and courses DAL
- `/lib/dal/assessments.ts` - Assessments and submissions DAL
- `/supabase/migrations/003_teacher_live_sessions.sql` - Sessions schema
- `/supabase/migrations/004_teacher_assessments.sql` - Assessments schema
