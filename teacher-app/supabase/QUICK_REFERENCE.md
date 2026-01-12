# Teacher App Database - Quick Reference

## Schema: `n8n_content_creation`

**CRITICAL:** All tables live in `n8n_content_creation` schema. Never use `public` schema.

---

## Table Reference

### Teacher Identity
```sql
n8n_content_creation.teacher_profiles (id, profile_id, school_id, employee_id, department)
n8n_content_creation.teacher_assignments (id, teacher_profile_id, section_id, course_id)
```

### Content Management
```sql
n8n_content_creation.teacher_transcripts (id, module_id, content, is_published)
n8n_content_creation.teacher_notes (id, module_id, rich_text, is_published)
n8n_content_creation.teacher_content_assets (id, owner_type, owner_id, storage_path)
```

### Live Sessions
```sql
n8n_content_creation.teacher_live_sessions (id, course_id, section_id, status)
n8n_content_creation.teacher_session_presence (id, session_id, student_id, duration_seconds)
n8n_content_creation.teacher_attendance (id, session_id, student_id, status, manual_override)
n8n_content_creation.teacher_daily_attendance (id, student_id, date, status)
```

### Assessments
```sql
n8n_content_creation.teacher_question_banks (id, course_id, name)
n8n_content_creation.teacher_bank_questions (id, bank_id, question_text, tags, difficulty)
n8n_content_creation.teacher_assessment_bank_rules (id, assessment_id, bank_id, pick_count)
n8n_content_creation.teacher_student_quiz_snapshots (id, assessment_id, student_id, questions_json)
```

### Grading
```sql
n8n_content_creation.teacher_rubric_templates (id, criteria_json, levels_json, max_score)
n8n_content_creation.teacher_rubric_scores (id, submission_id, scores_json, total_score)
n8n_content_creation.teacher_feedback (id, submission_id, teacher_comment, is_released)
```

### Communication
```sql
n8n_content_creation.teacher_announcements (id, scope_type, scope_id, title, is_pinned)
n8n_content_creation.teacher_discussion_threads (id, course_id, title, is_locked)
n8n_content_creation.teacher_discussion_posts (id, thread_id, parent_post_id, body)
n8n_content_creation.teacher_direct_messages (id, from_profile_id, to_profile_id, is_read)
```

---

## Common Queries

### Get Teacher's Assignments
```sql
SELECT
  c.name as course_name,
  s.name as section_name,
  ta.is_primary
FROM n8n_content_creation.teacher_assignments ta
JOIN n8n_content_creation.courses c ON ta.course_id = c.id
JOIN n8n_content_creation.sections s ON ta.section_id = s.id
WHERE ta.teacher_profile_id = :teacher_profile_id;
```

### Get Published Modules for Course
```sql
SELECT m.*
FROM n8n_content_creation.modules m
WHERE m.course_id = :course_id
  AND m.is_published = true
ORDER BY m.order;
```

### Get Pending Submissions for Teacher
```sql
SELECT
  sub.*,
  s.full_name as student_name,
  a.title as assessment_title
FROM n8n_content_creation.submissions sub
JOIN n8n_content_creation.students st ON sub.student_id = st.id
JOIN n8n_content_creation.profiles s ON st.profile_id = s.id
JOIN n8n_content_creation.assessments a ON sub.assessment_id = a.id
WHERE a.course_id IN (
  SELECT course_id FROM n8n_content_creation.teacher_assignments
  WHERE teacher_profile_id = :teacher_profile_id
)
  AND sub.status = 'submitted'
ORDER BY sub.submitted_at;
```

### Generate Quiz Snapshot
```sql
SELECT n8n_content_creation.generate_quiz_snapshot(
  :assessment_id,
  :student_id,
  1 -- attempt number
);
```

### Release Feedback
```sql
SELECT n8n_content_creation.release_feedback(
  :submission_id,
  :teacher_profile_id
);
```

### Get Active Announcements
```sql
SELECT n8n_content_creation.get_active_announcements(
  'course',
  :course_id
);
```

---

## Key Helper Functions

### RLS Helpers
- `current_profile_id()` → UUID
- `is_teacher()` → BOOLEAN
- `is_student()` → BOOLEAN
- `current_teacher_profile_id()` → UUID
- `current_student_id()` → UUID
- `teacher_assigned_to_course(course_id)` → BOOLEAN
- `teacher_assigned_to_section(section_id)` → BOOLEAN

### Content Helpers
- `get_latest_transcript(module_id)` → transcript
- `get_latest_notes(module_id)` → notes

### Assessment Helpers
- `count_bank_questions(bank_id, tags, difficulty)` → INTEGER
- `generate_quiz_snapshot(assessment_id, student_id, attempt)` → UUID

### Grading Helpers
- `calculate_rubric_max_score(criteria_json, levels_json)` → INTEGER
- `release_feedback(submission_id, released_by)` → BOOLEAN
- `batch_release_feedback(submission_ids[], released_by)` → INTEGER

