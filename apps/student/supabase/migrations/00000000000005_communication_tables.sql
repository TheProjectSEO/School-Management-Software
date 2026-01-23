-- ============================================================================
-- COMMUNICATION TABLES FOR STUDENT APP
-- Description: Creates announcements and messages tables for student portal
-- Schema: public (school software)
-- ============================================================================

-- ============================================================================
-- 1. ANNOUNCEMENTS TABLE
-- Purpose: Announcements from teachers to students (course or school-wide)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'reminder', 'general')) DEFAULT 'general',
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments_json JSONB,
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT message_not_empty CHECK (length(message) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_section ON announcements(section_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned, published_at DESC);

-- RLS Policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Students can view announcements from their school, courses, or sections
CREATE POLICY "Students can view relevant announcements" ON announcements
  FOR SELECT USING (
    -- School-wide announcements (no course/section specified)
    (course_id IS NULL AND section_id IS NULL) OR
    -- Course-specific announcements for enrolled courses
    (course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )) OR
    -- Section-specific announcements for student's section
    (section_id IN (
      SELECT s.section_id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 2. DIRECT MESSAGES TABLE
-- Purpose: Direct messages between teachers and students
-- ============================================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  to_teacher_id UUID,  -- Will be linked when teacher system is integrated
  from_teacher_id UUID,  -- Will be linked when teacher system is integrated
  to_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT valid_participants CHECK (
    (from_student_id IS NOT NULL AND to_teacher_id IS NOT NULL) OR
    (from_teacher_id IS NOT NULL AND to_student_id IS NOT NULL)
  ),
  CONSTRAINT read_consistency CHECK (
    (is_read = false AND read_at IS NULL) OR
    (is_read = true AND read_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_school ON direct_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_from_student ON direct_messages(from_student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_to_student ON direct_messages(to_student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_parent ON direct_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(to_student_id, is_read) WHERE is_read = false;

-- RLS Policies
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Students can view messages they sent or received
CREATE POLICY "Students can view own messages" ON direct_messages
  FOR SELECT USING (
    from_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    ) OR
    to_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Students can send messages
CREATE POLICY "Students can send messages" ON direct_messages
  FOR INSERT WITH CHECK (
    from_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Students can update their received messages (mark as read)
CREATE POLICY "Students can update received messages" ON direct_messages
  FOR UPDATE USING (
    to_student_id IN (
      SELECT s.id FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. MESSAGE CONVERSATIONS VIEW
-- Purpose: Simplified view for conversation threads
-- ============================================================================
CREATE OR REPLACE VIEW message_conversations AS
SELECT
  dm.id,
  dm.school_id,
  dm.from_student_id,
  dm.to_teacher_id,
  dm.from_teacher_id,
  dm.to_student_id,
  dm.subject,
  dm.body,
  dm.is_read,
  dm.read_at,
  dm.parent_message_id,
  dm.created_at,
  -- Get student name if message is from student
  CASE
    WHEN dm.from_student_id IS NOT NULL THEN (
      SELECT p.full_name FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE s.id = dm.from_student_id
    )
    ELSE NULL
  END as from_name,
  -- Get teacher name placeholder (will be updated when teacher system integrated)
  CASE
    WHEN dm.from_teacher_id IS NOT NULL THEN 'Teacher'
    ELSE NULL
  END as from_teacher_name
FROM direct_messages dm;

-- ============================================================================
-- 4. UPDATE TRIGGERS
-- ============================================================================

-- Trigger for announcements updated_at
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_message_read_trigger ON direct_messages;
CREATE TRIGGER mark_message_read_trigger
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION mark_message_read();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Get unread message count for a student
CREATE OR REPLACE FUNCTION get_student_unread_message_count(p_student_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM direct_messages
  WHERE to_student_id = p_student_id AND is_read = false;
$$ LANGUAGE sql STABLE;

-- Get unread notification count for a student
CREATE OR REPLACE FUNCTION get_student_unread_notification_count(p_student_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE student_id = p_student_id AND is_read = false;
$$ LANGUAGE sql STABLE;

-- Get active announcements for a student
CREATE OR REPLACE FUNCTION get_student_announcements(p_student_id UUID)
RETURNS SETOF announcements AS $$
  SELECT DISTINCT a.*
  FROM announcements a
  LEFT JOIN students s ON s.id = p_student_id
  LEFT JOIN enrollments e ON e.student_id = s.id
  WHERE
    (a.published_at <= NOW()) AND
    (a.expires_at IS NULL OR a.expires_at > NOW()) AND
    (
      -- School-wide announcements
      (a.course_id IS NULL AND a.section_id IS NULL AND a.school_id = s.school_id) OR
      -- Course-specific announcements
      (a.course_id = e.course_id) OR
      -- Section-specific announcements
      (a.section_id = s.section_id)
    )
  ORDER BY a.is_pinned DESC, a.published_at DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE announcements IS 'Teacher announcements for courses, sections, or school-wide';
COMMENT ON TABLE direct_messages IS 'Direct messages between students and teachers';
COMMENT ON COLUMN announcements.type IS 'Type of announcement: assignment, exam, reminder, general';
COMMENT ON COLUMN announcements.priority IS 'Priority level: normal, urgent';
COMMENT ON COLUMN announcements.attachments_json IS 'Array of attachment references';
COMMENT ON COLUMN direct_messages.parent_message_id IS 'Reference to parent message for threading';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
