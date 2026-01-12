# Teacher Dashboard Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEACHER DASHBOARD                            │
│                     /app/teacher/page.tsx                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ getTeacherProfile()
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER COMPONENT LAYER                            │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ DashboardStats │  │ TodaysSessions │  │  GradingInbox  │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │PendingReleases │  │  DraftContent  │  │UpcomingDeadlin.│       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│  ┌────────────────┐  ┌────────────────┐                           │
│  │AttendanceAlerts│  │ RecentActivity │                           │
│  └────────────────┘  └────────────────┘                           │
│                                                                      │
│  Each wrapped in <Suspense> for parallel loading                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ DAL Function Calls
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER (DAL)                             │
│                  /lib/dal/dashboard.ts                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getTeacherStats(teacherId)                                   │  │
│  │ ├─ getTotalStudentsCount()                                   │  │
│  │ ├─ getActiveCoursesCount()                                   │  │
│  │ ├─ getPendingSubmissionsCount()                              │  │
│  │ ├─ getGradedNotReleasedCount()                               │  │
│  │ └─ getDraftModulesCount()                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getTodaysLiveSessions(teacherId)                             │  │
│  │ ├─ Query teacher_live_sessions                               │  │
│  │ ├─ Filter by today's date                                    │  │
│  │ └─ Check if live (scheduled_start <= now <= scheduled_end)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getRecentPendingSubmissions(teacherId, limit)                │  │
│  │ ├─ Query submissions with status='submitted'                 │  │
│  │ ├─ Join students, profiles, assessments                      │  │
│  │ └─ Order by submitted_at DESC                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getGradedNotReleasedItems(teacherId)                         │  │
│  │ ├─ Query submissions with status='graded'                    │  │
│  │ ├─ Group by assessment_id                                    │  │
│  │ └─ Count graded submissions per assessment                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getDraftModules(teacherId, limit)                            │  │
│  │ ├─ Query modules with is_published=false                     │  │
│  │ ├─ Join courses for course names                             │  │
│  │ └─ Order by updated_at DESC                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getTodaysAbsentStudents(teacherId)                           │  │
│  │ ├─ Get teacher's sections                                    │  │
│  │ ├─ Get students in sections                                  │  │
│  │ ├─ Check teacher_daily_attendance for today                  │  │
│  │ └─ Return students with no record or status='absent'         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getUpcomingDeadlines(teacherId, days=7)                      │  │
│  │ ├─ Query assessments with due_date                           │  │
│  │ ├─ Filter: now <= due_date <= now + days                     │  │
│  │ ├─ Count submissions per assessment                          │  │
│  │ └─ Calculate days_until_due                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ getRecentActivity(teacherId, limit=5)                        │  │
│  │ ├─ Query recent submissions                                  │  │
│  │ ├─ Query recent enrollments                                  │  │
│  │ ├─ Query recently published modules                          │  │
│  │ ├─ Combine all activities                                    │  │
│  │ └─ Sort by timestamp DESC, take limit                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Supabase Client
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUPABASE DATABASE                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Core Tables                                                  │   │
│  │ ├─ teacher_profiles          (teacher data)                 │   │
│  │ ├─ teacher_assignments       (teacher-course links)         │   │
│  │ ├─ courses                   (course info)                  │   │
│  │ ├─ sections                  (class sections)               │   │
│  │ ├─ students                  (student data)                 │   │
│  │ └─ profiles                  (user profiles)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Content Tables                                               │   │
│  │ ├─ modules                   (course modules)               │   │
│  │ ├─ lessons                   (module lessons)               │   │
│  │ ├─ teacher_notes             (lecture notes)                │   │
│  │ └─ teacher_transcripts       (module transcripts)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Assessment Tables                                            │   │
│  │ ├─ assessments               (quizzes/assignments)          │   │
│  │ ├─ submissions               (student submissions)          │   │
│  │ └─ student_answers           (submission answers)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Session & Attendance Tables                                  │   │
│  │ ├─ teacher_live_sessions     (live class sessions)          │   │
│  │ ├─ teacher_session_presence  (student join/leave)           │   │
│  │ ├─ teacher_attendance        (session attendance)           │   │
│  │ └─ teacher_daily_attendance  (daily login tracking)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Activity Tables                                              │   │
│  │ └─ enrollments               (student enrollments)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  RLS Policies: Teacher can only access their own courses/students   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Data Returns
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT COMPONENT LAYER                          │
│                  /components/dashboard/*.tsx                         │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │  StatsWidget   │  │TodaysSessions  │  │ GradingInbox   │       │
│  │   (cards)      │  │   Widget       │  │    Widget      │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │PendingReleases │  │  DraftContent  │  │UpcomingDeadlin.│       │
│  │    Widget      │  │    Widget      │  │    Widget      │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│  ┌────────────────┐  ┌────────────────┐                           │
│  │AttendanceAlerts│  │ RecentActivity │                           │
│  │    Widget      │  │    Widget      │                           │
│  └────────────────┘  └────────────────┘                           │
│                                                                      │
│  Features:                                                          │
│  - Interactive UI (buttons, links, hover states)                   │
│  - Empty states when no data                                       │
│  - Badge styling for urgency/status                                │
│  - Responsive grid layout                                          │
│  - Dark mode support                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
1. User navigates to /teacher
   ↓
2. Next.js Server Component executes
   ↓
3. getTeacherProfile() called
   ├─ Fetch from teacher_profiles
   ├─ Join with profiles (name, avatar)
   └─ Join with schools (name, logo)
   ↓
4. If no profile → redirect('/teacher/login')
   ↓
5. teacherProfile.id passed to all widgets
   ↓
6. 8 Parallel Data Fetches (via Suspense):
   │
   ├─ getTeacherStats(teacherId)
   │  ├─ Get course IDs from teacher_assignments
   │  ├─ Count enrollments (students)
   │  ├─ Count published courses
   │  ├─ Count pending submissions
   │  ├─ Count graded not released
   │  └─ Count draft modules
   │  ↓
   │  → StatsWidget renders
   │
   ├─ getTodaysLiveSessions(teacherId)
   │  ├─ Get course IDs
   │  ├─ Query teacher_live_sessions for today
   │  ├─ Filter by date range (today)
   │  ├─ Calculate is_live_now
   │  └─ Calculate minutes_until_start
   │  ↓
   │  → TodaysSessionsWidget renders
   │
   ├─ getRecentPendingSubmissions(teacherId, 3)
   │  ├─ Get course IDs
   │  ├─ Query submissions (status='submitted')
   │  ├─ Join students, profiles, assessments
   │  ├─ Order by submitted_at
   │  └─ Limit 3
   │  ↓
   │  → GradingInboxWidget renders
   │
   ├─ getGradedNotReleasedItems(teacherId)
   │  ├─ Get course IDs
   │  ├─ Query submissions (status='graded')
   │  ├─ Join assessments, courses
   │  ├─ Group by assessment_id
   │  └─ Count per assessment
   │  ↓
   │  → PendingReleasesWidget renders
   │
   ├─ getDraftModules(teacherId, 5)
   │  ├─ Get course IDs
   │  ├─ Query modules (is_published=false)
   │  ├─ Join courses
   │  ├─ Order by updated_at DESC
   │  └─ Limit 5
   │  ↓
   │  → DraftContentWidget renders
   │
   ├─ getTodaysAbsentStudents(teacherId)
   │  ├─ Get section IDs from teacher_assignments
   │  ├─ Get students in sections
   │  ├─ Check teacher_daily_attendance for today
   │  └─ Return students with no record or absent
   │  ↓
   │  → AttendanceAlertsWidget renders
   │
   ├─ getUpcomingDeadlines(teacherId, 7)
   │  ├─ Get course IDs
   │  ├─ Query assessments with due_date
   │  ├─ Filter: now <= due_date <= now+7days
   │  ├─ Count submissions per assessment
   │  └─ Calculate days_until_due
   │  ↓
   │  → UpcomingDeadlinesWidget renders
   │
   └─ getRecentActivity(teacherId, 5)
      ├─ Get course IDs
      ├─ Query recent submissions
      ├─ Query recent enrollments
      ├─ Query recent published modules
      ├─ Combine all activities
      ├─ Sort by timestamp DESC
      └─ Take first 5
      ↓
      → RecentActivityWidget renders

7. All widgets render with real data
   ↓
8. User interacts with dashboard
   ├─ Click "Join Session" → Opens join_url
   ├─ Click submission → Navigate to grading page
   ├─ Click draft module → Navigate to editor
   └─ Click "View Details" → Navigate to full page
```

## Component Hierarchy

```
TeacherDashboardPage (Server)
├── Header
│   ├── Welcome + Teacher Name
│   └── Current Date
│
├── <Suspense fallback={StatsLoading}>
│   └── DashboardStats (Server)
│       └── StatsWidget (Client)
│           ├── Total Students Card
│           ├── Active Courses Card
│           └── Pending Submissions Card
│
└── Grid (2 columns)
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── TodaysSessions (Server)
    │       └── TodaysSessionsWidget (Client)
    │           ├── Session Cards
    │           │   ├── LIVE NOW badge
    │           │   └── Join/Prepare buttons
    │           └── Empty State
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── GradingInbox (Server)
    │       └── GradingInboxWidget (Client)
    │           ├── Total Count Display
    │           ├── Recent Submissions List
    │           ├── View All Button
    │           └── Empty State
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── PendingReleases (Server)
    │       └── PendingReleasesWidget (Client)
    │           ├── Assessment Count
    │           ├── Assessment List
    │           ├── Release Button
    │           └── Empty State
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── DraftContent (Server)
    │       └── DraftContentWidget (Client)
    │           ├── Draft Module List
    │           ├── Draft Badges
    │           ├── More Drafts Count
    │           └── Empty State
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── UpcomingDeadlines (Server)
    │       └── UpcomingDeadlinesWidget (Client)
    │           ├── Deadline List
    │           ├── Urgency Badges
    │           ├── Countdown Display
    │           └── Empty State
    │
    ├── <Suspense fallback={WidgetLoading}>
    │   └── RecentActivity (Server)
    │       └── RecentActivityWidget (Client)
    │           ├── Activity Items
    │           ├── Activity Icons
    │           ├── Time Ago
    │           └── Empty State
    │
    └── Full Width Section
        └── <Suspense fallback={WidgetLoading}>
            └── AttendanceAlerts (Server)
                └── AttendanceAlertsWidget (Client)
                    ├── Alert Banner (Red)
                    ├── Absent Count Badge
                    ├── View Details Button
                    └── Empty State (Green)
```

## State Management

**No client-side state needed:**
- All data fetched on server
- Data passed as props to client components
- Client components only manage UI state (hover, click)

**Loading States:**
- Managed by React Suspense
- Skeleton loaders while fetching
- Independent loading per widget

**Error States:**
- Caught by error boundaries (future enhancement)
- Console logging for debugging
- Empty states as fallback

## Performance Optimization

**Database Level:**
- ✅ Indexes on all filtered columns
- ✅ Select only needed columns
- ✅ Pagination/limits applied
- ✅ Parallel queries with Promise.all()

**Application Level:**
- ✅ Server Component data fetching
- ✅ Suspense streaming
- ✅ Component code splitting
- ✅ Minimal client JavaScript

**Caching:**
- Next.js automatic caching
- Revalidation on navigation
- Can add manual revalidation

## Security Model

**Row Level Security (RLS):**
```sql
-- Teachers can only see their own courses
CREATE POLICY teacher_courses ON courses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_assignments
      WHERE teacher_assignments.course_id = courses.id
      AND teacher_assignments.teacher_profile_id = auth.uid()
    )
  );
```

**Authorization Flow:**
1. User authenticates with Supabase
2. auth.uid() stored in session
3. RLS policies filter data automatically
4. DAL functions pass teacherId
5. Supabase validates access on every query

## Type Safety

**TypeScript Types:**
```typescript
// All data types defined
type TeacherStats = { ... }
type TodaysLiveSession = { ... }
type RecentSubmission = { ... }
// etc.

// Props typed
interface StatsWidgetProps {
  stats: TeacherStats
}

// Return types specified
async function getTeacherStats(
  teacherId: string
): Promise<TeacherStats> { ... }
```

## Conclusion

The dashboard architecture follows **Next.js best practices** with:
- Server Components for data fetching
- Client Components for interactivity
- Typed Data Access Layer
- Suspense for streaming
- Parallel data loading
- Row Level Security
- Responsive design
- Comprehensive documentation
