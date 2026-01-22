-- Run this SQL in Supabase SQL Editor to create transcript tables
-- These tables enable the "Ask AI about this recording" feature

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Session transcripts table - stores the full transcript
CREATE TABLE IF NOT EXISTS session_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openai',
  language text,
  transcript_text text NOT NULL,
  transcript_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- Session transcript chunks table - stores chunked transcript with embeddings
CREATE TABLE IF NOT EXISTS session_transcript_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  model text DEFAULT 'text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, chunk_index)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS session_transcript_chunks_embedding_idx
ON session_transcript_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for session_id lookups
CREATE INDEX IF NOT EXISTS session_transcript_chunks_session_idx
ON session_transcript_chunks(session_id);

CREATE INDEX IF NOT EXISTS session_transcripts_session_idx
ON session_transcripts(session_id);

-- Enable RLS
ALTER TABLE session_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_transcript_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view transcripts for enrolled courses" ON session_transcripts;
DROP POLICY IF EXISTS "Teachers can view transcripts for their sessions" ON session_transcripts;
DROP POLICY IF EXISTS "Service role can manage transcripts" ON session_transcripts;
DROP POLICY IF EXISTS "Students can view chunks for enrolled courses" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Teachers can view chunks for their sessions" ON session_transcript_chunks;
DROP POLICY IF EXISTS "Service role can manage chunks" ON session_transcript_chunks;

-- RLS policies for session_transcripts
CREATE POLICY "Students can view transcripts for enrolled courses"
ON session_transcripts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN enrollments e ON e.course_id = ls.course_id
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE ls.id = session_transcripts.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view transcripts for their sessions"
ON session_transcripts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_profiles tp ON tp.id = ls.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcripts.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage transcripts"
ON session_transcripts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS policies for session_transcript_chunks
CREATE POLICY "Students can view chunks for enrolled courses"
ON session_transcript_chunks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN enrollments e ON e.course_id = ls.course_id
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE ls.id = session_transcript_chunks.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view chunks for their sessions"
ON session_transcript_chunks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN teacher_profiles tp ON tp.id = ls.teacher_profile_id
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE ls.id = session_transcript_chunks.session_id
      AND sp.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage chunks"
ON session_transcript_chunks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify tables were created
SELECT 'session_transcripts' as table_name, count(*) as row_count FROM session_transcripts
UNION ALL
SELECT 'session_transcript_chunks' as table_name, count(*) as row_count FROM session_transcript_chunks;