### Attendance Helpers
- `get_student_session_duration(session_id, student_id)` → INTEGER
- `detect_attendance_status(session_id, student_id, threshold_min)` → TEXT

### Communication Helpers
- `get_conversation(profile_1, profile_2, limit, offset)` → messages[]
- `get_unread_count(profile_id)` → INTEGER
- `get_thread_post_count(thread_id)` → INTEGER

---

## Enum Values

### Source Types (Transcripts)
- `recording` - From uploaded recording
- `live_session` - From live session
- `upload` - Manually uploaded
- `ai_generated` - AI-generated

### Question Types
- `multiple_choice`
- `true_false`
- `short_answer`
- `essay`

### Difficulty Levels
- `easy`
- `medium`
- `hard`

### Attendance Status
- `present`
- `late`
- `absent`
- `excused`

### Session Status
- `scheduled`
- `live`
- `ended`
- `cancelled`

### Seed Modes (Randomization)
- `per_student` - Same quiz for all attempts
- `per_attempt` - New quiz each attempt
- `fixed` - Same for all students

### Scope Types (Announcements)
- `section`
- `course`
- `school`

### Owner Types (Assets)
- `module`
- `lesson`
- `assessment`
- `announcement`

### Asset Types
- `slide`
- `pdf`
- `image`
- `video`
- `audio`
- `recording`
- `document`

### Video Providers
- `zoom`
- `meet`
- `teams`
- `livekit`
- `daily`
- `internal`

---

## RLS Policy Summary

### Teacher Permissions
✅ View own profile and assignments
✅ Manage content for assigned courses
✅ Create/grade assessments for assigned courses
✅ Manage attendance for assigned sections
✅ Send announcements to assigned scope
✅ Create discussion threads
✅ Send direct messages within school

❌ Cannot access other schools' data
❌ Cannot manage unassigned courses/sections
❌ Cannot see other teachers' private data

### Student Permissions
✅ View published content for enrolled courses
✅ Submit to assigned assessments
✅ View own quiz snapshots
✅ View released grades and feedback
✅ View announcements for their scope
✅ Participate in discussions for enrolled courses
✅ Send direct messages within school

❌ Cannot see unpublished content
❌ Cannot see unreleased feedback
❌ Cannot access other students' data
❌ Cannot see draft content

---

## Migration Workflow

### 1. Apply Migrations
```bash
cd teacher-app
supabase db push
```

### 2. Verify Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'n8n_content_creation'
  AND table_name LIKE 'teacher_%'
ORDER BY table_name;
```

### 3. Generate Types
```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > types/supabase.ts
```

### 4. Test RLS
```sql
-- Test as teacher
SELECT set_config('request.jwt.claims', '{"sub": "teacher-uuid"}', true);
SELECT * FROM n8n_content_creation.teacher_assignments; -- Should see own

-- Test as student
SELECT set_config('request.jwt.claims', '{"sub": "student-uuid"}', true);
SELECT * FROM n8n_content_creation.teacher_transcripts; -- Should see published only
```

---

## Common Issues & Solutions

### Issue: Tables created in `public` schema
**Solution:** Drop and recreate. Always use `n8n_content_creation.` prefix

### Issue: RLS blocks all access
**Solution:** Check helper functions return correct profile_id. Verify auth.uid() is set

### Issue: Quiz snapshot generation fails
**Solution:** Ensure enough questions in bank matching filters. Check validation trigger

### Issue: Feedback not visible to student
**Solution:** Ensure `is_released = true` and `released_at/released_by` are set

### Issue: Can't post to discussion
**Solution:** Ensure thread not locked. Check user enrolled in course

---

## Storage Buckets

Required Supabase Storage buckets:

```javascript
// teacher_assets bucket
{
  name: 'teacher_assets',
  public: false,
  fileSizeLimit: 104857600, // 100MB
  allowedMimeTypes: [
    'application/pdf',
    'image/*',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
}

// recordings bucket
{
  name: 'recordings',
  public: false,
  fileSizeLimit: 1073741824, // 1GB
  allowedMimeTypes: ['video/*', 'audio/*']
}

// submissions bucket
{
  name: 'submissions',
  public: false,
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: ['*']
}

// message_attachments bucket
{
  name: 'message_attachments',
  public: false,
  fileSizeLimit: 26214400, // 25MB
  allowedMimeTypes: ['*']
}
```

---

## Performance Tips

1. **Use Indexes:** All foreign keys are indexed. Use them in WHERE clauses
2. **Limit Results:** Always use LIMIT/OFFSET for pagination
3. **Filter Early:** Apply WHERE before JOIN when possible
4. **Batch Operations:** Use batch functions for multiple releases
5. **Cache Snapshots:** Quiz snapshots are frozen - cache on client
6. **Async Processing:** Generate transcripts/AI feedback async

---

**Last Updated:** 2025-12-28
**Schema Version:** 1.0.0
