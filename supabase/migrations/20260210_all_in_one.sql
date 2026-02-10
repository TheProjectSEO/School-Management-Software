-- ============================================================
-- Combined Migration: All pending changes (2026-02-10)
-- Run this in Supabase SQL Editor as a single script
-- ============================================================

-- 1. Add video_type column to lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'lessons'
    AND column_name = 'video_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE lessons ADD COLUMN video_type TEXT;
  END IF;
END $$;

-- 2. Add thumbnail_url column to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. Add source_session_id column to lessons (links auto-created lessons to live sessions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'lessons'
    AND column_name = 'source_session_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE lessons ADD COLUMN source_session_id UUID REFERENCES live_sessions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_lessons_source_session ON lessons(source_session_id);
  END IF;
END $$;

-- 4. Fix: Set all existing lessons to published (bug previously hardcoded is_published = false)
UPDATE lessons SET is_published = true WHERE is_published = false;

-- 5. Fix student_progress unique constraint for upsert operations
-- Clean up any duplicate rows (keep the one with highest progress)
DELETE FROM student_progress a
USING student_progress b
WHERE a.student_id = b.student_id
  AND a.lesson_id = b.lesson_id
  AND a.id < b.id
  AND a.progress_percent <= b.progress_percent;

-- Also clean remaining duplicates (keep most recent)
DELETE FROM student_progress a
USING student_progress b
WHERE a.student_id = b.student_id
  AND a.lesson_id = b.lesson_id
  AND a.id < b.id;

-- Add the unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_progress_student_id_lesson_id_key'
      AND conrelid = 'student_progress'::regclass
  ) THEN
    ALTER TABLE student_progress
      ADD CONSTRAINT student_progress_student_id_lesson_id_key
      UNIQUE (student_id, lesson_id);
  END IF;
END
$$;

-- 6. Create lesson_reactions table
CREATE TABLE IF NOT EXISTS lesson_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'like', 'helpful', 'confused', 'love', 'celebrate'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_reactions_lesson ON lesson_reactions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reactions_student ON lesson_reactions(student_id);

ALTER TABLE lesson_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read lesson reactions" ON lesson_reactions;
CREATE POLICY "Anyone can read lesson reactions" ON lesson_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Students manage own reactions" ON lesson_reactions;
CREATE POLICY "Students manage own reactions" ON lesson_reactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Create student_notes table
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'note',
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_course ON student_notes(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_lesson ON student_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_tags ON student_notes USING GIN(tags);

-- 8. Add learning_objectives to modules (used by AI planner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'modules' AND column_name = 'learning_objectives' AND table_schema = 'public'
  ) THEN
    ALTER TABLE modules ADD COLUMN learning_objectives TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 9. Add lesson_id to assessments (link assessments to specific lessons)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'lesson_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE assessments ADD COLUMN lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_assessments_lesson ON assessments(lesson_id);
  END IF;
END $$;
