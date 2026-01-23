# SSE (Server-Sent Events) Architecture

## Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation](#2-current-implementation)
3. [Future Teacher Integration](#3-future-teacher-integration)
4. [Database Tables for SSE](#4-database-tables-for-sse)
5. [Supabase Realtime Configuration](#5-supabase-realtime-configuration)
6. [Architecture Diagrams](#6-architecture-diagrams)
7. [Implementation Checklist for Teachers](#7-implementation-checklist-for-teachers)
8. [Performance Considerations](#8-performance-considerations)

---

## 1. Overview

### What is SSE (Server-Sent Events)?

Server-Sent Events (SSE) is a server push technology that enables a client to receive automatic updates from a server via an HTTP connection. Unlike WebSockets, SSE is unidirectional - the server can push data to the client, but the client cannot send data back over the same connection.

In this educational platform, we leverage **Supabase Realtime**, which uses a combination of WebSockets and PostgreSQL's LISTEN/NOTIFY feature to provide real-time database change notifications. While technically using WebSockets under the hood, the programming model is similar to SSE - we subscribe to changes and receive push notifications.

### SSE vs WebSockets vs Polling

| Feature | SSE/Supabase Realtime | WebSockets | Polling |
|---------|----------------------|------------|---------|
| **Direction** | Unidirectional (server to client) | Bidirectional | Client-initiated |
| **Connection** | Persistent | Persistent | New request each time |
| **Complexity** | Low | Medium | Low |
| **Browser Support** | Excellent | Excellent | Universal |
| **Reconnection** | Automatic | Manual (typically) | N/A |
| **Data Format** | Text/JSON | Binary/Text | Any |
| **Best For** | Notifications, feeds | Chat, gaming | Legacy systems |
| **Overhead** | Low | Low | High (repeated requests) |

### Why SSE + Supabase Realtime is Ideal for This Platform

1. **Natural Fit for Educational Data Flows**
   - Students primarily receive information (grades, announcements, deadlines)
   - Teachers push updates, students consume them
   - Unidirectional flow matches educational hierarchy

2. **Reduced Complexity**
   - No need for custom WebSocket server infrastructure
   - Supabase handles connection management, reconnection, and scaling
   - Integrates seamlessly with existing Supabase authentication and RLS

3. **Database-Centric Design**
   - Changes are persisted in PostgreSQL first
   - Realtime events are triggered by database operations
   - Ensures data consistency - if it's in the database, subscribers know

4. **Efficient Resource Usage**
   - Single connection per client
   - Automatic connection pooling by Supabase
   - Battery-friendly for mobile devices compared to polling

5. **Built-in Security**
   - Row-Level Security (RLS) policies apply to realtime subscriptions
   - Students only receive notifications for their own data
   - No custom authorization layer needed

---

## 2. Current Implementation

### Architecture Overview

The current implementation follows a provider-based pattern using React Context to share realtime state across the application.

```
/hooks
  useRealtimeNotifications.ts    # Core hook for notification subscriptions

/components
  /providers
    RealtimeProvider.tsx         # React Context provider
  /notifications
    NotificationBell.tsx         # Header notification component

/app/(student)
  /notifications
    page.tsx                     # Server-side initial data fetch
    NotificationsClient.tsx      # Client-side realtime updates
```

### The `useRealtimeNotifications` Hook

This is the core hook that manages the Supabase Realtime subscription for notifications.

**Location:** `/hooks/useRealtimeNotifications.ts`

**Key Features:**

```typescript
interface UseRealtimeNotificationsReturn {
  notifications: Notification[];    // Recent notification list
  unreadCount: number;              // Count of unread notifications
  isConnected: boolean;             // Connection status
  error: string | null;             // Error message if any
  markAsRead: (id: string) => Promise<void>;     // Mark single as read
  markAllAsRead: () => Promise<void>;            // Mark all as read
  refresh: () => Promise<void>;                  // Manual refresh
}
```

**Subscription Flow:**

1. **Channel Creation**: Creates a unique channel per student: `notifications:{studentId}`

2. **Event Listeners**: Subscribes to two PostgreSQL change events:
   - `INSERT` - New notifications arrive
   - `UPDATE` - Notification read status changes

3. **Filter Application**: Uses row-level filtering: `student_id=eq.{studentId}`

4. **State Management**:
   - Maintains local notification array (max 50 items)
   - Tracks unread count separately for performance
   - Optimistic updates for read status changes

5. **Audio Feedback**: Plays a notification sound on new unread notifications

**Code Walkthrough:**

```typescript
// Create realtime channel with student-specific name
const channel = supabase
  .channel(`notifications:${studentId}`)
  // Listen for new notifications
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "student_notifications",
      filter: `student_id=eq.${studentId}`,
    },
    (payload) => {
      // Add new notification to beginning of list
      // Increment unread count
      // Play notification sound
      // Call optional callback
    }
  )
  // Listen for updates (read status changes)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "student_notifications",
      filter: `student_id=eq.${studentId}`,
    },
    (payload) => {
      // Update notification in list
      // Adjust unread count based on is_read change
    }
  )
  .subscribe((status) => {
    // Track connection status
  });
```

### The RealtimeProvider Architecture

**Location:** `/components/providers/RealtimeProvider.tsx`

The RealtimeProvider wraps the student area of the application and:

1. **Initializes Student Context**: Fetches or uses pre-provided student ID
2. **Manages Realtime Connection**: Single connection shared across components
3. **Provides Context Hooks**: `useRealtime()` and `useNotifications()`

**Component Hierarchy:**

```
<StudentLayout>
  <RealtimeProvider initialStudentId={studentId}>
    <AppShell>
      <NotificationBell />        // Uses useRealtime()
      <NotificationsPage />       // Uses useRealtimeNotifications()
      {children}
    </AppShell>
  </RealtimeProvider>
</StudentLayout>
```

**Context Value:**

```typescript
interface RealtimeContextValue {
  studentId: string | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}
```

### How NotificationBell Uses SSE

**Location:** `/components/notifications/NotificationBell.tsx`

The NotificationBell is a dropdown component in the header that:

1. **Consumes Context**: Uses `useRealtime()` hook for notification data
2. **Displays Badge**: Shows unread count (capped at 99+)
3. **Shows Connection Status**: Yellow dot when disconnected
4. **Renders Dropdown**: Last 5 notifications with quick actions
5. **Handles Interactions**: Mark as read, navigate to notification target

**Key Implementation Details:**

```typescript
function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useRealtime();

  // Only show last 5 in dropdown
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div>
      <button>
        {/* Bell icon with badge */}
        {unreadCount > 0 && <span>{unreadCount}</span>}
        {/* Reconnecting indicator */}
        {!isConnected && <span className="reconnecting-dot" />}
      </button>
      {/* Dropdown with notifications */}
    </div>
  );
}
```

### Notifications Page Implementation

**Location:** `/app/(student)/notifications/page.tsx` and `NotificationsClient.tsx`

**Server Component (page.tsx):**
- Fetches initial notifications server-side
- Passes data to client component
- Forces dynamic rendering (`export const dynamic = "force-dynamic"`)

**Client Component (NotificationsClient.tsx):**
- Uses `useRealtimeNotifications` directly for full control
- Falls back to initial server data if realtime not yet connected
- Shows "Live" or "Connecting" status indicator
- Displays "New notification received!" banner on new arrivals
- Provides filtering by type (all, unread, assignment, grade, announcement)

**Hybrid SSR + Realtime Pattern:**

```typescript
// Server Component
export default async function NotificationsPage() {
  const student = await getCurrentStudent();
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(student.id, { pageSize: 20 }),
    getUnreadNotificationCount(student.id),
  ]);

  return (
    <NotificationsClient
      notifications={notifications}        // Initial server data
      unreadCount={unreadCount}
      studentId={student.id}
    />
  );
}

// Client Component
function NotificationsClient({ notifications: initial, unreadCount: initialCount, studentId }) {
  const { notifications: realtime, unreadCount: rtCount } = useRealtimeNotifications(studentId);

  // Use realtime data when available, fall back to initial
  const notifications = realtime.length > 0 ? realtime : initial;
  const unreadCount = realtime.length > 0 ? rtCount : initialCount;
}
```

---

## 3. Future Teacher Integration

When teachers are added to the platform, SSE will enable powerful real-time interactions between teachers and students.

### 3.1 Notifications

#### Teacher Posts Announcement

**Flow:**
1. Teacher creates announcement in teacher portal
2. Announcement saved to `announcements` table
3. Database trigger creates notifications for all enrolled students
4. Supabase Realtime pushes to each student's channel
5. Students see notification appear instantly

**Database Trigger (Pseudo-SQL):**

```sql
CREATE OR REPLACE FUNCTION notify_students_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for each enrolled student
  INSERT INTO student_notifications (student_id, type, title, message, action_url)
  SELECT
    e.student_id,
    'announcement',
    NEW.title,
    LEFT(NEW.content, 100) || '...',
    '/announcements/' || NEW.id
  FROM enrollments e
  WHERE e.course_id = NEW.course_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_announcement_insert
AFTER INSERT ON announcements
FOR EACH ROW EXECUTE FUNCTION notify_students_on_announcement();
```

#### Teacher Grades Assessment

**Flow:**
1. Teacher enters grade in grading interface
2. Submission updated with score and feedback
3. Database trigger creates grade notification
4. Student receives instant notification with grade preview

**Notification Types:**

| Type | Trigger | Message Example |
|------|---------|-----------------|
| `grade` | Score entered | "You scored 95/100 on Quiz 3" |
| `grade` | Feedback added | "New feedback on your Math Assignment" |
| `grade` | Grade updated | "Grade adjusted for Science Project" |

#### Teacher Adds New Content

**Flow:**
1. Teacher publishes new module or lesson
2. Content marked as `is_published = true`
3. Trigger notifies enrolled students
4. Students see "New content available in [Course]"

### 3.2 Assessment Deadlines

#### Real-time Countdown Timers

When a student views an assessment:
- Display live countdown to deadline
- Subscribe to deadline changes for that assessment
- Update countdown if teacher extends deadline

```typescript
// Future implementation
function useAssessmentDeadline(assessmentId: string) {
  const [deadline, setDeadline] = useState<Date | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`assessment:${assessmentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assessments",
          filter: `id=eq.${assessmentId}`,
        },
        (payload) => {
          if (payload.new.due_date !== payload.old.due_date) {
            setDeadline(new Date(payload.new.due_date));
            showToast("Deadline has been updated!");
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [assessmentId]);

  return { deadline, timeRemaining: calculateTimeRemaining(deadline) };
}
```

#### Instant "Deadline Extended" Updates

When teacher extends deadline:
1. Teacher updates `due_date` in assessments table
2. All students viewing that assessment receive update
3. Countdown timer adjusts automatically
4. Toast notification: "Good news! Deadline extended to [date]"

#### Live Submission Status Updates

```typescript
// Track submission status in real-time
function useSubmissionStatus(assessmentId: string, studentId: string) {
  // Subscribe to submission changes
  // Show: "Submitted", "Graded", "Pending"
}
```

### 3.3 Progress Sync

#### Teacher Views Student Progress in Real-time

Teachers can monitor student progress live:

```typescript
// Teacher portal - watch all students in a course
function useClassProgress(courseId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`course-progress:${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",  // INSERT, UPDATE
          schema: "public",
          table: "student_progress",
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          // Update dashboard with student's new progress
          updateStudentProgress(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [courseId]);
}
```

#### Multiple Browser Tabs Stay in Sync

Using broadcast channels for cross-tab communication:

```typescript
// Sync progress across tabs
function useCrossTabSync() {
  useEffect(() => {
    const channel = supabase
      .channel('progress-sync')
      .on('broadcast', { event: 'progress-update' }, (payload) => {
        // Update local state from another tab
        syncLocalProgress(payload);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const broadcastProgress = (progress) => {
    channel.send({
      type: 'broadcast',
      event: 'progress-update',
      payload: progress
    });
  };
}
```

#### Collaborative Features (Future)

If collaborative features are added (e.g., group projects):
- Real-time document editing indicators ("John is editing...")
- Presence indicators showing who's online
- Live cursor positions in shared documents

### 3.4 Announcements

#### Broadcast to All Students in a Course

```typescript
// Teacher broadcasts to course
async function broadcastAnnouncement(courseId: string, announcement: Announcement) {
  // 1. Save to announcements table
  const { data } = await supabase
    .from('announcements')
    .insert({
      course_id: courseId,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      created_by: teacherId
    })
    .select()
    .single();

  // 2. Database trigger handles notification creation
  // 3. Supabase Realtime delivers to all enrolled students
}
```

#### Urgent Announcements with Visual Priority

```typescript
// Notification types with priority levels
interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  created_at: string;
}

// Client-side handling
function handleNewAnnouncement(notification: Notification) {
  if (notification.priority === 'urgent') {
    // Play alert sound
    // Show full-screen modal
    // Require acknowledgment
  } else if (notification.priority === 'important') {
    // Show persistent banner
    // Highlight in notification list
  } else {
    // Normal notification flow
  }
}
```

#### Read Receipts for Teachers

Track which students have seen announcements:

```sql
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id),
  student_id UUID REFERENCES students(id),
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, student_id)
);

-- RLS: Teachers can see read receipts for their courses
CREATE POLICY "Teachers view read receipts"
ON announcement_reads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = announcement_id
    AND c.teacher_id = auth.uid()
  )
);
```

---

## 4. Database Tables for SSE

### Tables Requiring Realtime

The following tables need Supabase Realtime enabled for the full feature set:

#### 4.1 `student_notifications` (Currently Implemented)

```sql
CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'grade', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_notifications_student_unread
ON student_notifications(student_id, is_read, created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_notifications;
```

**Realtime Events:**
- `INSERT` - New notification received
- `UPDATE` - Read status changed

#### 4.2 `assessments` (For Deadline Changes)

```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'exam', 'assignment', 'project')),
  due_date TIMESTAMPTZ,
  total_points INTEGER NOT NULL DEFAULT 100,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for deadline updates
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;
```

**Realtime Events:**
- `UPDATE` - Deadline extended/changed
- `INSERT` - New assessment published

#### 4.3 `announcements` (New Table for Teacher Broadcasts)

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  author_id UUID NOT NULL REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Either course_id or section_id should be set for targeted announcements
  -- Both NULL means school-wide announcement
  CONSTRAINT valid_target CHECK (
    (course_id IS NULL AND section_id IS NULL) OR  -- School-wide
    (course_id IS NOT NULL AND section_id IS NULL) OR  -- Course-specific
    (course_id IS NULL AND section_id IS NOT NULL)  -- Section-specific
  )
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
```

**Realtime Events:**
- `INSERT` - New announcement broadcast

#### 4.4 `student_progress` (For Live Sync)

```sql
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, course_id, lesson_id)
);

-- Enable Realtime for progress sync
ALTER PUBLICATION supabase_realtime ADD TABLE student_progress;
```

**Realtime Events:**
- `UPDATE` - Progress percentage changed
- `INSERT` - New progress record created

### RLS Policies for Realtime Tables

```sql
-- Notifications: Students see only their own
CREATE POLICY "Students view own notifications"
ON student_notifications FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Announcements: Students see announcements for their courses/sections
CREATE POLICY "Students view relevant announcements"
ON announcements FOR SELECT
TO authenticated
USING (
  course_id IN (
    SELECT e.course_id FROM enrollments e
    JOIN students s ON e.student_id = s.id
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
  OR
  section_id IN (
    SELECT s.section_id FROM students s
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Progress: Students see own, teachers see their course students
CREATE POLICY "Students view own progress"
ON student_progress FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Teachers view course progress"
ON student_progress FOR SELECT
TO authenticated
USING (
  course_id IN (
    SELECT id FROM courses WHERE teacher_id = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);
```

---

## 5. Supabase Realtime Configuration

### Enabling Realtime on Tables

**Via Supabase Dashboard:**
1. Navigate to Database > Replication
2. Find your table in the list
3. Toggle "Realtime" to ON
4. Select which operations to broadcast (INSERT, UPDATE, DELETE)

**Via SQL:**
```sql
-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;

-- Remove table from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE table_name;

-- Check which tables have realtime enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### Row-Level Security Considerations

**Important:** RLS policies apply to realtime subscriptions. This means:

1. **Automatic Filtering**: Students only receive events for rows they can SELECT
2. **No Additional Auth Needed**: If RLS is properly configured, subscriptions are secure
3. **Policy Complexity**: Complex policies may impact realtime performance

**Best Practices:**

```sql
-- GOOD: Simple, indexable condition
CREATE POLICY "Students own notifications"
ON student_notifications FOR SELECT
USING (student_id = current_student_id());  -- Function that returns current student

-- AVOID: Complex joins in RLS
CREATE POLICY "Complex check"
ON some_table FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM a
    JOIN b ON ...
    JOIN c ON ...
    WHERE ...
  )
);  -- May cause performance issues with realtime
```

### Channel Naming Conventions

Consistent channel naming helps with debugging and management:

```typescript
// Student-specific channels
`notifications:${studentId}`      // Notifications for a student
`progress:${studentId}`           // Progress updates for a student

// Course-specific channels
`course:${courseId}:announcements`   // Announcements for a course
`course:${courseId}:assessments`     // Assessment updates for a course
`course:${courseId}:progress`        // All progress in a course (for teachers)

// Assessment-specific channels
`assessment:${assessmentId}`      // Deadline changes for an assessment

// Broadcast channels (not tied to database)
`presence:course:${courseId}`     // Who's online in a course
`typing:lesson:${lessonId}`       // Typing indicators in discussions
```

### Connection Configuration

```typescript
// In lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10  // Rate limit for high-traffic tables
        }
      }
    }
  );
}
```

---

## 6. Architecture Diagrams

### Data Flow: Teacher Action to Student Notification

```
+------------------+       +-------------------+       +------------------+
|  Teacher Portal  |       |     Supabase      |       | Student Browser  |
+------------------+       +-------------------+       +------------------+
         |                          |                          |
         |  1. POST announcement    |                          |
         |------------------------->|                          |
         |                          |                          |
         |  2. INSERT INTO          |                          |
         |     announcements        |                          |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | Database Trigger |                 |
         |                 | Creates student  |                 |
         |                 | notifications    |                 |
         |                 +-----------------+                  |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | PostgreSQL       |                 |
         |                 | NOTIFY event     |                 |
         |                 +-----------------+                  |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | Supabase        |                 |
         |                 | Realtime Server |                 |
         |                 +-----------------+                  |
         |                          |                          |
         |                          |  3. WebSocket push       |
         |                          |  to subscribed channels  |
         |                          |------------------------->|
         |                          |                          |
         |                          |                 +--------v--------+
         |                          |                 | useRealtime     |
         |                          |                 | Hook receives   |
         |                          |                 | notification    |
         |                          |                 +-----------------+
         |                          |                          |
         |                          |                 +--------v--------+
         |                          |                 | UI Updates:     |
         |                          |                 | - Badge count   |
         |                          |                 | - Sound plays   |
         |                          |                 | - Toast shown   |
         |                          |                 +-----------------+
```

### Supabase Realtime Subscription Model

```
+-------------------------------------------------------------------+
|                     Supabase Realtime Server                       |
+-------------------------------------------------------------------+
|                                                                    |
|  +------------------+    +------------------+    +----------------+ |
|  | Channel:         |    | Channel:         |    | Channel:       | |
|  | notifications:   |    | notifications:   |    | course:123:    | |
|  | student-abc      |    | student-xyz      |    | announcements  | |
|  +--------+---------+    +--------+---------+    +-------+--------+ |
|           |                       |                      |         |
+-----------|-------------------+---|----------------------|----------+
            |                   |   |                      |
   +--------v--------+  +-------v---v-----+    +-----------v---------+
   | Student ABC's   |  | Student XYZ's   |    | All students in     |
   | Browser Tab 1   |  | Browser Tab 1   |    | Course 123          |
   | Browser Tab 2   |  +--^--------------+    | (Multiple browsers) |
   +-----------------+     |                   +---------------------+
                           |
                   PostgreSQL Change Event:
                   INSERT INTO student_notifications
                   WHERE student_id = 'xyz'
```

### Component Hierarchy for Realtime Features

```
<App>
  |
  +-- <RootLayout>
       |
       +-- <StudentLayout>
            |
            +-- <RealtimeProvider initialStudentId={...}>
                 |
                 |  [Creates Supabase channel subscription]
                 |  [Manages notification state]
                 |  [Provides context to children]
                 |
                 +-- <AppShell>
                      |
                      +-- <Header>
                      |    |
                      |    +-- <NotificationBell>
                      |         |
                      |         [useRealtime() hook]
                      |         [Shows badge, dropdown]
                      |
                      +-- <Sidebar>
                      |
                      +-- <main>
                           |
                           +-- <NotificationsPage>
                           |    |
                           |    +-- <NotificationsClient>
                           |         |
                           |         [useRealtimeNotifications() hook]
                           |         [Full notification list]
                           |         [Filter and mark as read]
                           |
                           +-- <AssessmentsPage>
                           |    |
                           |    [Future: useAssessmentDeadline()]
                           |
                           +-- <SubjectPage>
                                |
                                [Future: useCourseAnnouncements()]
```

### State Flow in Realtime Hooks

```
+-------------------+     +-----------------------+     +------------------+
| Supabase Channel  |     | useRealtimeNotifs     |     | UI Components    |
+-------------------+     +-----------------------+     +------------------+
         |                          |                          |
         |  postgres_changes        |                          |
         |  event: INSERT           |                          |
         |------------------------->|                          |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | setNotifications|                 |
         |                 | (prev => [...]) |                 |
         |                 +-----------------+                 |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | setUnreadCount  |                 |
         |                 | (prev + 1)      |                 |
         |                 +-----------------+                 |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | playSound()     |                 |
         |                 +-----------------+                 |
         |                          |                          |
         |                 +--------v--------+                 |
         |                 | onNewNotification|                |
         |                 | callback         |                |
         |                 +-----------------+                 |
         |                          |                          |
         |                          |  Context update triggers |
         |                          |  re-render               |
         |                          |------------------------->|
         |                          |                          |
         |                          |                 +--------v--------+
         |                          |                 | NotificationBell|
         |                          |                 | shows new badge |
         |                          |                 +-----------------+
```

---

## 7. Implementation Checklist for Teachers

When adding teacher functionality, use this checklist to ensure proper realtime integration:

### Phase 1: Core Teacher Notifications

- [ ] **Teacher sends notifications to individual students**
  - [ ] Create API endpoint: `POST /api/notifications/send`
  - [ ] Validate teacher owns course/has permission
  - [ ] Insert into `student_notifications` table
  - [ ] Test realtime delivery to student

- [ ] **Teacher sends notifications to entire course**
  - [ ] Create API endpoint: `POST /api/notifications/broadcast`
  - [ ] Batch insert notifications for all enrolled students
  - [ ] Handle large courses efficiently (batch processing)

### Phase 2: Announcements System

- [ ] **Create announcements table**
  - [ ] Write migration: `supabase/migrations/xxx_create_announcements.sql`
  - [ ] Add RLS policies for students and teachers
  - [ ] Enable Supabase Realtime on table

- [ ] **Teacher announcement creation**
  - [ ] Build teacher UI: `/teacher/courses/[id]/announcements/new`
  - [ ] Create API endpoint: `POST /api/announcements`
  - [ ] Add priority levels (normal, important, urgent)

- [ ] **Database trigger for notifications**
  - [ ] Create function `notify_students_on_announcement()`
  - [ ] Test with different announcement types

- [ ] **Student announcement display**
  - [ ] Update notification type icons
  - [ ] Handle urgent announcements differently
  - [ ] Add announcements section to course page

- [ ] **Read receipts (optional)**
  - [ ] Create `announcement_reads` table
  - [ ] Add RLS for teacher visibility
  - [ ] Build teacher dashboard for tracking reads

### Phase 3: Real-time Grade Publishing

- [ ] **Grade entry realtime updates**
  - [ ] Create hook: `useGradeUpdates(studentId)`
  - [ ] Subscribe to `submissions` table changes
  - [ ] Show notification when grade posted

- [ ] **Teacher grading interface**
  - [ ] Build grading UI: `/teacher/assessments/[id]/grade`
  - [ ] Update submission with score/feedback
  - [ ] Trigger notification creation

- [ ] **Student grade view**
  - [ ] Add realtime updates to grades page
  - [ ] Show "New Grade" badge
  - [ ] Navigate to specific assessment on click

### Phase 4: Live Progress Monitoring

- [ ] **Enable realtime on progress table**
  - [ ] Add to Supabase publication
  - [ ] Verify RLS policies work with realtime

- [ ] **Teacher progress dashboard**
  - [ ] Create hook: `useCourseProgress(courseId)`
  - [ ] Build real-time dashboard UI
  - [ ] Show student avatars with live progress

- [ ] **Progress update from student side**
  - [ ] Ensure progress updates trigger realtime events
  - [ ] Handle debouncing for frequent updates

### Phase 5: Assessment Deadline Management

- [ ] **Teacher deadline modification**
  - [ ] Build deadline edit UI
  - [ ] Update assessment `due_date`
  - [ ] Create notification for deadline change

- [ ] **Student deadline subscription**
  - [ ] Create hook: `useAssessmentDeadline(assessmentId)`
  - [ ] Subscribe to assessment updates
  - [ ] Update countdown timer in real-time

- [ ] **Deadline extension notifications**
  - [ ] Create notification type: `deadline_extended`
  - [ ] Show positive messaging ("Good news!")
  - [ ] Update local state optimistically

### Testing Checklist

- [ ] Test with multiple students simultaneously
- [ ] Verify notifications only go to intended recipients
- [ ] Test reconnection after network loss
- [ ] Verify RLS policies in realtime context
- [ ] Load test with 100+ concurrent students
- [ ] Test on mobile devices (battery, data usage)
- [ ] Verify cleanup of channels on component unmount

---

## 8. Performance Considerations

### Connection Limits

**Supabase Free Tier:**
- 200 concurrent realtime connections
- Sufficient for small schools

**Supabase Pro Tier:**
- 500+ concurrent connections
- Can be increased with add-ons

**Optimization Strategies:**

```typescript
// 1. Share connections across tabs using BroadcastChannel
const bc = new BroadcastChannel('supabase-realtime');

// 2. Unsubscribe when component unmounts
useEffect(() => {
  const channel = supabase.channel('...');
  // ...setup...

  return () => {
    supabase.removeChannel(channel);  // Important!
  };
}, []);

// 3. Use presence for counting, not individual subscriptions
// Instead of N channels for N students, use 1 presence channel
```

### Reconnection Strategies

The `useRealtimeNotifications` hook handles reconnection:

```typescript
.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    setIsConnected(true);
    setError(null);
  } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
    setIsConnected(false);
    setError("Connection lost. Attempting to reconnect...");
    // Supabase client automatically attempts reconnection
  }
});
```

**Enhanced Reconnection (Future):**

```typescript
// Exponential backoff for manual reconnection
function useReconnection() {
  const [retryCount, setRetryCount] = useState(0);

  const reconnect = useCallback(async () => {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    await sleep(delay);

    try {
      await channel.subscribe();
      setRetryCount(0);
    } catch (e) {
      setRetryCount(prev => prev + 1);
    }
  }, [retryCount]);
}

// Fetch missed notifications after reconnection
async function syncMissedNotifications(lastReceivedAt: string) {
  const { data } = await supabase
    .from('student_notifications')
    .select('*')
    .gt('created_at', lastReceivedAt)
    .order('created_at', { ascending: true });

  // Merge with local state
}
```

### Battery and Data Considerations for Mobile

**Current Optimizations:**

1. **Single Connection**: Only one WebSocket per app
2. **Minimal Payload**: Supabase sends only changed fields
3. **No Polling**: Zero background HTTP requests

**Future Optimizations:**

```typescript
// 1. Reduce update frequency for non-critical data
.on(
  "postgres_changes",
  { event: "*", schema: "public", table: "student_progress" },
  throttle(handleProgressUpdate, 5000)  // Max once per 5 seconds
)

// 2. Pause subscriptions when app is backgrounded
useEffect(() => {
  const handleVisibility = () => {
    if (document.hidden) {
      channel.unsubscribe();
    } else {
      channel.subscribe();
      syncMissedNotifications();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);

// 3. Use service worker for background notifications
// (Requires PWA setup with push notifications)
```

### Scalability Recommendations

| Students | Recommendation |
|----------|---------------|
| 1-200 | Free tier sufficient, single-channel per student |
| 200-500 | Pro tier, consider channel consolidation |
| 500-2000 | Pro tier with connection add-ons, implement presence |
| 2000+ | Enterprise tier, consider Supabase Edge Functions for fan-out |

**Channel Consolidation Example:**

```typescript
// Instead of individual student channels for course updates:
// BAD: course:123:student:abc, course:123:student:xyz, ...

// Use single course channel with client-side filtering:
// GOOD: course:123 (all students subscribe, filter client-side)

const channel = supabase
  .channel(`course:${courseId}`)
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "announcements" },
    (payload) => {
      // All students receive this, check relevance client-side
      if (isRelevantToStudent(payload.new, studentId)) {
        handleAnnouncement(payload.new);
      }
    }
  )
  .subscribe();
```

---

## Appendix: Quick Reference

### Hook Usage

```typescript
// In any component within RealtimeProvider
import { useRealtime, useNotifications } from "@/components/providers/RealtimeProvider";

function MyComponent() {
  // Full access
  const { studentId, isConnected, notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime();

  // Just notifications
  const { notifications, unreadCount, markAsRead } = useNotifications();
}

// Direct hook usage (for pages that need more control)
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

function NotificationsPage({ studentId }) {
  const { notifications, unreadCount, isConnected, error, markAsRead, markAllAsRead, refresh } = useRealtimeNotifications(studentId, {
    playSound: true,
    onNewNotification: (n) => console.log('New:', n),
    maxNotifications: 100
  });
}
```

### Database Quick Commands

```sql
-- Enable realtime on a table
ALTER PUBLICATION supabase_realtime ADD TABLE your_table;

-- Check realtime tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Create notification for testing
INSERT INTO student_notifications (student_id, type, title, message)
VALUES ('student-uuid', 'info', 'Test Notification', 'This is a test');
```

### Debugging

```typescript
// Enable debug logging
localStorage.setItem('supabase.debug', 'true');

// Check channel status
console.log(channel.state);  // 'SUBSCRIBED', 'CLOSED', etc.

// Monitor all realtime events
supabase.channel('debug')
  .on('system', { event: '*' }, (payload) => {
    console.log('System event:', payload);
  })
  .subscribe();
```

---

*Last Updated: December 2024*
*Version: 1.0.0*
