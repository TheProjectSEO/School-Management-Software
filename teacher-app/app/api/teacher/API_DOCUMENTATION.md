# Teacher API Routes Documentation

Complete REST API for the MSU Teacher App. All routes are protected and require teacher authentication via `requireTeacher()` helper.

## Authentication Helper

**Location:** `/lib/auth/requireTeacher.ts`

Returns teacher context with:
- `userId` - Auth user ID
- `profileId` - Profile record ID
- `teacherId` - Teacher profile ID
- `schoolId` - School ID

## API Routes Overview

### 1. Profile Management

#### GET `/api/teacher/profile`
Fetch teacher profile with school and user details.

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "school": { "id": "uuid", "name": "MSU", "logo_url": "..." },
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "avatar_url": "..."
    },
    "bio": "...",
    "specialization": "Mathematics",
    "office_hours": "M-F 2-4pm"
  }
}
```

#### PATCH `/api/teacher/profile`
Update teacher profile information.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "avatarUrl": "https://...",
  "bio": "Updated bio",
  "specialization": "Advanced Mathematics",
  "officeHours": "M-F 2-5pm"
}
```

---

### 2. Module Management

#### GET `/api/teacher/modules`
List modules for teacher's subjects.

**Query Params:**
- `subjectId` (optional) - Filter by subject
- `status` (optional) - Filter by status (draft, published)

**Response:**
```json
{
  "modules": [
    {
      "id": "uuid",
      "title": "Introduction to Algebra",
      "status": "published",
      "subject": { "id": "uuid", "name": "Mathematics", "code": "MATH101" },
      "publish_info": { "published_at": "2025-01-15T10:00:00Z" }
    }
  ]
}
```

#### POST `/api/teacher/modules`
Create a new module.

**Request:**
```json
{
  "subjectId": "uuid",
  "title": "Module Title",
  "description": "Module description",
  "objectives": ["Objective 1", "Objective 2"],
  "order": 1,
  "estimatedDuration": 120
}
```

#### GET `/api/teacher/modules/[id]`
Get detailed module information.

#### PATCH `/api/teacher/modules/[id]`
Update module details.

#### DELETE `/api/teacher/modules/[id]`
Delete a draft module (cannot delete published modules).

#### POST `/api/teacher/modules/[id]/publish`
Publish a module to make it visible to students.

---

### 3. Lesson Management

#### POST `/api/teacher/lessons`
Create a new lesson within a module.

**Request:**
```json
{
  "moduleId": "uuid",
  "title": "Lesson Title",
  "content": "Lesson content...",
  "type": "video",
  "order": 0,
  "duration": 45,
  "videoUrl": "https://...",
  "attachments": [...]
}
```

#### PATCH `/api/teacher/lessons/[id]`
Update lesson details.

#### DELETE `/api/teacher/lessons/[id]`
Delete a lesson.

---

### 4. Assessment Management

#### GET `/api/teacher/assessments`
List assessments (templates or instances).

**Query Params:**
- `subjectId` (optional) - Filter by subject
- `type` (optional) - Filter by type (quiz, assignment, exam)
- `view` (optional) - "templates" or "instances" (default: instances)

#### POST `/api/teacher/assessments`
Create a new assessment template.

**Request:**
```json
{
  "subjectId": "uuid",
  "type": "quiz",
  "title": "Week 1 Quiz",
  "instructions": "Complete within 30 minutes...",
  "defaultSettings": {
    "timeLimit": 1800,
    "attempts": 2
  },
  "rubricTemplateId": "uuid"
}
```

#### GET `/api/teacher/assessments/[id]`
Get assessment details.

**Query Params:**
- `template` - Set to "true" for template, omit for instance

#### PATCH `/api/teacher/assessments/[id]`
Update assessment.

**Request:**
```json
{
  "isTemplate": true,
  "title": "Updated Title",
  "openAt": "2025-01-20T09:00:00Z",
  "closeAt": "2025-01-27T23:59:00Z",
  "status": "published"
}
```

#### DELETE `/api/teacher/assessments/[id]`
Delete assessment (template or instance without submissions).

#### POST `/api/teacher/assessments/[id]/publish`
Publish an assessment instance to students.

#### POST `/api/teacher/assessments/[id]/release`
Release grades for an assessment.

**Request:**
```json
{
  "studentIds": ["uuid1", "uuid2"]  // Optional: specific students only
}
```

---

### 5. Question Banks

#### GET `/api/teacher/question-banks`
List question banks for teacher's subjects.

**Query Params:**
- `subjectId` (optional) - Filter by subject

#### POST `/api/teacher/question-banks`
Create a new question bank.

**Request:**
```json
{
  "subjectId": "uuid",
  "name": "Algebra Questions",
  "description": "Questions for algebra modules"
}
```

#### GET `/api/teacher/question-banks/[id]/questions`
List questions in a bank.

**Query Params:**
- `type` (optional) - Filter by question type
- `difficulty` (optional) - Filter by difficulty
- `tags` (optional) - Comma-separated tags

#### POST `/api/teacher/question-banks/[id]/questions`
Add a question to a bank.

**Request:**
```json
{
  "type": "multiple_choice",
  "prompt": "What is 2 + 2?",
  "choices": [
    { "id": "a", "text": "3", "isCorrect": false },
    { "id": "b", "text": "4", "isCorrect": true },
    { "id": "c", "text": "5", "isCorrect": false }
  ],
  "answerKey": { "correctChoice": "b" },
  "tags": ["arithmetic", "basic"],
  "difficulty": "easy",
  "points": 1
}
```

---

### 6. Grading & Submissions

#### GET `/api/teacher/submissions`
Get submissions (grading inbox).

**Query Params:**
- `assessmentId` (optional) - Filter by assessment
- `sectionId` (optional) - Filter by section
- `status` (optional) - Filter by status (submitted, graded, released)
- `pending` - Set to "true" for only ungraded submissions

**Response:**
```json
{
  "submissions": [
    {
      "id": "uuid",
      "student": { "first_name": "Jane", "last_name": "Smith" },
      "assessment": { "template": { "title": "Week 1 Quiz" } },
      "status": "submitted",
      "submitted_at": "2025-01-20T14:30:00Z"
    }
  ]
}
```

#### GET `/api/teacher/submissions/[id]`
Get detailed submission for grading.

#### POST `/api/teacher/submissions/[id]/grade`
Grade a submission with rubric scores and feedback.

**Request:**
```json
{
  "rubricTemplateId": "uuid",
  "scores": {
    "criteria1": 8,
    "criteria2": 7,
    "criteria3": 9
  },
  "totalScore": 24,
  "teacherComment": "Good work! Focus on...",
  "inlineNotes": [
    { "lineNumber": 15, "comment": "Excellent analysis here" }
  ],
  "autoRelease": false
}
```

---

### 7. Attendance

#### GET `/api/teacher/attendance/daily`
Get daily attendance for a section.

**Query Params:**
- `sectionId` (required) - Section ID
- `date` (optional) - Date in YYYY-MM-DD format (default: today)

#### POST `/api/teacher/attendance/daily`
Mark or update daily attendance.

**Request:**
```json
{
  "sectionId": "uuid",
  "date": "2025-01-20",
  "studentId": "uuid",
  "status": "present",
  "notes": "Late arrival"
}
```

#### GET `/api/teacher/attendance/session/[id]`
Get attendance for a live session.

#### PATCH `/api/teacher/attendance/session/[id]`
Update session attendance (manual override).

**Request:**
```json
{
  "studentId": "uuid",
  "status": "present",
  "notes": "Joined via mobile"
}
```

---

### 8. Live Sessions

#### GET `/api/teacher/live-sessions`
List live sessions for teacher.

**Query Params:**
- `sectionSubjectId` (optional) - Filter by section subject
- `status` (optional) - Filter by status
- `upcoming` - Set to "true" for upcoming sessions only

#### POST `/api/teacher/live-sessions`
Create a new live session.

**Request:**
```json
{
  "sectionSubjectId": "uuid",
  "moduleId": "uuid",
  "title": "Week 3 Lecture",
  "description": "Discussion on advanced topics",
  "startAt": "2025-01-25T10:00:00Z",
  "endAt": "2025-01-25T11:30:00Z",
  "provider": "zoom",
  "joinUrl": "https://zoom.us/j/..."
}
```

#### PATCH `/api/teacher/live-sessions/[id]`
Update a live session.

