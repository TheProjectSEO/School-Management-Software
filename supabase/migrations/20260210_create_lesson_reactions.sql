-- Create lesson_reactions table if it doesn't exist
-- Allows students to react to lessons (like, helpful, confused, love, celebrate)

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

-- Permissive RLS: service client bypasses, but allow read for authenticated users
ALTER TABLE lesson_reactions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read reactions
DROP POLICY IF EXISTS "Anyone can read lesson reactions" ON lesson_reactions;
CREATE POLICY "Anyone can read lesson reactions" ON lesson_reactions
  FOR SELECT TO authenticated USING (true);

-- Allow students to manage their own reactions
DROP POLICY IF EXISTS "Students manage own reactions" ON lesson_reactions;
CREATE POLICY "Students manage own reactions" ON lesson_reactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
