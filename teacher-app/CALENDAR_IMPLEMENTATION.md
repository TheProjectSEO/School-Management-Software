# Calendar & Scheduling Implementation

## Overview

A production-ready Calendar & Scheduling system for the MSU Teacher Portal with full live session management capabilities.

## Features Implemented

### 1. Calendar Views
- **Month View**: 7x5 grid with dates, showing all sessions and assessments
- **Week View**: Hourly schedule across 7 days with visual event cards
- **Day View**: Detailed hourly breakdown for a single day with full session details

### 2. Live Session Management
- Create new live sessions with comprehensive details
- Schedule sessions for specific courses, sections, and modules
- Multiple video platform support (Zoom, Google Meet, Teams, LiveKit, Daily, Internal)
- Session status tracking (scheduled, live, ended, cancelled)
- Edit and delete scheduled sessions
- Color-coded status indicators

### 3. Assessment Due Dates
- Display assessment due dates on calendar
- Separate visual treatment (yellow/orange) from sessions
- Quick access to assessment details
- Support for all assessment types (quiz, exam, assignment, project)

### 4. User Interface
- Responsive design (mobile-first approach)
- Today indicator with highlight
- Navigation controls (Previous/Next/Today)
- Session detail panels with slide-in animation
- Modal dialogs for creating sessions
- Real-time status badges
- MSU brand color integration

## File Structure

```
teacher-app/
├── app/
│   ├── teacher/
│   │   └── calendar/
│   │       ├── page.tsx                 # Server component (data fetching)
│   │       └── CalendarClient.tsx       # Client component (interactions)
│   └── api/
│       └── teacher/
│           └── sessions/
│               ├── route.ts             # POST /api/teacher/sessions
│               └── [id]/
│                   └── route.ts         # PATCH, DELETE /api/teacher/sessions/[id]
├── components/
│   └── calendar/
│       ├── CalendarView.tsx             # Main calendar with 3 view modes
│       ├── CreateSessionModal.tsx       # Session creation form
│       └── SessionDetailsPanel.tsx      # Slide-in details panel
└── lib/
    └── dal/
        └── teacher.ts                   # Extended with session DAL functions
```

## Architecture

### Server Components
- **page.tsx**: Fetches initial data server-side
  - Teacher profile
  - Live sessions (3-month range)
  - Assessment due dates
  - Teacher's subjects

### Client Components
- **CalendarClient.tsx**: Manages client-side state and API calls
- **CalendarView.tsx**: Renders calendar grids with event handling
- **CreateSessionModal.tsx**: Form for creating new sessions
- **SessionDetailsPanel.tsx**: Displays detailed session/assessment info

### Data Access Layer (DAL)

Added to `/lib/dal/teacher.ts`:

```typescript
// Types
export type LiveSession = { ... }
export type AssessmentDueDate = { ... }

// Functions
getTeacherLiveSessions(teacherId, startDate, endDate)
getUpcomingAssessmentDueDates(teacherId, startDate, endDate)
createLiveSession(teacherId, sessionData)
updateLiveSession(sessionId, teacherId, updates)
deleteLiveSession(sessionId, teacherId)
```

### API Routes

**POST /api/teacher/sessions**
- Creates a new live session
- Validates required fields
- Returns created session with all details

**PATCH /api/teacher/sessions/[id]**
- Updates an existing session
- Verifies teacher access
- Returns updated session

**DELETE /api/teacher/sessions/[id]**
- Deletes a session
- Verifies teacher access
- Returns success confirmation

## Database Integration

Uses existing schema from `003_teacher_live_sessions.sql`:

### Tables Used
- `teacher_live_sessions`: Main sessions table
- `courses`: Course information
- `sections`: Section details
- `modules`: Optional module linking
- `assessments`: Assessment due dates
- `teacher_assignments`: Access control

### Key Fields
- `scheduled_start`, `scheduled_end`: Session timing
- `provider`: Video platform (zoom, meet, teams, etc.)
- `join_url`: Meeting link for students
- `status`: Session state (scheduled, live, ended, cancelled)
- `recording_url`: Post-session recording link

## Usage

### Creating a Session

1. Click "Create Session" button
2. Select subject/course from dropdown
3. Optionally select a module
4. Enter session title and description
5. Set start and end date/time
6. Choose video platform
7. Add meeting join URL
8. Click "Create Session"

### Viewing Session Details