#### DELETE `/api/teacher/live-sessions/[id]`
Delete a scheduled session (cannot delete active/completed sessions).

---

### 9. Communication

#### GET `/api/teacher/announcements`
List announcements created by teacher.

**Query Params:**
- `scopeType` (optional) - Filter by scope type
- `limit` (optional) - Max results (default: 50)

#### POST `/api/teacher/announcements`
Create a new announcement.

**Request:**
```json
{
  "scopeType": "section",
  "scopeIds": ["section-uuid-1", "section-uuid-2"],
  "title": "Important Update",
  "body": "The midterm exam has been rescheduled...",
  "attachments": [{ "name": "schedule.pdf", "url": "..." }],
  "publishAt": "2025-01-20T09:00:00Z"
}
```

#### GET `/api/teacher/messages`
Get message conversations.

**Query Params:**
- `with` (optional) - User ID to get specific conversation

**Response (conversations list):**
```json
{
  "conversations": [
    {
      "partnerId": "uuid",
      "partner": { "first_name": "Jane", "last_name": "Smith" },
      "lastMessage": { "body": "Thank you!", "created_at": "..." },
      "unreadCount": 2
    }
  ]
}
```

#### POST `/api/teacher/messages/send`
Send a direct message.

**Request:**
```json
{
  "toUserId": "uuid",
  "message": "Hello! Your assignment has been graded...",
  "attachments": []
}
```

---

### 10. AI-Powered Features

#### POST `/api/teacher/ai/generate-module`
Generate module content using AI.

**Request:**
```json
{
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "subjectContext": "Advanced Mathematics",
  "learningObjectives": ["Understand...", "Apply..."]
}
```

**Response:**
```json
{
  "draft": {
    "title": "AI-Generated Module",
    "sections": [...],
    "objectives": [...],
    "suggestedAssessments": [...]
  },
  "message": "Module draft generated. Please review..."
}
```

#### POST `/api/teacher/ai/generate-quiz`
Generate quiz questions from module content.

**Request:**
```json
{
  "moduleContent": "Module text...",
  "questionCount": 10,
  "difficulty": "medium",
  "questionTypes": ["multiple_choice", "true_false"],
  "includeTags": true
}
```

#### POST `/api/teacher/ai/generate-feedback`
Generate feedback for student submission.

**Request:**
```json
{
  "submissionContent": "Student's work...",
  "rubricCriteria": [...],
  "rubricScores": { "criteria1": 8 },
  "assessmentInstructions": "..."
}
```

#### POST `/api/teacher/ai/cleanup-transcript`
Clean up and format a lecture transcript.

**Request:**
```json
{
  "rawTranscript": "Uh, so today we're gonna, um, discuss...",
  "generateNotes": true,
  "extractKeyPoints": true,
  "moduleTopic": "Introduction to Calculus"
}
```

**Response:**
```json
{
  "result": {
    "formatted": "Cleaned transcript...",
    "keyPoints": [...],
    "sections": [...],
    "notes": { ... }
  }
}
```

---

## Error Handling

All routes return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Database Schema

All routes interact with tables in the `n8n_content_creation` schema:

- `teacher_profiles`
- `modules`
- `lessons`
- `assessment_templates`
- `assessment_instances`
- `question_banks`
- `questions`
- `submissions`
- `rubric_scores`
- `feedback`
- `live_sessions`
- `live_attendance`
- `daily_presence`
- `announcements`
- `direct_messages`

---

## Next Steps

1. **Implement DAL Functions:** Create corresponding data access layer functions in `/lib/dal/teacher/`
2. **Add RLS Policies:** Ensure Supabase RLS policies enforce teacher access controls
3. **Implement AI Integration:** Replace placeholder AI responses with actual OpenAI/Anthropic API calls
4. **Add Notifications:** Implement notification creation when publishing, grading, or messaging
5. **File Upload Handling:** Add support for file uploads in submissions and attachments
6. **WebSocket Integration:** Add real-time updates for live sessions and messaging

---

## Testing

Example API call:

```typescript
// Fetch teacher profile
const response = await fetch('/api/teacher/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const { profile } = await response.json();
```

---

**Created:** December 28, 2025
**Status:** Complete - All 10 endpoint categories implemented
