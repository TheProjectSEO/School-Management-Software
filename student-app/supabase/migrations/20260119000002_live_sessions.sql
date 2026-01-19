-- MSU Complete Foundation: Live Virtual Classroom System
-- Migration: 20260119000002_live_sessions.sql

-- ============================================================================
-- LIVE SESSIONS (Daily.co Integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

  -- Session Info
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Daily.co Integration
  daily_room_name TEXT UNIQUE,
  daily_room_url TEXT,
  daily_room_config JSONB DEFAULT '{}'::jsonb,

  -- Recording
  recording_enabled BOOLEAN DEFAULT true,
  recording_started_at TIMESTAMPTZ,
  recording_url TEXT,
  recording_size_bytes BIGINT,
  recording_duration_seconds INTEGER,

  -- Status & Limits
  status TEXT CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')) DEFAULT 'scheduled',
  max_participants INTEGER DEFAULT 100,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_sessions_course ON live_sessions(course_id);
CREATE INDEX idx_live_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_scheduled_start ON live_sessions(scheduled_start);

COMMENT ON TABLE live_sessions IS 'Virtual classroom sessions with Daily.co video conferencing';
COMMENT ON COLUMN live_sessions.daily_room_name IS 'Unique room identifier for Daily.co';
COMMENT ON COLUMN live_sessions.recording_url IS 'Supabase storage URL after processing';

-- ============================================================================
-- SESSION PARTICIPANTS (Attendance Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Attendance
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Engagement
  camera_enabled BOOLEAN DEFAULT false,
  mic_enabled BOOLEAN DEFAULT false,
  questions_asked INTEGER DEFAULT 0,
  reactions_sent INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_student ON session_participants(student_id);
CREATE INDEX idx_session_participants_joined ON session_participants(joined_at);

COMMENT ON TABLE session_participants IS 'Track student attendance and engagement in live sessions';

-- ============================================================================
-- SESSION REACTIONS (Real-time Emoji Feedback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'raise_hand',    -- 🙋 I have a question
    'thumbs_up',     -- 👍 I understand
    'clap',          -- 👏 Great explanation
    'confused',      -- 😕 I'm lost
    'speed_up',      -- ⚡ Too slow
    'slow_down'      -- 🐌 Too fast
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 seconds')
);

CREATE INDEX idx_session_reactions_session ON session_reactions(session_id);
CREATE INDEX idx_session_reactions_expires ON session_reactions(expires_at);
CREATE INDEX idx_session_reactions_type ON session_reactions(reaction_type);

COMMENT ON TABLE session_reactions IS 'Temporary emoji reactions during live sessions (auto-expire)';

-- Auto-cleanup expired reactions
CREATE OR REPLACE FUNCTION cleanup_expired_reactions()
RETURNS void AS $$
BEGIN
  DELETE FROM session_reactions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SESSION Q&A (Student Questions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  answered_by UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,
  answer TEXT,
  upvotes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_questions_session ON session_questions(session_id);
CREATE INDEX idx_session_questions_student ON session_questions(student_id);
CREATE INDEX idx_session_questions_answered ON session_questions(is_answered);
CREATE INDEX idx_session_questions_upvotes ON session_questions(upvotes DESC);

COMMENT ON TABLE session_questions IS 'Student questions during live sessions with upvoting';

-- ============================================================================
-- QUESTION UPVOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_question_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(question_id, student_id)
);

CREATE INDEX idx_question_upvotes_question ON session_question_upvotes(question_id);

-- Trigger to update upvote count
CREATE OR REPLACE FUNCTION update_question_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE session_questions
    SET upvotes = upvotes + 1
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE session_questions
    SET upvotes = upvotes - 1
    WHERE id = OLD.question_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_question_upvote_trigger
AFTER INSERT OR DELETE ON session_question_upvotes
FOR EACH ROW EXECUTE FUNCTION update_question_upvotes();

-- ============================================================================
-- ENABLE REALTIME FOR ALL LIVE SESSION TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE session_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_question_upvotes;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Live Sessions: Students view sessions for enrolled courses
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view sessions for enrolled courses"
  ON live_sessions FOR SELECT
  USING (
    course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    OR
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their sessions"
  ON live_sessions FOR ALL
  USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Session Participants: Students can view and update their own participation
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view all participants in their sessions"
  ON session_participants FOR SELECT
  USING (
    session_id IN (
      SELECT ls.id FROM live_sessions ls
      JOIN enrollments e ON e.course_id = ls.course_id
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update their own participation"
  ON session_participants FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all participants"
  ON session_participants FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM live_sessions
      WHERE teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

-- Session Reactions: Students can create and view reactions
ALTER TABLE session_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can create reactions in enrolled sessions"
  ON session_reactions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT ls.id FROM live_sessions ls
      JOIN enrollments e ON e.course_id = ls.course_id
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view reactions in accessible sessions"
  ON session_reactions FOR SELECT
  USING (
    session_id IN (
      SELECT ls.id FROM live_sessions ls
      WHERE ls.course_id IN (
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
      OR
      ls.teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

-- Session Questions: Students can create and view questions
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can ask questions in enrolled sessions"
  ON session_questions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT ls.id FROM live_sessions ls
      JOIN enrollments e ON e.course_id = ls.course_id
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view questions in accessible sessions"
  ON session_questions FOR SELECT
  USING (
    session_id IN (
      SELECT ls.id FROM live_sessions ls
      WHERE ls.course_id IN (
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
      OR
      ls.teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Teachers can answer questions"
  ON session_questions FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM live_sessions
      WHERE teacher_id IN (
        SELECT tp.id FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE sp.auth_user_id = auth.uid()
      )
    )
  );

-- Question Upvotes
ALTER TABLE session_question_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can upvote questions"
  ON session_question_upvotes FOR ALL
  USING (
    question_id IN (
      SELECT sq.id FROM session_questions sq
      JOIN live_sessions ls ON ls.id = sq.session_id
      JOIN enrollments e ON e.course_id = ls.course_id
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    AND
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );
