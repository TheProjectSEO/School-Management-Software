-- Migration 006: Teacher Communication Tables
-- Description: Creates tables for announcements, discussions, and direct messages
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER ANNOUNCEMENTS TABLE
-- Purpose: Announcements scoped to sections, courses, or schools
-- Links to: schools, sections, courses (polymorphic via scope)
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('section', 'course', 'school')),
  scope_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_pinned BOOLEAN DEFAULT false,
  publish_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT expiry_after_publish CHECK (expires_at IS NULL OR expires_at > publish_at)
);

-- Indexes for performance
CREATE INDEX idx_teacher_announcements_scope ON n8n_content_creation.teacher_announcements(scope_type, scope_id);
CREATE INDEX idx_teacher_announcements_created_by ON n8n_content_creation.teacher_announcements(created_by);
CREATE INDEX idx_teacher_announcements_publish_at ON n8n_content_creation.teacher_announcements(publish_at DESC);
CREATE INDEX idx_teacher_announcements_pinned ON n8n_content_creation.teacher_announcements(is_pinned, publish_at DESC);
CREATE INDEX idx_teacher_announcements_active ON n8n_content_creation.teacher_announcements(scope_type, scope_id, publish_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_announcements IS 'Teacher announcements scoped to sections, courses, or schools';
COMMENT ON COLUMN n8n_content_creation.teacher_announcements.scope_type IS 'Target audience: section, course, or school';
COMMENT ON COLUMN n8n_content_creation.teacher_announcements.scope_id IS 'ID of section, course, or school';
COMMENT ON COLUMN n8n_content_creation.teacher_announcements.attachments_json IS 'Array of attachment references: [{"type": "file", "url": "...", "name": "..."}]';
COMMENT ON COLUMN n8n_content_creation.teacher_announcements.is_pinned IS 'Whether announcement is pinned to top';

-- ============================================================================
-- TEACHER DISCUSSION THREADS TABLE
-- Purpose: Discussion threads for courses/sections
-- Links to: courses, sections
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_discussion_threads_course ON n8n_content_creation.teacher_discussion_threads(course_id);
CREATE INDEX idx_teacher_discussion_threads_section ON n8n_content_creation.teacher_discussion_threads(section_id);
CREATE INDEX idx_teacher_discussion_threads_created_by ON n8n_content_creation.teacher_discussion_threads(created_by);
CREATE INDEX idx_teacher_discussion_threads_pinned ON n8n_content_creation.teacher_discussion_threads(course_id, is_pinned, created_at DESC);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_discussion_threads IS 'Discussion threads for course/section forums';
COMMENT ON COLUMN n8n_content_creation.teacher_discussion_threads.is_locked IS 'Whether thread is locked (no new posts)';
COMMENT ON COLUMN n8n_content_creation.teacher_discussion_threads.is_pinned IS 'Whether thread is pinned to top';

-- ============================================================================
-- TEACHER DISCUSSION POSTS TABLE
-- Purpose: Individual posts within discussion threads
-- Links to: teacher_discussion_threads, profiles
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_discussion_threads(id) ON DELETE CASCADE,
  parent_post_id UUID REFERENCES n8n_content_creation.teacher_discussion_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments_json JSONB,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  is_teacher_post BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT no_self_parent CHECK (parent_post_id IS NULL OR parent_post_id != id)
);

-- Indexes for performance
CREATE INDEX idx_teacher_discussion_posts_thread ON n8n_content_creation.teacher_discussion_posts(thread_id, created_at);
CREATE INDEX idx_teacher_discussion_posts_parent ON n8n_content_creation.teacher_discussion_posts(parent_post_id);
CREATE INDEX idx_teacher_discussion_posts_created_by ON n8n_content_creation.teacher_discussion_posts(created_by);
CREATE INDEX idx_teacher_discussion_posts_teacher ON n8n_content_creation.teacher_discussion_posts(is_teacher_post);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_discussion_posts IS 'Posts within discussion threads (supports nested replies)';
COMMENT ON COLUMN n8n_content_creation.teacher_discussion_posts.parent_post_id IS 'Parent post ID for threaded replies (NULL for top-level)';
COMMENT ON COLUMN n8n_content_creation.teacher_discussion_posts.is_teacher_post IS 'Whether post is from a teacher (for highlighting)';
COMMENT ON COLUMN n8n_content_creation.teacher_discussion_posts.attachments_json IS 'Array of attachment references';

