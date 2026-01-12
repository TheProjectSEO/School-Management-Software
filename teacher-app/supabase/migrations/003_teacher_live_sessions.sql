-- Migration 003: Teacher Live Sessions & Attendance Tables
-- Description: Creates tables for live sessions, presence tracking, and attendance
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER LIVE SESSIONS TABLE
-- Purpose: Schedules and tracks live class sessions
-- Links to: courses, sections, modules
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  module_id UUID REFERENCES n8n_content_creation.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  provider TEXT CHECK (provider IN ('zoom', 'meet', 'teams', 'livekit', 'daily', 'internal')),
  room_id TEXT,
  join_url TEXT,
  recording_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT scheduled_times_valid CHECK (scheduled_end IS NULL OR scheduled_end > scheduled_start),
  CONSTRAINT actual_times_valid CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
);

-- Indexes for performance
CREATE INDEX idx_teacher_live_sessions_course ON n8n_content_creation.teacher_live_sessions(course_id);
CREATE INDEX idx_teacher_live_sessions_section ON n8n_content_creation.teacher_live_sessions(section_id);
CREATE INDEX idx_teacher_live_sessions_module ON n8n_content_creation.teacher_live_sessions(module_id);
CREATE INDEX idx_teacher_live_sessions_status ON n8n_content_creation.teacher_live_sessions(status);
CREATE INDEX idx_teacher_live_sessions_scheduled ON n8n_content_creation.teacher_live_sessions(scheduled_start, scheduled_end);
CREATE INDEX idx_teacher_live_sessions_created_by ON n8n_content_creation.teacher_live_sessions(created_by);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_live_sessions IS 'Scheduled and live class sessions with video provider integration';
COMMENT ON COLUMN n8n_content_creation.teacher_live_sessions.provider IS 'Video conferencing provider: zoom, meet, teams, livekit, daily, or internal';
COMMENT ON COLUMN n8n_content_creation.teacher_live_sessions.status IS 'Session status: scheduled, live, ended, or cancelled';
COMMENT ON COLUMN n8n_content_creation.teacher_live_sessions.room_id IS 'Provider-specific room/meeting identifier';

