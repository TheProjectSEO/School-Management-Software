-- Create the session-recordings storage bucket for live session recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-recordings',
  'session-recordings',
  true,  -- Public bucket so students can access recordings
  524288000,  -- 500MB max file size
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'];

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Allow public read access to session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete session recordings" ON storage.objects;

-- Allow anyone (including anonymous) to read recordings - bucket is public
CREATE POLICY "Allow public read access to session recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'session-recordings');

-- Allow authenticated users (teachers) to upload recordings
CREATE POLICY "Allow authenticated users to upload session recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-recordings');

-- Allow authenticated users (teachers) to update their recordings
CREATE POLICY "Allow authenticated users to update session recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'session-recordings');

-- Allow authenticated users (teachers) to delete their recordings
CREATE POLICY "Allow authenticated users to delete session recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'session-recordings');
