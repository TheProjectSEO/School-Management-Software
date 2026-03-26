-- Session transcript semantic search RPC
-- Access control is handled at the API layer (not here).
-- This function is called only after the student/teacher is verified
-- to have access to the session.

CREATE OR REPLACE FUNCTION match_session_transcript_chunks(
  query_embedding vector(1536),
  match_session uuid,
  match_count integer DEFAULT 8,
  match_threshold double precision DEFAULT 0.5
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
  WHERE stc.session_id = match_session
    AND 1 - (stc.embedding <=> query_embedding) >= match_threshold
  ORDER BY stc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_session_transcript_chunks(vector, uuid, integer, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION match_session_transcript_chunks(vector, uuid, integer, double precision) TO authenticated;
