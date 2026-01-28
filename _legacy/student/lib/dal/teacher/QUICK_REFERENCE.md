# Teacher DAL Quick Reference

Fast lookup for all 46 functions. See README.md for detailed docs.

---

## Identity & Profile

```typescript
import { getCurrentTeacher, getTeacherAssignments } from '@/lib/dal/teacher';

// Get authenticated teacher
const teacher = await getCurrentTeacher(); // → Teacher | null

// Get all assignments
const assignments = await getTeacherAssignments(teacherId); // → TeacherAssignment[]

// Get school
const school = await getTeacherSchool(teacherId); // → School | null

// Authorization checks
const hasAccess = await verifyTeacherSectionAccess(teacherId, sectionId); // → boolean
const hasAccess = await verifyTeacherSubjectAccess(teacherId, subjectId); // → boolean
```

---

## Content Management

```typescript
import { createModule, publishModule, createTranscript } from '@/lib/dal/teacher';

// Get subjects
const subjects = await getTeacherSubjects(teacherId); // → Subject[]

// Create module (draft)
const module = await createModule({
  subject_id, title, description, objectives, order, created_by
}); // → Module | null

// Publish module
await publishModule(moduleId, publishedBy); // → boolean

// Transcripts
const transcript = await createTranscript({
  module_id, source_type, text, timestamps_json, created_by
}); // → Transcript | null

await publishTranscript(transcriptId, publishedBy); // → boolean
const transcripts = await getModuleTranscripts(moduleId); // → Transcript[]

// Assets
const asset = await uploadContentAsset({
  owner_type, owner_id, asset_type, file, created_by
}); // → ContentAsset | null

const url = await getContentAssetUrl(assetId); // → string | null
```

---

## Assessments

```typescript
import { createQuestionBank, createAssessment, generateQuizSnapshot } from '@/lib/dal/teacher';

// Question banks
const banks = await getQuestionBanks(subjectId); // → QuestionBank[]
const bank = await createQuestionBank({ subject_id, name, description, created_by }); // → QuestionBank | null

// Questions
const question = await addQuestionToBank({
  bank_id, type, prompt, choices_json, answer_key_json, tags_json, difficulty, points, created_by
}); // → Question | null

const questions = await getBankQuestions(bankId); // → Question[]

// Assessments
const assessment = await createAssessment({
  subject_id, section_subject_id, type, title, instructions,
  open_at, close_at, time_limit, attempts_allowed, allow_resubmission, created_by
}); // → Assessment | null

// Randomization
await addBankRules(assessmentId, [
  { bank_id, pick_count, tag_filter_json, shuffle_questions, shuffle_choices, seed_mode }
]); // → boolean

// Quiz snapshots
const snapshot = await generateQuizSnapshot(assessmentId, studentId); // → QuizSnapshot | null
```

---

## Grading

```typescript
import { getPendingSubmissions, gradeSubmission, applyRubricScore } from '@/lib/dal/teacher';

// Grading inbox
const pending = await getPendingSubmissions(teacherId); // → Submission[]
const submission = await getSubmission(submissionId); // → Submission | null

// Grade (simple)
await gradeSubmission({ submission_id, score, max_score, graded_by }); // → boolean

// Grade (rubric)
await applyRubricScore({
  submission_id, rubric_id, scores: { criterion_id: level_score }, graded_by
}); // → boolean

// Feedback
const feedback = await createFeedback({
  submission_id, teacher_comment, inline_notes_json, created_by
}); // → Feedback | null

// Release
await releaseGrades(assessmentId, releasedBy); // → boolean

// Rubrics
const rubrics = await getRubricTemplates(subjectId); // → RubricTemplate[]
const score = await getSubmissionRubricScore(submissionId); // → RubricScore | null
```

---

## Communication

```typescript
import { sendAnnouncement, sendDirectMessage, getMessages } from '@/lib/dal/teacher';

// Announcements
const announcement = await sendAnnouncement({
  scope_type, scope_ids, title, body, attachments_json, publish_at, created_by
}); // → Announcement | null

// Discussions
const threads = await getDiscussionThreads(sectionSubjectId); // → DiscussionThread[]
const thread = await createDiscussionThread(sectionSubjectId, title, createdBy); // → DiscussionThread | null
const posts = await getThreadPosts(threadId); // → DiscussionPost[]
const post = await addThreadPost(threadId, body, createdBy, attachments?); // → DiscussionPost | null

// Direct messages
const message = await sendDirectMessage(
  { to_profile_id, body, attachments_json },
  fromUserId,
  schoolId
); // → DirectMessage | null

const messages = await getMessages(teacherId); // → DirectMessage[]
const conversation = await getConversation(teacherId, studentId); // → DirectMessage[]
await markMessageAsRead(messageId); // → boolean
const unreadCount = await getUnreadMessageCount(teacherId); // → number
```

---

## Attendance

```typescript
import { getSessionAttendance, overrideAttendance, getDailyAttendance } from '@/lib/dal/teacher';

// Session attendance
const attendance = await getSessionAttendance(sessionId); // → LiveAttendance[]

// Override
await overrideAttendance(sessionId, studentId, status, updatedBy, notes?); // → boolean
// status: 'present' | 'absent' | 'late' | 'excused'

// Daily attendance
const daily = await getDailyAttendance(date, sectionId); // → DailyPresence[]
// date format: 'YYYY-MM-DD'

// Presence tracking
await trackPresence(sessionId, studentId, 'join'); // → boolean
await trackPresence(sessionId, studentId, 'ping'); // → boolean
await trackPresence(sessionId, studentId, 'leave'); // → boolean

// Summary stats
const summary = await getAttendanceSummary(sectionId, startDate, endDate); // → {
//   total_days, total_sessions, average_attendance_rate,
//   by_student: [{ student_id, student_name, present_days, absent_days, attendance_rate }]
// }
```

---

## Common Types

```typescript
// Module creation
type CreateModuleInput = {
  subject_id: string;
  title: string;
  description?: string;
  objectives?: string[];
  order?: number;
  created_by: string;
};

// Transcript creation
type CreateTranscriptInput = {
  module_id: string;
  source_type: 'recording' | 'upload' | 'ai_generated' | 'manual';
  text: string;
  timestamps_json?: Record<string, unknown>;
  created_by: string;
};

// Question types
type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'coding';
type Difficulty = 'easy' | 'medium' | 'hard';

// Assessment types
type AssessmentType = 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';

// Seed modes
type SeedMode = 'fixed' | 'per_student' | 'per_attempt';

// Announcement scopes
type AnnouncementScope = 'section' | 'subject_multi_section';

// Attendance status
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
```

---

## Error Handling Pattern

```typescript
const result = await someFunction(input);

if (!result) {
  // Check console for error details
  console.error('Operation failed');
  return { error: 'Operation failed' };
}

// Success - use result
return { data: result };
```

---

## Common Workflows

### Publish Module
```typescript
const module = await createModule({ ... });
const asset = await uploadContentAsset({ owner_id: module.id, ... });
const transcript = await createTranscript({ module_id: module.id, ... });
await publishTranscript(transcript.id, teacherId);
await publishModule(module.id, teacherId);
```

### Create Quiz
```typescript
const bank = await createQuestionBank({ ... });
await addQuestionToBank({ bank_id: bank.id, ... });
const quiz = await createAssessment({ type: 'quiz', ... });
await addBankRules(quiz.id, [{ bank_id: bank.id, ... }]);
```

### Grade Submission
```typescript
const submission = await getSubmission(submissionId);
await applyRubricScore({ submission_id, rubric_id, scores, graded_by });
await createFeedback({ submission_id, teacher_comment, created_by });
await releaseGrades(submission.assessment_id, teacherId);
```

---

## Storage Buckets

| Owner Type | Bucket |
|------------|--------|
| `module` | `teacher_assets` |
| `assessment` | `teacher_assets` |
| `submission` | `submissions` |
| `message` | `message_attachments` |

---

## Schema

All tables in: **`n8n_content_creation`**

---

## Import Patterns

```typescript
// All functions
import { ... } from '@/lib/dal/teacher';

// Specific domain
import { ... } from '@/lib/dal/teacher/content';
import { ... } from '@/lib/dal/teacher/grading';

// Types only
import type { Module, Transcript } from '@/lib/dal/teacher';
```

---

## Debugging

All functions log errors to console:
```
Error fetching teacher profile: { error details }
Unexpected error in createModule: { error details }
```

---

## Authorization Flow

```typescript
// 1. Get teacher
const teacher = await getCurrentTeacher();
if (!teacher) return unauthorized();

// 2. Verify access
const hasAccess = await verifyTeacherSubjectAccess(teacher.id, subjectId);
if (!hasAccess) return forbidden();

// 3. Perform operation
const module = await createModule({ ... });
```

---

## RLS Requirements

All queries enforce RLS at database level. UI authorization is supplementary.

Example policy:
```sql
CREATE POLICY "teachers_own_data"
  ON n8n_content_creation.modules
  USING (
    subject_id IN (
      SELECT subject_id FROM section_subjects
      WHERE teacher_id = auth.uid()
    )
  );
```

---

## Environment Setup

```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

## File Structure

```
lib/dal/teacher/
├── identity.ts              # 5 functions
├── content.ts               # 8 functions
├── assessments.ts           # 8 functions
├── grading.ts               # 9 functions
├── communication.ts         # 11 functions
├── attendance.ts            # 5 functions
├── index.ts                 # Exports
├── README.md                # Full docs
├── QUICK_REFERENCE.md       # This file
└── IMPLEMENTATION_SUMMARY.md # Overview
```

---

**Total**: 46 functions | 6 domains | 100% typed | Production-ready
