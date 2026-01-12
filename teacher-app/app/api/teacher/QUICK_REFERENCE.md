# Teacher API Quick Reference

## Authentication
All routes use `requireTeacher()` helper from `/lib/auth/requireTeacher.ts`

## Endpoints Summary

### Profile
- `GET /api/teacher/profile` - Get profile
- `PATCH /api/teacher/profile` - Update profile

### Modules
- `GET /api/teacher/modules` - List modules
- `POST /api/teacher/modules` - Create module
- `GET /api/teacher/modules/[id]` - Get module
- `PATCH /api/teacher/modules/[id]` - Update module
- `DELETE /api/teacher/modules/[id]` - Delete module
- `POST /api/teacher/modules/[id]/publish` - Publish module

### Lessons
- `POST /api/teacher/lessons` - Create lesson
- `PATCH /api/teacher/lessons/[id]` - Update lesson
- `DELETE /api/teacher/lessons/[id]` - Delete lesson

### Assessments
- `GET /api/teacher/assessments` - List assessments
- `POST /api/teacher/assessments` - Create assessment template
- `GET /api/teacher/assessments/[id]` - Get assessment
- `PATCH /api/teacher/assessments/[id]` - Update assessment
- `DELETE /api/teacher/assessments/[id]` - Delete assessment
- `POST /api/teacher/assessments/[id]/publish` - Publish assessment
- `POST /api/teacher/assessments/[id]/release` - Release grades

### Question Banks
- `GET /api/teacher/question-banks` - List banks
- `POST /api/teacher/question-banks` - Create bank
- `GET /api/teacher/question-banks/[id]/questions` - List questions
- `POST /api/teacher/question-banks/[id]/questions` - Add question

### Grading
- `GET /api/teacher/submissions` - Grading inbox
- `GET /api/teacher/submissions/[id]` - Submission detail
- `POST /api/teacher/submissions/[id]/grade` - Grade submission

### Attendance
- `GET /api/teacher/attendance/daily` - Daily attendance
- `POST /api/teacher/attendance/daily` - Mark daily attendance
- `GET /api/teacher/attendance/session/[id]` - Session attendance
- `PATCH /api/teacher/attendance/session/[id]` - Update session attendance

### Live Sessions
- `GET /api/teacher/live-sessions` - List sessions
- `POST /api/teacher/live-sessions` - Create session
- `PATCH /api/teacher/live-sessions/[id]` - Update session
- `DELETE /api/teacher/live-sessions/[id]` - Delete session

### Communication
- `GET /api/teacher/announcements` - List announcements
- `POST /api/teacher/announcements` - Create announcement
- `GET /api/teacher/messages` - List conversations
- `POST /api/teacher/messages/send` - Send message

### AI Features
- `POST /api/teacher/ai/generate-module` - Generate module
- `POST /api/teacher/ai/generate-quiz` - Generate quiz questions
- `POST /api/teacher/ai/generate-feedback` - Generate feedback
- `POST /api/teacher/ai/cleanup-transcript` - Clean transcript

## Common Query Parameters

### Filtering
- `subjectId` - Filter by subject
- `sectionId` - Filter by section
- `status` - Filter by status
- `type` - Filter by type

### Pagination
- `limit` - Max results
- `offset` - Skip results

### Views
- `pending=true` - Only pending items
- `upcoming=true` - Only upcoming items
- `template=true` - Template vs instance

## Response Codes
- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `500` Internal Server Error

## File Structure
```
app/api/teacher/
├── profile/route.ts
├── modules/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── publish/route.ts
├── lessons/
│   ├── route.ts
│   └── [id]/route.ts
├── assessments/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── publish/route.ts
│       └── release/route.ts
├── question-banks/
│   ├── route.ts
│   └── [id]/questions/route.ts
├── submissions/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── grade/route.ts
├── attendance/
│   ├── daily/route.ts
│   └── session/[id]/route.ts
├── live-sessions/
│   ├── route.ts
│   └── [id]/route.ts
├── announcements/route.ts
├── messages/
│   ├── route.ts
│   └── send/route.ts
└── ai/
    ├── generate-module/route.ts
    ├── generate-quiz/route.ts
    ├── generate-feedback/route.ts
    └── cleanup-transcript/route.ts
```

## Total Routes: 26 API endpoints

**See API_DOCUMENTATION.md for detailed request/response examples.**
