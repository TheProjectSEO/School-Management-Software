# Student API Routes Migration

## Summary

Successfully migrated all 41 student API routes from `apps/student/app/api/` to `apps/web/app/api/student/`.

## Migration Date
2026-01-24

## Files Migrated

### Authentication & Profile (4 routes)
- `auth/logout/route.ts` - Logout endpoint with cookie cleanup
- `profile/avatar/route.ts` - Avatar upload/delete
- `profile/update/route.ts` - Profile update with validation

### Announcements (4 routes)
- `announcements/route.ts` - Get student announcements
- `announcements/stream/route.ts` - SSE real-time announcements
- `announcements/urgent/route.ts` - Get urgent announcements
- `announcements/[id]/route.ts` - Get/mark single announcement

### Assessments (4 routes)
- `assessments/[id]/questions/route.ts` - Get quiz questions
- `assessments/[id]/save-answer/route.ts` - Save quiz answer
- `assessments/[id]/start/route.ts` - Start quiz attempt
- `assessments/[id]/submit/route.ts` - Submit quiz

### Grades & Progress (5 routes)
- `grades/route.ts` - Get course grades
- `grades/gpa/route.ts` - Get GPA data
- `progress/complete/route.ts` - Mark lesson complete
- `progress/update/route.ts` - Update lesson progress

### Report Cards (3 routes)
- `report-cards/route.ts` - Get all report cards
- `report-cards/[id]/route.ts` - Get single report card
- `report-cards/[id]/pdf/route.ts` - Generate PDF report card

### Live Sessions (7 routes)
- `live-sessions/[id]/join/route.ts` - Join session as student
- `live-sessions/[id]/questions/route.ts` - Q&A in session
- `live-sessions/[id]/react/route.ts` - Send reactions
- `live-sessions/[id]/ask/route.ts` - Ask AI during session
- `teacher/live-sessions/route.ts` - Create/list sessions (teacher)
- `teacher/live-sessions/[id]/start/route.ts` - Start session (teacher)
- `teacher/live-sessions/[id]/end/route.ts` - End session (teacher)

### Messaging (5 routes)
- `messages/route.ts` - Get all conversations
- `messages/quota/route.ts` - Check message quota
- `messages/teachers/route.ts` - Get available teachers
- `messages/stream/route.ts` - SSE real-time messages
- `messages/[teacherProfileId]/route.ts` - Get/send messages with teacher

### Notes (2 routes)
- `notes/route.ts` - List/create notes
- `notes/[id]/route.ts` - Get/update/delete note

### Notifications (2 routes)
- `notifications/mark-read/route.ts` - Mark single notification read
- `notifications/mark-all-read/route.ts` - Mark all notifications read

### Downloads (2 routes)
- `downloads/[id]/route.ts` - Get/delete single download
- `downloads/batch/route.ts` - Batch download multiple files

### Applications (2 routes)
- `applications/route.ts` - Submit/check application status
- `applications/documents/create-upload-url/route.ts` - Create signed upload URL

### AI Features (1 route)
- `ai/ask/route.ts` - AI tutoring chatbot with context

### Admin Utilities (1 route)
- `admin/seed-downloads/route.ts` - Seed sample downloads for testing

### Attendance (1 route)
- `attendance/calendar/route.ts` - Get attendance calendar

## Route Structure Preserved

The migration maintains the exact same route structure:
- Source: `apps/student/app/api/**/*.ts`
- Destination: `apps/web/app/api/student/**/*.ts`

## Imports Status

✅ All imports already use `@/` alias
✅ All Supabase imports use `@/lib/supabase/server` or `@/lib/supabase/service`
✅ All DAL imports use `@/lib/dal/*`
✅ All utility imports use `@/lib/*`

## No Changes Required

The files were copied as-is because:
1. Source files already used `@/` alias (not relative imports)
2. The apps/student and apps/web share the same workspace configuration
3. Both apps have access to the same `@/` alias mappings in tsconfig.json

## API Endpoints

All routes are now accessible at:
- **Base URL**: `https://student.klase.ph/api/student/*` (production)
- **Base URL**: `http://localhost:3000/api/student/*` (development)

Examples:
- `GET /api/student/announcements` - Get announcements
- `POST /api/student/messages/[teacherId]` - Send message to teacher
- `GET /api/student/grades` - Get course grades
- `POST /api/student/live-sessions/[id]/join` - Join live session
- `POST /api/student/assessments/[id]/submit` - Submit quiz

## Integration Points

### Supabase
- Uses `@/lib/supabase/server` for authenticated requests
- Uses `@/lib/supabase/service` for service role operations

### Daily.co (Video)
- `@/lib/services/daily/client` - Create rooms, generate tokens
- `@/lib/services/daily/recordings` - Download recordings

### OpenAI (AI Features)
- `@/lib/ai/openai` - Chat completions, embeddings
- `@/lib/ai/studentContext` - Build personalized context
- `@/lib/ai/intentClassifier` - Classify user intent

### Resend (Email)
- Used in applications for status updates

## Testing Checklist

After migration, test these critical flows:

- [ ] Student can log in and out
- [ ] Student can view announcements (including SSE real-time)
- [ ] Student can take and submit quizzes
- [ ] Student can view grades and GPA
- [ ] Student can join live sessions
- [ ] Student can send messages to teachers
- [ ] Student can create and manage notes
- [ ] Student can upload/update profile avatar
- [ ] Student can view and download report cards
- [ ] AI tutoring chatbot works
- [ ] Applications can be submitted

## Next Steps

1. Update any frontend code that references the old API routes
2. Test all endpoints in development
3. Update API documentation if it exists
4. Deploy to production

## Rollback Plan

If issues arise, the original files remain in:
`apps/student/app/api/**/*.ts`

Simply revert any frontend changes that point to the new routes.