-- ============================================================================
-- TEACHER DIRECT MESSAGES TABLE
-- Purpose: One-to-one direct messages between teachers and students
-- Links to: schools, profiles
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES n8n_content_creation.schools(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT body_not_empty CHECK (length(body) > 0),
  CONSTRAINT no_self_message CHECK (from_profile_id != to_profile_id),
  CONSTRAINT read_consistency CHECK (
    (is_read = false AND read_at IS NULL) OR
    (is_read = true AND read_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_direct_messages_school ON n8n_content_creation.teacher_direct_messages(school_id);
CREATE INDEX idx_teacher_direct_messages_from ON n8n_content_creation.teacher_direct_messages(from_profile_id, created_at DESC);
CREATE INDEX idx_teacher_direct_messages_to ON n8n_content_creation.teacher_direct_messages(to_profile_id, created_at DESC);
CREATE INDEX idx_teacher_direct_messages_conversation ON n8n_content_creation.teacher_direct_messages(from_profile_id, to_profile_id, created_at DESC);
CREATE INDEX idx_teacher_direct_messages_unread ON n8n_content_creation.teacher_direct_messages(to_profile_id, is_read)
  WHERE is_read = false;

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_direct_messages IS 'Direct messages between teachers and students';
COMMENT ON COLUMN n8n_content_creation.teacher_direct_messages.school_id IS 'School context for message (for RLS enforcement)';
COMMENT ON COLUMN n8n_content_creation.teacher_direct_messages.attachments_json IS 'Array of attachment references';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_teacher_announcements_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_announcements
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_discussion_threads_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_discussion_threads
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_discussion_posts_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_discussion_posts
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- TRIGGER: Update thread timestamp when new post is added
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.update_thread_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE n8n_content_creation.teacher_discussion_threads
  SET updated_at = NEW.created_at
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_on_post_trigger
  AFTER INSERT ON n8n_content_creation.teacher_discussion_posts
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_thread_on_post();

-- ============================================================================
-- TRIGGER: Mark message as read
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.mark_message_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_message_read_trigger
  BEFORE UPDATE ON n8n_content_creation.teacher_direct_messages
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.mark_message_read();

-- ============================================================================
-- HELPER FUNCTION: Get conversation between two profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_conversation(
  p_profile_1 UUID,
  p_profile_2 UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF n8n_content_creation.teacher_direct_messages AS $$
  SELECT *
  FROM n8n_content_creation.teacher_direct_messages
  WHERE
    (from_profile_id = p_profile_1 AND to_profile_id = p_profile_2) OR
    (from_profile_id = p_profile_2 AND to_profile_id = p_profile_1)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_conversation IS 'Returns conversation messages between two profiles';

-- ============================================================================
-- HELPER FUNCTION: Get unread message count for a profile
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_unread_count(p_profile_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM n8n_content_creation.teacher_direct_messages
  WHERE to_profile_id = p_profile_id AND is_read = false;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_unread_count IS 'Returns count of unread messages for a profile';

-- ============================================================================
-- HELPER FUNCTION: Get active announcements for a scope
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_active_announcements(
  p_scope_type TEXT,
  p_scope_id UUID
)
RETURNS SETOF n8n_content_creation.teacher_announcements AS $$
  SELECT *
  FROM n8n_content_creation.teacher_announcements
  WHERE
    scope_type = p_scope_type
    AND scope_id = p_scope_id
    AND publish_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY
    is_pinned DESC,
    publish_at DESC;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_active_announcements IS 'Returns active (published, non-expired) announcements for a scope';

-- ============================================================================
-- HELPER FUNCTION: Get thread post count
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_thread_post_count(p_thread_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM n8n_content_creation.teacher_discussion_posts
  WHERE thread_id = p_thread_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_thread_post_count IS 'Returns total number of posts in a thread';

-- ============================================================================
-- VALIDATION FUNCTION: Prevent posting in locked threads
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.validate_thread_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  v_is_locked BOOLEAN;
BEGIN
  SELECT is_locked INTO v_is_locked
  FROM n8n_content_creation.teacher_discussion_threads
  WHERE id = NEW.thread_id;

  IF v_is_locked THEN
    RAISE EXCEPTION 'Cannot post to locked thread';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_thread_not_locked_trigger
  BEFORE INSERT ON n8n_content_creation.teacher_discussion_posts
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.validate_thread_not_locked();

-- ============================================================================
-- END OF MIGRATION 006
-- ============================================================================
