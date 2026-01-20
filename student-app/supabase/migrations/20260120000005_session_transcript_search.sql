-- Session transcript search using pgvector

CREATE OR REPLACE FUNCTION match_session_transcript_chunks(
  query_embedding vector(1536),
  match_session uuid,
  match_count integer DEFAULT 8,
  match_threshold double precision DEFAULT 0.7
)
RETURNS TABLE (
  session_id uuid,
  chunk_index integer,
  content text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    stc.session_id,
    stc.chunk_index,
    stc.content,
    1 - (stc.embedding <=> query_embedding) AS similarity
  FROM session_transcript_chunks stc
  JOIN live_sessions ls ON ls.id = stc.session_id
  WHERE stc.session_id = match_session
    AND 1 - (stc.embedding <=> query_embedding) >= match_threshold
    AND (
      EXISTS (
        SELECT 1
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN school_profiles sp ON sp.id = s.profile_id
        WHERE e.course_id = ls.course_id
          AND sp.auth_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM teacher_profiles tp
        JOIN school_profiles sp ON sp.id = tp.profile_id
        WHERE tp.id = ls.teacher_id
          AND sp.auth_user_id = auth.uid()
      )
    )
  ORDER BY stc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_session_transcript_chunks(vector, uuid, integer, double precision) TO authenticated;
