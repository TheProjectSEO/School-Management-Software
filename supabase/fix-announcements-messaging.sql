-- ============================================================================
-- FIX ANNOUNCEMENTS & MESSAGING TABLES
-- Run this SQL script in your Supabase SQL Editor to set up the unified
-- announcements and messaging tables for both teacher and student apps.
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING TABLES/FUNCTIONS TO START FRESH
-- These may exist in different schemas or with different structures
-- ============================================================================

-- Drop functions first (they may reference the tables)
DROP FUNCTION IF EXISTS get_announcement_target_count(UUID, TEXT, UUID[], TEXT[], UUID[]) CASCADE;
DROP FUNCTION IF EXISTS publish_announcement(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_student_message_quota(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS send_student_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_teacher_message(UUID, UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_conversation(UUID, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_unread_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_student_profile_by_id(UUID) CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS teacher_announcements CASCADE;
DROP TABLE IF EXISTS student_message_quotas CASCADE;
DROP TABLE IF EXISTS teacher_direct_messages CASCADE;

-- Also drop from n8n_content_creation schema if they exist there
DROP TABLE IF EXISTS n8n_content_creation.teacher_announcements CASCADE;
DROP TABLE IF EXISTS n8n_content_creation.teacher_direct_messages CASCADE;

-- ============================================================================
-- STEP 2: CREATE TEACHER_ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE teacher_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('section', 'grade', 'course', 'school')) DEFAULT 'school',
  target_section_ids UUID[] DEFAULT '{}',
  target_grade_levels TEXT[] DEFAULT '{}',
  target_course_ids UUID[] DEFAULT '{}',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT content_not_empty CHECK (length(content) > 0)
);

-- Indexes
CREATE INDEX idx_teacher_announcements_school ON teacher_announcements(school_id);
CREATE INDEX idx_teacher_announcements_teacher ON teacher_announcements(teacher_id);
CREATE INDEX idx_teacher_announcements_published ON teacher_announcements(is_published, published_at DESC);

-- Enable RLS
ALTER TABLE teacher_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

CREATE POLICY "Students can view targeted announcements" ON teacher_announcements
  FOR SELECT USING (
    is_published = true AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (
      target_type = 'school' OR
      (target_type = 'section' AND target_section_ids && ARRAY(
        SELECT s.section_id FROM students s
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid() AND s.section_id IS NOT NULL
      )) OR
      (target_type = 'grade' AND target_grade_levels && ARRAY(
        SELECT s.grade_level FROM students s
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid() AND s.grade_level IS NOT NULL
      )) OR
      (target_type = 'course' AND target_course_ids && ARRAY(
        SELECT e.course_id FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE sp.auth_user_id = auth.uid()
      ))
    )
  );

-- ============================================================================
-- STEP 3: CREATE ANNOUNCEMENT_READS TABLE
-- ============================================================================
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES teacher_announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, student_id)
);

CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_student ON announcement_reads(student_id);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own reads" ON announcement_reads
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can mark as read" ON announcement_reads
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

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
-- STEP 4: CREATE TEACHER_DIRECT_MESSAGES TABLE
-- ============================================================================
CREATE TABLE teacher_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES school_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'student')) DEFAULT 'teacher',
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT no_self_message CHECK (from_profile_id != to_profile_id)
);

CREATE INDEX idx_teacher_dm_from ON teacher_direct_messages(from_profile_id, created_at DESC);
CREATE INDEX idx_teacher_dm_to ON teacher_direct_messages(to_profile_id, created_at DESC);
CREATE INDEX idx_teacher_dm_unread ON teacher_direct_messages(to_profile_id, is_read) WHERE is_read = false;

