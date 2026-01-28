# Teacher API Routes Migration Summary

## Migration Completed: January 24, 2026

### Overview
Successfully migrated all teacher API routes from `apps/teacher/app/api/` to `apps/web/app/api/teacher/`.

---

## Migration Statistics

- **Total Routes Migrated**: 69 route files
- **Source**: `apps/teacher/app/api/`
- **Destination**: `apps/web/app/api/teacher/`
- **Import Updates**: No changes needed (already using `@/` alias)

---

## Migrated Route Structure

### Top-Level Routes (6 directories)

#### 1. Announcements (`/api/teacher/announcements/`)
- `route.ts` - List and create teacher announcements
- `stream/route.ts` - SSE endpoint for real-time announcement updates
- `targets/route.ts` - Get targeting options and preview counts
- `[id]/route.ts` - Get, update, delete announcement
- `[id]/publish/route.ts` - Publish announcement

#### 2. Auth (`/api/teacher/auth/`)
- `logout/route.ts` - Teacher logout

#### 3. Content (`/api/teacher/content/`)
- `lessons/route.ts` - Create and list lessons
- `lessons/[id]/route.ts` - Get, update, delete lesson
- `modules/route.ts` - Create and list modules
- `modules/[id]/route.ts` - Get, update, delete module
- `upload/route.ts` - Upload files to Supabase Storage

#### 4. Messages (`/api/teacher/messages/`)
- `route.ts` - List messages
- `stream/route.ts` - SSE endpoint for real-time messaging
- `students/route.ts` - Get student list for messaging
- `[studentProfileId]/route.ts` - Get messages with specific student

#### 5. Schools (`/api/teacher/schools/`)
- `route.ts` - Get schools list

#### 6. Teacher (`/api/teacher/teacher/`)
This is the main teacher-specific API namespace with the following sub-routes:

##### AI Endpoints (`/api/teacher/teacher/ai/`)
- `generate-module/route.ts` - AI module generation
- `generate-progress-report/route.ts` - AI progress reports
- `generate-quiz/route.ts` - AI quiz generation
- `grade-response/route.ts` - AI-assisted grading
- `save-assessment/route.ts` - Save AI-generated assessment
- `save-module/route.ts` - Save AI-generated module
- `student-alerts/route.ts` - AI student alerts

##### Announcements (`/api/teacher/teacher/announcements/`)
- `route.ts` - Teacher announcements (alternative endpoint)

##### Assessments (`/api/teacher/teacher/assessments/`)
- `route.ts` - List and create assessments
- `[id]/route.ts` - Get, update, delete assessment

##### Attendance (`/api/teacher/teacher/attendance/`)
- `daily/route.ts` - Daily attendance tracking
- `session/[id]/route.ts` - Session-specific attendance

##### Feedback Templates (`/api/teacher/teacher/feedback-templates/`)
- `route.ts` - List and create feedback templates
- `[id]/route.ts` - Get, update, delete template
- `[id]/apply/route.ts` - Apply template to submission

##### Gradebook (`/api/teacher/teacher/gradebook/`)
- `bulk-entry/route.ts` - Bulk grade entry
- `release/route.ts` - Release grades to students
- `save-score/route.ts` - Save individual score
- `weights/route.ts` - Manage grade weights

##### Grading (`/api/teacher/teacher/grading/`)
- `auto-grade/route.ts` - Auto-grade submissions
- `queue/route.ts` - Grading queue
- `queue/assessments/route.ts` - Assessment grading queue
- `queue/stats/route.ts` - Queue statistics
- `queue/[itemId]/route.ts` - Get, update queue item
- `queue/[itemId]/flag/route.ts` - Flag queue item

##### Lessons (`/api/teacher/teacher/lessons/`)
- `route.ts` - Teacher lessons endpoint
- `[id]/route.ts` - Specific lesson operations

