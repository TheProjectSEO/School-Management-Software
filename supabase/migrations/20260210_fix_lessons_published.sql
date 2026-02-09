-- Fix: All existing lessons were saved with is_published = false
-- due to a bug that hardcoded the value, ignoring the teacher's intent.
-- This sets all existing lessons to published.
UPDATE lessons SET is_published = true WHERE is_published = false;
