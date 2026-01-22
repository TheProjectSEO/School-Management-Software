-- Check which sessions have daily_room_name but no recording_url
-- These sessions may need manual reprocessing via the API

SELECT
  id,
  title,
  status,
  daily_room_name,
  recording_url,
  actual_end
FROM live_sessions
WHERE status = 'ended'
  AND daily_room_name IS NOT NULL
  AND recording_url IS NULL
ORDER BY actual_end DESC;

-- To manually trigger recording processing for a session,
-- make a POST request to:
-- POST /api/teacher/live-sessions/{session_id}/recording
--
-- Example using curl:
-- curl -X POST http://localhost:3001/api/teacher/live-sessions/1e6005b2-ebf5-43b3-8d60-013020453859/recording