##### Live Sessions (`/api/teacher/teacher/live-sessions/`)
- `route.ts` - List and create live sessions
- `recordings-status/route.ts` - Check recording status
- `[id]/route.ts` - Get, update, delete session
- `[id]/end/route.ts` - End live session
- `[id]/recording/route.ts` - Get session recording
- `[id]/start/route.ts` - Start live session
- `[id]/transcribe/route.ts` - Transcribe session

##### Messages (`/api/teacher/teacher/messages/`)
- `route.ts` - Teacher messaging
- `send/route.ts` - Send message

##### Modules (`/api/teacher/teacher/modules/`)
- `route.ts` - List and create modules
- `[id]/route.ts` - Get, update, delete module
- `[id]/publish/route.ts` - Publish module

##### Profile (`/api/teacher/teacher/profile/`)
- `route.ts` - Get and update teacher profile

##### Question Banks (`/api/teacher/teacher/question-banks/`)
- `route.ts` - List and create question banks
- `import/route.ts` - Import questions
- `[id]/questions/route.ts` - Manage questions in bank

##### Report Cards (`/api/teacher/teacher/report-cards/`)
- `route.ts` - List and create report cards
- `[id]/route.ts` - Get, update, delete report card
- `[id]/pdf/route.ts` - Generate PDF report card
- `[id]/remarks/route.ts` - Update report card remarks

##### Sessions (`/api/teacher/teacher/sessions/`)
- `route.ts` - List and create sessions
- `[id]/route.ts` - Get, update, delete session

##### Subjects (`/api/teacher/teacher/subjects/`)
- `route.ts` - Get teacher subjects

##### Submissions (`/api/teacher/teacher/submissions/`)
- `route.ts` - List submissions
- `[id]/route.ts` - Get submission details
- `[id]/grade/route.ts` - Grade submission

---

## Supporting Libraries Migrated

### DAL (Data Access Layer)
Copied from `apps/teacher/lib/dal/` to `apps/web/lib/dal/`:
- `announcements.ts` - Announcement operations
- `assessment-builder.ts` - Assessment building
- `assessments.ts` - Assessment management
- `content.ts` - Content management
- `dashboard.ts` - Dashboard data
- `grading-queue.ts` - Grading queue operations
- `messages.ts` - Messaging operations
- `report-cards.ts` - Report card operations
- `teacher.ts` - Teacher profile operations
- `gradebook.ts` - Gradebook operations
- `index.ts` - DAL exports
- `teacher/` - Teacher-specific DAL subdirectory

### Grading
Copied from `apps/teacher/lib/grading/` to `apps/web/lib/grading/`:
- `auto-grader.ts` - Automatic grading logic

### Services
Copied from `apps/teacher/lib/services/` to `apps/web/lib/services/`:
- `client.ts` - Service client
- `recordings.ts` - Recording services

### Supabase
Added to `apps/web/lib/supabase/`:
- `service.ts` - Service role client for privileged operations and realtime subscriptions

---

## Import Compatibility

### Status: ✅ Fully Compatible

All routes already use the `@/` path alias, which maps to the app root in both teacher and web apps:
- `@/lib/dal/teacher` → `apps/web/lib/dal/teacher`
- `@/lib/supabase/server` → `apps/web/lib/supabase/server`
- `@/lib/supabase/service` → `apps/web/lib/supabase/service`
- `@/lib/ai/openai` → `apps/web/lib/ai/openai`
- `@/lib/grading/auto-grader` → `apps/web/lib/grading/auto-grader`

No import path updates were needed.

---

## Key Features

### Real-time Endpoints (SSE)
- `/api/teacher/announcements/stream` - Real-time announcement updates
- `/api/teacher/messages/stream` - Real-time messaging

### File Uploads
- `/api/teacher/content/upload` - Upload to Supabase Storage buckets

### AI Integration
All AI endpoints use OpenAI for:
- Module generation
- Quiz generation
- Progress reports
- Auto-grading assistance
- Student alerts

