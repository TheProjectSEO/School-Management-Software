-- MSU Complete Foundation: Session Recording Storage
-- Migration: 20260119000004_recording_storage.sql

-- ============================================================================
-- STORAGE BUCKET FOR SESSION RECORDINGS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-recordings',
  'session-recordings',
  false,  -- Private bucket, requires authentication
  2147483648,  -- 2GB per file
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS POLICIES FOR SESSION RECORDINGS BUCKET
-- ============================================================================

-- Students can view recordings for sessions in their enrolled courses
CREATE POLICY "Students can view recordings for enrolled courses"
ON storage.objects FOR SELECT USING (
  bucket_id = 'session-recordings' AND
  -- Extract session ID from file path (format: <session-id>/recording.mp4)
  (SELECT ls.course_id FROM live_sessions ls
   WHERE ls.id::text = split_part(name, '/', 1)::uuid
  ) IN (
    SELECT e.course_id FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can view recordings for their sessions
CREATE POLICY "Teachers can view recordings for their sessions"
ON storage.objects FOR SELECT USING (
  bucket_id = 'session-recordings' AND
  (SELECT ls.teacher_id FROM live_sessions ls
   WHERE ls.id::text = split_part(name, '/', 1)::uuid
  ) IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Teachers can upload recordings for their sessions
CREATE POLICY "Teachers can upload recordings for their sessions"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'session-recordings' AND
  (SELECT ls.teacher_id FROM live_sessions ls
   WHERE ls.id::text = split_part(name, '/', 1)::uuid
  ) IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- System/service role can delete old recordings
CREATE POLICY "Service role can delete recordings"
ON storage.objects FOR DELETE USING (
  bucket_id = 'session-recordings' AND
  auth.role() = 'service_role'
);

-- Admins can manage all recordings
CREATE POLICY "Admins can manage all recordings"
ON storage.objects FOR ALL USING (
  bucket_id = 'session-recordings' AND
  auth.uid() IN (
    SELECT sp.auth_user_id FROM school_profiles sp
    WHERE sp.role = 'admin'
  )
);

-- ============================================================================
-- HELPER FUNCTION: Get Recording URL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recording_url(session_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  recording_path TEXT;
  signed_url TEXT;
BEGIN
  -- Get the recording path from live_sessions
  SELECT recording_url INTO recording_path
  FROM live_sessions
  WHERE id = session_uuid;

  IF recording_path IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the path (frontend will handle signed URL generation)
  RETURN recording_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_recording_url IS 'Returns recording storage path for a session';

-- ============================================================================
-- HELPER FUNCTION: Clean Up Old Recordings (Retention Policy)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_recordings(retention_days INTEGER DEFAULT 180)
RETURNS TABLE (
  deleted_count INTEGER,
  freed_bytes BIGINT
) AS $$
DECLARE
  total_deleted INTEGER := 0;
  total_bytes BIGINT := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Get stats before deletion
  SELECT COUNT(*), COALESCE(SUM(recording_size_bytes), 0)
  INTO total_deleted, total_bytes
  FROM live_sessions
  WHERE actual_end < cutoff_date
    AND recording_url IS NOT NULL;

  -- Delete from storage (must be done via storage API in production)
  -- This function just marks them for deletion

  -- Update live_sessions to mark recordings as expired
  UPDATE live_sessions
  SET recording_url = NULL,
      recording_size_bytes = NULL
  WHERE actual_end < cutoff_date
    AND recording_url IS NOT NULL;

  RETURN QUERY SELECT total_deleted, total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_recordings IS 'Marks recordings older than N days for deletion';