-- ============================================================================
-- TEACHER SESSION PRESENCE TABLE
-- Purpose: Tracks student join/leave events during live sessions
-- Links to: teacher_live_sessions, students
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_session_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ping_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT times_valid CHECK (left_at IS NULL OR left_at > joined_at),
  CONSTRAINT duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT ping_count_non_negative CHECK (ping_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_session_presence_session ON n8n_content_creation.teacher_session_presence(session_id);
CREATE INDEX idx_teacher_session_presence_student ON n8n_content_creation.teacher_session_presence(student_id);
CREATE INDEX idx_teacher_session_presence_joined ON n8n_content_creation.teacher_session_presence(joined_at);
CREATE INDEX idx_teacher_session_presence_composite ON n8n_content_creation.teacher_session_presence(session_id, student_id, joined_at);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_session_presence IS 'Tracks student presence events during live sessions';
COMMENT ON COLUMN n8n_content_creation.teacher_session_presence.duration_seconds IS 'Calculated duration between join and leave';
COMMENT ON COLUMN n8n_content_creation.teacher_session_presence.ping_count IS 'Number of ping/heartbeat signals received';

-- ============================================================================
-- TEACHER ATTENDANCE TABLE
-- Purpose: Per-session attendance status with auto-detection and manual override
-- Links to: teacher_live_sessions, students
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
  detected_from_presence BOOLEAN DEFAULT false,
  manual_override BOOLEAN DEFAULT false,
  notes TEXT,
  updated_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(session_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_teacher_attendance_session ON n8n_content_creation.teacher_attendance(session_id);
CREATE INDEX idx_teacher_attendance_student ON n8n_content_creation.teacher_attendance(student_id);
CREATE INDEX idx_teacher_attendance_status ON n8n_content_creation.teacher_attendance(status);
CREATE INDEX idx_teacher_attendance_manual ON n8n_content_creation.teacher_attendance(manual_override);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_attendance IS 'Per-session attendance with auto-detection and manual override';
COMMENT ON COLUMN n8n_content_creation.teacher_attendance.detected_from_presence IS 'Whether status was automatically determined from presence data';
COMMENT ON COLUMN n8n_content_creation.teacher_attendance.manual_override IS 'Whether teacher manually overrode the status';

-- ============================================================================
-- TEACHER DAILY ATTENDANCE TABLE
-- Purpose: Daily attendance tracking across all sessions/activities
-- Links to: students
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES n8n_content_creation.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  detected_from_login BOOLEAN DEFAULT true,
  manual_override BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(student_id, date),
  CONSTRAINT times_valid CHECK (last_seen_at IS NULL OR first_seen_at IS NULL OR last_seen_at >= first_seen_at)
);

-- Indexes for performance
CREATE INDEX idx_teacher_daily_attendance_student ON n8n_content_creation.teacher_daily_attendance(student_id);
CREATE INDEX idx_teacher_daily_attendance_date ON n8n_content_creation.teacher_daily_attendance(date DESC);
CREATE INDEX idx_teacher_daily_attendance_status ON n8n_content_creation.teacher_daily_attendance(status);
CREATE INDEX idx_teacher_daily_attendance_composite ON n8n_content_creation.teacher_daily_attendance(student_id, date);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_daily_attendance IS 'Daily attendance tracking with login detection';
COMMENT ON COLUMN n8n_content_creation.teacher_daily_attendance.detected_from_login IS 'Whether attendance was detected from student login';
COMMENT ON COLUMN n8n_content_creation.teacher_daily_attendance.manual_override IS 'Whether teacher manually set the status';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_teacher_live_sessions_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_live_sessions
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_attendance_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_daily_attendance_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_daily_attendance
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-calculate duration when session presence ends
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.calculate_presence_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND NEW.joined_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_presence_duration_trigger
  BEFORE INSERT OR UPDATE ON n8n_content_creation.teacher_session_presence
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.calculate_presence_duration();

-- ============================================================================
-- HELPER FUNCTION: Get total presence time for a student in a session
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_student_session_duration(
  p_session_id UUID,
  p_student_id UUID
)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(duration_seconds), 0)::INTEGER
  FROM n8n_content_creation.teacher_session_presence
  WHERE session_id = p_session_id
    AND student_id = p_student_id
    AND duration_seconds IS NOT NULL;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_student_session_duration IS 'Returns total duration (seconds) student was present in a session';

-- ============================================================================
-- HELPER FUNCTION: Auto-detect attendance status from presence data
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.detect_attendance_status(
  p_session_id UUID,
  p_student_id UUID,
  p_threshold_minutes INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
  total_minutes INTEGER;
  session_duration INTEGER;
  join_time TIMESTAMPTZ;
  session_start TIMESTAMPTZ;
BEGIN
  -- Get total presence time
  SELECT get_student_session_duration(p_session_id, p_student_id) / 60 INTO total_minutes;

  -- Get first join time
  SELECT MIN(joined_at) INTO join_time
  FROM n8n_content_creation.teacher_session_presence
  WHERE session_id = p_session_id AND student_id = p_student_id;

  -- Get session start time
  SELECT scheduled_start INTO session_start
  FROM n8n_content_creation.teacher_live_sessions
  WHERE id = p_session_id;

  -- No presence data = absent
  IF total_minutes IS NULL OR total_minutes = 0 THEN
    RETURN 'absent';
  END IF;

  -- Joined late (more than 15 minutes after start)
  IF join_time > session_start + INTERVAL '15 minutes' THEN
    RETURN 'late';
  END IF;

  -- Present if attended for threshold duration
  IF total_minutes >= p_threshold_minutes THEN
    RETURN 'present';
  END IF;

  RETURN 'late';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION n8n_content_creation.detect_attendance_status IS 'Auto-detects attendance status based on presence data';

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================