### Authentication
All routes use:
- `getTeacherProfile()` from `@/lib/dal/teacher` for authentication
- `requireTeacherAPI()` from `@/lib/auth/requireTeacherAPI` for some routes
- Cookie-based Supabase authentication

---

## Next Steps

### Required Actions

1. **Update Frontend References**
   - Update all teacher app frontend code to point to `/api/teacher/*` instead of `/api/*`
   - Example: `/api/announcements` → `/api/teacher/announcements`

2. **Environment Variables**
   - Ensure `apps/web/.env.local` has all required variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (for SSE endpoints)
     - `OPENAI_API_KEY` (for AI endpoints)

3. **Test Routes**
   - Test all 69 migrated routes
   - Verify authentication works correctly
   - Test file uploads
   - Test real-time SSE endpoints
   - Test AI generation endpoints

4. **Database Schema**
   - Ensure all DAL functions point to correct schema
   - Teacher app uses `public` schema (as per CLAUDE.md)
   - Verify RLS policies allow teacher access

5. **TypeScript Types**
   - Regenerate Supabase types if needed:
     ```bash
     cd apps/web
     npx supabase gen types typescript --project-id <id> > types/supabase.ts
     ```

---

## Route Path Changes

All routes now have the `/api/teacher/` prefix in the web app:

| Old Path (Teacher App) | New Path (Web App) |
|---|---|
| `/api/announcements` | `/api/teacher/announcements` |
| `/api/content/modules` | `/api/teacher/content/modules` |
| `/api/teacher/ai/generate-module` | `/api/teacher/teacher/ai/generate-module` |
| `/api/teacher/assessments` | `/api/teacher/teacher/assessments` |
| ... | ... |

---

## Files Structure

```
apps/web/
├── app/
│   └── api/
│       └── teacher/               ← New teacher API namespace
│           ├── announcements/
│           ├── auth/
│           ├── content/
│           ├── messages/
│           ├── schools/
│           └── teacher/           ← Main teacher endpoints
│               ├── ai/
│               ├── announcements/
│               ├── assessments/
│               ├── attendance/
│               ├── feedback-templates/
│               ├── gradebook/
│               ├── grading/
│               ├── lessons/
│               ├── live-sessions/
│               ├── messages/
│               ├── modules/
│               ├── profile/
│               ├── question-banks/
│               ├── report-cards/
│               ├── sessions/
│               ├── subjects/
│               └── submissions/
└── lib/
    ├── ai/                        ← AI utilities (already exists)
    ├── dal/                       ← Data Access Layer (migrated)
    ├── grading/                   ← Grading utilities (migrated)
    ├── services/                  ← Services (migrated)
    └── supabase/
        └── service.ts             ← Service client (added)
```

---

## Migration Validation

### Checklist
- [x] All 69 route files copied
- [x] DAL libraries copied
- [x] Grading utilities copied
- [x] Services copied
- [x] Supabase service client added
- [x] Import paths verified
- [ ] Frontend code updated to use new paths
- [ ] Environment variables configured
- [ ] Routes tested
- [ ] Authentication verified
- [ ] Real-time features tested

---

## Notes

1. **Route Duplication**: Some routes exist in both namespaces (e.g., `/announcements` and `/teacher/announcements`). Review and consolidate if needed.

2. **Schema Configuration**: The teacher Supabase server client defaults to `public` schema. Ensure this matches your database setup.

3. **Service Role Key**: SSE endpoints require the service role key for long-lived realtime connections. Ensure this is set in environment variables.

4. **File Storage**: Upload routes use Supabase Storage buckets `course-content` and `lesson-attachments`. Ensure these buckets exist with proper RLS policies.

5. **AI Features**: All AI endpoints require `OPENAI_API_KEY` environment variable.

---

## Support

For questions or issues, refer to:
- `apps/teacher/CLAUDE.md` - Teacher app specification
- Supabase documentation for RLS policies
- Next.js App Router documentation for route handlers
