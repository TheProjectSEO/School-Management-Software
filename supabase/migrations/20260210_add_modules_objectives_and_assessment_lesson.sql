-- Add learning_objectives array column to modules (used by AI planner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'modules' AND column_name = 'learning_objectives' AND table_schema = 'public'
  ) THEN
    ALTER TABLE modules ADD COLUMN learning_objectives TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add lesson_id column to assessments so assessments can be linked to a specific lesson
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
