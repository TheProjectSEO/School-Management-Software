# How to Apply Migration 012: Grading Queue

## Quick Method: Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: https://qyjzqzqqjimittltttph.supabase.co
   - Navigate to "SQL Editor" (left sidebar)

2. **Copy Migration SQL**
   - Open: `teacher-app/supabase/migrations/012_grading_queue.sql`
   - Copy all contents (222 lines)

3. **Run Migration**
   - Click "New query" in SQL Editor
   - Paste the SQL
   - Click "Run" (or press Ctrl/Cmd + Enter)

4. **Verify Success**
   - Go to "Table Editor"
   - Check schema: `n8n_content_creation`
   - You should see new tables:
     - `teacher_grading_queue`
     - `assessment_questions`
     - `student_answers`

## What This Migration Creates

### 1. teacher_grading_queue Table
```
Stores questions that need manual teacher review:
- Essays, short answers, etc.
- Priority-based ordering
- Status tracking (pending/in_review/completed)
- Teacher feedback field
```

### 2. assessment_questions Table
```
Stores questions for assessments:
- Supports 8+ question types
- Answer keys for auto-grading
- Points, difficulty, tags
- Order indexing
```

### 3. student_answers Table
```
Stores student responses:
- Links to submission + question
- Auto-grading results
- Points earned tracking
```

### 4. Helper Functions
```sql
- get_grading_queue_count(teacher_id, status)
  → Count items in queue

- get_next_grading_item(teacher_id)
  → Fetch next item by priority
```

## After Migration

You can test:
1. Create an assessment with essay questions
2. Student submits the assessment
3. Essays automatically queue in `/teacher/grading`
4. Teacher grades from queue
5. Final score updates when all items graded

---

**Migration is idempotent** - safe to run multiple times (uses `CREATE TABLE IF NOT EXISTS` where applicable).
