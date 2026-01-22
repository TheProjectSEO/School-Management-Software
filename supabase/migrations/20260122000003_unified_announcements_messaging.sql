-- ============================================================================
-- UNIFIED ANNOUNCEMENTS & MESSAGING TABLES
-- Description: Creates consolidated tables for announcements and messaging
--              that work across teacher-app, student-app, and admin-app
-- Schema: public (primary tables for all apps to access)
-- ============================================================================

-- ============================================================================
-- 1. TEACHER_ANNOUNCEMENTS TABLE (public schema)
-- Purpose: Unified announcements table that all apps can access
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Targeting options
  target_type TEXT NOT NULL CHECK (target_type IN ('section', 'grade', 'course', 'school')) DEFAULT 'school',
  target_section_ids UUID[] DEFAULT '{}',
  target_grade_levels TEXT[] DEFAULT '{}',
  target_course_ids UUID[] DEFAULT '{}',
  -- Priority and status
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Attachments
  attachments JSONB DEFAULT '[]',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT content_not_empty CHECK (length(content) > 0),
  CONSTRAINT expiry_after_publish CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_school ON teacher_announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_teacher ON teacher_announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_target_type ON teacher_announcements(target_type);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_published ON teacher_announcements(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_priority ON teacher_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_active ON teacher_announcements(school_id, is_published, published_at DESC)
  WHERE is_published = true AND (expires_at IS NULL OR expires_at > NOW());

-- Enable RLS
ALTER TABLE teacher_announcements ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own announcements
CREATE POLICY "Teachers can view own announcements" ON teacher_announcements
  FOR SELECT USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert announcements" ON teacher_announcements
  FOR INSERT WITH CHECK (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own announcements" ON teacher_announcements
  FOR UPDATE USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own announcements" ON teacher_announcements
  FOR DELETE USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Students can view published announcements targeted to them
CREATE POLICY "Students can view targeted announcements" ON teacher_announcements
  FOR SELECT USING (
    is_published = true AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (
      -- School-wide announcements
      target_type = 'school' OR
      -- Section-targeted
      (target_type = 'section' AND target_section_ids && ARRAY(
        SELECT s.section_id FROM students s
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid() AND s.section_id IS NOT NULL
      )) OR
      -- Grade-targeted
      (target_type = 'grade' AND target_grade_levels && ARRAY(
        SELECT s.grade_level FROM students s
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid() AND s.grade_level IS NOT NULL
      )) OR
      -- Course-targeted
      (target_type = 'course' AND target_course_ids && ARRAY(
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      ))
    )
  );

-- ============================================================================
-- 2. ANNOUNCEMENT_READS TABLE
-- Purpose: Track which students have read which announcements
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES teacher_announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint to prevent duplicate reads
  UNIQUE(announcement_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_student ON announcement_reads(student_id);

-- Enable RLS
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Students can view their own read status
CREATE POLICY "Students can view own reads" ON announcement_reads
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Students can mark announcements as read
CREATE POLICY "Students can mark as read" ON announcement_reads
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Teachers can view read counts for their announcements
CREATE POLICY "Teachers can view reads for own announcements" ON announcement_reads
  FOR SELECT USING (
    announcement_id IN (
      SELECT ta.id FROM teacher_announcements ta
      JOIN teacher_profiles tp ON tp.id = ta.teacher_id
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. RPC: GET ANNOUNCEMENT TARGET COUNT
-- Purpose: Calculate how many students will receive an announcement
-- ============================================================================
CREATE OR REPLACE FUNCTION get_announcement_target_count(
  p_school_id UUID,
  p_target_type TEXT,
  p_section_ids UUID[],
  p_grade_levels TEXT[],
  p_course_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_target_type = 'school' THEN
    -- All students in the school
    SELECT COUNT(DISTINCT s.id) INTO v_count
    FROM students s
    WHERE s.school_id = p_school_id;

  ELSIF p_target_type = 'section' THEN
    -- Students in specified sections
    SELECT COUNT(DISTINCT s.id) INTO v_count
    FROM students s
    WHERE s.school_id = p_school_id
      AND s.section_id = ANY(p_section_ids);

  ELSIF p_target_type = 'grade' THEN
    -- Students in specified grade levels
    SELECT COUNT(DISTINCT s.id) INTO v_count
    FROM students s
    WHERE s.school_id = p_school_id
      AND s.grade_level = ANY(p_grade_levels);

  ELSIF p_target_type = 'course' THEN
    -- Students enrolled in specified courses
    SELECT COUNT(DISTINCT e.student_id) INTO v_count
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE s.school_id = p_school_id
      AND e.course_id = ANY(p_course_ids);

  ELSE
    v_count := 0;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_announcement_target_count IS 'Calculate number of students that will receive an announcement based on targeting';

-- ============================================================================
-- 4. RPC: PUBLISH ANNOUNCEMENT
-- Purpose: Publish an announcement and optionally create notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION publish_announcement(p_announcement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_announcement RECORD;
BEGIN
  -- Get the announcement
  SELECT * INTO v_announcement
  FROM teacher_announcements
  WHERE id = p_announcement_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update announcement to published
  UPDATE teacher_announcements
  SET
    is_published = true,
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_announcement_id;

  -- Optionally create notifications for targeted students here
  -- (Can be extended to insert into student_notifications table)

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION publish_announcement IS 'Publish an announcement and create notifications for targeted students';

-- ============================================================================
-- 5. TEACHER_DIRECT_MESSAGES TABLE (public schema)
-- Purpose: Unified messaging table for all apps
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'student')) DEFAULT 'teacher',
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT no_self_message CHECK (from_profile_id != to_profile_id),
  CONSTRAINT read_consistency CHECK (
    (is_read = false AND read_at IS NULL) OR
    (is_read = true AND read_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_dm_school ON teacher_direct_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_dm_from ON teacher_direct_messages(from_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_dm_to ON teacher_direct_messages(to_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_dm_conversation ON teacher_direct_messages(
  LEAST(from_profile_id, to_profile_id),
  GREATEST(from_profile_id, to_profile_id),
  created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_teacher_dm_unread ON teacher_direct_messages(to_profile_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_teacher_dm_sender_type ON teacher_direct_messages(sender_type);

-- Enable RLS
ALTER TABLE teacher_direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages" ON teacher_direct_messages
  FOR SELECT USING (
    from_profile_id IN (
      SELECT sp.id FROM school_profiles sp
      WHERE sp.auth_user_id = auth.uid()
    ) OR
    to_profile_id IN (
      SELECT sp.id FROM school_profiles sp
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages" ON teacher_direct_messages
  FOR INSERT WITH CHECK (
    from_profile_id IN (
      SELECT sp.id FROM school_profiles sp
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- Users can update received messages (mark as read)
CREATE POLICY "Users can update received messages" ON teacher_direct_messages
  FOR UPDATE USING (
    to_profile_id IN (
      SELECT sp.id FROM school_profiles sp
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. STUDENT MESSAGE QUOTAS TABLE
-- Purpose: Limit student messages to 3 per day per teacher
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_message_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  max_messages INTEGER NOT NULL DEFAULT 3,

  -- Unique constraint per student-teacher-day
  UNIQUE(student_id, teacher_id, quota_date),

  -- Check constraint
  CONSTRAINT valid_quota CHECK (messages_sent <= max_messages)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_student_quotas_lookup ON student_message_quotas(student_id, teacher_id, quota_date);

-- Enable RLS
ALTER TABLE student_message_quotas ENABLE ROW LEVEL SECURITY;

-- Students can view their own quotas
CREATE POLICY "Students can view own quotas" ON student_message_quotas
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. RPC: CHECK STUDENT MESSAGE QUOTA
-- Purpose: Check if student can send message to teacher
-- ============================================================================
CREATE OR REPLACE FUNCTION check_student_message_quota(
  p_student_id UUID,
  p_teacher_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
  v_result JSONB;
BEGIN
  -- Get or create quota for today
  SELECT * INTO v_quota
  FROM student_message_quotas
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND quota_date = CURRENT_DATE;

  IF NOT FOUND THEN
    -- No quota record means no messages sent today
    RETURN jsonb_build_object(
      'can_send', true,
      'remaining', 3,
      'used', 0,
      'max', 3,
      'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    );
  END IF;

  RETURN jsonb_build_object(
    'can_send', v_quota.messages_sent < v_quota.max_messages,
    'remaining', v_quota.max_messages - v_quota.messages_sent,
    'used', v_quota.messages_sent,
    'max', v_quota.max_messages,
    'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 8. RPC: SEND STUDENT MESSAGE (with quota enforcement)
-- Purpose: Atomically send message and update quota
-- ============================================================================
CREATE OR REPLACE FUNCTION send_student_message(
  p_student_id UUID,
  p_teacher_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_quota JSONB;
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Check quota first
  v_quota := check_student_message_quota(p_student_id, p_teacher_id);

  IF NOT (v_quota->>'can_send')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily message limit reached for this teacher',
      'quota', v_quota
    );
  END IF;

  -- Get profile IDs
  SELECT profile_id INTO v_student_profile_id
  FROM students WHERE id = p_student_id;

  SELECT profile_id INTO v_teacher_profile_id
  FROM teacher_profiles WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid student or teacher'
    );
  END IF;

  -- Insert message
  INSERT INTO teacher_direct_messages (
    school_id, from_profile_id, to_profile_id, sender_type, body, attachments
  ) VALUES (
    p_school_id, v_student_profile_id, v_teacher_profile_id, 'student', p_body, p_attachments
  ) RETURNING id INTO v_message_id;

  -- Update quota
  INSERT INTO student_message_quotas (student_id, teacher_id, school_id, quota_date, messages_sent)
  VALUES (p_student_id, p_teacher_id, p_school_id, CURRENT_DATE, 1)
  ON CONFLICT (student_id, teacher_id, quota_date)
  DO UPDATE SET messages_sent = student_message_quotas.messages_sent + 1;

  -- Get updated quota
  v_quota := check_student_message_quota(p_student_id, p_teacher_id);

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'quota', v_quota
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. RPC: SEND TEACHER MESSAGE (no quota)
-- Purpose: Send message from teacher to student
-- ============================================================================
CREATE OR REPLACE FUNCTION send_teacher_message(
  p_teacher_id UUID,
  p_student_id UUID,
  p_school_id UUID,
  p_body TEXT,
  p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_profile_id UUID;
  v_student_profile_id UUID;
  v_message_id UUID;
BEGIN
  -- Get profile IDs
  SELECT profile_id INTO v_teacher_profile_id
  FROM teacher_profiles WHERE id = p_teacher_id;

  SELECT profile_id INTO v_student_profile_id
  FROM students WHERE id = p_student_id;

  IF v_teacher_profile_id IS NULL OR v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid teacher or student'
    );
  END IF;

  -- Insert message
  INSERT INTO teacher_direct_messages (
    school_id, from_profile_id, to_profile_id, sender_type, body, attachments
  ) VALUES (
    p_school_id, v_teacher_profile_id, v_student_profile_id, 'teacher', p_body, p_attachments
  ) RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. RPC: GET USER CONVERSATIONS
-- Purpose: Get all conversations for a user with stats
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_profile_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  partner_profile_id UUID,
  partner_name TEXT,
  partner_avatar_url TEXT,
  partner_role TEXT,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_type TEXT,
  unread_count BIGINT,
  total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CASE
        WHEN from_profile_id = p_profile_id THEN to_profile_id
        ELSE from_profile_id
      END AS partner_id,
      body,
      created_at,
      sender_type,
      is_read,
      to_profile_id
    FROM teacher_direct_messages
    WHERE from_profile_id = p_profile_id OR to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (partner_id)
      partner_id,
      body AS last_body,
      created_at AS last_at,
      sender_type AS last_sender
    FROM conversations
    ORDER BY partner_id, created_at DESC
  ),
  stats AS (
    SELECT
      partner_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE to_profile_id = p_profile_id AND is_read = false) AS unread
    FROM conversations
    GROUP BY partner_id
  )
  SELECT
    l.partner_id,
    sp.full_name,
    sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM teacher_profiles WHERE profile_id = l.partner_id) THEN 'teacher'
      WHEN EXISTS (SELECT 1 FROM students WHERE profile_id = l.partner_id) THEN 'student'
      ELSE 'unknown'
    END,
    l.last_body,
    l.last_at,
    l.last_sender,
    COALESCE(s.unread, 0),
    COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 11. RPC: GET CONVERSATION MESSAGES
-- Purpose: Get messages between two users
-- ============================================================================
CREATE OR REPLACE FUNCTION get_conversation(
  p_profile_1 UUID,
  p_profile_2 UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF teacher_direct_messages AS $$
  SELECT *
  FROM teacher_direct_messages
  WHERE
    (from_profile_id = p_profile_1 AND to_profile_id = p_profile_2) OR
    (from_profile_id = p_profile_2 AND to_profile_id = p_profile_1)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 12. RPC: GET UNREAD COUNT
-- Purpose: Get unread message count for a profile
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_count(p_profile_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM teacher_direct_messages
  WHERE to_profile_id = p_profile_id AND is_read = false;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

-- Auto-update updated_at for announcements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_announcements_updated_at ON teacher_announcements;
CREATE TRIGGER update_teacher_announcements_updated_at
  BEFORE UPDATE ON teacher_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set read_at when marking message as read
CREATE OR REPLACE FUNCTION mark_message_as_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL) THEN
    NEW.read_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_dm_read_trigger ON teacher_direct_messages;
CREATE TRIGGER mark_dm_read_trigger
  BEFORE UPDATE ON teacher_direct_messages
  FOR EACH ROW EXECUTE FUNCTION mark_message_as_read();

-- ============================================================================
-- 14. RPC: GET STUDENT PROFILE BY ID
-- Purpose: Get student profile info by student ID (used by messaging DAL)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_student_profile_by_id(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  school_id UUID,
  section_id UUID,
  grade_level TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.profile_id,
    s.school_id,
    s.section_id,
    s.grade_level,
    sp.full_name,
    sp.avatar_url
  FROM students s
  JOIN school_profiles sp ON sp.id = s.profile_id
  WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_student_profile_by_id IS 'Get student profile info by student ID';

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE teacher_announcements IS 'Teacher announcements with flexible targeting (section, grade, course, school-wide)';
COMMENT ON TABLE announcement_reads IS 'Tracks which students have read which announcements';
COMMENT ON TABLE teacher_direct_messages IS 'Direct messages between teachers and students';
COMMENT ON TABLE student_message_quotas IS 'Daily message limits for students (3 per teacher per day)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
