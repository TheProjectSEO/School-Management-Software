# Teacher Data Access Layer (DAL)

Production-ready, type-safe data access functions for the MSU Teacher App. All queries use the `n8n_content_creation` schema with Supabase RLS policies enforcing authorization.

## Table of Contents

1. [Architecture](#architecture)
2. [Identity & Profile](#identity--profile)
3. [Content Management](#content-management)
4. [Assessments](#assessments)
5. [Grading](#grading)
6. [Communication](#communication)
7. [Attendance](#attendance)
8. [Usage Examples](#usage-examples)

---

## Architecture

### Design Principles

- **Type Safety**: All functions use TypeScript interfaces
- **Error Handling**: Try-catch blocks with console logging
- **RLS Enforcement**: Queries respect Supabase Row Level Security
- **Schema Isolation**: All tables in `n8n_content_creation` schema
- **Server-Side**: Uses `@/lib/supabase/server` for authenticated operations

### Import Pattern

```typescript
import { getCurrentTeacher, getTeacherAssignments } from '@/lib/dal/teacher';
// or
import { getCurrentTeacher } from '@/lib/dal/teacher/identity';
```

---

## Identity & Profile

**File**: `identity.ts`

### Functions

#### `getCurrentTeacher()`
Get authenticated teacher profile from session.

```typescript
const teacher = await getCurrentTeacher();
// Returns: Teacher | null
```

**Returns**:
```typescript
{
  id: string;
  user_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

#### `getTeacherAssignments(teacherId: string)`
Get all section/subject assignments for a teacher.

```typescript
const assignments = await getTeacherAssignments(teacherId);
// Returns: TeacherAssignment[]
```

**Returns**:
```typescript
{
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  section_name: string;
  subject_name: string;
  subject_code?: string;
  program_name: string;
  year_level: string;
  enrollment_count: number;
  created_at: string;
}[]
```

#### `getTeacherSchool(teacherId: string)`
Get teacher's school details.

```typescript
const school = await getTeacherSchool(teacherId);
// Returns: School | null
```

#### `verifyTeacherSectionAccess(teacherId: string, sectionId: string)`
Authorization check for section access.

```typescript
const hasAccess = await verifyTeacherSectionAccess(teacherId, sectionId);
// Returns: boolean
```

#### `verifyTeacherSubjectAccess(teacherId: string, subjectId: string)`
Authorization check for subject access.

```typescript
const hasAccess = await verifyTeacherSubjectAccess(teacherId, subjectId);
// Returns: boolean
```

---

## Content Management

**File**: `content.ts`

### Functions

#### `getTeacherSubjects(teacherId: string)`
Get all unique subjects assigned to teacher.

```typescript
const subjects = await getTeacherSubjects(teacherId);
// Returns: Subject[]
```

#### `createModule(input: CreateModuleInput)`
Create a new module in draft state.

```typescript
const module = await createModule({
  subject_id: 'uuid',
  title: 'Introduction to Algebra',
  description: 'Basic algebraic concepts',
  objectives: ['Understand variables', 'Solve equations'],
  order: 1,
  created_by: teacherId
});
// Returns: Module | null
```

**Input**:
```typescript
{
  subject_id: string;
  title: string;
  description?: string;
  objectives?: string[];
  order?: number;
  created_by: string;
}
```

#### `publishModule(moduleId: string, publishedBy: string)`
Publish a module (sets `is_published=true`).

```typescript
const success = await publishModule(moduleId, teacherId);
// Returns: boolean
```

#### `createTranscript(input: CreateTranscriptInput)`
Create a transcript for a module.

```typescript
const transcript = await createTranscript({
  module_id: 'uuid',
  source_type: 'recording',
  text: 'Transcript content...',
  timestamps_json: { '00:00': 'Introduction' },
  created_by: teacherId
});
// Returns: Transcript | null
```

**Source Types**: `'recording' | 'upload' | 'ai_generated' | 'manual'`

#### `publishTranscript(transcriptId: string, publishedBy: string)`
Publish a transcript (unpublishes others for same module).

```typescript
const success = await publishTranscript(transcriptId, teacherId);
// Returns: boolean
```

#### `getModuleTranscripts(moduleId: string)`
Get all transcripts for a module (ordered by version, newest first).

```typescript
const transcripts = await getModuleTranscripts(moduleId);
// Returns: Transcript[]
```

#### `uploadContentAsset(input: UploadContentAssetInput)`
Upload file to Supabase Storage and create database record.

```typescript
const asset = await uploadContentAsset({
  owner_type: 'module',
  owner_id: moduleId,
  asset_type: 'video',
  file: fileObject,
  created_by: teacherId
});
// Returns: ContentAsset | null
```

**Storage Buckets**:
- `module` → `teacher_assets`
- `assessment` → `teacher_assets`
- `submission` → `submissions`
- `message` → `message_attachments`

#### `getContentAssetUrl(assetId: string)`
Get public URL for a content asset.

```typescript
const url = await getContentAssetUrl(assetId);
// Returns: string | null
```

---

## Assessments

**File**: `assessments.ts`

### Functions

#### `getQuestionBanks(subjectId: string)`
Get all question banks for a subject.

```typescript
const banks = await getQuestionBanks(subjectId);
// Returns: QuestionBank[]
```

#### `createQuestionBank(input: CreateQuestionBankInput)`
Create a new question bank.

```typescript
const bank = await createQuestionBank({
  subject_id: 'uuid',
  name: 'Algebra Quiz Bank',
  description: 'Questions for algebra topics',
  created_by: teacherId
});
// Returns: QuestionBank | null
```

#### `addQuestionToBank(input: AddQuestionInput)`
Add a question to a bank.

```typescript
const question = await addQuestionToBank({
  bank_id: 'uuid',
  type: 'mcq',
  prompt: 'What is 2 + 2?',
  choices_json: { a: '3', b: '4', c: '5' },
  answer_key_json: { correct: 'b' },
  tags_json: ['basic', 'addition'],
  difficulty: 'easy',
  points: 1,
  created_by: teacherId
});
// Returns: Question | null
```

**Question Types**: `'mcq' | 'true_false' | 'short_answer' | 'essay' | 'coding'`

**Difficulty**: `'easy' | 'medium' | 'hard'`

#### `createAssessment(input: CreateAssessmentInput)`
Create an assessment (quiz/assignment/exam).

```typescript
const assessment = await createAssessment({
  subject_id: 'uuid',
  section_subject_id: 'uuid',
  type: 'quiz',
  title: 'Midterm Quiz',
  instructions: 'Answer all questions',
  open_at: '2025-01-15T09:00:00Z',
  close_at: '2025-01-15T10:00:00Z',
  time_limit: 60, // minutes
  attempts_allowed: 1,
  allow_resubmission: false,
  created_by: teacherId
});
// Returns: Assessment | null
```

**Assessment Types**: `'quiz' | 'assignment' | 'project' | 'midterm' | 'final'`

#### `addBankRules(assessmentId: string, rules: AddBankRuleInput[])`
Add randomization rules for question banks.

```typescript
const success = await addBankRules(assessmentId, [
  {
    bank_id: 'bank-uuid',
    pick_count: 10,
    tag_filter_json: ['basic'],
    shuffle_questions: true,
    shuffle_choices: true,
    seed_mode: 'per_student'
  }
]);
// Returns: boolean
```

**Seed Modes**:
- `'fixed'` - Same questions for all students
- `'per_student'` - Different for each student, same across attempts
- `'per_attempt'` - Different every attempt

#### `generateQuizSnapshot(assessmentId: string, studentId: string)`
Generate quiz snapshot for a student (applies randomization).

```typescript
const snapshot = await generateQuizSnapshot(assessmentId, studentId);
// Returns: QuizSnapshot | null
```

#### `getBankQuestions(bankId: string)`
Get all questions from a specific bank.

```typescript
const questions = await getBankQuestions(bankId);
// Returns: Question[]
```

---

## Grading

**File**: `grading.ts`

### Functions

#### `getPendingSubmissions(teacherId: string)`
Get grading inbox (all submitted work needing review).

```typescript
const submissions = await getPendingSubmissions(teacherId);
// Returns: Submission[]
```

#### `getSubmission(submissionId: string)`
Get detailed submission including versions.

```typescript
const submission = await getSubmission(submissionId);
// Returns: Submission | null
```

#### `gradeSubmission(input: GradeSubmissionInput)`
Apply a score to a submission.

```typescript
const success = await gradeSubmission({
  submission_id: 'uuid',
  score: 85,
  max_score: 100,
  graded_by: teacherId
});
// Returns: boolean
```

#### `applyRubricScore(input: ApplyRubricScoreInput)`
Grade using a rubric template.

```typescript
const success = await applyRubricScore({
  submission_id: 'uuid',
  rubric_id: 'rubric-uuid',
  scores: {
    'criterion-1-id': 4,
    'criterion-2-id': 3,
    'criterion-3-id': 5
  },
  graded_by: teacherId
});
// Returns: boolean
```

**Automatically calculates total score and updates submission.**

#### `releaseGrades(assessmentId: string, releasedBy: string)`
Release all grades for an assessment (students can now see them).

```typescript
const success = await releaseGrades(assessmentId, teacherId);
// Returns: boolean
```

#### `createFeedback(input: CreateFeedbackInput)`
Create feedback for a submission (unreleased by default).

```typescript
const feedback = await createFeedback({
  submission_id: 'uuid',
  teacher_comment: 'Great work! Consider improving...',
  inline_notes_json: { line_5: 'Good point here' },
  created_by: teacherId
});
// Returns: Feedback | null
```

#### `getRubricTemplates(subjectId: string)`
Get all rubric templates for a subject.

```typescript
const rubrics = await getRubricTemplates(subjectId);
// Returns: RubricTemplate[]
```

#### `getSubmissionRubricScore(submissionId: string)`
Get rubric score for a submission.

```typescript
const score = await getSubmissionRubricScore(submissionId);
// Returns: RubricScore | null
```

---

## Communication

**File**: `communication.ts`

### Functions

#### `sendAnnouncement(input: CreateAnnouncementInput)`
Send announcement to section or subject-across-sections.

```typescript
const announcement = await sendAnnouncement({
  scope_type: 'section',
  scope_ids: ['section-uuid-1', 'section-uuid-2'],
  title: 'Midterm Schedule',
  body: 'The midterm exam will be on...',
  attachments_json: ['file-uuid'],
  publish_at: '2025-01-10T08:00:00Z', // Optional: schedule for later
  created_by: teacherId
});
// Returns: Announcement | null
```

**Automatically creates notifications for all students in scope.**

**Scope Types**:
- `'section'` - Specific sections
- `'subject_multi_section'` - All sections teaching this subject

#### `getDiscussionThreads(sectionSubjectId: string)`
Get all discussion threads for a course.

```typescript
const threads = await getDiscussionThreads(sectionSubjectId);
// Returns: DiscussionThread[]
```

#### `createDiscussionThread(sectionSubjectId, title, createdBy)`
Create a new discussion thread.

```typescript
const thread = await createDiscussionThread(
  sectionSubjectId,
  'Week 1 Discussion',
  teacherId
);
// Returns: DiscussionThread | null
```

#### `getThreadPosts(threadId: string)`
Get all posts in a thread.

```typescript
const posts = await getThreadPosts(threadId);
// Returns: DiscussionPost[]
```

#### `addThreadPost(threadId, body, createdBy, attachments?)`
Add a post to a thread.

```typescript
const post = await addThreadPost(
  threadId,
  'Great question! The answer is...',
  teacherId,
  ['file-uuid']
);
// Returns: DiscussionPost | null
```

#### `sendDirectMessage(input, fromUserId, schoolId)`
Send a direct message to a student.

```typescript
const message = await sendDirectMessage(
  {
    to_profile_id: studentId,
    body: 'Please submit your assignment by Friday.',
    attachments_json: []
  },
  teacherId,
  schoolId
);
// Returns: DirectMessage | null
```

**Automatically creates notification for recipient.**

#### `getMessages(teacherId: string)`
Get all messages (sent and received) for teacher.

```typescript
const messages = await getMessages(teacherId);
// Returns: DirectMessage[]
```

#### `getConversation(teacherId: string, studentId: string)`
Get conversation between teacher and specific student.

```typescript
const conversation = await getConversation(teacherId, studentId);
// Returns: DirectMessage[]
```

#### `markMessageAsRead(messageId: string)`
Mark a message as read.

```typescript
const success = await markMessageAsRead(messageId);
// Returns: boolean
```

#### `getUnreadMessageCount(teacherId: string)`
Get count of unread messages.

```typescript
const count = await getUnreadMessageCount(teacherId);
// Returns: number
```

---

## Attendance

**File**: `attendance.ts`

### Functions

#### `getSessionAttendance(sessionId: string)`
Get attendance for a specific live session.

```typescript
const attendance = await getSessionAttendance(sessionId);
// Returns: LiveAttendance[]
```

#### `overrideAttendance(sessionId, studentId, status, updatedBy, notes?)`
Manually override attendance status.

```typescript
const success = await overrideAttendance(
  sessionId,
  studentId,
  'present',
  teacherId,
  'Attended via phone call'
);
// Returns: boolean
```

**Status Options**: `'present' | 'absent' | 'late' | 'excused'`

#### `getDailyAttendance(date: string, sectionId: string)`
Get daily attendance for all students in a section.

```typescript
const attendance = await getDailyAttendance('2025-01-10', sectionId);
// Returns: DailyPresence[]
```

**Date Format**: `'YYYY-MM-DD'`

#### `trackPresence(sessionId, studentId, action)`
Track student presence in a live session.

```typescript
// When student joins
await trackPresence(sessionId, studentId, 'join');

// Keepalive ping
await trackPresence(sessionId, studentId, 'ping');

// When student leaves
await trackPresence(sessionId, studentId, 'leave');

// Returns: boolean
```

**Actions**: `'join' | 'leave' | 'ping'`

#### `getAttendanceSummary(sectionId, startDate, endDate)`
Get attendance statistics for a section over date range.

```typescript
const summary = await getAttendanceSummary(
  sectionId,
  '2025-01-01',
  '2025-01-31'
);
// Returns: {
//   total_days: number;
//   total_sessions: number;
//   average_attendance_rate: number;
//   by_student: Array<{
//     student_id: string;
//     student_name: string;
//     present_days: number;
//     absent_days: number;
//     attendance_rate: number;
//   }>;
// }
```

---

## Usage Examples

### Complete Module Publishing Flow

```typescript
import {
  createModule,
  uploadContentAsset,
  createTranscript,
  publishTranscript,
  publishModule
} from '@/lib/dal/teacher';

// 1. Create module
const module = await createModule({
  subject_id: subjectId,
  title: 'Introduction to Calculus',
  description: 'Limits and derivatives',
  objectives: ['Understand limits', 'Calculate derivatives'],
  created_by: teacherId
});

// 2. Upload recording
const recording = await uploadContentAsset({
  owner_type: 'module',
  owner_id: module.id,
  asset_type: 'video',
  file: recordingFile,
  created_by: teacherId
});

// 3. Create transcript (AI-generated)
const transcript = await createTranscript({
  module_id: module.id,
  source_type: 'ai_generated',
  text: transcriptText,
  timestamps_json: timestamps,
  created_by: teacherId
});

// 4. Publish transcript
await publishTranscript(transcript.id, teacherId);

// 5. Publish module
await publishModule(module.id, teacherId);
```

### Quiz with Randomization

```typescript
import {
  createQuestionBank,
  addQuestionToBank,
  createAssessment,
  addBankRules,
  generateQuizSnapshot
} from '@/lib/dal/teacher';

// 1. Create question bank
const bank = await createQuestionBank({
  subject_id: subjectId,
  name: 'Algebra Basics',
  description: 'Basic algebra questions',
  created_by: teacherId
});

// 2. Add questions
for (const q of questions) {
  await addQuestionToBank({
    bank_id: bank.id,
    type: 'mcq',
    prompt: q.prompt,
    choices_json: q.choices,
    answer_key_json: q.answer,
    tags_json: q.tags,
    difficulty: q.difficulty,
    created_by: teacherId
  });
}

// 3. Create assessment
const quiz = await createAssessment({
  section_subject_id: sectionSubjectId,
  type: 'quiz',
  title: 'Weekly Quiz 1',
  time_limit: 30,
  attempts_allowed: 1,
  created_by: teacherId
});

// 4. Add randomization rules
await addBankRules(quiz.id, [
  {
    bank_id: bank.id,
    pick_count: 10,
    shuffle_questions: true,
    shuffle_choices: true,
    seed_mode: 'per_student'
  }
]);

// 5. Generate snapshot for student
const snapshot = await generateQuizSnapshot(quiz.id, studentId);
```

### Grading with Rubric

```typescript
import {
  getSubmission,
  applyRubricScore,
  createFeedback,
  releaseGrades
} from '@/lib/dal/teacher';

// 1. Get submission
const submission = await getSubmission(submissionId);

// 2. Apply rubric
await applyRubricScore({
  submission_id: submission.id,
  rubric_id: rubricId,
  scores: {
    'content-quality': 4,
    'organization': 5,
    'grammar': 3
  },
  graded_by: teacherId
});

// 3. Add feedback
await createFeedback({
  submission_id: submission.id,
  teacher_comment: 'Excellent analysis! Watch grammar in paragraph 3.',
  created_by: teacherId
});

// 4. Release all grades for this assignment
await releaseGrades(submission.assessment_id, teacherId);
```

---

## Error Handling

All functions return `null` or `false` on error and log to console:

```typescript
const module = await createModule(input);
if (!module) {
  // Handle error - check console for details
  return { error: 'Failed to create module' };
}
```

For production, enhance with proper error tracking (Sentry, etc.).

---

## RLS Policy Requirements

All tables in `n8n_content_creation` schema must have policies:

### Teacher Policies
```sql
-- Example for modules table
CREATE POLICY "Teachers can read their assigned modules"
  ON n8n_content_creation.modules
  FOR SELECT
  USING (
    subject_id IN (
      SELECT subject_id
      FROM n8n_content_creation.section_subjects
      WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create modules for their subjects"
  ON n8n_content_creation.modules
  FOR INSERT
  WITH CHECK (
    subject_id IN (
      SELECT subject_id
      FROM n8n_content_creation.section_subjects
      WHERE teacher_id = auth.uid()
    )
  );
```

Repeat for all tables with appropriate scope checks.

---

## Type Safety

All input/output types are exported:

```typescript
import type {
  CreateModuleInput,
  Module,
  Transcript
} from '@/lib/dal/teacher';

const input: CreateModuleInput = {
  subject_id: 'uuid',
  title: 'My Module',
  created_by: teacherId
};

const module: Module | null = await createModule(input);
```

---

## Next Steps

1. **Create Supabase migrations** for all tables
2. **Implement RLS policies** for each table
3. **Test with Supabase local dev**
4. **Build UI components** that consume these functions
5. **Add AI integrations** for content generation

---

## Support

For issues or questions, refer to:
- CLAUDE.md (project overview)
- agent_teacher.md (teacher app plan)
- Supabase documentation for RLS and Storage
