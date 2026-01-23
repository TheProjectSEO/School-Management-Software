-- MSU Complete Foundation: Student Interaction Features
-- Migration: 20260119000003_student_interactions.sql

-- ============================================================================
-- LESSON REACTIONS (Like, Helpful, Confused, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'like',        -- 👍 I like this
    'helpful',     -- 💡 Very helpful
    'confused',    -- 😕 I'm confused
    'love',        -- ❤️ Love this
    'celebrate'    -- 🎉 Excellent
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One reaction per student per lesson
  UNIQUE(lesson_id, student_id)
);

CREATE INDEX idx_lesson_reactions_lesson ON lesson_reactions(lesson_id);
CREATE INDEX idx_lesson_reactions_student ON lesson_reactions(student_id);
CREATE INDEX idx_lesson_reactions_type ON lesson_reactions(reaction_type);

COMMENT ON TABLE lesson_reactions IS 'Student reactions to individual lessons (one per student)';

-- ============================================================================
-- COURSE DISCUSSIONS (Forums)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  created_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_by_teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,

  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  post_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either student or teacher created the thread
  CHECK (
    (created_by_student_id IS NOT NULL AND created_by_teacher_id IS NULL)
    OR
    (created_by_student_id IS NULL AND created_by_teacher_id IS NOT NULL)
  )
);

CREATE INDEX idx_course_discussions_course ON course_discussions(course_id);
CREATE INDEX idx_course_discussions_pinned ON course_discussions(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_course_discussions_created ON course_discussions(created_at DESC);

COMMENT ON TABLE course_discussions IS 'Discussion threads for courses';

-- ============================================================================
-- DISCUSSION POSTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,

  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,

  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either student or teacher posted
  CHECK (
    (student_id IS NOT NULL AND teacher_id IS NULL)
    OR
    (student_id IS NULL AND teacher_id IS NOT NULL)
  )
);

CREATE INDEX idx_discussion_posts_thread ON discussion_posts(thread_id);
CREATE INDEX idx_discussion_posts_created ON discussion_posts(created_at);

COMMENT ON TABLE discussion_posts IS 'Individual posts within discussion threads';

-- Trigger to update post count
CREATE OR REPLACE FUNCTION update_discussion_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE course_discussions
    SET post_count = post_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_discussions
    SET post_count = post_count - 1
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discussion_post_count_trigger
AFTER INSERT OR DELETE ON discussion_posts
FOR EACH ROW EXECUTE FUNCTION update_discussion_post_count();

-- ============================================================================
-- ENABLE REALTIME FOR INTERACTION TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE lesson_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE course_discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_posts;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Lesson Reactions: Students can react to lessons in enrolled courses
ALTER TABLE lesson_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view reactions for enrolled course lessons"
  ON lesson_reactions FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN enrollments e ON e.course_id = c.id
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can add/update their own reactions"
  ON lesson_reactions FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view reactions for their courses"
  ON lesson_reactions FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

-- Course Discussions: Students can view and create threads
ALTER TABLE course_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view discussions for enrolled courses"
  ON course_discussions FOR SELECT
  USING (
    course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    OR
    course_id IN (
      SELECT c.id FROM courses c
      WHERE c.teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students can create discussions in enrolled courses"
  ON course_discussions FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    AND
    created_by_student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage discussions for their courses"
  ON course_discussions FOR ALL
  USING (
    course_id IN (
      SELECT c.id FROM courses c
      WHERE c.teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

-- Discussion Posts: Students can view and create posts
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in accessible discussions"
  ON discussion_posts FOR SELECT
  USING (
    thread_id IN (
      SELECT cd.id FROM course_discussions cd
      WHERE cd.course_id IN (
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
      OR
      cd.course_id IN (
        SELECT c.id FROM courses c
        WHERE c.teacher_id IN (
          SELECT tp.id FROM teacher_profiles tp
          JOIN school_profiles sp ON sp.id = tp.profile_id
          WHERE sp.auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Students can create posts in enrolled course discussions"
  ON discussion_posts FOR INSERT
  WITH CHECK (
    thread_id IN (
      SELECT cd.id FROM course_discussions cd
      WHERE cd.course_id IN (
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
      AND cd.is_locked = false
    )
    AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create posts in their course discussions"
  ON discussion_posts FOR INSERT
  WITH CHECK (
    thread_id IN (
      SELECT cd.id FROM course_discussions cd
      WHERE cd.course_id IN (
        SELECT c.id FROM courses c
        WHERE c.teacher_id IN (
          SELECT tp.id FROM teacher_profiles tp
          JOIN school_profiles sp ON sp.id = tp.profile_id
          WHERE sp.auth_user_id = auth.uid()
        )
      )
    )
    AND
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );
