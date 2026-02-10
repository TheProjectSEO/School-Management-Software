-- Create student_notes table for lesson note-taking
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
