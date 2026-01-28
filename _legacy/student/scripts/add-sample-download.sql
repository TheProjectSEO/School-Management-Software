-- Quick SQL script to add a sample download for testing
-- Run this in Supabase SQL Editor to add a test download

-- Replace 'YOUR_STUDENT_ID' with actual student ID from your database
-- Get student ID by running: SELECT id FROM students LIMIT 1;

INSERT INTO downloads (
  student_id,
  title,
  file_url,
  file_size_bytes,
  file_type,
  status,
  created_at
) VALUES (
  'YOUR_STUDENT_ID',
  'Sample Python Tutorial',
  'https://www.tutorialspoint.com/python/python_tutorial.pdf',
  2457600,
  'application/pdf',
  'ready',
  NOW()
);

-- Add more sample downloads with different statuses
INSERT INTO downloads (student_id, title, file_url, file_size_bytes, file_type, status) VALUES
  -- Ready downloads (can be downloaded immediately)
  ('YOUR_STUDENT_ID', 'Mathematics Calculus Cheat Sheet', 'https://tutorial.math.lamar.edu/pdf/Calculus_Cheat_Sheet_All.pdf', 524288, 'application/pdf', 'ready'),
  ('YOUR_STUDENT_ID', 'JavaScript Programming Guide', 'https://eloquentjavascript.net/Eloquent_JavaScript.pdf', 3145728, 'application/pdf', 'ready'),
  ('YOUR_STUDENT_ID', 'Physics Study Notes', 'https://www.example.com/physics.pdf', 1572864, 'application/pdf', 'ready'),

  -- Syncing downloads (currently downloading)
  ('YOUR_STUDENT_ID', 'Chemistry Lab Manual', 'https://www.example.com/chemistry.pdf', 2097152, 'application/pdf', 'syncing'),
  ('YOUR_STUDENT_ID', 'Biology Video Lesson', 'https://www.example.com/biology.mp4', 52428800, 'video/mp4', 'syncing'),

  -- Queued downloads (waiting to download)
  ('YOUR_STUDENT_ID', 'History Timeline', 'https://www.example.com/history.pdf', 1048576, 'application/pdf', 'queued'),
  ('YOUR_STUDENT_ID', 'Geography Maps', 'https://www.example.com/geography.zip', 10485760, 'application/zip', 'queued'),

  -- Error downloads (failed to download)
  ('YOUR_STUDENT_ID', 'Statistics Workbook', 'https://www.example.com/stats.pdf', 1572864, 'application/pdf', 'error'),
  ('YOUR_STUDENT_ID', 'Spanish Audio Lessons', 'https://www.example.com/spanish.mp3', 8388608, 'audio/mpeg', 'error');

-- Verify the downloads were added
SELECT
  title,
  status,
  file_type,
  ROUND(file_size_bytes / 1024.0 / 1024.0, 2) || ' MB' as file_size,
  created_at
FROM downloads
WHERE student_id = 'YOUR_STUDENT_ID'
ORDER BY created_at DESC;
