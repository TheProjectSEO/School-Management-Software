-- Add video_type column to lessons table if it doesn't exist
-- This column stores the detected video type (youtube, vimeo, upload, embed, external)
-- Used by resolveVideoSource() to determine the correct player type

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'lessons'
    AND column_name = 'video_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE lessons ADD COLUMN video_type TEXT;
    RAISE NOTICE 'Added video_type column to lessons table';
  ELSE
    RAISE NOTICE 'Column video_type already exists in lessons table';
  END IF;
END $$;
