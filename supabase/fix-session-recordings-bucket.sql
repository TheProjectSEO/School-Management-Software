-- Run this SQL in Supabase SQL Editor to fix the session-recordings bucket
-- This will:
-- 1. Make the bucket public (so videos can be accessed without auth)
-- 2. Create/recreate the necessary storage policies

-- 1. Update bucket to be public
UPDATE storage.buckets
SET public = true,
    file_size_limit = 524288000,
    allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'session-recordings';

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete session recordings" ON storage.objects;

-- 3. Create policies
-- Allow anyone to read recordings (public access)
CREATE POLICY "Allow public read access to session recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'session-recordings');

-- Allow authenticated users to upload recordings
CREATE POLICY "Allow authenticated users to upload session recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-recordings');

-- Allow authenticated users to update their recordings
CREATE POLICY "Allow authenticated users to update session recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'session-recordings');

-- Allow authenticated users to delete their recordings
CREATE POLICY "Allow authenticated users to delete session recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'session-recordings');

-- Verify the bucket is now public
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'session-recordings';
