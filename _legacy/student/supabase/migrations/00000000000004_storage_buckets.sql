-- Create storage buckets for the student portal

-- Avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Downloads bucket for offline learning materials
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'downloads',
  'downloads',
  false,
  104857600 -- 100MB limit
) ON CONFLICT (id) DO NOTHING;

-- Submissions bucket for assessment submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800 -- 50MB limit
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