1. Click any session event on calendar
2. Details panel slides in from right
3. View all session information
4. Access join URL or recording
5. Edit or delete scheduled sessions

### Navigation

- **Previous/Next Buttons**: Navigate between time periods
- **Today Button**: Jump to current date
- **View Tabs**: Switch between Month/Week/Day views
- **Close Panel**: Click X or outside to dismiss details

## Color Coding

### Session Status
- **Scheduled**: Blue (#3b82f6)
- **Live**: Green (#10b981)
- **Ended**: Gray (#6b7280)
- **Cancelled**: Red (#ef4444)

### Assessment Due Dates
- **All Types**: Yellow/Orange (#f59e0b)

## Responsive Breakpoints

- **Mobile**: Single column, stacked layout
- **Tablet (md)**: 2-column grids, side panels
- **Desktop (lg)**: Full calendar grids, optimal spacing

## Performance Optimizations

1. **Server-Side Data Fetching**: Initial data loaded on server
2. **Parallel Queries**: Sessions, assessments, and subjects fetched simultaneously
3. **Optimistic UI Updates**: Immediate feedback on create/delete
4. **Client-Side Caching**: React state maintains calendar data
5. **Efficient Rendering**: Only visible dates rendered in month view

## Security

1. **RLS Policies**: Database-level access control
2. **Teacher Verification**: All DAL functions verify teacher access
3. **API Route Protection**: Checks authentication before mutations
4. **Input Validation**: Required fields enforced client and server-side

## Future Enhancements

### Potential Features
1. **Recurring Sessions**: Weekly/daily repeating schedules
2. **Session Templates**: Save common session configurations
3. **Attendance Integration**: Direct link to attendance tracking
4. **Calendar Export**: iCal/Google Calendar sync
5. **Notifications**: Reminders before sessions start
6. **Zoom Integration**: Auto-create Zoom meetings
7. **Session Notes**: Teacher prep notes per session
8. **Student View**: What students see on their calendar

### Technical Improvements
1. **Drag-and-Drop**: Move sessions between dates
2. **Bulk Operations**: Create multiple sessions at once
3. **Calendar Filters**: Show/hide by subject, section, status
4. **Print View**: Printable calendar layouts
5. **Time Zone Support**: Handle multiple time zones
6. **Offline Support**: PWA with offline calendar access

## Testing Checklist

### Functionality
- [ ] Create session with all fields
- [ ] Create session with minimal fields
- [ ] Edit scheduled session
- [ ] Delete session with confirmation
- [ ] View session details
- [ ] View assessment details
- [ ] Navigate between months/weeks/days
- [ ] Switch view modes
- [ ] Jump to today
- [ ] Click events in all views

### Edge Cases
- [ ] No sessions scheduled
- [ ] Sessions outside visible range
- [ ] Multiple sessions at same time
- [ ] Assessment due at midnight
- [ ] Session spanning multiple days
- [ ] Cancelled vs ended sessions
- [ ] Sessions without join URLs

### Responsive Design
- [ ] Mobile portrait (< 640px)
- [ ] Mobile landscape (640-768px)
- [ ] Tablet (768-1024px)
- [ ] Desktop (> 1024px)
- [ ] Modal on small screens
- [ ] Detail panel on small screens

### Performance
- [ ] Large number of sessions (50+)
- [ ] Fast view switching
- [ ] Smooth modal animations
- [ ] No layout shifts
- [ ] Quick data refresh

## Troubleshooting

### Sessions Not Appearing
1. Check teacher_assignments table for course access
2. Verify date range includes session dates
3. Check session status (might be filtered)
4. Ensure RLS policies are correct

### Cannot Create Session
1. Verify teacher profile exists
2. Check course access in teacher_assignments
3. Validate all required fields
4. Check API route errors in console
5. Verify Supabase connection

### Details Panel Not Opening
1. Check session data structure
2. Verify onClick handlers
3. Check z-index conflicts
4. Review console for errors

## Support

For issues or questions:
1. Check migration files in `/supabase/migrations/`
2. Review DAL functions in `/lib/dal/teacher.ts`
3. Inspect browser console for errors
4. Verify database schema matches code

## Credits

Built using:
- Next.js 14 (App Router)
- React Server Components
- Tailwind CSS
- Supabase (PostgreSQL + RLS)
- Material Symbols Icons
- TypeScript

---

**Status**: Production Ready ✅
**Last Updated**: 2025-12-28
**Version**: 1.0.0