ALTER TABLE teacher_direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON teacher_direct_messages
  FOR SELECT USING (
    from_profile_id IN (SELECT sp.id FROM school_profiles sp WHERE sp.auth_user_id = auth.uid()) OR
    to_profile_id IN (SELECT sp.id FROM school_profiles sp WHERE sp.auth_user_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON teacher_direct_messages
  FOR INSERT WITH CHECK (
    from_profile_id IN (SELECT sp.id FROM school_profiles sp WHERE sp.auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update received messages" ON teacher_direct_messages
  FOR UPDATE USING (
    to_profile_id IN (SELECT sp.id FROM school_profiles sp WHERE sp.auth_user_id = auth.uid())
  );

-- ============================================================================
-- STEP 5: CREATE STUDENT_MESSAGE_QUOTAS TABLE
-- ============================================================================
CREATE TABLE student_message_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  max_messages INTEGER NOT NULL DEFAULT 3,
  UNIQUE(student_id, teacher_id, quota_date),
  CONSTRAINT valid_quota CHECK (messages_sent <= max_messages)
);

CREATE INDEX idx_student_quotas_lookup ON student_message_quotas(student_id, teacher_id, quota_date);

ALTER TABLE student_message_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own quotas" ON student_message_quotas
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: CREATE RPC FUNCTIONS
-- ============================================================================

-- Get announcement target count
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
    SELECT COUNT(DISTINCT s.id) INTO v_count FROM students s WHERE s.school_id = p_school_id;
  ELSIF p_target_type = 'section' THEN
    SELECT COUNT(DISTINCT s.id) INTO v_count FROM students s
    WHERE s.school_id = p_school_id AND s.section_id = ANY(p_section_ids);
  ELSIF p_target_type = 'grade' THEN
    SELECT COUNT(DISTINCT s.id) INTO v_count FROM students s
    WHERE s.school_id = p_school_id AND s.grade_level = ANY(p_grade_levels);
  ELSIF p_target_type = 'course' THEN
    SELECT COUNT(DISTINCT e.student_id) INTO v_count FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE s.school_id = p_school_id AND e.course_id = ANY(p_course_ids);
  ELSE
    v_count := 0;
  END IF;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Publish announcement
CREATE OR REPLACE FUNCTION publish_announcement(p_announcement_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE teacher_announcements
  SET is_published = true, published_at = NOW(), updated_at = NOW()
  WHERE id = p_announcement_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check student message quota
CREATE OR REPLACE FUNCTION check_student_message_quota(p_student_id UUID, p_teacher_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
BEGIN
  SELECT * INTO v_quota FROM student_message_quotas
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id AND quota_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_send', true, 'remaining', 3, 'used', 0, 'max', 3, 'resets_at', (CURRENT_DATE + INTERVAL '1 day')::timestamptz);
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

-- Send student message (with quota)
CREATE OR REPLACE FUNCTION send_student_message(
  p_student_id UUID, p_teacher_id UUID, p_school_id UUID, p_body TEXT, p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_quota JSONB;
  v_student_profile_id UUID;
  v_teacher_profile_id UUID;
  v_message_id UUID;
BEGIN
  v_quota := check_student_message_quota(p_student_id, p_teacher_id);
  IF NOT (v_quota->>'can_send')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily message limit reached', 'quota', v_quota);
  END IF;

  SELECT profile_id INTO v_student_profile_id FROM students WHERE id = p_student_id;
  SELECT profile_id INTO v_teacher_profile_id FROM teacher_profiles WHERE id = p_teacher_id;

  IF v_student_profile_id IS NULL OR v_teacher_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid student or teacher');
  END IF;

  INSERT INTO teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_student_profile_id, v_teacher_profile_id, 'student', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  INSERT INTO student_message_quotas (student_id, teacher_id, school_id, quota_date, messages_sent)
  VALUES (p_student_id, p_teacher_id, p_school_id, CURRENT_DATE, 1)
  ON CONFLICT (student_id, teacher_id, quota_date) DO UPDATE SET messages_sent = student_message_quotas.messages_sent + 1;

  v_quota := check_student_message_quota(p_student_id, p_teacher_id);
  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'quota', v_quota);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send teacher message (no quota)
CREATE OR REPLACE FUNCTION send_teacher_message(
  p_teacher_id UUID, p_student_id UUID, p_school_id UUID, p_body TEXT, p_attachments JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_profile_id UUID;
  v_student_profile_id UUID;
  v_message_id UUID;
BEGIN
  SELECT profile_id INTO v_teacher_profile_id FROM teacher_profiles WHERE id = p_teacher_id;
  SELECT profile_id INTO v_student_profile_id FROM students WHERE id = p_student_id;

  IF v_teacher_profile_id IS NULL OR v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid teacher or student');
  END IF;

  INSERT INTO teacher_direct_messages (school_id, from_profile_id, to_profile_id, sender_type, body, attachments)
  VALUES (p_school_id, v_teacher_profile_id, v_student_profile_id, 'teacher', p_body, p_attachments)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user conversations
CREATE OR REPLACE FUNCTION get_user_conversations(p_profile_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  partner_profile_id UUID, partner_name TEXT, partner_avatar_url TEXT, partner_role TEXT,
  last_message_body TEXT, last_message_at TIMESTAMPTZ, last_message_sender_type TEXT,
  unread_count BIGINT, total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CASE WHEN tdm.from_profile_id = p_profile_id THEN tdm.to_profile_id ELSE tdm.from_profile_id END AS partner_id,
      tdm.body, tdm.created_at, tdm.sender_type, tdm.is_read, tdm.to_profile_id
    FROM teacher_direct_messages tdm
    WHERE tdm.from_profile_id = p_profile_id OR tdm.to_profile_id = p_profile_id
  ),
  latest_per_partner AS (
    SELECT DISTINCT ON (c.partner_id) c.partner_id, c.body AS last_body, c.created_at AS last_at, c.sender_type AS last_sender
    FROM conversations c ORDER BY c.partner_id, c.created_at DESC
  ),
  stats AS (
    SELECT c.partner_id, COUNT(*) AS total,
      COUNT(*) FILTER (WHERE c.to_profile_id = p_profile_id AND c.is_read = false) AS unread
    FROM conversations c GROUP BY c.partner_id
  )
  SELECT l.partner_id, sp.full_name, sp.avatar_url,
    CASE
      WHEN EXISTS (SELECT 1 FROM teacher_profiles tp WHERE tp.profile_id = l.partner_id) THEN 'teacher'::TEXT
      WHEN EXISTS (SELECT 1 FROM students st WHERE st.profile_id = l.partner_id) THEN 'student'::TEXT
      ELSE 'unknown'::TEXT
    END,
    l.last_body, l.last_at, l.last_sender, COALESCE(s.unread, 0), COALESCE(s.total, 0)
  FROM latest_per_partner l
  JOIN school_profiles sp ON sp.id = l.partner_id
  LEFT JOIN stats s ON s.partner_id = l.partner_id
  ORDER BY l.last_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get conversation messages
CREATE OR REPLACE FUNCTION get_conversation(p_profile_1 UUID, p_profile_2 UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS SETOF teacher_direct_messages AS $$
  SELECT * FROM teacher_direct_messages
  WHERE (from_profile_id = p_profile_1 AND to_profile_id = p_profile_2)
     OR (from_profile_id = p_profile_2 AND to_profile_id = p_profile_1)
  ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- Get unread count
CREATE OR REPLACE FUNCTION get_unread_count(p_profile_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM teacher_direct_messages WHERE to_profile_id = p_profile_id AND is_read = false;
$$ LANGUAGE sql STABLE;

-- Get student profile by ID
CREATE OR REPLACE FUNCTION get_student_profile_by_id(p_student_id UUID)
RETURNS TABLE (id UUID, profile_id UUID, school_id UUID, section_id UUID, grade_level TEXT, full_name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.profile_id, s.school_id, s.section_id, s.grade_level, sp.full_name, sp.avatar_url
  FROM students s JOIN school_profiles sp ON sp.id = s.profile_id WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Mark messages as delivered (when user opens conversation)
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE teacher_direct_messages
  SET delivered_at = COALESCE(delivered_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND delivered_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE teacher_direct_messages
  SET is_read = true, read_at = COALESCE(read_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: CREATE TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_announcements_updated_at ON teacher_announcements;
CREATE TRIGGER update_teacher_announcements_updated_at
  BEFORE UPDATE ON teacher_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mark message as read trigger
CREATE OR REPLACE FUNCTION mark_message_as_read() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL) THEN NEW.read_at := NOW(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_dm_read_trigger ON teacher_direct_messages;
CREATE TRIGGER mark_dm_read_trigger
  BEFORE UPDATE ON teacher_direct_messages FOR EACH ROW EXECUTE FUNCTION mark_message_as_read();

-- ============================================================================
-- DONE! Tables and functions are ready.
-- ============================================================================
SELECT 'Announcements and Messaging tables created successfully!' AS status;
